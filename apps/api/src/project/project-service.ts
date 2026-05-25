import type { Project, CreateProjectInput, UpdateProjectInput } from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitProjectTimelineEntry } from "./project-timeline";
import {
  findProjectById,
  insertProject,
  listProjects as listProjectsRepo,
  softDeleteProject,
  updateProject as updateProjectRepo
} from "./projects";

// Service for the Project entity. Each mutation emits an AuditEvent with the
// canonical project.project.created / updated / deleted grammar and a
// TimelineEntry for the delivery activity stream.

export class ProjectNotFoundError extends Error {
  readonly code = "PROJECT_NOT_FOUND";
  constructor(projectId: string) {
    super(`Project ${projectId} not found`);
  }
}

export async function createProject(
  db: Queryable,
  context: TenantContext,
  input: CreateProjectInput
): Promise<Project> {
  assertTenantContext(context);
  const created = await insertProject(db, context, input);
  await emitProjectAudit(db, context, {
    action: "project.project.created",
    projectId: created.id,
    beforeSummary: null,
    afterSummary: {
      name: created.name,
      status: created.status,
      code: created.code,
      companyId: created.companyId
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceId: created.id,
    entryType: "project.project.created",
    payloadSummary: {
      name: created.name,
      status: created.status
    }
  });
  return created;
}

export async function updateProject(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateProjectInput
): Promise<Project> {
  assertTenantContext(context);
  const before = await findProjectById(db, context, id);
  if (!before) throw new ProjectNotFoundError(id);
  const updated = await updateProjectRepo(db, context, id, patch);
  if (!updated) throw new ProjectNotFoundError(id);
  await emitProjectAudit(db, context, {
    action: "project.project.updated",
    projectId: updated.id,
    beforeSummary: {
      name: before.name,
      status: before.status,
      ownerUserId: before.ownerUserId
    },
    afterSummary: {
      name: updated.name,
      status: updated.status,
      ownerUserId: updated.ownerUserId
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceId: updated.id,
    entryType: "project.project.updated",
    payloadSummary: {
      name: updated.name,
      status: updated.status
    }
  });
  return updated;
}

export async function deleteProject(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findProjectById(db, context, id);
  if (!before) throw new ProjectNotFoundError(id);
  const deleted = await softDeleteProject(db, context, id);
  if (!deleted) throw new ProjectNotFoundError(id);
  await emitProjectAudit(db, context, {
    action: "project.project.deleted",
    projectId: id,
    beforeSummary: { name: before.name, status: before.status },
    afterSummary: null
  });
  await emitProjectTimelineEntry(db, context, {
    resourceId: id,
    entryType: "project.project.deleted",
    payloadSummary: { name: before.name }
  });
}

export async function getProjectById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Project | null> {
  return findProjectById(db, context, id);
}

export async function listProjects(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: "draft" | "active" | "on_hold" | "completed" | "cancelled" } = {}
): Promise<Project[]> {
  return listProjectsRepo(db, context, options);
}

interface EmitProjectAuditInput {
  action: string;
  projectId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitProjectAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitProjectAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "project",
    resourceId: input.projectId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
