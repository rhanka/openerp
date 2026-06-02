import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { Dashboard, DashboardWidget, ReportColumn } from "@sentropic/openerp-domain/reporting";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 5.2 — Dashboard render detail page.

export interface RenderedWidgetPayload {
  widget: DashboardWidget;
  reportType: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
}

export interface RenderPayload {
  dashboard: Dashboard;
  widgets: RenderedWidgetPayload[];
}

const DEMO_RENDER: RenderPayload = {
  dashboard: {
    id: "demo-dash-1",
    organizationId: "demo-org",
    ownerUserId: null,
    name: "Pipeline overview (demo)",
    description: "Pipeline funnel in one view.",
    isShared: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  widgets: [
    {
      widget: {
        id: "demo-widget-1",
        organizationId: "demo-org",
        dashboardId: "demo-dash-1",
        reportDefinitionId: "demo-rd-1",
        title: "Funnel overview",
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      reportType: "crm.pipeline_funnel",
      columns: [
        { key: "stage", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.stage", dataType: "string" },
        { key: "open_count", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.open_count", dataType: "number" },
        { key: "pipeline_value_minor", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.pipeline_value_minor", dataType: "money" }
      ],
      rows: [
        { stage: "Discovery", open_count: "3", pipeline_value_minor: "15000" },
        { stage: "Proposal", open_count: "1", pipeline_value_minor: "50000" }
      ],
      rowCount: 2
    }
  ]
};

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

export const load: PageServerLoad = async ({ params, fetch, locals }) => {
  const id = params.id;
  const session = clientFromLocalsOrEnv(fetch, locals);

  if (!session) {
    return {
      render: DEMO_RENDER as RenderPayload,
      reportDefinitions: [] as Array<{ id: string; name: string; reportType: string }>,
      source: "demo" as const,
      locale: locals.locale
    };
  }

  try {
    const [render, reportDefs] = await Promise.all([
      session.client.renderDashboard(id) as Promise<RenderPayload>,
      session.client.listReportDefinitions()
    ]);
    return {
      render,
      reportDefinitions: reportDefs.map((rd) => ({
        id: rd.id,
        name: rd.name,
        reportType: rd.reportType
      })),
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    return {
      render: null as RenderPayload | null,
      reportDefinitions: [] as Array<{ id: string; name: string; reportType: string }>,
      source: "error" as const,
      locale: locals.locale,
      message: err instanceof Error ? err.message : String(err)
    };
  }
};

export const actions: Actions = {
  addWidget: async ({ params, request, fetch, locals }) => {
    const id = params.id ?? "";
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const form = await request.formData();
    const reportDefinitionId = String(form.get("reportDefinitionId") ?? "").trim();
    if (!reportDefinitionId) return fail(400, { code: "REPORT_DEFINITION_ID_REQUIRED" });
    const titleRaw = String(form.get("title") ?? "").trim();
    const title = titleRaw || null;
    const positionRaw = String(form.get("position") ?? "0");
    const position = parseInt(positionRaw) || 0;

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      const created = await session.client.addDashboardWidget(id, { reportDefinitionId, title, position });
      return { ok: true as const, widgetId: created.id };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  },

  removeWidget: async ({ params, request, fetch, locals }) => {
    const id = params.id ?? "";
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    const form = await request.formData();
    const widgetId = String(form.get("widgetId") ?? "");
    if (!widgetId) return fail(400, { code: "WIDGET_ID_REQUIRED" });

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });
    try {
      await session.client.removeDashboardWidget(id, widgetId);
      return { ok: true as const, widgetId, removed: true };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
