import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { DeliveryRun, ReportDefinition, ScheduledDelivery } from "@sentropic/openerp-domain/reporting";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 5.3 — ScheduledDeliveries admin list page.

const DEMO_REPORT_DEFS: ReportDefinition[] = [
  {
    id: "demo-rd-1",
    organizationId: "demo-org",
    ownerUserId: null,
    reportType: "crm.pipeline_funnel",
    name: "Pipeline funnel (demo)",
    parameters: {},
    isShared: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_DELIVERIES: ScheduledDelivery[] = [
  {
    id: "demo-sd-1",
    organizationId: "demo-org",
    ownerUserId: null,
    name: "Weekly funnel delivery (demo)",
    targetType: "report_definition",
    targetId: "demo-rd-1",
    cadence: "weekly",
    timezone: "UTC",
    nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    channel: "in_app",
    recipientUserIds: ["demo-user-1"],
    isShared: false,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_RUNS: DeliveryRun[] = [
  {
    id: "demo-dr-1",
    organizationId: "demo-org",
    scheduledDeliveryId: "demo-sd-1",
    reportRunId: "demo-rr-1",
    triggeredBy: "schedule",
    status: "completed",
    errorDetail: null,
    snapshotSummary: { rowCount: 3, reportType: "crm.pipeline_funnel" },
    startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 200).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

function clientFromLocalsOrEnv(
  fetchImpl: typeof fetch,
  locals: App.Locals
): { client: ReturnType<typeof createApiClient> } | null {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const organizationId = locals.session?.organizationId ?? env.OPENERP_DEV_ORG_ID ?? "";
  const actorUserId = locals.session?.userIdentityId ?? env.OPENERP_DEV_USER_ID ?? "";
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
      deliveries: DEMO_DELIVERIES,
      reportDefs: DEMO_REPORT_DEFS,
      runsByDelivery: { "demo-sd-1": DEMO_RUNS } as Record<string, DeliveryRun[]>,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [deliveries, reportDefs] = await Promise.all([
      session.client.listScheduledDeliveries(),
      session.client.listReportDefinitions()
    ]);

    // Load runs for each delivery (best-effort)
    const runsByDelivery: Record<string, DeliveryRun[]> = {};
    for (const d of deliveries) {
      try {
        runsByDelivery[d.id] = await session.client.listDeliveryRuns(d.id);
      } catch {
        runsByDelivery[d.id] = [];
      }
    }

    return {
      deliveries,
      reportDefs,
      runsByDelivery,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    return {
      deliveries: [] as ScheduledDelivery[],
      reportDefs: [] as ReportDefinition[],
      runsByDelivery: {} as Record<string, DeliveryRun[]>,
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
    const targetId = String(form.get("targetId") ?? "").trim();
    if (!targetId) return fail(400, { code: "TARGET_REQUIRED" });
    const cadenceRaw = String(form.get("cadence") ?? "").trim();
    if (!cadenceRaw) return fail(400, { code: "CADENCE_REQUIRED" });
    const timezone = String(form.get("timezone") ?? "UTC").trim() || "UTC";
    const recipientsRaw = String(form.get("recipientUserIds") ?? "").trim();
    const recipientUserIds = recipientsRaw
      ? recipientsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const isShared = form.get("isShared") === "on";
    const active = form.get("active") !== "off";

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });

    try {
      const created = await session.client.createScheduledDelivery({
        name,
        targetType: "report_definition",
        targetId,
        cadence: cadenceRaw as ScheduledDelivery["cadence"],
        timezone,
        recipientUserIds,
        isShared,
        active
      });
      return { ok: true as const, id: created.id, name: created.name };
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
      await session.client.deleteScheduledDelivery(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  runDue: async ({ fetch, locals }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const result = await session.client.runDueDeliveries();
      return { ok: true as const, processed: result.processed };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  runNow: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const run = await session.client.runDeliveryNow(id);
      return { ok: true as const, deliveryRunId: run.id, status: run.status };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
