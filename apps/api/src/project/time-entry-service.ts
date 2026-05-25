import type {
  TimeEntry,
  TimeEntryStatus,
  CreateTimeEntryInput,
  UpdateTimeEntryInput
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitProjectTimelineEntry } from "./project-timeline";
import {
  findTimeEntryById,
  insertTimeEntry,
  listTimeEntries as listTimeEntriesRepo,
  softDeleteTimeEntry,
  updateTimeEntry as updateTimeEntryRepo
} from "./time-entries";

// Service for the TimeEntry entity. Each mutation emits an AuditEvent with
// the canonical project.time_entry.created / updated / submitted / approved / deleted
// grammar and a TimelineEntry for the delivery activity stream.
// Transitioning to 'submitted' also emits project.time_entry.submitted.
// Transitioning to 'approved' also emits project.time_entry.approved.

export class TimeEntryNotFoundError extends Error {
  readonly code = "TIME_ENTRY_NOT_FOUND";
  constructor(entryId: string) {
    super(`TimeEntry ${entryId} not found`);
  }
}

export async function createTimeEntry(
  db: Queryable,
  context: TenantContext,
  input: CreateTimeEntryInput
): Promise<TimeEntry> {
  assertTenantContext(context);
  const created = await insertTimeEntry(db, context, input);
  await emitEntryAudit(db, context, {
    action: "project.time_entry.created",
    entryId: created.id,
    beforeSummary: null,
    afterSummary: {
      projectId: created.projectId,
      userId: created.userId,
      entryDate: created.entryDate,
      minutes: created.minutes,
      status: created.status
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "time_entry",
    resourceId: created.id,
    entryType: "project.time_entry.created",
    payloadSummary: {
      projectId: created.projectId,
      entryDate: created.entryDate,
      minutes: created.minutes,
      status: created.status
    }
  });
  return created;
}

export async function updateTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateTimeEntryInput
): Promise<TimeEntry> {
  assertTenantContext(context);
  const before = await findTimeEntryById(db, context, id);
  if (!before) throw new TimeEntryNotFoundError(id);

  const updated = await updateTimeEntryRepo(db, context, id, patch);
  if (!updated) throw new TimeEntryNotFoundError(id);

  await emitEntryAudit(db, context, {
    action: "project.time_entry.updated",
    entryId: updated.id,
    beforeSummary: {
      status: before.status,
      minutes: before.minutes,
      entryDate: before.entryDate
    },
    afterSummary: {
      status: updated.status,
      minutes: updated.minutes,
      entryDate: updated.entryDate
    }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "time_entry",
    resourceId: updated.id,
    entryType: "project.time_entry.updated",
    payloadSummary: {
      projectId: updated.projectId,
      status: updated.status,
      minutes: updated.minutes
    }
  });

  const transitioningToSubmitted =
    patch.status === "submitted" && before.status !== "submitted";
  if (transitioningToSubmitted) {
    await emitEntryAudit(db, context, {
      action: "project.time_entry.submitted",
      entryId: updated.id,
      beforeSummary: { status: before.status },
      afterSummary: { status: updated.status }
    });
    await emitProjectTimelineEntry(db, context, {
      resourceType: "time_entry",
      resourceId: updated.id,
      entryType: "project.time_entry.submitted",
      payloadSummary: { projectId: updated.projectId, minutes: updated.minutes }
    });
  }

  const transitioningToApproved =
    patch.status === "approved" && before.status !== "approved";
  if (transitioningToApproved) {
    await emitEntryAudit(db, context, {
      action: "project.time_entry.approved",
      entryId: updated.id,
      beforeSummary: { status: before.status },
      afterSummary: { status: updated.status }
    });
    await emitProjectTimelineEntry(db, context, {
      resourceType: "time_entry",
      resourceId: updated.id,
      entryType: "project.time_entry.approved",
      payloadSummary: { projectId: updated.projectId, minutes: updated.minutes }
    });
  }

  return updated;
}

export async function deleteTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findTimeEntryById(db, context, id);
  if (!before) throw new TimeEntryNotFoundError(id);
  const deleted = await softDeleteTimeEntry(db, context, id);
  if (!deleted) throw new TimeEntryNotFoundError(id);
  await emitEntryAudit(db, context, {
    action: "project.time_entry.deleted",
    entryId: id,
    beforeSummary: {
      projectId: before.projectId,
      entryDate: before.entryDate,
      minutes: before.minutes,
      status: before.status
    },
    afterSummary: null
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "time_entry",
    resourceId: id,
    entryType: "project.time_entry.deleted",
    payloadSummary: { projectId: before.projectId, entryDate: before.entryDate }
  });
}

export async function getTimeEntryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<TimeEntry | null> {
  return findTimeEntryById(db, context, id);
}

export async function listTimeEntries(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    projectId?: string;
    projectTaskId?: string;
    userId?: string;
    status?: TimeEntryStatus;
    billable?: boolean;
  } = {}
): Promise<TimeEntry[]> {
  return listTimeEntriesRepo(db, context, options);
}

interface EmitEntryAuditInput {
  action: string;
  entryId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitEntryAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitEntryAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "time_entry",
    resourceId: input.entryId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
