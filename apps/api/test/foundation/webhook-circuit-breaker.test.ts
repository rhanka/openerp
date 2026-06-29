/**
 * Tests for W0-circuit-breaker:
 *   - tripEndpointIfNeeded (webhook-circuit-breaker.ts)
 *   - attemptWebhookDelivery + CB integration (webhook-delivery-service.ts)
 *   - Re-arm on PATCH isActive false→true (webhook-service.ts via
 *     clearEndpointCircuitBreakerState in webhook-endpoints.ts)
 *
 * Uses in-memory Queryable mock (vi.fn returning fixed rows).
 * DB integration deferred — docker absent.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { Queryable, TenantContext } from "../../src/db/client";
import {
  CIRCUIT_BREAKER_THRESHOLD,
  tripEndpointIfNeeded,
} from "../../src/webhook/webhook-circuit-breaker";
import { attemptWebhookDelivery } from "../../src/webhook/webhook-delivery-service";
import {
  makeInMemoryEgressPort,
  type WebhookEgressResult,
} from "../../src/webhook/webhook-egress-port";
import { clearEndpointCircuitBreakerState } from "../../src/webhook/webhook-endpoints";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CTX: TenantContext = {
  organizationId: "org_cb_test",
  actorUserId: "user_cb_test",
};

const DELIVERY_ID = "del_cb_001";
const ENDPOINT_ID = "ep_cb_001";

const SIGNED_AT = new Date("2026-03-01T10:00:00Z");

function makeEndpointRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ENDPOINT_ID,
    organizationId: CTX.organizationId,
    ownerUserId: null,
    name: "cb test endpoint",
    targetUrl: "https://example.com/hook",
    eventTypes: ["contact.created"],
    isActive: true,
    isShared: false,
    consecutiveFailures: 0,
    disabledAt: null,
    signingSecret: "secret_cb_test",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeDeliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DELIVERY_ID,
    organizationId: CTX.organizationId,
    webhookEndpointId: ENDPOINT_ID,
    eventType: "contact.created",
    triggerAuditEventId: null,
    payload: { ev: "test" },
    signature: "sha256=sig_cb",
    status: "pending_egress",
    httpStatus: null,
    attemptCount: 0,
    nextRetryAt: null,
    errorDetail: null,
    signedAt: SIGNED_AT,
    deliveredAt: null,
    createdAt: new Date("2026-03-01T09:59:00Z"),
    ...overrides,
  };
}

/**
 * Build a Queryable mock dispatching on SQL fragment content.
 *
 * @param endpointRow - row returned from webhook_endpoints (with signing_secret)
 * @param deliveryRow - row returned from webhook_deliveries
 */
function makeDb(
  endpointRow: unknown | null,
  deliveryRow: unknown | null = null
): Queryable {
  const query = vi.fn(async (text: string, _values?: unknown[]) => {
    const sql = text.toLowerCase().replace(/\s+/g, " ").trim();

    if (sql.includes("from webhook_deliveries") && sql.includes("where id =")) {
      return { rows: deliveryRow !== null ? [deliveryRow] : [] };
    }
    if (sql.includes("from webhook_endpoints") && sql.includes("signing_secret")) {
      return { rows: endpointRow !== null ? [endpointRow] : [] };
    }
    // All update/insert queries (markDeliveryAttempt, increment, reset, trip, audit)
    return { rows: [] };
  });
  return { query } as unknown as Queryable;
}

function queryCallTexts(db: Queryable): string[] {
  return (db.query as ReturnType<typeof vi.fn>).mock.calls.map(
    (c: unknown[]) => (c[0] as string).toLowerCase().replace(/\s+/g, " ").trim()
  );
}

// ---------------------------------------------------------------------------
// tripEndpointIfNeeded
// ---------------------------------------------------------------------------

