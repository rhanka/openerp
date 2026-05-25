import type {
  ProjectTask,
  CreateProjectTaskInput,
  UpdateProjectTaskInput
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitProjectTimelineEntry } from "./project-timeline";
import {
  findProjectTaskById,
  insertProjectTask,
  listProjectTasks as listProjectTasksRepo,
  softDeleteProjectTask,
  updateProjectTask as updateProjectTaskRepo
} from "./project-tasks";

// Service for the ProjectTask entity. Each mutation emits an AuditEvent with
// the canonical project.task.created / updated / completed / deleted grammar
// and a TimelineEntry for the delivery activity stream.
// Completing a task (status -> done) emits an additional project.task.completed
// event on top of project.task.updated.

export class ProjectTaskNotFoundError extends Error {
  readonly code = "PROJECT_TASK_NOT_FOUND";
  constructor(taskId: string) {
    super(`ProjectTask ${taskId} not found`);
  }
}

export async function createProjectTask(
  db: Queryable,
  context: TenantContext,
  input: CreateProjectTaskInput
): Promise<ProjectTask> {
  assertTenantContext(context);
  const created = await insertProjectTask(db, context, input);
  await emitTaskAudit(db, context, {
    action: "project.task.created",
    taskId: created.id,
    beforeSummary: null,
    afterSummary: {
      title: created.title,
      projectId: created.projectId,
      status: created.status
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "project_task",
    resourceId: created.id,
    entryType: "project.task.created",
    payloadSummary: {
      title: created.title,
      projectId: created.projectId,
      status: created.status
    }
  });
  return created;
}

export async function updateProjectTask(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateProjectTaskInput
): Promise<ProjectTask> {
  assertTenantContext(context);
  const before = await findProjectTaskById(db, context, id);
  if (!before) throw new ProjectTaskNotFoundError(id);

  const transitioningToDone = patch.status === "done" && before.status !== "done";
  const autoStamp = transitioningToDone && patch.completedAt === undefined;

  const updated = await updateProjectTaskRepo(db, context, id, {
    ...patch,
    _autoStampCompleted: autoStamp
  });
  if (!updated) throw new ProjectTaskNotFoundError(id);

  await emitTaskAudit(db, context, {
    action: "project.task.updated",
    taskId: updated.id,
    beforeSummary: {
      title: before.title,
      status: before.status,
      assigneeUserId: before.assigneeUserId
    },
    afterSummary: {
      title: updated.title,
      status: updated.status,
      assigneeUserId: updated.assigneeUserId
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "project_task",
    resourceId: updated.id,
    entryType: "project.task.updated",
    payloadSummary: {
      title: updated.title,
      status: updated.status,
      projectId: updated.projectId
    }
  });

  if (transitioningToDone) {
    await emitTaskAudit(db, context, {
      action: "project.task.completed",
      taskId: updated.id,
      beforeSummary: { status: before.status },
      afterSummary: { status: updated.status, completedAt: updated.completedAt }
    });
    await emitProjectTimelineEntry(db, context, {
      resourceType: "project_task",
      resourceId: updated.id,
      entryType: "project.task.completed",
      payloadSummary: {
        title: updated.title,
        projectId: updated.projectId,
        completedAt: updated.completedAt
      }
    });
  }

  return updated;
}

export async function deleteProjectTask(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findProjectTaskById(db, context, id);
  if (!before) throw new ProjectTaskNotFoundError(id);
  const deleted = await softDeleteProjectTask(db, context, id);
  if (!deleted) throw new ProjectTaskNotFoundError(id);
  await emitTaskAudit(db, context, {
    action: "project.task.deleted",
    taskId: id,
    beforeSummary: { title: before.title, status: before.status, projectId: before.projectId },
    afterSummary: null
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "project_task",
    resourceId: id,
    entryType: "project.task.deleted",
    payloadSummary: { title: before.title, projectId: before.projectId }
  });
}

export async function getProjectTaskById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ProjectTask | null> {
  return findProjectTaskById(db, context, id);
}

export async function listProjectTasks(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    status?: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
  } = {}
): Promise<ProjectTask[]> {
  return listProjectTasksRepo(db, context, options);
}

interface EmitTaskAuditInput {
  action: string;
  taskId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitTaskAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitTaskAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "project_task",
    resourceId: input.taskId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
