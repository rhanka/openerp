import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { WorkflowDefinition, WorkflowRun } from "@sentropic/openerp-domain/workflow";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// Demo Slice 5.4 — WorkflowDefinitions admin list page.

const DEMO_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "demo-wf-1",
    organizationId: "demo-org",
    ownerUserId: null,
    name: "Notify on opportunity won (demo)",
    description: null,
    triggerType: "crm.opportunity.won",
    triggerConfig: {},
    actionType: "create_notification",
    actionConfig: {
      subjectKey: "workflow.demo.subject",
      bodyKey: "workflow.demo.body"
    },
    isActive: true,
    isShared: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_RUNS: WorkflowRun[] = [
  {
    id: "demo-wr-1",
    organizationId: "demo-org",
    workflowDefinitionId: "demo-wf-1",
    triggerAuditEventId: null,
    triggerEventType: "crm.opportunity.won",
    triggerResourceType: "opportunity",
    triggerResourceId: "demo-opp-1",
    triggeredBy: "event",
    status: "completed",
    createdResourceType: "notification",
    createdResourceId: "demo-notif-1",
    actionResult: { notificationId: "demo-notif-1" },
    errorDetail: null,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3600000 + 100).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const DEMO_CATALOG = {
  triggers: [
    { eventType: "crm.opportunity.won", labelKey: "workflow.triggerType.crm_opportunity_won.label" },
    { eventType: "crm.lead.converted", labelKey: "workflow.triggerType.crm_lead_converted.label" },
    { eventType: "billing.invoice.issued", labelKey: "workflow.triggerType.billing_invoice_issued.label" },
    { eventType: "project.task.completed", labelKey: "workflow.triggerType.project_task_completed.label" }
  ],
  actions: [
    { actionType: "create_notification", labelKey: "workflow.actionType.create_notification.label" },
    { actionType: "create_project_task", labelKey: "workflow.actionType.create_project_task.label" },
    { actionType: "create_project", labelKey: "workflow.actionType.create_project.label" }
  ]
};

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
      workflows: DEMO_WORKFLOWS,
      catalog: DEMO_CATALOG,
      runsByWorkflow: { "demo-wf-1": DEMO_RUNS } as Record<string, WorkflowRun[]>,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [workflows, catalog] = await Promise.all([
      session.client.listWorkflows(),
      session.client.getWorkflowCatalog()
    ]);

    // Load runs for each workflow (best-effort)
    const runsByWorkflow: Record<string, WorkflowRun[]> = {};
    for (const wf of workflows) {
      try {
        runsByWorkflow[wf.id] = await session.client.listWorkflowRuns(wf.id);
      } catch {
        runsByWorkflow[wf.id] = [];
      }
    }

    return {
      workflows,
      catalog,
      runsByWorkflow,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    return {
      workflows: [] as WorkflowDefinition[],
      catalog: DEMO_CATALOG,
      runsByWorkflow: {} as Record<string, WorkflowRun[]>,
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
    const triggerType = String(form.get("triggerType") ?? "").trim();
    if (!triggerType) return fail(400, { code: "TRIGGER_REQUIRED" });
    const actionType = String(form.get("actionType") ?? "").trim();
    if (!actionType) return fail(400, { code: "ACTION_REQUIRED" });

    // Build actionConfig from form fields
    const actionConfig: Record<string, unknown> = {};
    const subjectKey = String(form.get("actionConfig_subjectKey") ?? "").trim();
    if (subjectKey) actionConfig.subjectKey = subjectKey;
    const bodyKey = String(form.get("actionConfig_bodyKey") ?? "").trim();
    if (bodyKey) actionConfig.bodyKey = bodyKey;
    const recipientUserId = String(form.get("actionConfig_recipientUserId") ?? "").trim();
    if (recipientUserId) actionConfig.recipientUserId = recipientUserId;
    const titleTemplate = String(form.get("actionConfig_titleTemplate") ?? "").trim();
    if (titleTemplate) actionConfig.titleTemplate = titleTemplate;
    const projectId = String(form.get("actionConfig_projectId") ?? "").trim();
    if (projectId) actionConfig.projectId = projectId;
    const nameTemplate = String(form.get("actionConfig_nameTemplate") ?? "").trim();
    if (nameTemplate) actionConfig.nameTemplate = nameTemplate;

    const isActive = form.get("isActive") !== "off";
    const isShared = form.get("isShared") === "on";

    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return fail(503, { code: "DEMO_MODE_NO_API" });

    try {
      const created = await session.client.createWorkflow({
        name,
        triggerType,
        actionType,
        actionConfig,
        isActive,
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
      await session.client.deleteWorkflow(id);
      return { ok: true as const, id, deleted: true };
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
      const run = await session.client.runWorkflowNow(id);
      return { ok: true as const, runId: run.id, status: run.status };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