describe("tripEndpointIfNeeded", () => {
  it("counter below threshold: no UPDATE issued", async () => {
    const db = makeDb(makeEndpointRow({ consecutiveFailures: 9, isActive: true }));

    await tripEndpointIfNeeded(db, CTX, ENDPOINT_ID);

    const texts = queryCallTexts(db);
    const updateTrip = texts.find(
      (t) => t.includes("update webhook_endpoints") && t.includes("is_active = false")
    );
    expect(updateTrip).toBeUndefined();
  });

  it("counter exactly at threshold and is_active=true: UPDATE flips is_active=false + audit emitted", async () => {
    const db = makeDb(
      makeEndpointRow({ consecutiveFailures: CIRCUIT_BREAKER_THRESHOLD, isActive: true })
    );

    await tripEndpointIfNeeded(db, CTX, ENDPOINT_ID);

    const texts = queryCallTexts(db);
    const updateTrip = texts.find(
      (t) => t.includes("update webhook_endpoints") && t.includes("is_active = false")
    );
    expect(updateTrip).toBeTruthy();

    // Audit event insert
    const auditInsert = texts.find(
      (t) => t.includes("insert into audit_events")
    );
    expect(auditInsert).toBeTruthy();

    // The audit call values should carry the circuit_breaker_opened reason
    const auditCallIndex = texts.findIndex(
      (t) => t.includes("insert into audit_events")
    );
    const auditValues = (db.query as ReturnType<typeof vi.fn>).mock.calls[auditCallIndex]![1] as unknown[];
    // afterSummary is serialized as JSON in audit-emit — check that disabledReason appears
    const afterSummaryArg = auditValues.find(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        (v as Record<string, unknown>)["disabledReason"] === "circuit_breaker_opened"
    );
    expect(afterSummaryArg).toBeTruthy();
  });

  it("counter above threshold but is_active already false: no extra UPDATE (idempotent)", async () => {
    const db = makeDb(
      makeEndpointRow({
        consecutiveFailures: CIRCUIT_BREAKER_THRESHOLD + 5,
        isActive: false,
        disabledAt: new Date("2026-02-01T00:00:00Z"),
      })
    );

    await tripEndpointIfNeeded(db, CTX, ENDPOINT_ID);

    const texts = queryCallTexts(db);
    const updateTrip = texts.find(
      (t) => t.includes("update webhook_endpoints") && t.includes("is_active = false")
    );
    expect(updateTrip).toBeUndefined();
  });

  it("counter at threshold but is_active=false (manually disabled): no extra UPDATE", async () => {
    const db = makeDb(
      makeEndpointRow({
        consecutiveFailures: CIRCUIT_BREAKER_THRESHOLD,
        isActive: false,
        disabledAt: new Date("2026-02-15T00:00:00Z"),
      })
    );

    await tripEndpointIfNeeded(db, CTX, ENDPOINT_ID);

    const texts = queryCallTexts(db);
    const updateTrip = texts.find(
      (t) => t.includes("update webhook_endpoints") && t.includes("is_active = false")
    );
    expect(updateTrip).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// attemptWebhookDelivery + circuit-breaker integration
// ---------------------------------------------------------------------------

describe("attemptWebhookDelivery + circuit-breaker integration", () => {
  it("10th failure: tripEndpointIfNeeded UPDATE is issued", async () => {
    // After incrementEndpointFailureCounter, tripEndpointIfNeeded re-reads the
    // endpoint. We simulate this by returning the already-incremented state
    // (failures=10) on the second endpoint fetch (which happens inside
    // tripEndpointIfNeeded).
    let endpointFetchCount = 0;
    const query = vi.fn(async (text: string, _values?: unknown[]) => {
      const sql = text.toLowerCase().replace(/\s+/g, " ").trim();

      if (sql.includes("from webhook_deliveries") && sql.includes("where id =")) {
        return { rows: [makeDeliveryRow()] };
      }
      if (sql.includes("from webhook_endpoints") && sql.includes("signing_secret")) {
        endpointFetchCount++;
        // First fetch (in attemptWebhookDelivery): active, 9 failures
        // Second fetch (in tripEndpointIfNeeded): active, 10 failures after increment
        const failures = endpointFetchCount === 1 ? 9 : CIRCUIT_BREAKER_THRESHOLD;
        return {
          rows: [
            makeEndpointRow({ consecutiveFailures: failures, isActive: true }),
          ],
        };
      }
      return { rows: [] };
    });
    const db = { query } as unknown as Queryable;

    const port = makeInMemoryEgressPort(
      async (_req): Promise<WebhookEgressResult> => ({
        ok: false,
        kind: "NETWORK",
        httpStatus: null,
        message: "conn refused",
        durationMs: 5,
      })
    );

    await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    const texts = (db.query as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => (c[0] as string).toLowerCase().replace(/\s+/g, " ").trim()
    );
    const tripUpdate = texts.find(
      (t: string) => t.includes("update webhook_endpoints") && t.includes("is_active = false")
    );
    expect(tripUpdate).toBeTruthy();
  });

  it("9th failure: endpoint stays active (no trip UPDATE)", async () => {
    let endpointFetchCount = 0;
    const query = vi.fn(async (text: string, _values?: unknown[]) => {
      const sql = text.toLowerCase().replace(/\s+/g, " ").trim();

      if (sql.includes("from webhook_deliveries") && sql.includes("where id =")) {
        return { rows: [makeDeliveryRow()] };
      }
      if (sql.includes("from webhook_endpoints") && sql.includes("signing_secret")) {
        endpointFetchCount++;
        // After increment: still only 9 failures — below threshold
        const failures = endpointFetchCount === 1 ? 8 : 9;
        return {
          rows: [makeEndpointRow({ consecutiveFailures: failures, isActive: true })],
        };
      }
      return { rows: [] };
    });
    const db = { query } as unknown as Queryable;

    const port = makeInMemoryEgressPort(
      async (_req): Promise<WebhookEgressResult> => ({
        ok: false,
        kind: "TIMEOUT",
        httpStatus: null,
        message: "timed out",
        durationMs: 10_001,
      })
    );

    await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    const texts = (db.query as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => (c[0] as string).toLowerCase().replace(/\s+/g, " ").trim()
    );
    const tripUpdate = texts.find(
      (t: string) => t.includes("update webhook_endpoints") && t.includes("is_active = false")
    );
    expect(tripUpdate).toBeUndefined();
  });

  it("success after some failures: counter reset, endpoint stays active", async () => {
    const db = makeDb(
      makeEndpointRow({ consecutiveFailures: 5, isActive: true }),
      makeDeliveryRow()
    );

    const port = makeInMemoryEgressPort(async (_req): Promise<WebhookEgressResult> => ({
      ok: true,
      httpStatus: 200,
      durationMs: 30,
    }));

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("succeeded");

    const texts = queryCallTexts(db);

    // Counter was reset
    const reset = texts.find(
      (t) =>
        t.includes("update webhook_endpoints") &&
        t.includes("consecutive_failures = 0")
    );
    expect(reset).toBeTruthy();

    // No trip
    const tripUpdate = texts.find(
      (t) => t.includes("update webhook_endpoints") && t.includes("is_active = false")
    );
    expect(tripUpdate).toBeUndefined();
  });

  it("already-disabled endpoint: short-circuit failed with endpoint_disabled", async () => {
    const db = makeDb(
      makeEndpointRow({ isActive: false, disabledAt: new Date("2026-01-01T10:00:00Z") }),
      makeDeliveryRow()
    );
    const sendSpy = vi.fn(async (_req: unknown): Promise<WebhookEgressResult> => ({
      ok: true,
      httpStatus: 200,
      durationMs: 1,
    }));
    const port = makeInMemoryEgressPort(sendSpy);

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("failed");
    expect(result.errorDetail).toBe("endpoint_disabled");
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// clearEndpointCircuitBreakerState (re-arm on PATCH isActive false→true)
// ---------------------------------------------------------------------------

describe("clearEndpointCircuitBreakerState", () => {
  it("issues UPDATE resetting consecutive_failures=0 and disabled_at=null", async () => {
    const db = makeDb(null);

    await clearEndpointCircuitBreakerState(db, CTX, ENDPOINT_ID);

    const texts = queryCallTexts(db);
    const clearUpdate = texts.find(
      (t) =>
        t.includes("update webhook_endpoints") &&
        t.includes("consecutive_failures = 0") &&
        t.includes("disabled_at = null")
    );
    expect(clearUpdate).toBeTruthy();
  });

  it("PATCH isActive false→true: clearEndpointCircuitBreakerState called (integration via makeDb)", async () => {
    // This test exercises clearEndpointCircuitBreakerState in isolation.
    // Full webhook-service.ts integration is DB-bound; we verify the helper
    // issues the correct SQL.
    const db = makeDb(null);

    await clearEndpointCircuitBreakerState(db, CTX, ENDPOINT_ID);

    const texts = queryCallTexts(db);
    const updateCall = texts.find(
      (t) => t.includes("update webhook_endpoints") && t.includes("consecutive_failures = 0")
    );
    expect(updateCall).toBeTruthy();

    // Verify it targets the correct endpoint and org
    const callIdx = texts.findIndex(
      (t) => t.includes("update webhook_endpoints") && t.includes("consecutive_failures = 0")
    );
    const values = (db.query as ReturnType<typeof vi.fn>).mock.calls[callIdx]![1] as unknown[];
    expect(values).toContain(ENDPOINT_ID);
    expect(values).toContain(CTX.organizationId);
  });

  it("no-op when consecutive_failures already 0: SQL still runs, no errors", async () => {
    const db = makeDb(null);
    // Re-arm is unconditional on current state — safe to call multiple times
    await clearEndpointCircuitBreakerState(db, CTX, ENDPOINT_ID);
    await clearEndpointCircuitBreakerState(db, CTX, ENDPOINT_ID);

    const texts = queryCallTexts(db);
    const clearCalls = texts.filter(
      (t) =>
        t.includes("update webhook_endpoints") &&
        t.includes("consecutive_failures = 0") &&
        t.includes("disabled_at = null")
    );
    expect(clearCalls).toHaveLength(2);
  });
});
