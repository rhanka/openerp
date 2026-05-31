import { createHmac } from "node:crypto";

// HMAC-SHA256 signing for webhook deliveries.
// Signature format: `v1=<hex hmac sha256 of "${deliveryId}.${signedAtUnix}.${rawBody}">`
// This is intentionally simple and stable — the egress slice must implement
// the same scheme on the consumer-facing docs.

export function signPayload(
  secret: string,
  deliveryId: string,
  signedAtUnix: number,
  rawBody: string
): string {
  const message = `${deliveryId}.${signedAtUnix}.${rawBody}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(message);
  return `v1=${hmac.digest("hex")}`;
}

export function buildDeliveryPayload(
  eventType: string,
  organizationId: string,
  resourceType: string,
  resourceId: string,
  auditEventId: string | null
): Record<string, unknown> {
  // Keys are sorted alphabetically so that JSON.stringify produces a stable
  // canonical form regardless of runtime key-insertion order. This ensures
  // the HMAC input is reproducible even after a JSONB round-trip (Postgres
  // JSONB reorders keys alphabetically when returning data).
  return {
    auditEventId,
    eventType,
    organizationId,
    resourceId,
    resourceType,
    timestamp: new Date().toISOString()
  };
}

/**
 * Serialize a payload object to a canonical JSON string with sorted keys.
 * This is the stable serialization used for HMAC signing and verification.
 * Use this instead of JSON.stringify when building the rawBody for signPayload.
 */
export function canonicalizePayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}
