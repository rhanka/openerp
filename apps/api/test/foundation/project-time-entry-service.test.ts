import { describe, expect, it } from "vitest";

import type { ApprovalRequest } from "@sentropic/openerp-domain";
import type { TimeEntry } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import {
  TimeEntryNotFoundError,
  approveTimeEntry,
  createTimeEntry,
  deleteTimeEntry,
  listTimeEntries,
  rejectTimeEntry,
  submitTimeEntry,
  updateTimeEntry
} from "../../src/project/time-entry-service";

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb() {
  const entries: TimeEntry[] = [];
  const approvals: ApprovalRequest[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // -----------------------------------------------------------------------
      // ApprovalRequest inserts (createApprovalRequest → insertApprovalRequest)
      // -----------------------------------------------------------------------
      if (t.includes("insert into approval_requests")) {
        const [
          organizationId,
          requesterUserIdentityId,
          approverUserIdentityId,
          approverRoleId,
          subjectType,
          subjectId,
          reason,
          urgency,
          // status is hardcoded 'pending' in the SQL, expiresAt is the 9th param
          expiresAt
        ] = values as [string, string, string | null, string | null, string, string, string, string, string | null];
        const row: ApprovalRequest = {
          id: `approval_${approvals.length + 1}`,
          organizationId,
          requesterUserIdentityId,
          approverUserIdentityId,
          approverRoleId,
          subjectType,
          subjectId,
          reason,
          urgency: urgency as ApprovalRequest["urgency"],
          status: "pending",
          decisionReason: null,
          decidedAt: null,
          expiresAt: expiresAt ?? null,
          createdAt: "2026-05-28T10:00:00.000Z"
        };
        approvals.push(row);
        return { rows: [row as unknown as T] };
      }

      // -----------------------------------------------------------------------
      // ApprovalRequest update (decideApprovalRequest → recordApprovalDecision)
      // -----------------------------------------------------------------------
      if (t.includes("update approval_requests") && t.includes("status = $3")) {
        const [approvalId, organizationId, decision, decisionReason, decidedAt, approverUserId] =
          values as [string, string, string, string, string, string];
        const idx = approvals.findIndex(
          (a) => a.id === approvalId && a.organizationId === organizationId && a.status === "pending"
        );
        if (idx === -1) return { rows: [] };
        approvals[idx] = {
          ...approvals[idx]!,
          status: decision as ApprovalRequest["status"],
          decisionReason,
          decidedAt,
          approverUserIdentityId: approvals[idx]!.approverUserIdentityId ?? approverUserId
        };
        return { rows: [approvals[idx]! as unknown as T] };
      }

      // findApprovalRequestById
      if (t.includes("from approval_requests") && t.includes("where id = $1")) {
        const [approvalId, organizationId] = values as [string, string];
        const found = approvals.find(
          (a) => a.id === approvalId && a.organizationId === organizationId
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // findPreviousJournalEntry (h2a chain lookup — return no prev for simplicity)
      if (t.includes("approval_request_id = $2") && t.includes("after_summary ? 'journalEntry'")) {
        return { rows: [] };
      }

      // -----------------------------------------------------------------------
      // TimeEntry operations
      // -----------------------------------------------------------------------
      if (t.includes("insert into time_entries")) {
        const [
          organizationId,
          projectId,
          projectTaskId,
          userId,
          entryDate,
          minutes,
          description,
          billable,
          status
        ] = values as [
          string,
          string,
          string | null,
          string,
          string,
          number,
          string | null,
          boolean,
          string
        ];
        const row: TimeEntry = {
          id: `te_${entries.length + 1}`,
          organizationId,
          projectId,
          projectTaskId,
          userId,
          entryDate,
          minutes,
          description,
          billable,
          status: status as TimeEntry["status"],
          approvalRequestId: null,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        entries.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from time_entries") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = entries.find(
          (e) =>
            e.id === id &&
            e.organizationId === organizationId &&
            !(e as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from time_entries") && t.includes("order by entry_date desc")) {
        const [organizationId, projectIdFilter, projectTaskIdFilter, userIdFilter, statusFilter, billableFilter, limit, offset] =
          values as [string, string | null, string | null, string | null, string | null, boolean | null, number, number];
        const filtered = entries
          .filter((e) => e.organizationId === organizationId)
          .filter((e) => !(e as unknown as { _deleted?: boolean })._deleted)
          .filter((e) => (projectIdFilter ? e.projectId === projectIdFilter : true))
          .filter((e) => (projectTaskIdFilter ? e.projectTaskId === projectTaskIdFilter : true))
          .filter((e) => (userIdFilter ? e.userId === userIdFilter : true))
          .filter((e) => (statusFilter ? e.status === statusFilter : true))
          .filter((e) => (billableFilter !== null ? e.billable === billableFilter : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update time_entries") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = entries.findIndex(
          (e) =>
            e.id === id &&
            e.organizationId === organizationId &&
            !(e as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (entries[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: entries[idx]!.id } as unknown as T] };
      }

      // linkApprovalRequestToTimeEntry
      if (t.includes("update time_entries") && t.includes("approval_request_id = $3")) {
        const [id, organizationId, approvalRequestId] = values as [string, string, string];
        const idx = entries.findIndex(
          (e) => e.id === id && e.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        entries[idx] = { ...entries[idx]!, approvalRequestId, updatedAt: "2026-05-28T10:00:00.000Z" };
        return { rows: [entries[idx]! as unknown as T] };
      }

      if (t.includes("update time_entries")) {
        const [id, organizationId] = values as [string, string];
        const idx = entries.findIndex(
          (e) => e.id === id && e.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<TimeEntry> = {};
        if (t.includes("status = $")) {
          const statusVal = trailing.find((v) =>
            ["draft", "submitted", "approved", "rejected"].includes(v as string)
          );
          if (statusVal !== undefined) patch.status = statusVal as TimeEntry["status"];
        }
        if (t.includes("minutes = $")) {
          const minutesVal = trailing.find((v) => typeof v === "number" && (v as number) > 0);
          if (minutesVal !== undefined) patch.minutes = Number(minutesVal);
        }
        entries[idx] = { ...entries[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [entries[idx]! as unknown as T] };
      }

      // -----------------------------------------------------------------------
      // Audit / Timeline
      // -----------------------------------------------------------------------
      if (t.includes("insert into audit_events")) {
        const [
          organizationId,
          actorUserId,
          _actorType,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        ] = values as [string, string, string, string, string, string, unknown, unknown];
        void _actorType;
        audits.push({
          organizationId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        });
        return { rows: [] };
      }

      if (t.includes("insert into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, entries, approvals, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("TimeEntryService (DS 3.2)", () => {
  it("creates a time entry and emits project.time_entry.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-25",
      minutes: 90
    });
    expect(created.projectId).toBe("proj_1");
    expect(created.minutes).toBe(90);
    expect(created.status).toBe("draft");
    expect(created.billable).toBe(true);
    const createAudit = audits.find((a) => a.action === "project.time_entry.created");
    expect(createAudit).toBeDefined();
    expect(createAudit!.resourceType).toBe("time_entry");
    expect(createAudit!.resourceId).toBe(created.id);
  });

  it("updates a time entry and emits project.time_entry.updated", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-25",
      minutes: 60
    });
    const updated = await updateTimeEntry(db, context, created.id, { minutes: 120 });
    expect(updated.minutes).toBe(120);
    const updateAudit = audits.find((a) => a.action === "project.time_entry.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ minutes: 60, status: "draft" });
    expect(updateAudit!.afterSummary).toMatchObject({ minutes: 120 });
    expect(audits.find((a) => a.action === "project.time_entry.submitted")).toBeUndefined();
    expect(audits.find((a) => a.action === "project.time_entry.approved")).toBeUndefined();
  });

  it("transitioning to submitted emits project.time_entry.submitted in addition to updated", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-25",
      minutes: 60
    });
    await updateTimeEntry(db, context, created.id, { status: "submitted" });
    expect(audits.filter((a) => a.action === "project.time_entry.updated")).toHaveLength(1);
    const submittedAudit = audits.find((a) => a.action === "project.time_entry.submitted");
    expect(submittedAudit).toBeDefined();
    expect(submittedAudit!.resourceType).toBe("time_entry");
    expect(submittedAudit!.resourceId).toBe(created.id);
    expect(submittedAudit!.afterSummary).toMatchObject({ status: "submitted" });
  });

  it("transitioning to approved emits project.time_entry.approved in addition to updated", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-25",
      minutes: 60,
      status: "submitted"
    });
    await updateTimeEntry(db, context, created.id, { status: "approved" });
    const approvedAudit = audits.find((a) => a.action === "project.time_entry.approved");
    expect(approvedAudit).toBeDefined();
    expect(approvedAudit!.resourceId).toBe(created.id);
    expect(approvedAudit!.afterSummary).toMatchObject({ status: "approved" });
  });

  it("throws TimeEntryNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateTimeEntry(db, context, "te_nope", { minutes: 30 })
    ).rejects.toBeInstanceOf(TimeEntryNotFoundError);
  });

  it("lists time entries with projectId filter", async () => {
    const { db } = makeFakeDb();
    await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-25",
      minutes: 60
    });
    await createTimeEntry(db, context, {
      projectId: "proj_2",
      userId: "user_1",
      entryDate: "2026-05-25",
      minutes: 30
    });
    const all = await listTimeEntries(db, context);
    expect(all.length).toBe(2);
    const scoped = await listTimeEntries(db, context, { projectId: "proj_1" });
    expect(scoped).toHaveLength(1);
    expect(scoped[0]!.projectId).toBe("proj_1");
  });

  it("soft-deletes a time entry: emits project.time_entry.deleted and hides it", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-25",
      minutes: 45
    });
    await deleteTimeEntry(db, context, created.id);
    const deleteAudit = audits.find((a) => a.action === "project.time_entry.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    const list = await listTimeEntries(db, context);
    expect(list.find((e) => e.id === created.id)).toBeUndefined();
  });

  it("throws TimeEntryNotFoundError when deleting a non-existent entry", async () => {
    const { db } = makeFakeDb();
    await expect(deleteTimeEntry(db, context, "te_nope")).rejects.toBeInstanceOf(
      TimeEntryNotFoundError
    );
  });
});

