import { describe, expect, it } from "vitest";

import type { Assignment } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import {
  AssignmentNotFoundError,
  createAssignment,
  deleteAssignment,
  listAssignments,
  updateAssignment
} from "../../src/project/assignment-service";

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
  const assignments: Assignment[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into assignments")) {
        const [organizationId, projectId, userId, roleLabel, allocationPercent, startDate, endDate, billableRateId] =
          values as [string, string, string, string | null, number | null, string | null, string | null, string | null];
        const row: Assignment = {
          id: `asgn_${assignments.length + 1}`,
          organizationId,
          projectId,
          userId,
          roleLabel,
          allocationPercent,
          startDate,
          endDate,
          billableRateId,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        assignments.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from assignments") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = assignments.find(
          (a) =>
            a.id === id &&
            a.organizationId === organizationId &&
            !(a as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from assignments") && t.includes("order by created_at desc")) {
        const [organizationId, projectIdFilter, userIdFilter, limit, offset] = values as [
          string,
          string | null,
          string | null,
          number,
          number
        ];
        const filtered = assignments
          .filter((a) => a.organizationId === organizationId)
          .filter((a) => !(a as unknown as { _deleted?: boolean })._deleted)
          .filter((a) => (projectIdFilter ? a.projectId === projectIdFilter : true))
          .filter((a) => (userIdFilter ? a.userId === userIdFilter : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update assignments") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = assignments.findIndex(
          (a) =>
            a.id === id &&
            a.organizationId === organizationId &&
            !(a as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (assignments[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: assignments[idx]!.id } as unknown as T] };
      }

      if (t.includes("update assignments")) {
        const [id, organizationId] = values as [string, string];
        const idx = assignments.findIndex(
          (a) => a.id === id && a.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Assignment> = {};
        if (t.includes("role_label = $")) {
          const roleVal = trailing.find((v) => typeof v === "string");
          if (roleVal !== undefined) patch.roleLabel = String(roleVal);
        }
        if (t.includes("allocation_percent = $")) {
          const allocVal = trailing.find((v) => typeof v === "number");
          if (allocVal !== undefined) patch.allocationPercent = allocVal as number;
        }
        assignments[idx] = { ...assignments[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [assignments[idx]! as unknown as T] };
      }

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

  return { db, assignments, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("AssignmentService (DS 3.3)", () => {
  it("creates an assignment and emits project.assignment.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createAssignment(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      roleLabel: "Lead developer",
      allocationPercent: 80
    });
    expect(created.projectId).toBe("proj_1");
    expect(created.userId).toBe("user_1");
    expect(created.allocationPercent).toBe(80);
    const createAudit = audits.find((a) => a.action === "project.assignment.created");
    expect(createAudit).toBeDefined();
    expect(createAudit!.resourceType).toBe("assignment");
    expect(createAudit!.resourceId).toBe(created.id);
  });

  it("updates an assignment and emits project.assignment.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createAssignment(db, context, {
      projectId: "proj_1",
      userId: "user_1",
      roleLabel: "Developer",
      allocationPercent: 50
    });
    const updated = await updateAssignment(db, context, created.id, {
      roleLabel: "Senior developer",
      allocationPercent: 100
    });
    expect(updated.roleLabel).toBe("Senior developer");
    const updateAudit = audits.find((a) => a.action === "project.assignment.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ roleLabel: "Developer" });
  });

  it("throws AssignmentNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateAssignment(db, context, "asgn_nope", { roleLabel: "X" })
    ).rejects.toBeInstanceOf(AssignmentNotFoundError);
  });

  it("lists assignments with projectId filter", async () => {
    const { db } = makeFakeDb();
    await createAssignment(db, context, { projectId: "proj_1", userId: "user_1" });
    await createAssignment(db, context, { projectId: "proj_2", userId: "user_2" });
    const all = await listAssignments(db, context);
    expect(all.length).toBe(2);
    const scoped = await listAssignments(db, context, { projectId: "proj_1" });
    expect(scoped.map((a) => a.projectId)).toEqual(["proj_1"]);
  });

  it("soft-deletes an assignment: emits project.assignment.deleted and hides it", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createAssignment(db, context, {
      projectId: "proj_1",
      userId: "user_1"
    });
    await deleteAssignment(db, context, created.id);
    const deleteAudit = audits.find((a) => a.action === "project.assignment.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    const list = await listAssignments(db, context);
    expect(list.find((a) => a.id === created.id)).toBeUndefined();
  });

  it("throws AssignmentNotFoundError when deleting a non-existent assignment", async () => {
    const { db } = makeFakeDb();
    await expect(deleteAssignment(db, context, "asgn_nope")).rejects.toBeInstanceOf(
      AssignmentNotFoundError
    );
  });
});
