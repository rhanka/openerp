import type { Queryable, TenantContext } from "../db/client";
import { findWebhookEndpointByIdWithSecret } from "./webhook-endpoints";
import { recordAuditEvent } from "../foundation/audit-emit";

/**
 * Number of consecutive delivery failures that trips the circuit breaker and
 * auto-disables the endpoint.
 */
export const CIRCUIT_BREAKER_THRESHOLD = 10;

/**
 * After incrementing the consecutive_failures counter, call this helper to
 * check whether the threshold has been crossed. If so, it atomically flips
 * is_active=false and disabled_at=now() on the endpoint and emits an audit
 * event with disabledReason="circuit_breaker_opened".
 *
 * Idempotent: if the endpoint is already inactive, no UPDATE is issued.
 */
export async function tripEndpointIfNeeded(
  db: Queryable,
  ctx: TenantContext,
  endpointId: string
): Promise<void> {
  const endpoint = await findWebhookEndpointByIdWithSecret(db, ctx, endpointId);
  if (!endpoint) {
    // Endpoint deleted concurrently — nothing to trip.
    return;
  }

  // Guard: only trip if still active and failures have reached the threshold.
  if (endpoint.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) {
    return;
  }
  if (endpoint.isActive === false) {
    // Already disabled — idempotent, no extra UPDATE.
    return;
  }

  const now = new Date();

  await db.query(
    `update webhook_endpoints
        set is_active   = false,
            disabled_at = $3,
            updated_at  = $3
      where id = $1
        and organization_id = $2
        and is_active = true
        and deleted_at is null`,
    [endpointId, ctx.organizationId, now]
  );

  await recordAuditEvent(db, ctx, {
    action: "webhook.webhook_endpoint.updated",
    resourceType: "webhook_endpoint",
    resourceId: endpointId,
    beforeSummary: {
      isActive: true,
      disabledAt: null,
      consecutiveFailures: endpoint.consecutiveFailures,
    },
    afterSummary: {
      isActive: false,
      disabledAt: now.toISOString(),
      disabledReason: "circuit_breaker_opened",
    },
  });
}
