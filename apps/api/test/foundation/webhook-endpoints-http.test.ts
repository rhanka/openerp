import { describe, expect, it } from "vitest";

import type { WebhookEndpoint, WebhookDelivery } from "@sentropic/openerp-domain/webhook";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// ---------------------------------------------------------------------------
// Fake DB for HTTP handler tests
// ---------------------------------------------------------------------------

interface StoredEndpoint extends WebhookEndpoint {
  signingSecret: string;
  _deleted?: boolean;
}

interface StoredDelivery extends WebhookDelivery {}

function makeFakeDb() {
  const endpoints: StoredEndpoint[] = [];
  const deliveries: StoredDelivery[] = [];
  const audits: unknown[] = [];
  let idCounter = 0;

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // webhook_endpoints insert
      if (t.includes("insert into webhook_endpoints")) {
        const [orgId, ownerUserId, name, targetUrl, signingSecret, eventTypesRaw, isActive, isShared] =
          values as [string, string | null, string, string, string, string, boolean, boolean];
        const ep: StoredEndpoint = {
          id: `wh_${++idCounter}`,
          organizationId: orgId,
          ownerUserId: ownerUserId ?? null,
          name,
          targetUrl,
          signingSecret,
          eventTypes: JSON.parse(eventTypesRaw) as string[],
          isActive,
          isShared,
          consecutiveFailures: 0,
          disabledAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        endpoints.push(ep);
        return { rows: [ep as unknown as T] };
      }

      // findByIdWithSecret
      if (t.includes("from webhook_endpoints") && t.includes("where id = $1") && t.includes("signing_secret")) {
        const [id, orgId] = values as [string, string];
        const found = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // findById (public — no secret)
      if (t.includes("from webhook_endpoints") && t.includes("where id = $1") && !t.includes("signing_secret")) {
        const [id, orgId] = values as [string, string];
        const found = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!found) return { rows: [] };
        const { signingSecret: _, ...pub } = found;
        void _;
        return { rows: [pub as unknown as T] };
      }

      // list
      if (t.includes("from webhook_endpoints") && t.includes("deleted_at is null") && !t.includes("event_types @>")) {
        const [orgId] = values as [string];
        const rows = endpoints
          .filter((e) => e.organizationId === orgId && !e._deleted)
          .map(({ signingSecret: _, ...pub }) => { void _; return pub; });
        return { rows: rows as unknown as T[] };
      }

      // listActiveBySubscribedEvent
      if (t.includes("event_types @>")) {
        return { rows: [] };
      }

      // update (general — not soft-delete, not secret rotation)
      if (t.includes("update webhook_endpoints") && t.includes("updated_at = now()") && !t.includes("signing_secret") && !t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const ep = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!ep) return { rows: [] };
        if (typeof values[2] === "string" && !values[2].startsWith("{")) {
          ep.name = values[2] as string;
        }
        const { signingSecret: _, ...pub } = ep;
        void _;
        return { rows: [pub as unknown as T] };
      }

      // rotate secret
      if (t.includes("update webhook_endpoints") && t.includes("signing_secret")) {
        const [id, orgId, newSecret] = values as [string, string, string];
        const ep = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!ep) return { rows: [] };
        ep.signingSecret = newSecret;
        return { rows: [{ id: ep.id } as unknown as T] };
      }

      // soft-delete
      if (t.includes("update webhook_endpoints") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const ep = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!ep) return { rows: [] };
        ep._deleted = true;
        return { rows: [{ id: ep.id } as unknown as T] };
      }

      // webhook_deliveries insert
      if (t.includes("insert into webhook_deliveries")) {
        const [orgId, webhookEndpointId, eventType, triggerAuditEventId, payloadRaw, signature, signedAt] =
          values as [string, string, string, string | null, string, string, string];

        if (triggerAuditEventId) {
          const existing = deliveries.find(
            (d) => d.webhookEndpointId === webhookEndpointId && d.triggerAuditEventId === triggerAuditEventId
          );
          if (existing) return { rows: [] };
        }

        const delivery: StoredDelivery = {
          id: `del_${++idCounter}`,
          organizationId: orgId,
          webhookEndpointId,
          eventType,
          triggerAuditEventId: triggerAuditEventId ?? null,
          payload: JSON.parse(payloadRaw) as Record<string, unknown>,
          signature,
          status: "pending_egress",
          httpStatus: null,
          attemptCount: 0,
          nextRetryAt: null,
          errorDetail: null,
          signedAt,
          deliveredAt: null,
          createdAt: new Date().toISOString()
        };
        deliveries.push(delivery);
        return { rows: [delivery as unknown as T] };
      }

      // webhook_deliveries findById
      if (t.includes("from webhook_deliveries") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = deliveries.find((d) => d.id === id && d.organizationId === orgId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // webhook_deliveries list by endpoint
      if (t.includes("from webhook_deliveries") && t.includes("webhook_endpoint_id = $2")) {
        const [orgId, endpointId] = values as [string, string];
        const rows = deliveries.filter((d) => d.organizationId === orgId && d.webhookEndpointId === endpointId);
        return { rows: rows as unknown as T[] };
      }

      // workflow_definitions/runs
      if (t.includes("workflow_definitions") || t.includes("workflow_runs")) {
        return { rows: [] };
      }

      // audit_events insert
      if (t.includes("insert into audit_events")) {
        const row = { id: `audit_${audits.length + 1}` };
        audits.push(row);
        return { rows: [row as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, endpoints, deliveries, audits };
}

const ORG = "org_wh_http";
const USER_A = "user_wh_http_a";
const USER_B = "user_wh_http_b";

const headersA = {
  "content-type": "application/json",
  "x-organization-id": ORG,
  "x-user-identity-id": USER_A
};

const headersB = {
  "content-type": "application/json",
  "x-organization-id": ORG,
  "x-user-identity-id": USER_B
};

describe("webhook HTTP endpoints (DS 5.5)", () => {
  it("returns 401 without tenant headers", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/webhook/endpoints");
    expect(res.status).toBe(401);
  });

  it("GET /webhook/event-types returns curated list", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/webhook/event-types", {
      headers: { "x-organization-id": ORG, "x-user-identity-id": USER_A }
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { items: Array<{ eventType: string }> };
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.some((e) => e.eventType === "crm.opportunity.won")).toBe(true);
  });

  it("POST /webhook/endpoints creates endpoint and returns 201 with signingSecret", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        name: "My hook",
        targetUrl: "https://example.com/hook",
        eventTypes: ["crm.opportunity.won"]
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json() as { id: string; signingSecret?: string };
    expect(data.id).toBeDefined();
    expect(typeof data.signingSecret).toBe("string");
    expect(data.signingSecret!.length).toBe(64);
  });

  it("POST /webhook/endpoints returns 400 for http:// URL", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        name: "Bad URL",
        targetUrl: "http://example.com/hook",
        eventTypes: ["crm.opportunity.won"]
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json() as { code: string };
    expect(data.code).toBe("INVALID_WEBHOOK_URL");
  });

  it("POST /webhook/endpoints returns 400 for unknown eventType", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        name: "Unknown event",
        targetUrl: "https://example.com/hook",
        eventTypes: ["unknown.fake.event"]
      })
    });

    expect(res.status).toBe(400);
    const data = await res.json() as { code: string };
    expect(data.code).toBe("UNKNOWN_EVENT_TYPE");
  });

  it("GET /webhook/endpoints/:id returns 200 WITHOUT signingSecret", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    // Create first
    const createRes = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ name: "Readable", targetUrl: "https://example.com/hook", eventTypes: ["crm.lead.converted"] })
    });
    const created = await createRes.json() as { id: string };

    const res = await app.request(`/webhook/endpoints/${created.id}`, {
      headers: { "x-organization-id": ORG, "x-user-identity-id": USER_A }
    });

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.id).toBe(created.id);
    // CRITICAL: no secret in GET response
    expect(data.signingSecret).toBeUndefined();
    expect(data.signing_secret).toBeUndefined();
  });

  it("GET /webhook/endpoints/:id returns 404 for missing endpoint", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/endpoints/no-such-id", {
      headers: { "x-organization-id": ORG, "x-user-identity-id": USER_A }
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /webhook/endpoints/:id returns 200 WITHOUT signingSecret", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const createRes = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ name: "Patchable", targetUrl: "https://example.com/hook", eventTypes: ["project.task.completed"] })
    });
    const created = await createRes.json() as { id: string };

    const res = await app.request(`/webhook/endpoints/${created.id}`, {
      method: "PATCH",
      headers: headersA,
      body: JSON.stringify({ name: "Updated name" })
    });

    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.signingSecret).toBeUndefined();
    expect(data.signing_secret).toBeUndefined();
  });

  it("DELETE /webhook/endpoints/:id returns 204 and removes from list", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const createRes = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ name: "ToDelete", targetUrl: "https://example.com/hook", eventTypes: ["billing.invoice.issued"] })
    });
    const created = await createRes.json() as { id: string };

    const delRes = await app.request(`/webhook/endpoints/${created.id}`, {
      method: "DELETE",
      headers: headersA
    });
    expect(delRes.status).toBe(204);

    const getRes = await app.request(`/webhook/endpoints/${created.id}`, {
      headers: { "x-organization-id": ORG, "x-user-identity-id": USER_A }
    });
    expect(getRes.status).toBe(404);
  });

  it("POST /webhook/endpoints/:id/rotate-secret returns 200 with new signingSecret", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const createRes = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ name: "Rotatable", targetUrl: "https://example.com/hook", eventTypes: ["crm.opportunity.won"] })
    });
    const created = await createRes.json() as { id: string; signingSecret: string };

    const rotateRes = await app.request(`/webhook/endpoints/${created.id}/rotate-secret`, {
      method: "POST",
      headers: headersA
    });
    expect(rotateRes.status).toBe(200);
    const rotated = await rotateRes.json() as { signingSecret: string };
    expect(typeof rotated.signingSecret).toBe("string");
    expect(rotated.signingSecret.length).toBe(64);
    expect(rotated.signingSecret).not.toBe(created.signingSecret);
  });

  it("POST /webhook/endpoints/:id/test returns 200 with pending_egress delivery", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const createRes = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({ name: "Testable", targetUrl: "https://example.com/hook", eventTypes: ["crm.opportunity.won"] })
    });
    const created = await createRes.json() as { id: string };

    const testRes = await app.request(`/webhook/endpoints/${created.id}/test`, {
      method: "POST",
      headers: headersA
    });
    expect(testRes.status).toBe(200);
    const delivery = await testRes.json() as WebhookDelivery;
    expect(delivery.status).toBe("pending_egress");
    expect(delivery.signature).toMatch(/^v1=/);
    expect(delivery.httpStatus).toBeNull();
    expect(delivery.deliveredAt).toBeNull();
  });

  it("PATCH /webhook/endpoints/:id returns 403 when non-owner modifies shared endpoint", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    // User A creates a shared endpoint
    const createRes = await app.request("/webhook/endpoints", {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        name: "Shared",
        targetUrl: "https://example.com/hook",
        eventTypes: ["crm.opportunity.won"],
        isShared: true
      })
    });
    const created = await createRes.json() as { id: string };

    // User B tries to PATCH
    const patchRes = await app.request(`/webhook/endpoints/${created.id}`, {
      method: "PATCH",
      headers: headersB,
      body: JSON.stringify({ name: "Hacked" })
    });
    expect(patchRes.status).toBe(403);
  });
});
