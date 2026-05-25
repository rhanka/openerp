import { env } from "$env/dynamic/private";

import type { Project, ProjectTask } from "@sentropic/openerp-domain/project";
import type { TimelineEntry } from "@sentropic/openerp-domain";

import { createApiClient } from "$lib/api/client";

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

const DEMO_FALLBACK: { project: Project; timeline: TimelineEntry[]; tasks: ProjectTask[] } = {
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
  ]
};

export const load: PageServerLoad = async ({ fetch, locals, params }) => {
  const session = clientFromLocalsOrEnv(fetch, locals);
  if (!session) {
    return {
      ...DEMO_FALLBACK,
      source: "demo" as const,
      locale: locals.locale
    };
  }
  try {
    const [project, timeline, tasks] = await Promise.all([
      session.client.getProject(params.id),
      session.client.listProjectTimeline({
        resourceId: params.id,
        limit: 50
      }),
      session.client.listProjectTasks({ projectId: params.id, limit: 100 })
    ]);
    return {
      project,
      timeline,
      tasks,
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
  }
};
