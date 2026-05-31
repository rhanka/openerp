import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { WebhookEndpoint, WebhookDelivery } from "@sentropic/openerp-domain/webhook";
import type { Queryable } from "../../src/db/client";
import { makeWebhookEvaluator } from "../../src/webhook/webhook-evaluator";
import { setWebhookEvaluator, recordAuditEvent } from "../../src/foundation/audit-emit";

// ---------------------------------------------------------------------------
// Fake DB for evaluator tests
// ---------------------------------------------------------------------------

interface StoredEndpoint extends WebhookEndpoint {
  signingSecret: string;
  _deleted?: boolean;
}

interface StoredDelivery extends WebhookDelivery {
  _rawPayload?: string;
}

function makeFakeDb(opts: {
  activeEndpoints?: Array<{ id: string; eventTypes: string[]; secret: string }>;
  throwOnDeliveryInsert?: boolean;
} = {}) {
  const endpoints: StoredEndpoint[] = (opts.activeEndpoints ?? []).map((e, i) => ({
    id: e.id,
    organizationId: "org_ev",
    ownerUserId: null,
    name: `Endpoint ${i}`,
    targetUrl: "https://example.com/hook",
    signingSecret: e.secret,
    eventTypes: e.eventTypes,
    isActive: true,
    isShared: false,
    consecutiveFailures: 0,
    disabledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  const deliveries: StoredDelivery[] = [];
  const audits: Array<{ action: string; id: string }> = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // listActiveBySubscribedEvent
      if (t.includes("event_types @>")) {
        const [orgId, eventTypeJson] = values as [string, string];
        const eventType = (JSON.parse(eventTypeJson) as string[])[0]!;
        const rows = endpoints
          .filter((e) => e.organizationId === orgId && !e._deleted && e.isActive && e.eventTypes.includes(eventType))
          .map(({ signingSecret: _, ...pub }) => { void _; return pub; });
        return { rows: rows as unknown as T[] };
      }

      // findByIdWithSecret
      if (t.includes("from webhook_endpoints") && t.includes("where id = $1") && t.includes("signing_secret")) {
        const [id, orgId] = values as [string, string];
        const found = endpoints.find((e) => e.id === id && e.organizationId === orgId && !e._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // webhook_deliveries insert with ON CONFLICT DO NOTHING
      if (t.includes("insert into webhook_deliveries")) {
        if (opts.throwOnDeliveryInsert) throw new Error("Simulated delivery insert failure");

        const [orgId, webhookEndpointId, eventType, triggerAuditEventId, payloadRaw, signature, signedAt] =
          values as [string, string, string, string | null, string, string, string];

        // Idempotency check
        if (triggerAuditEventId) {
          const existing = deliveries.find(
            (d) => d.webhookEndpointId === webhookEndpointId && d.triggerAuditEventId === triggerAuditEventId
          );
          if (existing) {
            // Simulate ON CONFLICT DO NOTHING
            return { rows: [] };
          }
        }

        const delivery: StoredDelivery = {
          id: `del_${deliveries.length + 1}`,
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
          createdAt: new Date().toISOString(),
          _rawPayload: payloadRaw
        };
        deliveries.push(delivery);
        return { rows: [delivery as unknown as T] };
      }

      // webhook_deliveries fetch existing (for idempotency return)
      if (t.includes("from webhook_deliveries") && t.includes("webhook_endpoint_id = $1")) {
        const [endpointId, auditEventId] = values as [string, string];
        const found = deliveries.find(
          (d) => d.webhookEndpointId === endpointId && d.triggerAuditEventId === auditEventId
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // audit_events insert
      if (t.includes("insert into audit_events")) {
        const row = { id: `audit_ev_${audits.length + 1}` };
        audits.push({ action: values[3] as string, id: row.id });
        return { rows: [row as unknown as T] };
      }

      // workflow_definitions/runs (not relevant here)
      if (t.includes("workflow_definitions") || t.includes("workflow_runs")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, endpoints, deliveries, audits };
}

const context = { organizationId: "org_ev", actorUserId: "user_ev_a" };

describe("webhook evaluator (DS 5.5)", () => {
  it("subscribed event → records exactly ONE pending_egress delivery with valid HMAC signature", async () => {
    const secret = "mysecret1234abcdef";
    const { db, deliveries } = makeFakeDb({
      activeEndpoints: [{ id: "ep_1", eventTypes: ["crm.opportunity.won"], secret }]
    });

    const evaluate = makeWebhookEvaluator();
    await evaluate(db, context, {
      auditEventId: "audit_ev_001",
      action: "crm.opportunity.won",
      resourceType: "opportunity",
      resourceId: "opp_1"
    });

    expect(deliveries.length).toBe(1);
    const delivery = deliveries[0]!;
    expect(delivery.status).toBe("pending_egress");
    expect(delivery.httpStatus).toBeNull();
    expect(delivery.deliveredAt).toBeNull();
    expect(delivery.triggerAuditEventId).toBe("audit_ev_001");
    expect(delivery.eventType).toBe("crm.opportunity.won");

    // Verify the HMAC signature
    const rawBody = delivery._rawPayload!;
    const signedAtUnix = Math.floor(new Date(delivery.signedAt).getTime() / 1000);
    const message = `audit_ev_001.${signedAtUnix}.${rawBody}`;
    const expected = "v1=" + createHmac("sha256", secret).update(message).digest("hex");
    expect(delivery.signature).toBe(expected);

    // Confirm there is NO outbound egress
    expect(delivery.httpStatus).toBeNull();
    expect(delivery.deliveredAt).toBeNull();
  });

  it("non-subscribed event → no delivery recorded (cheap no-op)", async () => {
    const { db, deliveries } = makeFakeDb({
      activeEndpoints: [{ id: "ep_2", eventTypes: ["billing.invoice.issued"], secret: "s2" }]
    });

    const evaluate = makeWebhookEvaluator();
    await evaluate(db, context, {
      auditEventId: "audit_ev_002",
      action: "crm.opportunity.won",
      resourceType: "opportunity",
      resourceId: "opp_2"
    });

    expect(deliveries.length).toBe(0);
  });

  it("no endpoints subscribed → no delivery, function is a no-op (existing tests unaffected)", async () => {
    const { db, deliveries } = makeFakeDb({ activeEndpoints: [] });

    const evaluate = makeWebhookEvaluator();
    await evaluate(db, context, {
      auditEventId: "audit_ev_003",
      action: "crm.opportunity.won",
      resourceType: "opportunity",
      resourceId: "opp_3"
    });

    expect(deliveries.length).toBe(0);
  });

  it("idempotency: same auditEventId + endpointId only creates ONE delivery row", async () => {
    const secret = "idempotency_secret";
    const { db, deliveries } = makeFakeDb({
      activeEndpoints: [{ id: "ep_3", eventTypes: ["project.task.completed"], secret }]
    });

    const evaluate = makeWebhookEvaluator();
    const payload = {
      auditEventId: "audit_ev_idem",
      action: "project.task.completed",
      resourceType: "project_task",
      resourceId: "task_1"
    };

    await evaluate(db, context, payload);
    await evaluate(db, context, payload); // second call — same auditEventId

    expect(deliveries.length).toBe(1);
  });

  it("best-effort: error in delivery insert does NOT throw to the caller", async () => {
    const { db } = makeFakeDb({
      activeEndpoints: [{ id: "ep_4", eventTypes: ["billing.invoice.issued"], secret: "s4" }],
      throwOnDeliveryInsert: true
    });

    const evaluate = makeWebhookEvaluator();
    await expect(
      evaluate(db, context, {
        auditEventId: "audit_ev_err",
        action: "billing.invoice.issued",
        resourceType: "invoice",
        resourceId: "inv_1"
      })
    ).resolves.toBeUndefined(); // Must not throw
  });

  it("suppression guard: evaluator not called when wired through recordAuditEvent with depth guard", async () => {
    const { db, deliveries } = makeFakeDb({
      activeEndpoints: [{ id: "ep_5", eventTypes: ["crm.opportunity.won"], secret: "s5" }]
    });

    // Register the evaluator globally (mirrors buildApp)
    setWebhookEvaluator(makeWebhookEvaluator());

    // Suppressed context (__workflowDepth = 1) — evaluator should NOT fire
    const suppressedContext = { ...context, __workflowDepth: 1 };
    await recordAuditEvent(db, suppressedContext as typeof context, {
      action: "crm.opportunity.won",
      resourceType: "opportunity",
      resourceId: "opp_suppressed"
    });

    expect(deliveries.length).toBe(0);

    // Clean up (set back to null-like evaluator to avoid leaking state)
    setWebhookEvaluator(makeWebhookEvaluator());
  });

  it("non-suppressed context: evaluator fires when depth is 0 and endpoint is subscribed", async () => {
    const secret = "fire_secret";
    const { db, deliveries } = makeFakeDb({
      activeEndpoints: [{ id: "ep_6", eventTypes: ["crm.lead.converted"], secret }]
    });

    setWebhookEvaluator(makeWebhookEvaluator());

    await recordAuditEvent(db, context, {
      action: "crm.lead.converted",
      resourceType: "lead",
      resourceId: "lead_1"
    });

    expect(deliveries.length).toBe(1);
    expect(deliveries[0]!.status).toBe("pending_egress");

    // Reset
    setWebhookEvaluator(makeWebhookEvaluator());
  });
});
