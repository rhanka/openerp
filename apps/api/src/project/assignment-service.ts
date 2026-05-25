import type {
  Assignment,
  CreateAssignmentInput,
  UpdateAssignmentInput
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitProjectTimelineEntry } from "./project-timeline";
import {
  findAssignmentById,
  insertAssignment,
  listAssignments as listAssignmentsRepo,
  softDeleteAssignment,
  updateAssignment as updateAssignmentRepo
} from "./assignments";

// Service for the Assignment entity. Each mutation emits an AuditEvent with
// the canonical project.assignment.created / updated / deleted grammar and a
// TimelineEntry for the delivery activity stream.

export class AssignmentNotFoundError extends Error {
  readonly code = "ASSIGNMENT_NOT_FOUND";
  constructor(assignmentId: string) {
    super(`Assignment ${assignmentId} not found`);
  }
}

export async function createAssignment(
  db: Queryable,
  context: TenantContext,
  input: CreateAssignmentInput
): Promise<Assignment> {
  assertTenantContext(context);
  const created = await insertAssignment(db, context, input);
  await emitAssignmentAudit(db, context, {
    action: "project.assignment.created",
    assignmentId: created.id,
    beforeSummary: null,
    afterSummary: {
      projectId: created.projectId,
      userId: created.userId,
      roleLabel: created.roleLabel,
      allocationPercent: created.allocationPercent
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "assignment",
    resourceId: created.id,
    entryType: "project.assignment.created",
    payloadSummary: {
      projectId: created.projectId,
      userId: created.userId,
      roleLabel: created.roleLabel
    }
  });
  return created;
}

export async function updateAssignment(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateAssignmentInput
): Promise<Assignment> {
  assertTenantContext(context);
  const before = await findAssignmentById(db, context, id);
  if (!before) throw new AssignmentNotFoundError(id);
  const updated = await updateAssignmentRepo(db, context, id, patch);
  if (!updated) throw new AssignmentNotFoundError(id);
  await emitAssignmentAudit(db, context, {
    action: "project.assignment.updated",
    assignmentId: updated.id,
    beforeSummary: {
      roleLabel: before.roleLabel,
      allocationPercent: before.allocationPercent,
      billableRateId: before.billableRateId
    },
    afterSummary: {
      roleLabel: updated.roleLabel,
      allocationPercent: updated.allocationPercent,
      billableRateId: updated.billableRateId
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "assignment",
    resourceId: updated.id,
    entryType: "project.assignment.updated",
    payloadSummary: {
      projectId: updated.projectId,
      userId: updated.userId,
      roleLabel: updated.roleLabel
    }
  });
  return updated;
}

export async function deleteAssignment(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findAssignmentById(db, context, id);
  if (!before) throw new AssignmentNotFoundError(id);
  const deleted = await softDeleteAssignment(db, context, id);
  if (!deleted) throw new AssignmentNotFoundError(id);
  await emitAssignmentAudit(db, context, {
    action: "project.assignment.deleted",
    assignmentId: id,
    beforeSummary: {
      projectId: before.projectId,
      userId: before.userId,
      roleLabel: before.roleLabel
    },
    afterSummary: null
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "assignment",
    resourceId: id,
    entryType: "project.assignment.deleted",
    payloadSummary: { projectId: before.projectId, userId: before.userId }
  });
}

export async function getAssignmentById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Assignment | null> {
  return findAssignmentById(db, context, id);
}

export async function listAssignments(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    userId?: string;
  } = {}
): Promise<Assignment[]> {
  return listAssignmentsRepo(db, context, options);
}

interface EmitAssignmentAuditInput {
  action: string;
  assignmentId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitAssignmentAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitAssignmentAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "assignment",
    resourceId: input.assignmentId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
