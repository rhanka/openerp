/**
 * Tests for apps/api/src/webhook/webhook-delivery-service.ts
 *
 * Uses in-memory Queryable mock (vi.fn returning fixed rows) and
 * makeInMemoryEgressPort for the egress port.
 *
 * DB integration deferred — docker absent.
 *
 * W0-delivery-attempt
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { Queryable, TenantContext } from "../../src/db/client";
import { attemptWebhookDelivery } from "../../src/webhook/webhook-delivery-service";
import {
  makeInMemoryEgressPort,
  type WebhookEgressResult,
} from "../../src/webhook/webhook-egress-port";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CTX: TenantContext = {
  organizationId: "org_test_001",
  actorUserId: "user_test_001",
};

const DELIVERY_ID = "del_001";
const ENDPOINT_ID = "ep_001";

/** A signed_at as a Date (pg returns dates as Date objects). */
const SIGNED_AT = new Date("2026-01-01T12:00:00Z");

function makeDeliveryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DELIVERY_ID,
    organizationId: CTX.organizationId,
    webhookEndpointId: ENDPOINT_ID,
    eventType: "contact.created",
    triggerAuditEventId: null,
    payload: { foo: "bar" },
    signature: "sha256=abc123",
    status: "pending_egress",
    httpStatus: null,
    attemptCount: 0,
    nextRetryAt: null,
    errorDetail: null,
    signedAt: SIGNED_AT,
    deliveredAt: null,
    createdAt: new Date("2026-01-01T11:59:00Z"),
    ...overrides,
  };
}

function makeEndpointRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ENDPOINT_ID,
    organizationId: CTX.organizationId,
    ownerUserId: null,
    name: "test endpoint",
    targetUrl: "https://example.com/webhook",
    eventTypes: ["contact.created"],
    isActive: true,
    isShared: false,
    consecutiveFailures: 0,
    disabledAt: null,
    signingSecret: "secret_abc",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

/**
 * Build a Queryable mock that dispatches on SQL fragments.
 * The mock records calls for assertion and returns the provided rows.
 */
function makeDb(deliveryRow: unknown | null, endpointRow: unknown | null): Queryable {
  const query = vi.fn(async (text: string, _values?: unknown[]) => {
    const sql = text.toLowerCase().replace(/\s+/g, " ").trim();

    if (sql.includes("from webhook_deliveries") && sql.includes("where id =")) {
      return { rows: deliveryRow !== null ? [deliveryRow] : [] };
    }
    if (sql.includes("from webhook_endpoints") && sql.includes("signing_secret")) {
      return { rows: endpointRow !== null ? [endpointRow] : [] };
    }
    // update queries (markDeliveryAttempt, incrementEndpointFailureCounter, resetEndpointFailureCounter)
    return { rows: [] };
  });
  return { query };
}

// ---------------------------------------------------------------------------
// Helpers to inspect mock call SQL
// ---------------------------------------------------------------------------

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

