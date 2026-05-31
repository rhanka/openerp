import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { WebhookEndpoint, WebhookDelivery } from "@sentropic/openerp-domain/webhook";
import type { Queryable } from "../../src/db/client";
import {
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookEndpointById,
  listWebhookEndpoints,
  rotateWebhookEndpointSecretService,
  recordTestDelivery,
  WebhookEndpointNotFoundError,
  InvalidWebhookUrlError,
  UnknownWebhookEventTypeError,
  WebhookForbiddenError
} from "../../src/webhook/webhook-service";

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------

interface AuditRow {
  organizationId: string;
  action: string;
  resourceId: string;
  afterSummary: unknown;
  beforeSummary: unknown;
}

interface StoredEndpoint extends WebhookEndpoint {
  signingSecret: string;
  _deleted?: boolean;
}

interface StoredDelivery extends WebhookDelivery {
  _endpointId?: string;
}

function makeFakeDb() {
  const endpoints: StoredEndpoint[] = [];
  const deliveries: StoredDelivery[] = [];
  const audits: AuditRow[] = [];
  let idCounter = 0;

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // webhook_endpoints insert
      if (t.includes("insert into webhook_endpoints")) {
        const [orgId, ownerUserId, name, targetUrl, signingSecret, eventTypesRaw, isActive, isShared] =
          values as [string, string | null, string, string, string, string, boolean, boolean];
        const ep: StoredEndpoint = {
          id: `wh_ep_${++idCounter}`,
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

      // webhook_endpoints findById (public — no secret)
      if (t.includes("from webhook_endpoints") && t.includes("where id = $1") && !t.includes("signing_secret")) {
        const [id, orgId] = values as [string, string];
        const found = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!found) return { rows: [] };
        // Return without signingSecret
        const { signingSecret: _, ...pub } = found;
        void _;
        return { rows: [pub as unknown as T] };
      }

      // webhook_endpoints findByIdWithSecret
      if (t.includes("from webhook_endpoints") && t.includes("where id = $1") && t.includes("signing_secret")) {
        const [id, orgId] = values as [string, string];
        const found = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!found) return { rows: [] };
        return { rows: [found as unknown as T] };
      }

      // webhook_endpoints list
      if (t.includes("from webhook_endpoints") && t.includes("deleted_at is null") && !t.includes("where id = $1") && !t.includes("event_types @>")) {
        const [orgId] = values as [string];
        const rows = endpoints
          .filter((e) => e.organizationId === orgId && !e._deleted)
          .map(({ signingSecret: _, ...pub }) => { void _; return pub; });
        return { rows: rows as unknown as T[] };
      }

      // webhook_endpoints listActiveBySubscribedEvent
      if (t.includes("event_types @>")) {
        const [orgId, eventTypeJson] = values as [string, string];
        const eventType = (JSON.parse(eventTypeJson) as string[])[0]!;
        const rows = endpoints
          .filter((e) => e.organizationId === orgId && !e._deleted && e.isActive && e.eventTypes.includes(eventType))
          .map(({ signingSecret: _, ...pub }) => { void _; return pub; });
        return { rows: rows as unknown as T[] };
      }

      // webhook_endpoints update (general — not soft-delete, not secret rotation)
      if (t.includes("update webhook_endpoints") && t.includes("updated_at = now()") && !t.includes("signing_secret") && !t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const ep = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!ep) return { rows: [] };
        // Apply patch fields (simplified)
        for (let i = 2; i < values.length; i++) {
          const v = values[i];
          if (typeof v === "string" && (v.startsWith("https://") || (!v.startsWith("{") && !v.startsWith("[")))) {
            if (t.includes(`$${i + 1}`) && t.includes("name =")) ep.name = v as string;
            if (t.includes(`$${i + 1}`) && t.includes("target_url =")) ep.targetUrl = v as string;
          }
          if (typeof v === "boolean") {
            if (t.includes("is_active")) ep.isActive = v as boolean;
            if (t.includes("is_shared")) ep.isShared = v as boolean;
          }
          if (typeof v === "string" && v.startsWith("[")) {
            ep.eventTypes = JSON.parse(v) as string[];
          }
        }
        const { signingSecret: _, ...pub } = ep;
        void _;
        return { rows: [pub as unknown as T] };
      }

      // webhook_endpoints rotate secret
      if (t.includes("update webhook_endpoints") && t.includes("signing_secret")) {
        const [id, orgId, newSecret] = values as [string, string, string];
        const ep = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!ep) return { rows: [] };
        ep.signingSecret = newSecret;
        return { rows: [{ id: ep.id } as unknown as T] };
      }

      // webhook_endpoints soft-delete
      if (t.includes("update webhook_endpoints") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const ep = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        if (!ep) return { rows: [] };
        ep._deleted = true;
        return { rows: [{ id: ep.id } as unknown as T] };
      }

      // webhook_deliveries insert with ON CONFLICT DO NOTHING
      if (t.includes("insert into webhook_deliveries")) {
        const [orgId, webhookEndpointId, eventType, triggerAuditEventId, payloadRaw, signature, signedAt] =
          values as [string, string, string, string | null, string, string, string];

        // Idempotency check
        if (triggerAuditEventId) {
          const existing = deliveries.find(
            (d) => d.webhookEndpointId === webhookEndpointId && d.triggerAuditEventId === triggerAuditEventId
          );
          if (existing) {
            // Simulate ON CONFLICT DO NOTHING — return empty rows (then caller fetches existing)
            return { rows: [] };
          }
        }

        const delivery: StoredDelivery = {
          id: `wh_del_${++idCounter}`,
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

      // webhook_deliveries findById (for the fallback after ON CONFLICT)
      if (t.includes("from webhook_deliveries") && t.includes("webhook_endpoint_id = $1")) {
        const [endpointId, auditEventId] = values as [string, string];
        const found = deliveries.find(
          (d) => d.webhookEndpointId === endpointId && d.triggerAuditEventId === auditEventId
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // webhook_deliveries findById by id
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

      // workflow_definitions/runs (not relevant here)
      if (t.includes("workflow_definitions") || t.includes("workflow_runs")) {
        return { rows: [] };
      }

      // audit_events insert
      if (t.includes("insert into audit_events")) {
        const [orgId, , , action, , resourceId, beforeSummary, afterSummary] =
          values as [string, string, string, string, string, string, unknown, unknown];
        const row = { id: `audit_${audits.length + 1}` };
        audits.push({ organizationId: orgId, action, resourceId, beforeSummary, afterSummary });
        return { rows: [row as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, endpoints, deliveries, audits };
}

const context = { organizationId: "org_wh_1", actorUserId: "user_wh_a" };
const contextB = { organizationId: "org_wh_1", actorUserId: "user_wh_b" };

describe("WebhookEndpoint service (DS 5.5)", () => {
  it("createWebhookEndpoint returns a CreateWebhookEndpointResult with signingSecret once", async () => {
    const { db, audits } = makeFakeDb();
    const result = await createWebhookEndpoint(db, context, {
      name: "My webhook",
      targetUrl: "https://example.com/hook",
      eventTypes: ["crm.opportunity.won"],
      isActive: true,
      isShared: false
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("My webhook");
    expect(result.targetUrl).toBe("https://example.com/hook");
    expect(result.eventTypes).toEqual(["crm.opportunity.won"]);
    expect(typeof result.signingSecret).toBe("string");
    expect(result.signingSecret.length).toBe(64); // 32 bytes hex

    // signingSecret must not appear in afterSummary
    const audit = audits.find((a) => a.action === "webhook.webhook_endpoint.created");
    expect(audit).toBeDefined();
    const summary = audit!.afterSummary as Record<string, unknown>;
    expect(summary).not.toHaveProperty("signingSecret");
    expect(summary).not.toHaveProperty("signing_secret");
  });

  it("createWebhookEndpoint rejects non-https targetUrl", async () => {
    const { db } = makeFakeDb();
    await expect(
      createWebhookEndpoint(db, context, {
        name: "Bad URL",
        targetUrl: "http://example.com/hook",
        eventTypes: ["crm.opportunity.won"]
      })
    ).rejects.toBeInstanceOf(InvalidWebhookUrlError);
  });

  it("createWebhookEndpoint rejects unknown eventType", async () => {
    const { db } = makeFakeDb();
    await expect(
      createWebhookEndpoint(db, context, {
        name: "Bad event",
        targetUrl: "https://example.com/hook",
        eventTypes: ["unknown.bad.event"]
      })
    ).rejects.toBeInstanceOf(UnknownWebhookEventTypeError);
  });

  it("getWebhookEndpointById returns the endpoint without signingSecret", async () => {
    const { db } = makeFakeDb();
    const created = await createWebhookEndpoint(db, context, {
      name: "Readable",
      targetUrl: "https://example.com/hook",
      eventTypes: ["crm.lead.converted"]
    });

    const found = await getWebhookEndpointById(db, context, created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect((found as unknown as Record<string, unknown>).signingSecret).toBeUndefined();
    expect((found as unknown as Record<string, unknown>).signing_secret).toBeUndefined();
  });

  it("listWebhookEndpoints returns endpoints without signingSecret", async () => {
    const { db } = makeFakeDb();
    await createWebhookEndpoint(db, context, {
      name: "Listed",
      targetUrl: "https://example.com/hook",
      eventTypes: ["billing.invoice.issued"]
    });

    const list = await listWebhookEndpoints(db, context);
    expect(list.length).toBe(1);
    expect((list[0] as unknown as Record<string, unknown>).signingSecret).toBeUndefined();
  });

  it("updateWebhookEndpoint updates and emits audit with explicit fields (no secret)", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createWebhookEndpoint(db, context, {
      name: "Before",
      targetUrl: "https://example.com/hook",
      eventTypes: ["crm.opportunity.won"]
    });

    const updated = await updateWebhookEndpoint(db, context, created.id, {
      name: "After",
      isActive: false
    });
    expect(updated.name).toBe("After");

    const audit = audits.find((a) => a.action === "webhook.webhook_endpoint.updated");
    expect(audit).toBeDefined();
    const after = audit!.afterSummary as Record<string, unknown>;
    expect(after).not.toHaveProperty("signingSecret");
    expect(after).not.toHaveProperty("signing_secret");
  });

  it("updateWebhookEndpoint throws WebhookEndpointNotFoundError for missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateWebhookEndpoint(db, context, "no-such-id", { name: "X" })
    ).rejects.toBeInstanceOf(WebhookEndpointNotFoundError);
  });

  it("ownership enforcement: shared endpoint non-owner update throws WebhookForbiddenError", async () => {
    const { db } = makeFakeDb();
    const created = await createWebhookEndpoint(db, context, {
      name: "Shared",
      targetUrl: "https://example.com/hook",
      eventTypes: ["crm.opportunity.won"],
      isShared: true,
      ownerUserId: context.actorUserId
    });
    await expect(
      updateWebhookEndpoint(db, contextB, created.id, { name: "Hacked" })
    ).rejects.toBeInstanceOf(WebhookForbiddenError);
  });

  it("ownership enforcement: non-owner cannot delete a shared endpoint", async () => {
    const { db } = makeFakeDb();
    const created = await createWebhookEndpoint(db, context, {
      name: "Shared for delete",
      targetUrl: "https://example.com/hook",
      eventTypes: ["billing.invoice.issued"],
      isShared: true,
      ownerUserId: context.actorUserId
    });
    await expect(
      deleteWebhookEndpoint(db, contextB, created.id)
    ).rejects.toBeInstanceOf(WebhookForbiddenError);
  });

  it("deleteWebhookEndpoint soft-deletes and emits audit; endpoint not in list after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createWebhookEndpoint(db, context, {
      name: "ToDelete",
      targetUrl: "https://example.com/hook",
      eventTypes: ["project.task.completed"]
    });

    await deleteWebhookEndpoint(db, context, created.id);

    const found = await getWebhookEndpointById(db, context, created.id);
    expect(found).toBeNull();

    const list = await listWebhookEndpoints(db, context);
    expect(list.find((e) => e.id === created.id)).toBeUndefined();

    expect(audits.some((a) => a.action === "webhook.webhook_endpoint.deleted")).toBe(true);
  });

  it("rotateWebhookEndpointSecretService returns a new 64-char hex secret; afterSummary has no secret", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createWebhookEndpoint(db, context, {
      name: "Rotate me",
      targetUrl: "https://example.com/hook",
      eventTypes: ["crm.opportunity.won"]
    });
    const oldSecret = created.signingSecret;

    const newSecret = await rotateWebhookEndpointSecretService(db, context, created.id);
    expect(typeof newSecret).toBe("string");
    expect(newSecret.length).toBe(64);
    expect(newSecret).not.toBe(oldSecret);

    const audit = audits.find((a) => a.action === "webhook.webhook_endpoint.updated");
    expect(audit).toBeDefined();
    const summary = audit!.afterSummary as Record<string, unknown>;
    expect(summary).not.toHaveProperty("signingSecret");
    expect(summary).not.toHaveProperty("signing_secret");
  });

  it("recordTestDelivery returns a pending_egress delivery with a non-empty signature", async () => {
    const { db, deliveries } = makeFakeDb();
    const created = await createWebhookEndpoint(db, context, {
      name: "Test delivery",
      targetUrl: "https://example.com/hook",
      eventTypes: ["crm.opportunity.won"]
    });

    const delivery = await recordTestDelivery(db, context, created.id);
    expect(delivery.status).toBe("pending_egress");
    expect(delivery.signature).toBeDefined();
    expect(delivery.signature.startsWith("v1=")).toBe(true);
    expect(delivery.httpStatus).toBeNull();
    expect(delivery.deliveredAt).toBeNull();

    // No egress (no http_status, no delivered_at)
    const stored = deliveries.find((d) => d.id === delivery.id);
    expect(stored).toBeDefined();
    expect(stored!.httpStatus).toBeNull();
    expect(stored!.deliveredAt).toBeNull();
  });

  it("recordTestDelivery throws WebhookEndpointNotFoundError for missing endpoint", async () => {
    const { db } = makeFakeDb();
    await expect(
      recordTestDelivery(db, context, "no-such-id")
    ).rejects.toBeInstanceOf(WebhookEndpointNotFoundError);
  });
});

describe("signPayload (DS 5.5 signer)", () => {
  it("signature format is v1=<hex>", async () => {
    const { signPayload } = await import("../../src/webhook/webhook-signer");
    const sig = signPayload("secret", "delivery-id", 1234567890, '{"foo":"bar"}');
    expect(sig.startsWith("v1=")).toBe(true);
    expect(sig.length).toBeGreaterThan(65); // "v1=" + 64 hex chars
  });

  it("can be verified externally with HMAC-SHA256", async () => {
    const { signPayload } = await import("../../src/webhook/webhook-signer");
    const secret = "abc123";
    const deliveryId = "del-001";
    const signedAtUnix = 1716134400;
    const rawBody = '{"eventType":"crm.opportunity.won"}';

    const sig = signPayload(secret, deliveryId, signedAtUnix, rawBody);
    const message = `${deliveryId}.${signedAtUnix}.${rawBody}`;
    const expected = "v1=" + createHmac("sha256", secret).update(message).digest("hex");
    expect(sig).toBe(expected);
  });
});
