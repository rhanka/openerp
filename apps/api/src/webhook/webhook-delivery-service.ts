import type { Queryable, TenantContext } from "../db/client";
import {
  findWebhookDeliveryById,
  findWebhookEndpointByIdWithSecret,
  markDeliveryAttempt,
  incrementEndpointFailureCounter,
  resetEndpointFailureCounter,
} from "./webhook-endpoints";
import type { WebhookEgressPort } from "./webhook-egress-port";

export interface AttemptWebhookDeliveryDeps {
  port: WebhookEgressPort;
  timeoutMs?: number;
}

export interface AttemptWebhookDeliveryResult {
  deliveryId: string;
  outcome: "succeeded" | "failed";
  httpStatus: number | null;
  errorDetail: string | null;
  durationMs: number;
}

/**
 * Attempt a single egress for a pending delivery.
 *
 * Loads the delivery row + the parent endpoint (with signing secret), POSTs
 * the canonical body through the egress port, then transitions the delivery
 * row and bumps the endpoint failure counter (reset on success, ++ on fail).
 *
 * Retry scheduling and circuit-breaker disable are handled in downstream
 * slices (W0-retry-backoff, W0-circuit-breaker).
 */
export async function attemptWebhookDelivery(
  db: Queryable,
  ctx: TenantContext,
  deliveryId: string,
  deps: AttemptWebhookDeliveryDeps
): Promise<AttemptWebhookDeliveryResult> {
  const delivery = await findWebhookDeliveryById(db, ctx, deliveryId);
  if (!delivery) {
    throw new Error(`webhook delivery not found: ${deliveryId}`);
  }

  const endpoint = await findWebhookEndpointByIdWithSecret(db, ctx, delivery.webhookEndpointId);
  if (!endpoint) {
    throw new Error(`webhook endpoint not found: ${delivery.webhookEndpointId}`);
  }

  // Defensive: deliveries created for already-disabled endpoints short-circuit.
  if (endpoint.isActive === false || endpoint.disabledAt !== null) {
    await markDeliveryAttempt(db, ctx, {
      deliveryId,
      status: "failed",
      httpStatus: null,
      errorDetail: "endpoint_disabled",
    });
    return {
      deliveryId,
      outcome: "failed",
      httpStatus: null,
      errorDetail: "endpoint_disabled",
      durationMs: 0,
    };
  }

  // The payload + signature were computed at insert time; resend them verbatim.
  const rawBody = canonicalRawBody(delivery.payload);

  const result = await deps.port.send({
    url: endpoint.targetUrl,
    body: rawBody,
    headers: {
      "x-openerp-signature": delivery.signature,
      "x-openerp-delivery-id": delivery.id,
      "x-openerp-signed-at": Math.floor(
        new Date(delivery.signedAt).getTime() / 1000
      ).toString(),
      "x-openerp-event-type": delivery.eventType,
    },
    timeoutMs: deps.timeoutMs ?? 10_000,
  });

  if (result.ok) {
    if (result.httpStatus >= 200 && result.httpStatus < 300) {
      await markDeliveryAttempt(db, ctx, {
        deliveryId,
        status: "succeeded",
        httpStatus: result.httpStatus,
        errorDetail: null,
      });
      await resetEndpointFailureCounter(db, ctx, endpoint.id);
      return {
        deliveryId,
        outcome: "succeeded",
        httpStatus: result.httpStatus,
        errorDetail: null,
        durationMs: result.durationMs,
      };
    }
    // 2xx check above covers success; non-2xx ok=true should not occur per port contract,
    // but handle defensively the same as an error.
    await markDeliveryAttempt(db, ctx, {
      deliveryId,
      status: "failed",
      httpStatus: result.httpStatus,
      errorDetail: `http_${result.httpStatus}`,
    });
    await incrementEndpointFailureCounter(db, ctx, endpoint.id);
    return {
      deliveryId,
      outcome: "failed",
      httpStatus: result.httpStatus,
      errorDetail: `http_${result.httpStatus}`,
      durationMs: result.durationMs,
    };
  }

  // ok=false — network/timeout/ssrf failure
  await markDeliveryAttempt(db, ctx, {
    deliveryId,
    status: "failed",
    httpStatus: result.httpStatus,
    errorDetail: result.kind,
  });
  await incrementEndpointFailureCounter(db, ctx, endpoint.id);
  return {
    deliveryId,
    outcome: "failed",
    httpStatus: result.httpStatus,
    errorDetail: result.kind,
    durationMs: result.durationMs,
  };
}

/** Canonicalize the stored JSONB payload to the same wire form the signature was computed against. */
function canonicalRawBody(payload: unknown): string {
  // payload is already a JS object (pg returns jsonb as parsed JS); re-stringify deterministically.
  return JSON.stringify(payload);
}
