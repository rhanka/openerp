import type {
  TimeEntry,
  TimeEntryStatus,
  CreateTimeEntryInput,
  UpdateTimeEntryInput
} from "@sentropic/openerp-domain/project";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import {
  createApprovalRequest,
  decideApprovalRequest
} from "../foundation/approval-service";
import { emitProjectTimelineEntry } from "./project-timeline";
import {
  findTimeEntryById,
  insertTimeEntry,
  linkApprovalRequestToTimeEntry,
  listTimeEntries as listTimeEntriesRepo,
  softDeleteTimeEntry,
  updateTimeEntry as updateTimeEntryRepo
} from "./time-entries";

// Service for the TimeEntry entity. Each mutation emits an AuditEvent with
// the canonical project.time_entry.created / updated / submitted / approved / deleted
// grammar and a TimelineEntry for the delivery activity stream.
//
// DS 3.5 (PG-07): submitTimeEntry creates a Foundation ApprovalRequest and links it
// to the entry (approval_request_id). approveTimeEntry / rejectTimeEntry decide the
// linked ApprovalRequest (which emits foundation audit + h2a journal) then flip the
// entry status. A direct-flip fallback is kept for entries without a linked approval
// (legacy rows, direct seeding) so existing flows remain green.

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

// DS 3.5: submit a time entry by creating a Foundation ApprovalRequest.
// The approval is linked back (approval_request_id) and the entry transitions to 'submitted'.
// approverUserIdentityId or approverRoleId must be provided; if neither is given we default
// the approver to the submitting actor so the demo path is self-contained.
export async function submitTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string,
  options: {
    approverUserIdentityId?: string | null;
    approverRoleId?: string | null;
  } = {}
): Promise<TimeEntry> {
  assertTenantContext(context);
  const entry = await findTimeEntryById(db, context, id);
  if (!entry) throw new TimeEntryNotFoundError(id);

  // Determine approver: prefer explicit approver; fall back to self (demo / single-user path).
  const approverUserIdentityId =
    options.approverUserIdentityId ?? (options.approverRoleId ? null : context.actorUserId);
  const approverRoleId = options.approverRoleId ?? null;

  const approval = await createApprovalRequest(db, context, {
    requesterUserIdentityId: context.actorUserId,
    approverUserIdentityId,
    approverRoleId,
    subjectType: "time_entry",
    subjectId: id,
    reason: "Time entry submitted for approval",
    urgency: "normal"
  });

  // Link the approval to the entry and set status submitted.
  await linkApprovalRequestToTimeEntry(db, context, id, approval.id);
  const submitted = await updateTimeEntryRepo(db, context, id, { status: "submitted" });
  if (!submitted) throw new TimeEntryNotFoundError(id);

  await emitEntryAudit(db, context, {
    action: "project.time_entry.submitted",
    entryId: submitted.id,
    beforeSummary: { status: entry.status },
    afterSummary: { status: submitted.status, approvalRequestId: approval.id }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "time_entry",
    resourceId: submitted.id,
    entryType: "project.time_entry.submitted",
    payloadSummary: { projectId: submitted.projectId, minutes: submitted.minutes, approvalRequestId: approval.id }
  });

  return submitted;
}

// DS 3.5: approve a time entry via its linked ApprovalRequest.
// If no linked approval exists (legacy), falls back to direct status flip.
export async function approveTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string,
  options: { decisionReason?: string } = {}
): Promise<TimeEntry> {
  assertTenantContext(context);
  const entry = await findTimeEntryById(db, context, id);
  if (!entry) throw new TimeEntryNotFoundError(id);

  if (entry.approvalRequestId) {
    await decideApprovalRequest(db, context, {
      approvalRequestId: entry.approvalRequestId,
      approverUserIdentityId: context.actorUserId,
      decision: "approved",
      decisionReason: options.decisionReason ?? "Approved",
      decidedAt: new Date().toISOString()
    });
  }

  const approved = await updateTimeEntryRepo(db, context, id, { status: "approved" });
  if (!approved) throw new TimeEntryNotFoundError(id);

  await emitEntryAudit(db, context, {
    action: "project.time_entry.approved",
    entryId: approved.id,
    beforeSummary: { status: entry.status },
    afterSummary: { status: approved.status }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "time_entry",
    resourceId: approved.id,
    entryType: "project.time_entry.approved",
    payloadSummary: { projectId: approved.projectId, minutes: approved.minutes }
  });

  return approved;
}

// DS 3.5: reject a time entry via its linked ApprovalRequest.
// If no linked approval, falls back to direct status flip.
export async function rejectTimeEntry(
  db: Queryable,
  context: TenantContext,
  id: string,
  options: { decisionReason?: string } = {}
): Promise<TimeEntry> {
  assertTenantContext(context);
  const entry = await findTimeEntryById(db, context, id);
  if (!entry) throw new TimeEntryNotFoundError(id);

  if (entry.approvalRequestId) {
    await decideApprovalRequest(db, context, {
      approvalRequestId: entry.approvalRequestId,
      approverUserIdentityId: context.actorUserId,
      decision: "rejected",
      decisionReason: options.decisionReason ?? "Rejected",
      decidedAt: new Date().toISOString()
    });
  }

  const rejected = await updateTimeEntryRepo(db, context, id, { status: "rejected" });
  if (!rejected) throw new TimeEntryNotFoundError(id);

  await emitEntryAudit(db, context, {
    action: "project.time_entry.rejected",
    entryId: rejected.id,
    beforeSummary: { status: entry.status },
    afterSummary: { status: rejected.status }
  });
  await emitProjectTimelineEntry(db, context, {
    resourceType: "time_entry",
    resourceId: rejected.id,
    entryType: "project.time_entry.rejected",
    payloadSummary: { projectId: rejected.projectId, minutes: rejected.minutes }
  });

  return rejected;
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
