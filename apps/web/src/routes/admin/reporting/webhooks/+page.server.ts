import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { WebhookEndpoint, WebhookDelivery } from "@sentropic/openerp-domain/webhook";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 5.5 — WebhookEndpoints admin list page.

const DEMO_ENDPOINT: WebhookEndpoint = {
  id: "demo-wh-1",
  organizationId: "demo-org",
  ownerUserId: null,
  name: "CRM won events (demo)",
  targetUrl: "https://hooks.example.com/crm-won",
  eventTypes: ["crm.opportunity.won"],
  isActive: true,
  isShared: false,
  consecutiveFailures: 0,
  disabledAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const DEMO_DELIVERY: WebhookDelivery = {
  id: "demo-wh-del-1",
  organizationId: "demo-org",
  webhookEndpointId: "demo-wh-1",
  eventType: "crm.opportunity.won",
  triggerAuditEventId: "demo-audit-1",
  payload: {
    eventType: "crm.opportunity.won",
    organizationId: "demo-org",
    resourceType: "opportunity",
    resourceId: "demo-opp-1",
    auditEventId: "demo-audit-1",
    timestamp: new Date().toISOString()
  },
  signature: "v1=demo_hmac_sha256_signature",
  status: "pending_egress",
  httpStatus: null,
  attemptCount: 0,
  nextRetryAt: null,
  errorDetail: null,
  signedAt: new Date().toISOString(),
  deliveredAt: null,
  createdAt: new Date().toISOString()
};

const DEMO_EVENT_TYPES = [
  { eventType: "crm.opportunity.won", labelKey: "webhook.eventType.crm_opportunity_won.label" },
  { eventType: "crm.lead.converted", labelKey: "webhook.eventType.crm_lead_converted.label" },
  { eventType: "billing.invoice.issued", labelKey: "webhook.eventType.billing_invoice_issued.label" },
  { eventType: "project.task.completed", labelKey: "webhook.eventType.project_task_completed.label" }
];

function clientFromLocalsOrEnv(
  fetchImpl: typeof fetch,
  locals: App.Locals
): { client: ReturnType<typeof createApiClient> } | null {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const token = locals.session?.token;
  if (token) {
    return {
      client: createApiClient({ baseUrl, token, fetch: fetchImpl as typeof globalThis.fetch })
    };
  }
  const organizationId = env.OPENERP_DEV_ORG_ID ?? "";
  const actorUserId = env.OPENERP_DEV_USER_ID ?? "";
  if (!organizationId || !actorUserId) return null;
  return {
    client: createApiClient({
      baseUrl,
      organizationId,
      actorUserId,
      fetch: fetchImpl as typeof globalThis.fetch
    })
  };
}

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    return {
      endpoints: [DEMO_ENDPOINT],
      deliveriesByEndpoint: { "demo-wh-1": [DEMO_DELIVERY] } as Record<string, WebhookDelivery[]>,
      eventTypes: DEMO_EVENT_TYPES,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [endpoints, eventTypesData] = await Promise.all([
      session.client.listWebhookEndpoints(),
      session.client.listWebhookEventTypes()
    ]);

    const deliveriesByEndpoint: Record<string, WebhookDelivery[]> = {};
    for (const ep of endpoints) {
      try {
        deliveriesByEndpoint[ep.id] = await session.client.listWebhookDeliveries(ep.id);
      } catch {
        deliveriesByEndpoint[ep.id] = [];
      }
    }

    return {
      endpoints,
      deliveriesByEndpoint,
      eventTypes: eventTypesData,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    return {
      endpoints: [] as WebhookEndpoint[],
      deliveriesByEndpoint: {} as Record<string, WebhookDelivery[]>,
      eventTypes: DEMO_EVENT_TYPES,
      source: "error" as const,
      locale: locals.locale,
      message: err instanceof Error ? err.message : String(err)
    };
  }
};

export const actions: Actions = {
  create: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return fail(400, { code: "NAME_REQUIRED" });
    const targetUrl = String(form.get("targetUrl") ?? "").trim();
    if (!targetUrl) return fail(400, { code: "TARGET_URL_REQUIRED" });
    const eventTypesRaw = form.getAll("eventTypes").map(String).filter(Boolean);
    if (eventTypesRaw.length === 0) return fail(400, { code: "EVENT_TYPES_REQUIRED" });
    const isActive = form.get("isActive") !== "off";
    const isShared = form.get("isShared") === "on";

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });

    try {
      const created = await session.client.createWebhookEndpoint({
        name,
        targetUrl,
        eventTypes: eventTypesRaw,
        isActive,
        isShared
      });
      // signingSecret is returned once — surface it to the form
      return {
        ok: true as const,
        id: created.id,
        name: created.name,
        signingSecret: created.signingSecret
      };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  delete: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.deleteWebhookEndpoint(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  rotateSecret: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const result = await session.client.rotateWebhookSecret(id);
      return {
        ok: true as const,
        id,
        signingSecret: result.signingSecret,
        rotated: true as const
      };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  test: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const delivery = await session.client.testWebhookEndpoint(id);
      return { ok: true as const, id, delivery };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
