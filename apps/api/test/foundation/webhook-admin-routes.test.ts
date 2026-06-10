/**
 * Tests for apps/api/src/http/handlers/webhook-admin.ts
 *
 * POST /webhook/_admin/tick
 *
 * W0-worker-tick
 */
import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import {
  makeInMemoryEgressPort,
  type WebhookEgressResult,
} from "../../src/webhook/webhook-egress-port";

// ---------------------------------------------------------------------------
// Minimal Queryable — returns empty rows for everything (no due deliveries).
// ---------------------------------------------------------------------------

function makeEmptyDb(): Queryable {
  return {
    async query<T = unknown>(): Promise<{ rows: T[] }> {
      return { rows: [] };
    },
  };
}

const HEADERS = {
  "content-type": "application/json",
  "x-organization-id": "org_admin_001",
  "x-user-identity-id": "user_admin_001",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /webhook/_admin/tick", () => {
  // 1. Basic tick returns 200 with result JSON shape
  it("returns 200 with RunDueWebhookDeliveriesResult shape", async () => {
    const db = makeEmptyDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/_admin/tick", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as {
      processed: number;
      succeeded: number;
      failed: number;
      skipped: number;
      asOf: string;
    };
    expect(typeof data.processed).toBe("number");
    expect(typeof data.succeeded).toBe("number");
    expect(typeof data.failed).toBe("number");
    expect(typeof data.skipped).toBe("number");
    expect(typeof data.asOf).toBe("string");
  });

  // 2. Body with asOfDate is parsed and passed to runDueWebhookDeliveries
  it("asOfDate in body → asOf reflected in response", async () => {
    const asOfDate = "2026-01-15T10:00:00.000Z";
    const db = makeEmptyDb();
    const port = makeInMemoryEgressPort(
      async (): Promise<WebhookEgressResult> => ({ ok: true, httpStatus: 200, durationMs: 1 })
    );
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/_admin/tick", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ asOfDate }),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { asOf: string };
    // asOf should match the provided date
    expect(new Date(data.asOf).toISOString()).toBe(asOfDate);

    void port; // port not wired in this test — just verifying asOf passthrough via asOf field
  });

  // 3. Invalid / absent JSON body still runs (body optional)
  it("invalid JSON body: still returns 200 (body optional)", async () => {
    const db = makeEmptyDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/_admin/tick", {
      method: "POST",
      headers: {
        // no content-type — will cause req.json() to throw
        "x-organization-id": "org_admin_001",
        "x-user-identity-id": "user_admin_001",
      },
      body: "not-valid-json",
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { processed: number };
    expect(typeof data.processed).toBe("number");
  });

  // 4. Missing tenant headers → 401
  it("missing tenant headers: returns 401", async () => {
    const db = makeEmptyDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/_admin/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
  });

  // 5. Port option plumbed through — port.send called when there is a due delivery
  it("port option: send called for due deliveries", async () => {
    const sendSpy = vi.fn(async (): Promise<WebhookEgressResult> => ({
      ok: true,
      httpStatus: 200,
      durationMs: 5,
    }));
    const port = makeInMemoryEgressPort(sendSpy);

    // DB that returns one due delivery + matching endpoint
    const deliveryRow = {
      id: "del_admin_001",
      organizationId: "org_admin_001",
      webhookEndpointId: "ep_admin_001",
      eventType: "contact.created",
      triggerAuditEventId: null,
      payload: { x: 1 },
      signature: "sha256=sig",
      status: "pending_egress",
      httpStatus: null,
      attemptCount: 0,
      nextRetryAt: null,
      errorDetail: null,
      signedAt: new Date("2026-06-01T11:59:00Z"),
      deliveredAt: null,
      createdAt: new Date("2026-06-01T11:58:00Z"),
    };
    const endpointRow = {
      id: "ep_admin_001",
      organizationId: "org_admin_001",
      ownerUserId: null,
      name: "admin endpoint",
      targetUrl: "https://example.com/admin-tick",
      eventTypes: ["contact.created"],
      isActive: true,
      isShared: false,
      consecutiveFailures: 0,
      disabledAt: null,
      signingSecret: "secret_admin",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    };

    const db: Queryable = {
      async query<T = unknown>(text: string): Promise<{ rows: T[] }> {
        const sql = text.toLowerCase().replace(/\s+/g, " ").trim();
        if (sql.includes("from webhook_deliveries") && sql.includes("for update skip locked")) {
          return { rows: [{ id: "del_admin_001" }] as unknown as T[] };
        }
        if (sql.includes("from webhook_deliveries") && sql.includes("where id =")) {
          return { rows: [deliveryRow] as unknown as T[] };
        }
        if (sql.includes("select attempt_count") || (sql.includes("from webhook_deliveries") && sql.includes("attempt_count"))) {
          return { rows: [{ attempt_count: 1 }] as unknown as T[] };
        }
        if (sql.includes("from webhook_endpoints") && sql.includes("signing_secret")) {
          return { rows: [endpointRow] as unknown as T[] };
        }
        if (sql.includes("from webhook_endpoints")) {
          return { rows: [endpointRow] as unknown as T[] };
        }
        return { rows: [] };
      },
    };

    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    // We need to pass the port — but buildApp doesn't accept it directly.
    // The mountWebhookAdminRoutes in app.ts uses the no-op port by default.
    // Test the port option via mountWebhookAdminRoutes directly.
    const { Hono } = await import("hono");
    const { mountWebhookAdminRoutes } = await import("../../src/http/handlers/webhook-admin");

    type AppBindings = { Variables: { db: Queryable; tenant: { organizationId: string; actorUserId: string } } };
    const subApp = new Hono<AppBindings>();
    subApp.use("*", async (c, next) => {
      c.set("db", db);
      c.set("tenant", { organizationId: "org_admin_001", actorUserId: "user_admin_001" });
      await next();
    });
    mountWebhookAdminRoutes(subApp, { port });

    const res = await subApp.request("/webhook/_admin/tick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { processed: number; succeeded: number };
    expect(data.processed).toBe(1);
    expect(data.succeeded).toBe(1);
    expect(sendSpy).toHaveBeenCalledOnce();
  });
});
