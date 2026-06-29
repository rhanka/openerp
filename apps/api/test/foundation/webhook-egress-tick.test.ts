/**
 * Tests for apps/api/src/webhook/webhook-egress-tick.ts
 *
 * Uses in-memory Queryable mock (vi.fn) and makeInMemoryEgressPort.
 * DB integration deferred — docker absent.
 *
 * W0-worker-tick
 */
import { describe, expect, it, vi } from "vitest";

import type { Queryable, TenantContext } from "../../src/db/client";
import { runDueWebhookDeliveries } from "../../src/webhook/webhook-egress-tick";
import {
  makeInMemoryEgressPort,
  type WebhookEgressResult,
} from "../../src/webhook/webhook-egress-port";
import { MAX_ATTEMPTS } from "../../src/webhook/webhook-retry-policy";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CTX: TenantContext = {
  organizationId: "org_tick_001",
  actorUserId: "user_tick_001",
};

const AS_OF = new Date("2026-06-01T12:00:00Z");

function makeDeliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "del_tick_001",
    organizationId: CTX.organizationId,
    webhookEndpointId: "ep_tick_001",
    eventType: "contact.created",
    triggerAuditEventId: null,
    payload: { foo: "bar" },
    signature: "sha256=tick_abc",
    status: "pending_egress" as const,
    httpStatus: null,
    attemptCount: 0,
    nextRetryAt: null,
    errorDetail: null,
    signedAt: new Date("2026-06-01T11:59:00Z"),
    deliveredAt: null,
    createdAt: new Date("2026-06-01T11:58:00Z"),
    ...overrides,
  };
}

function makeEndpointRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ep_tick_001",
    organizationId: CTX.organizationId,
    ownerUserId: null,
    name: "tick endpoint",
    targetUrl: "https://example.com/tick",
    eventTypes: ["contact.created"],
    isActive: true,
    isShared: false,
    consecutiveFailures: 0,
    disabledAt: null,
    signingSecret: "secret_tick",
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    ...overrides,
  };
}

/**
 * Build a Queryable mock.
 *
 * dueIds: the ids returned by the "due deliveries" SELECT.
 * deliveryRow: the row returned by findWebhookDeliveryById (keyed by single id).
 * endpointRow: the row returned by findWebhookEndpointByIdWithSecret.
 * postAttemptCount: what attempt_count to return in the post-attempt SELECT (default 1).
 */
function makeDb(opts: {
  dueIds?: string[];
  deliveryRow?: ReturnType<typeof makeDeliveryRow> | null;
  endpointRow?: ReturnType<typeof makeEndpointRow> | null;
  postAttemptCount?: number;
}): Queryable {
  const {
    dueIds = [],
    deliveryRow = makeDeliveryRow(),
    endpointRow = makeEndpointRow(),
    postAttemptCount = 1,
  } = opts;

  const query = vi.fn(async (text: string, values?: unknown[]) => {
    const sql = text.toLowerCase().replace(/\s+/g, " ").trim();

    // Due deliveries sweep SELECT (tick query)
    if (
      sql.includes("from webhook_deliveries") &&
      sql.includes("for update skip locked")
    ) {
      return { rows: dueIds.map((id) => ({ id })) };
    }

    // findWebhookDeliveryById (single delivery by id)
    if (
      sql.includes("from webhook_deliveries") &&
      sql.includes("where id =") &&
      !sql.includes("attempt_count") &&
      !sql.includes("next_retry_at")
    ) {
      // Could be the post-attempt count SELECT too — distinguish by SELECT columns
      if (sql.includes("select attempt_count") || (sql.includes("select") && sql.includes("attempt_count") && !sql.includes("status"))) {
        return { rows: [{ attempt_count: postAttemptCount }] };
      }
      return { rows: deliveryRow !== null ? [deliveryRow] : [] };
    }

    // Post-attempt attempt_count SELECT
    if (
      sql.includes("select attempt_count") ||
      (sql.includes("from webhook_deliveries") && sql.includes("attempt_count") && !sql.includes("status =") && !sql.includes("for update"))
    ) {
      return { rows: [{ attempt_count: postAttemptCount }] };
    }

    // findWebhookEndpointByIdWithSecret
    if (sql.includes("from webhook_endpoints") && sql.includes("signing_secret")) {
      return { rows: endpointRow !== null ? [endpointRow] : [] };
    }

    // All UPDATE queries (markDeliveryAttempt, incrementEndpointFailureCounter,
    // resetEndpointFailureCounter, tripEndpointIfNeeded, next_retry_at update)
    if (
      sql.includes("update webhook_deliveries") ||
      sql.includes("update webhook_endpoints")
    ) {
      return { rows: [] };
    }

    // webhook_endpoints SELECT for circuit-breaker
    if (sql.includes("from webhook_endpoints")) {
      return { rows: endpointRow !== null ? [endpointRow] : [] };
    }

    return { rows: [] };
  });

  return { query } as unknown as Queryable;
}