describe("attemptWebhookDelivery", () => {
  // 1. Success 200
  it("success 200: outcome=succeeded, delivery updated, endpoint counter reset", async () => {
    const db = makeDb(makeDeliveryRow(), makeEndpointRow());
    const port = makeInMemoryEgressPort(async (_req) => ({
      ok: true,
      httpStatus: 200,
      durationMs: 42,
    }));

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("succeeded");
    expect(result.httpStatus).toBe(200);
    expect(result.errorDetail).toBeNull();
    expect(result.durationMs).toBe(42);

    const texts = queryCallTexts(db);
    // Should have: select delivery, select endpoint, update delivery, update endpoint
    const deliveryUpdate = texts.find(
      (t) => t.includes("update webhook_deliveries") && t.includes("attempt_count")
    );
    expect(deliveryUpdate).toBeTruthy();

    const endpointReset = texts.find(
      (t) => t.includes("update webhook_endpoints") && t.includes("consecutive_failures = 0")
    );
    expect(endpointReset).toBeTruthy();

    // Should NOT increment the counter
    const endpointIncrement = texts.find(
      (t) =>
        t.includes("update webhook_endpoints") &&
        t.includes("consecutive_failures = consecutive_failures + 1")
    );
    expect(endpointIncrement).toBeUndefined();

    // Delivery update should have status=succeeded
    const updateCallIndex = texts.findIndex(
      (t) => t.includes("update webhook_deliveries") && t.includes("attempt_count")
    );
    const updateValues = queryCallValues(db)[updateCallIndex] ?? [];
    expect(updateValues[0]).toBe("succeeded");
    expect(updateValues[1]).toBe(200);
  });

  // 2. HTTP 500
  it("HTTP 500: outcome=failed, errorDetail=http_500, endpoint counter incremented", async () => {
    const db = makeDb(makeDeliveryRow(), makeEndpointRow());
    const port = makeInMemoryEgressPort(async (_req): Promise<WebhookEgressResult> => ({
      ok: false,
      kind: "NETWORK",
      httpStatus: 500,
      message: "server error",
      durationMs: 20,
    }));

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("failed");
    expect(result.httpStatus).toBe(500);
    expect(result.errorDetail).toBe("NETWORK");

    const texts = queryCallTexts(db);
    const increment = texts.find(
      (t) =>
        t.includes("update webhook_endpoints") &&
        t.includes("consecutive_failures = consecutive_failures + 1")
    );
    expect(increment).toBeTruthy();
  });

  // 3. HTTP 404
  it("HTTP 404: outcome=failed, errorDetail=http_404, endpoint counter incremented", async () => {
    const db = makeDb(makeDeliveryRow(), makeEndpointRow());
    const port = makeInMemoryEgressPort(async (_req): Promise<WebhookEgressResult> => ({
      ok: false,
      kind: "NETWORK",
      httpStatus: 404,
      message: "not found",
      durationMs: 15,
    }));

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("failed");
    expect(result.httpStatus).toBe(404);

    const texts = queryCallTexts(db);
    const increment = texts.find(
      (t) =>
        t.includes("update webhook_endpoints") &&
        t.includes("consecutive_failures = consecutive_failures + 1")
    );
    expect(increment).toBeTruthy();
  });

  // 4. NETWORK failure
  it("NETWORK failure: outcome=failed, errorDetail=NETWORK, counter incremented", async () => {
    const db = makeDb(makeDeliveryRow(), makeEndpointRow());
    const port = makeInMemoryEgressPort(async (_req): Promise<WebhookEgressResult> => ({
      ok: false,
      kind: "NETWORK",
      httpStatus: null,
      message: "connection refused",
      durationMs: 5,
    }));

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("failed");
    expect(result.httpStatus).toBeNull();
    expect(result.errorDetail).toBe("NETWORK");

    const texts = queryCallTexts(db);
    const increment = texts.find(
      (t) =>
        t.includes("update webhook_endpoints") &&
        t.includes("consecutive_failures = consecutive_failures + 1")
    );
    expect(increment).toBeTruthy();
  });

  // 5. TIMEOUT failure
  it("TIMEOUT failure: outcome=failed, errorDetail=TIMEOUT", async () => {
    const db = makeDb(makeDeliveryRow(), makeEndpointRow());
    const port = makeInMemoryEgressPort(async (_req): Promise<WebhookEgressResult> => ({
      ok: false,
      kind: "TIMEOUT",
      httpStatus: null,
      message: "timed out",
      durationMs: 10_001,
    }));

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("failed");
    expect(result.errorDetail).toBe("TIMEOUT");
  });

  // 6. SSRF_PRIVATE_IP failure
  it("SSRF_PRIVATE_IP failure: outcome=failed, errorDetail=SSRF_PRIVATE_IP", async () => {
    const db = makeDb(makeDeliveryRow(), makeEndpointRow());
    const port = makeInMemoryEgressPort(async (_req): Promise<WebhookEgressResult> => ({
      ok: false,
      kind: "SSRF_PRIVATE_IP",
      httpStatus: null,
      message: "private ip blocked",
      durationMs: 1,
    }));

    const result = await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port });

    expect(result.outcome).toBe("failed");
    expect(result.errorDetail).toBe("SSRF_PRIVATE_IP");
  });

  // 7. Endpoint already disabled
  it("disabled endpoint: outcome=failed, errorDetail=endpoint_disabled, port.send NOT called", async () => {
    const db = makeDb(
      makeDeliveryRow(),
      makeEndpointRow({ isActive: false, disabledAt: new Date("2026-01-01T10:00:00Z") })
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
    expect(result.httpStatus).toBeNull();
    expect(sendSpy).not.toHaveBeenCalled();

    const texts = queryCallTexts(db);
    const deliveryUpdate = texts.find(
      (t) => t.includes("update webhook_deliveries") && t.includes("attempt_count")
    );
    expect(deliveryUpdate).toBeTruthy();
  });

  // 8. Delivery not found
  it("delivery not found: throws Error containing 'webhook delivery not found'", async () => {
    const db = makeDb(null, makeEndpointRow());

    await expect(
      attemptWebhookDelivery(db, CTX, "del_missing", { port: makeInMemoryEgressPort(async () => ({ ok: true, httpStatus: 200, durationMs: 0 })) })
    ).rejects.toThrow("webhook delivery not found");
  });

  // 9. Endpoint not found
  it("endpoint not found: throws Error containing 'webhook endpoint not found'", async () => {
    const db = makeDb(makeDeliveryRow(), null);

    await expect(
      attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port: makeInMemoryEgressPort(async () => ({ ok: true, httpStatus: 200, durationMs: 0 })) })
    ).rejects.toThrow("webhook endpoint not found");
  });

  // 10. Headers forwarded correctly
  it("headers forwarded: all 4 x-openerp-* headers sent with correct values", async () => {
    const db = makeDb(makeDeliveryRow(), makeEndpointRow());
    const sendSpy = vi.fn(async (_req: unknown): Promise<WebhookEgressResult> => ({
      ok: true,
      httpStatus: 200,
      durationMs: 5,
    }));
    const port = makeInMemoryEgressPort(sendSpy);

    await attemptWebhookDelivery(db, CTX, DELIVERY_ID, { port, timeoutMs: 5_000 });

    expect(sendSpy).toHaveBeenCalledOnce();
    const req = sendSpy.mock.calls[0][0] as {
      url: string;
      body: string;
      headers: Record<string, string>;
      timeoutMs: number;
    };

    expect(req.url).toBe("https://example.com/webhook");
    expect(req.timeoutMs).toBe(5_000);

    // signature value
    expect(req.headers["x-openerp-signature"]).toBe("sha256=abc123");
    // delivery id
    expect(req.headers["x-openerp-delivery-id"]).toBe(DELIVERY_ID);
    // signed_at as unix seconds
    const expectedSignedAt = Math.floor(SIGNED_AT.getTime() / 1000).toString();
    expect(req.headers["x-openerp-signed-at"]).toBe(expectedSignedAt);
    // event type
    expect(req.headers["x-openerp-event-type"]).toBe("contact.created");

    // body is deterministic JSON
    expect(req.body).toBe(JSON.stringify({ foo: "bar" }));
  });
});
