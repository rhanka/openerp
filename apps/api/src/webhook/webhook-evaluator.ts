import type { Queryable, TenantContext } from "../db/client";
import type { WebhookEvaluatorFn, WebhookTriggerPayload } from "../foundation/audit-emit";
import {
  listActiveEndpointsBySubscribedEvent,
  insertWebhookDelivery,
  findWebhookEndpointByIdWithSecret
} from "./webhook-endpoints";
import { signPayload, buildDeliveryPayload, canonicalizePayload } from "./webhook-signer";

// ---------------------------------------------------------------------------
// makeWebhookEvaluator — returns the evaluator function to register via
// setWebhookEvaluator() in audit-emit.ts at buildApp startup.
//
// This module MUST NOT be imported by foundation code. The dependency direction
// is: foundation→registration-hook (no import), webhook→foundation.
//
// Guards implemented here:
// 1. BEST-EFFORT — entire evaluate body is wrapped try/catch; errors swallowed.
// 2. RE-ENTRANCY/CASCADE GUARD — the caller (audit-emit) already suppresses
//    calls when __workflowDepth >= 1, so nested events don't fan out.
// 3. IDEMPOTENCY — insertWebhookDelivery uses ON CONFLICT DO NOTHING per
//    (webhook_endpoint_id, trigger_audit_event_id).
// 4. NO EGRESS — status is always 'pending_egress'; no fetch/HTTP calls.
// ---------------------------------------------------------------------------

export interface WebhookEvaluatorOptions {
  /**
   * Called after each successful insertWebhookDelivery. Best-effort: errors
   * thrown by the callback are swallowed and never propagated to the caller.
   *
   * Production wiring: pass `runDueWebhookDeliveries` (or an enqueue helper)
   * here to trigger eager egress immediately after a delivery row is recorded.
   */
  onDeliveryRecorded?: (
    deliveryId: string,
    ctx: { organizationId: string }
  ) => void | Promise<void>;
}

export function makeWebhookEvaluator(options?: WebhookEvaluatorOptions): WebhookEvaluatorFn {
  return async function evaluate(
    db: Queryable,
    context: TenantContext,
    payload: WebhookTriggerPayload
  ): Promise<void> {
    // Outer try/catch: best-effort guarantee — never throws to caller.
    try {
      // Find all active endpoints subscribed to this event type.
      const endpoints = await listActiveEndpointsBySubscribedEvent(
        db,
        context,
        payload.action
      );

      for (const endpoint of endpoints) {
        try {
          // Load the secret (the only retrieval path).
          const endpointWithSecret = await findWebhookEndpointByIdWithSecret(
            db,
            context,
            endpoint.id
          );
          if (!endpointWithSecret) continue;

          const deliveryPayload = buildDeliveryPayload(
            payload.action,
            context.organizationId,
            payload.resourceType,
            payload.resourceId,
            payload.auditEventId
          );

          // Use canonical serialization (sorted keys) so the HMAC is reproducible
          // even after a JSONB round-trip (Postgres JSONB sorts keys alphabetically).
          const rawBody = canonicalizePayload(deliveryPayload);
          const now = new Date();
          const signedAtUnix = Math.floor(now.getTime() / 1000);
          // Sign with auditEventId as the stable identifier for the delivery
          const signature = signPayload(
            endpointWithSecret.signingSecret,
            payload.auditEventId,
            signedAtUnix,
            rawBody
          );

          // Insert — idempotent on (webhook_endpoint_id, trigger_audit_event_id).
          const delivery = await insertWebhookDelivery(db, context, {
            webhookEndpointId: endpoint.id,
            eventType: payload.action,
            triggerAuditEventId: payload.auditEventId,
            payload: deliveryPayload,
            signature,
            signedAt: now.toISOString()
          });
          // NO egress — record-only.

          // Fire the callback (best-effort) when a delivery row was obtained.
          // insertWebhookDelivery always returns a row (new or existing on conflict),
          // so we call the callback whenever we have an id back.
          if (options?.onDeliveryRecorded && delivery?.id) {
            try {
              await options.onDeliveryRecorded(delivery.id, {
                organizationId: context.organizationId
              });
            } catch {
              // Best-effort: callback errors must not affect the audit pipeline.
            }
          }
        } catch {
          // Per-endpoint best-effort: continue to the next endpoint.
        }
      }
    } catch {
      // Outer best-effort guard — swallow all errors.
    }
  };
}