describe("TimeEntryService DS 3.5 — ApprovalRequest integration", () => {
  it("submitTimeEntry creates an ApprovalRequest and links it; emits project.time_entry.submitted", async () => {
    const { db, entries, approvals, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-28",
      minutes: 60
    });
    expect(created.status).toBe("draft");

    const submitted = await submitTimeEntry(db, context, created.id, {
      approverUserIdentityId: "approver_user_identity_1"
    });

    expect(submitted.status).toBe("submitted");
    expect(submitted.approvalRequestId).toBeTruthy();
    expect(approvals).toHaveLength(1);
    expect(approvals[0]!.subjectType).toBe("time_entry");
    expect(approvals[0]!.subjectId).toBe(created.id);
    expect(approvals[0]!.status).toBe("pending");
    expect(entries.find((e) => e.id === created.id)?.approvalRequestId).toBeTruthy();

    const submittedAudit = audits.find((a) => a.action === "project.time_entry.submitted");
    expect(submittedAudit).toBeDefined();
    expect(submittedAudit!.resourceId).toBe(created.id);
  });

  it("submitTimeEntry defaults approver to actorUserId when no approver provided", async () => {
    const { db, approvals } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-28",
      minutes: 60
    });
    await submitTimeEntry(db, context, created.id);
    expect(approvals).toHaveLength(1);
    expect(approvals[0]!.approverUserIdentityId).toBe(context.actorUserId);
  });

  it("approveTimeEntry decides the linked ApprovalRequest and flips entry to approved", async () => {
    const { db, approvals, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-28",
      minutes: 60
    });
    await submitTimeEntry(db, context, created.id, {
      approverUserIdentityId: "approver_identity_1"
    });

    const approved = await approveTimeEntry(db, context, created.id, {
      decisionReason: "Looks good"
    });

    expect(approved.status).toBe("approved");
    expect(approvals[0]!.status).toBe("approved");
    expect(approvals[0]!.decisionReason).toBe("Looks good");

    const approvedAudit = audits.find((a) => a.action === "project.time_entry.approved");
    expect(approvedAudit).toBeDefined();
    expect(approvedAudit!.resourceId).toBe(created.id);

    // Foundation approval audit event must also be present
    const approvalDecidedAudit = audits.find((a) => a.action === "approval_request.decided");
    expect(approvalDecidedAudit).toBeDefined();
  });

  it("rejectTimeEntry decides the linked ApprovalRequest and flips entry to rejected", async () => {
    const { db, approvals, audits } = makeFakeDb();
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-28",
      minutes: 60
    });
    await submitTimeEntry(db, context, created.id, {
      approverUserIdentityId: "approver_identity_1"
    });

    const rejected = await rejectTimeEntry(db, context, created.id, {
      decisionReason: "Missing description"
    });

    expect(rejected.status).toBe("rejected");
    expect(approvals[0]!.status).toBe("rejected");

    const rejectedAudit = audits.find((a) => a.action === "project.time_entry.rejected");
    expect(rejectedAudit).toBeDefined();

    const approvalDecidedAudit = audits.find((a) => a.action === "approval_request.decided");
    expect(approvalDecidedAudit).toBeDefined();
  });

  it("approveTimeEntry falls back to direct flip when no linked approval (legacy entry)", async () => {
    const { db, approvals, audits } = makeFakeDb();
    // Seed entry directly at 'submitted' without an approval
    const created = await createTimeEntry(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      entryDate: "2026-05-28",
      minutes: 60,
      status: "submitted"
    });
    expect(created.approvalRequestId).toBeNull();

    const approved = await approveTimeEntry(db, context, created.id);
    expect(approved.status).toBe("approved");
    // No ApprovalRequest created in this path
    expect(approvals).toHaveLength(0);
    // But the project audit is still emitted
    const approvedAudit = audits.find((a) => a.action === "project.time_entry.approved");
    expect(approvedAudit).toBeDefined();
  });
});
