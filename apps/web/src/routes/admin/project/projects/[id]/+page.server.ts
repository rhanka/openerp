import { env } from "$env/dynamic/private";

import type { Assignment, InvoiceProposal, InvoiceProposalWithLines, Project, ProjectTask, Rate, TimeEntry } from "@sentropic/openerp-domain/project";
import type { TimelineEntry } from "@sentropic/openerp-domain";

import { createApiClient, type TenantUserSummary } from "$lib/api/client";

import type { Actions, PageServerLoad } from "./$types";

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

const DEMO_ASSIGNMENTS: Assignment[] = [
  {
    id: "demo-asgn-1",
    organizationId: "demo-org",
    projectId: "demo-pr-1",
    userId: "demo-user-1",
    roleLabel: "Lead developer",
    allocationPercent: 80,
    startDate: "2026-01-01",
    endDate: null,
    billableRateId: "demo-rate-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_PROPOSALS: InvoiceProposalWithLines[] = [
  {
    id: "demo-prop-1",
    organizationId: "demo-org",
    projectId: "demo-pr-1",
    companyId: null,
    status: "draft",
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    total: { amountMinor: 15000, currency: "CAD", scale: 2 },
    currency: "CAD",
    submittedAt: null,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    lines: [
      {
        id: "demo-line-1",
        organizationId: "demo-org",
        invoiceProposalId: "demo-prop-1",
        sourceType: "time_entry",
        sourceId: "demo-te-1",
        description: "Set up project scaffolding",
        quantityMinutes: 120,
        unitRate: { amountMinor: 7500, currency: "CAD", scale: 2 },
        amount: { amountMinor: 15000, currency: "CAD", scale: 2 },
        createdAt: new Date(Date.now() - 3_600_000).toISOString()
      }
    ]
  }
];

const DEMO_RATES: Rate[] = [
  {
    id: "demo-rate-1",
    organizationId: "demo-org",
    name: "Senior consultant",
    amount: { amountMinor: 15000, currency: "CAD", scale: 2 },
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEMO_USERS: TenantUserSummary[] = [
  { id: "demo-user-1", email: "alice@demo.local", displayName: "Alice Tremblay", status: "active" }
];

const DEMO_FALLBACK: { project: Project; timeline: TimelineEntry[]; tasks: ProjectTask[]; timeEntries: TimeEntry[]; assignments: Assignment[]; proposals: InvoiceProposalWithLines[] } = {
  project: {
    id: "demo-pr-1",
    organizationId: "demo-org",
    name: "Northwind Implementation",
    description: "Core ERP delivery for Northwind Services.",
    status: "active",
    code: "NW-2026",
    companyId: null,
    ownerUserId: null,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  timeline: [
    {
      id: "te-pr-1",
      organizationId: "demo-org",
      resourceType: "project",
      resourceId: "demo-pr-1",
      actorUserIdentityId: null,
      entryType: "project.project.created",
      payloadSummary: { name: "Northwind Implementation" },
      occurredAt: new Date(Date.now() - 86_400_000 * 3).toISOString()
    },
    {
      id: "te-pr-2",
      organizationId: "demo-org",
      resourceType: "project",
      resourceId: "demo-pr-1",
      actorUserIdentityId: null,
      entryType: "project.project.updated",
      payloadSummary: { status: "active" },
      occurredAt: new Date(Date.now() - 3_600_000).toISOString()
    }
  ],
  tasks: [
    {
      id: "demo-tk-1",
      organizationId: "demo-org",
      projectId: "demo-pr-1",
      title: "Set up project structure",
      description: null,
      status: "done",
      assigneeUserId: null,
      dueDate: null,
      completedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
      parentTaskId: null,
      createdAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86_400_000 * 2).toISOString()
    },
    {
      id: "demo-tk-2",
      organizationId: "demo-org",
      projectId: "demo-pr-1",
      title: "Implement core API endpoints",
      description: null,
      status: "in_progress",
      assigneeUserId: null,
      dueDate: "2026-06-30",
      completedAt: null,
      parentTaskId: null,
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3_600_000).toISOString()
    }
  ],
  timeEntries: [
    {
      id: "demo-te-1",
      organizationId: "demo-org",
      projectId: "demo-pr-1",
      projectTaskId: "demo-tk-1",
      userId: "demo-user-1",
      entryDate: "2026-05-22",
      minutes: 120,
      description: "Set up project scaffolding",
      billable: true,
      status: "approved",
      approvalRequestId: null,
      createdAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86_400_000 * 2).toISOString()
    },
    {
      id: "demo-te-2",
      organizationId: "demo-org",
      projectId: "demo-pr-1",
      projectTaskId: "demo-tk-2",
      userId: "demo-user-1",
      entryDate: "2026-05-24",
      minutes: 90,
      description: "API endpoint implementation",
      billable: true,
      status: "submitted",
      approvalRequestId: null,
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      updatedAt: new Date(Date.now() - 3_600_000).toISOString()
    }
  ],
  assignments: DEMO_ASSIGNMENTS,
  proposals: DEMO_PROPOSALS
};

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    return {
      ...DEMO_FALLBACK,
      rates: DEMO_RATES,
      users: DEMO_USERS,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [project, timeline, tasks, timeEntries, assignments, proposals, rates, users] = await Promise.all([
      session.client.getProject(params.id),
      session.client.listProjectTimeline({
        resourceId: params.id,
        limit: 50
      }),
      session.client.listProjectTasks({ projectId: params.id, limit: 100 }),
      session.client.listTimeEntries({ projectId: params.id, limit: 200 }),
      session.client.listAssignments({ projectId: params.id, limit: 100 }),
      session.client.listInvoiceProposals({ projectId: params.id, limit: 50 }),
      session.client.listRates({ activeOnly: true }),
      session.client.listUsers({ limit: 100 })
    ]);
    return {
      project,
      timeline,
      tasks,
      timeEntries,
      assignments,
      proposals,
      rates,
      users,
      source: "api" as const,
      locale: locals.locale
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const notFound =
      err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404;
    return {
      project: null as Project | null,
      timeline: [] as TimelineEntry[],
      tasks: [] as ProjectTask[],
      timeEntries: [] as TimeEntry[],
      assignments: [] as Assignment[],
      proposals: [] as InvoiceProposal[],
      rates: [] as Rate[],
      users: [] as TenantUserSummary[],
      source: notFound ? ("not_found" as const) : ("error" as const),
      locale: locals.locale,
      message
    };
  }
};

export const actions: Actions = {
  createTask: async ({ fetch, locals, params, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
    if (!title) return { ok: false, code: "TITLE_REQUIRED" };
    try {
      await session.client.createProjectTask({
        projectId: params.id,
        title,
        dueDate: dueDate ?? undefined
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  markDone: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const taskId = String(formData.get("taskId") ?? "").trim();
    if (!taskId) return { ok: false, code: "TASK_ID_REQUIRED" };
    try {
      await session.client.updateProjectTask(taskId, { status: "done" });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  deleteTask: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const taskId = String(formData.get("taskId") ?? "").trim();
    if (!taskId) return { ok: false, code: "TASK_ID_REQUIRED" };
    try {
      await session.client.deleteProjectTask(taskId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  logTime: async ({ fetch, locals, params, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const minutesRaw = String(formData.get("minutes") ?? "").trim();
    const entryDate = String(formData.get("entryDate") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const billable = formData.get("billable") !== null;
    const projectTaskId = String(formData.get("projectTaskId") ?? "").trim() || null;
    const userId = String(formData.get("userId") ?? "").trim();
    const minutes = parseInt(minutesRaw, 10);
    if (!entryDate) return { ok: false, code: "ENTRY_DATE_REQUIRED" };
    if (!Number.isFinite(minutes) || minutes <= 0) return { ok: false, code: "MINUTES_REQUIRED" };
    if (!userId) return { ok: false, code: "USER_ID_REQUIRED" };
    try {
      await session.client.createTimeEntry({
        projectId: params.id,
        userId,
        entryDate,
        minutes,
        description: description ?? undefined,
        billable,
        projectTaskId: projectTaskId ?? undefined
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  submitTimeEntry: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const entryId = String(formData.get("entryId") ?? "").trim();
    if (!entryId) return { ok: false, code: "ENTRY_ID_REQUIRED" };
    try {
      await session.client.updateTimeEntry(entryId, { status: "submitted" });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  approveTimeEntry: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const entryId = String(formData.get("entryId") ?? "").trim();
    if (!entryId) return { ok: false, code: "ENTRY_ID_REQUIRED" };
    try {
      await session.client.updateTimeEntry(entryId, { status: "approved" });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  deleteTimeEntry: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const entryId = String(formData.get("entryId") ?? "").trim();
    if (!entryId) return { ok: false, code: "ENTRY_ID_REQUIRED" };
    try {
      await session.client.deleteTimeEntry(entryId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  createAssignment: async ({ fetch, locals, params, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const userId = String(formData.get("userId") ?? "").trim();
    if (!userId) return { ok: false, code: "USER_ID_REQUIRED" };
    const roleLabel = String(formData.get("roleLabel") ?? "").trim() || null;
    const allocationPercentRaw = String(formData.get("allocationPercent") ?? "").trim();
    const allocationPercent = allocationPercentRaw ? parseInt(allocationPercentRaw, 10) : null;
    const billableRateId = String(formData.get("billableRateId") ?? "").trim() || null;
    try {
      await session.client.createAssignment({
        projectId: params.id,
        userId,
        roleLabel: roleLabel ?? undefined,
        allocationPercent: allocationPercent ?? undefined,
        billableRateId: billableRateId ?? undefined
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  deleteAssignment: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const assignmentId = String(formData.get("assignmentId") ?? "").trim();
    if (!assignmentId) return { ok: false, code: "ASSIGNMENT_ID_REQUIRED" };
    try {
      await session.client.deleteAssignment(assignmentId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  generateProposal: async ({ fetch, locals, params }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    try {
      await session.client.generateInvoiceProposal({ projectId: params.id });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  submitProposal: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const proposalId = String(formData.get("proposalId") ?? "").trim();
    if (!proposalId) return { ok: false, code: "PROPOSAL_ID_REQUIRED" };
    try {
      await session.client.submitInvoiceProposal(proposalId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  approveProposal: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const proposalId = String(formData.get("proposalId") ?? "").trim();
    if (!proposalId) return { ok: false, code: "PROPOSAL_ID_REQUIRED" };
    try {
      await session.client.approveInvoiceProposal(proposalId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  rejectProposal: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const proposalId = String(formData.get("proposalId") ?? "").trim();
    if (!proposalId) return { ok: false, code: "PROPOSAL_ID_REQUIRED" };
    try {
      await session.client.rejectInvoiceProposal(proposalId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  },

  deleteProposal: async ({ fetch, locals, request }) => {
    const session = clientFromLocalsOrEnv(fetch, locals);
    if (!session) return { ok: false, code: "NO_SESSION" };
    const formData = await request.formData();
    const proposalId = String(formData.get("proposalId") ?? "").trim();
    if (!proposalId) return { ok: false, code: "PROPOSAL_ID_REQUIRED" };
    try {
      await session.client.deleteInvoiceProposal(proposalId);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message };
    }
  }
};