function queryCallTexts(db: Queryable): string[] {
  return (db.query as ReturnType<typeof vi.fn>).mock.calls.map(
    (c: unknown[]) => (c[0] as string).toLowerCase().replace(/\s+/g, " ").trim()
  );
}

function queryCallValues(db: Queryable): unknown[][] {
  return (db.query as ReturnType<typeof vi.fn>).mock.calls.map(
    (c: unknown[]) => (c[1] ?? []) as unknown[]
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runDueWebhookDeliveries", () => {
  // 1. Empty queue
  it("empty queue: processed=0, succeeded=0, failed=0, skipped=0", async () => {
    const db = makeDb({ dueIds: [] });
    const result = await runDueWebhookDeliveries(db, CTX, AS_OF);

    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.asOf).toEqual(AS_OF);
  });

  // 2. One pending — port called, processed=1
  it("one pending: port called once, processed=1", async () => {
    const db = makeDb({ dueIds: ["del_tick_001"] });
    const sendSpy = vi.fn(async (_req: unknown): Promise<WebhookEgressResult> => ({
      ok: true,
      httpStatus: 200,
      durationMs: 5,
    }));
    const port = makeInMemoryEgressPort(sendSpy);

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.processed).toBe(1);
    expect(sendSpy).toHaveBeenCalledOnce();
  });

  // 3. One pending success
  it("one pending success: processed=1, succeeded=1, failed=0", async () => {
    const db = makeDb({ dueIds: ["del_tick_001"] });
    const port = makeInMemoryEgressPort(async () => ({ ok: true, httpStatus: 200, durationMs: 10 }));

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });

  // 4. One pending failure (NETWORK, retryable) — next_retry_at scheduled
  it("NETWORK failure: processed=1, failed=1, next_retry_at UPDATE issued", async () => {
    const db = makeDb({
      dueIds: ["del_tick_001"],
      postAttemptCount: 1,
    });
    const port = makeInMemoryEgressPort(
      async (): Promise<WebhookEgressResult> => ({
        ok: false,
        kind: "NETWORK",
        httpStatus: null,
        message: "connection refused",
        durationMs: 5,
      })
    );

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);

    const texts = queryCallTexts(db);
    const retryUpdate = texts.find(
      (t) => t.includes("update webhook_deliveries") && t.includes("next_retry_at")
    );
    expect(retryUpdate).toBeTruthy();
  });

  // 5. SSRF_PRIVATE_IP failure — terminal, next_retry_at NOT scheduled
  it("SSRF_PRIVATE_IP failure: failed=1, no next_retry_at UPDATE", async () => {
    const db = makeDb({
      dueIds: ["del_tick_001"],
      postAttemptCount: 1,
    });
    const port = makeInMemoryEgressPort(
      async (): Promise<WebhookEgressResult> => ({
        ok: false,
        kind: "SSRF_PRIVATE_IP",
        httpStatus: null,
        message: "private ip blocked",
        durationMs: 1,
      })
    );

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.failed).toBe(1);

    const texts = queryCallTexts(db);
    const retryUpdate = texts.find(
      (t) => t.includes("update webhook_deliveries") && t.includes("next_retry_at")
    );
    expect(retryUpdate).toBeUndefined();
  });

  // 6. One failed-retry that is due — picked up, attempt runs
  it("failed-retry due: picked up and processed", async () => {
    const retryRow = makeDeliveryRow({
      id: "del_tick_retry",
      status: "failed",
      attemptCount: 2,
      nextRetryAt: new Date("2026-06-01T11:00:00Z"), // before asOf
    });
    const db = makeDb({
      dueIds: ["del_tick_retry"],
      deliveryRow: retryRow,
    });
    const port = makeInMemoryEgressPort(async () => ({ ok: true, httpStatus: 200, durationMs: 5 }));

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
  });

  // 7. One failed-retry not yet due (next_retry_at > asOf) — not picked up (SQL filters it out)
  it("failed-retry not yet due: not picked up (processed=0)", async () => {
    // The SQL filter excludes rows where next_retry_at > asOf.
    // Simulate by returning empty dueIds (SQL would not include it).
    const db = makeDb({ dueIds: [] });
    const port = makeInMemoryEgressPort(async () => ({ ok: true, httpStatus: 200, durationMs: 5 }));

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.processed).toBe(0);
  });

  // 8. attempt_count >= MAX_ATTEMPTS — not picked up (terminal, SQL filters it out)
  it("attempt_count >= MAX_ATTEMPTS: not picked up (processed=0)", async () => {
    // SQL: attempt_count < MAX_ATTEMPTS. Terminal rows never returned.
    const db = makeDb({ dueIds: [] });
    const port = makeInMemoryEgressPort(async () => ({ ok: true, httpStatus: 200, durationMs: 5 }));

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.processed).toBe(0);

    // Confirm that SQL includes the attempt_count < MAX_ATTEMPTS filter
    const texts = queryCallTexts(db);
    const sweep = texts.find(
      (t) => t.includes("from webhook_deliveries") && t.includes("for update skip locked")
    );
    expect(sweep).toBeTruthy();
    expect(sweep).toContain(`attempt_count < $3`);
  });

  // 9. Already-disabled endpoint — delivery service handles short-circuit → failed result
  it("disabled endpoint: outcome=failed (delivery service short-circuits), processed=1", async () => {
    const db = makeDb({
      dueIds: ["del_tick_001"],
      endpointRow: makeEndpointRow({
        isActive: false,
        disabledAt: new Date("2026-06-01T10:00:00Z"),
      }),
    });
    const sendSpy = vi.fn(async (): Promise<WebhookEgressResult> => ({
      ok: true,
      httpStatus: 200,
      durationMs: 1,
    }));
    const port = makeInMemoryEgressPort(sendSpy);

    const result = await runDueWebhookDeliveries(db, CTX, AS_OF, { port });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    // Port must NOT be called — endpoint_disabled short-circuit
    expect(sendSpy).not.toHaveBeenCalled();
  });

  // 10. asOf override applied to the SQL filter values
  it("asOf override passed as $2 in due deliveries query", async () => {
    const customAsOf = new Date("2026-03-15T09:00:00Z");
    const db = makeDb({ dueIds: [] });

    await runDueWebhookDeliveries(db, CTX, customAsOf);

    const calls = queryCallValues(db);
    const sweepCallIndex = (db.query as ReturnType<typeof vi.fn>).mock.calls.findIndex(
      (c: unknown[]) => {
        const sql = (c[0] as string).toLowerCase();
        return sql.includes("from webhook_deliveries") && sql.includes("for update skip locked");
      }
    );
    expect(sweepCallIndex).toBeGreaterThanOrEqual(0);
    const sweepValues = calls[sweepCallIndex] ?? [];
    expect(sweepValues[0]).toBe(CTX.organizationId);
    expect(sweepValues[1]).toEqual(customAsOf);
    expect(sweepValues[2]).toBe(MAX_ATTEMPTS);
  });
});
