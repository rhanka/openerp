import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { ReportDefinition, ReportRun } from "@sentropic/openerp-domain/reporting";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 5.1 — Reporting report-definitions admin page.
// SSR loader hits the live API when session is present, otherwise falls back
// to a deterministic demo list so the route remains reviewable without the API.

const DEMO_RUN: ReportRun = {
  id: "demo-run-1",
  organizationId: "demo-org",
  reportDefinitionId: "demo-rd-1",
  triggeredByUserId: null,
  status: "completed",
  parametersSnapshot: {},
  resultColumns: [
    { key: "stage", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.stage", dataType: "string" },
    { key: "open_count", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.open_count", dataType: "number" },
    { key: "pipeline_value_minor", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.pipeline_value_minor", dataType: "money" }
  ],
  resultRows: [
    { stage: "Discovery", open_count: "3", pipeline_value_minor: "15000" },
    { stage: "Proposal", open_count: "1", pipeline_value_minor: "50000" }
  ],
  rowCount: 2,
  errorDetail: null,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
};

const DEMO_FALLBACK: ReportDefinition[] = [
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
      reportDefinitions: DEMO_FALLBACK,
      reportTypes: [] as Array<{ reportType: string; labelKey: string; params: unknown[]; columns: unknown[] }>,
      latestRun: DEMO_RUN as ReportRun | null,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [reportDefinitions, reportTypes] = await Promise.all([
      session.client.listReportDefinitions(),
      session.client.listReportTypes()
    ]);
    return {
      reportDefinitions,
      reportTypes,
      latestRun: null as ReportRun | null,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    return {
      reportDefinitions: [] as ReportDefinition[],
      reportTypes: [] as Array<{ reportType: string; labelKey: string; params: unknown[]; columns: unknown[] }>,
      latestRun: null as ReportRun | null,
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
    const reportType = String(form.get("reportType") ?? "").trim();
    if (!reportType) return fail(400, { code: "REPORT_TYPE_REQUIRED" });
    const isShared = form.get("isShared") === "on";

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.createReportDefinition({
        name,
        reportType,
        isShared
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
      await session.client.deleteReportDefinition(id);
      return { ok: true as const, id, deleted: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  run: async ({ request, fetch, locals }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const run = await session.client.runReportDefinition(id);
      return { ok: true as const, run };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
