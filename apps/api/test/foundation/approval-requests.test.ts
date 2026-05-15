import { beforeEach, describe, expect, it } from "vitest";
import type { ApprovalRequest } from "@openerp/domain";
import type { Queryable } from "../../src/db/client";
import {
  expireApprovalRequests,
  findApprovalRequestById,
  insertApprovalRequest,
  isTerminalStatus,
  listPendingApprovalsForApprover,
  recordApprovalDecision
} from "../../src/foundation/approval-requests";

// In-memory fake Queryable that records issued SQL and synthesises plausible rows.
// The schema is asserted separately in canon-schema.test.ts; here we test the
// repository's API contract (parameter wiring, returned shape) without a live database.
function makeFakeDb(initialRows: ApprovalRequest[] = []) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  let rows: ApprovalRequest[] = [...initialRows];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      calls.push({ text, values });
      const t = text;

      if (t.includes("insert into approval_requests")) {
        const [organizationId, requesterUserIdentityId, approverUserIdentityId, approverRoleId,
               subjectType, subjectId, reason, urgency, expiresAt] = values as [
          string, string, string | null, string | null, string, string, string,
          "low" | "normal" | "high", string | null
        ];
        const inserted: ApprovalRequest = {
          id: `appr_${rows.length + 1}`,
          organizationId,
          requesterUserIdentityId,
          approverUserIdentityId,
          approverRoleId,
          subjectType,
          subjectId,
          reason,
          urgency,
          status: "pending",
          decisionReason: null,
          decidedAt: null,
          expiresAt,
          createdAt: "2026-05-14T12:00:00.000Z"
        };
        rows.push(inserted);
        return { rows: [inserted as unknown as T] };
      }

      if (t.includes("from approval_requests") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = rows.find((r) => r.id === id && r.organizationId === organizationId);
        return { rows: found ? ([found as unknown as T]) : [] };
      }

      if (t.includes("from approval_requests") && t.includes("approver_user_identity_id = $2")) {
        const [organizationId, approverId] = values as [string, string];
        const matches = rows
          .filter((r) => r.organizationId === organizationId
            && r.approverUserIdentityId === approverId
            && r.status === "pending");
        return { rows: matches as unknown as T[] };
      }

      if (t.includes("update approval_requests") && t.includes("decision_reason")) {
        const [id, organizationId, decision, decisionReason, decidedAt, approverFallback] = values as [
          string, string, "approved" | "rejected" | "escalated", string, string, string
        ];
        const idx = rows.findIndex((r) => r.id === id && r.organizationId === organizationId && r.status === "pending");
        if (idx === -1) return { rows: [] };
        rows[idx] = {
          ...rows[idx]!,
          status: decision,
          decisionReason,
          decidedAt,
          approverUserIdentityId: rows[idx]!.approverUserIdentityId ?? approverFallback
        };
        return { rows: [rows[idx]! as unknown as T] };
      }

      if (t.includes("update approval_requests") && t.includes("'expired'")) {
        const [organizationId, asOf] = values as [string, string];
        const expired = rows.filter((r) => r.organizationId === organizationId
          && r.status === "pending"
          && r.expiresAt !== null
          && r.expiresAt! <= asOf);
        for (const e of expired) e.status = "expired";
        return { rows: expired.map((r) => ({ id: r.id })) as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db, calls, getRows: () => rows };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

describe("ApprovalRequest repository (PG-07)", () => {
  let fake: ReturnType<typeof makeFakeDb>;

  beforeEach(() => {
    fake = makeFakeDb();
  });

  it("inserts a pending request with the provided fields", async () => {
    const created = await insertApprovalRequest(fake.db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "Amount above auto-approve threshold",
      urgency: "normal",
      expiresAt: "2026-05-15T12:00:00.000Z"
    });
    expect(created.status).toBe("pending");
    expect(created.subjectType).toBe("invoice");
    expect(created.organizationId).toBe("org_1");
  });

  it("requires approverUserIdentityId or approverRoleId", async () => {
    await expect(
      insertApprovalRequest(fake.db, context, {
        requesterUserIdentityId: "uid_agent",
        approverUserIdentityId: null,
        approverRoleId: null,
        subjectType: "invoice",
        subjectId: "invoice_1",
        reason: "test",
        urgency: "normal",
        expiresAt: null
      })
    ).rejects.toThrow(/approverUserIdentityId or approverRoleId/);
  });

  it("looks up a request by id scoped to the tenant", async () => {
    const inserted = await insertApprovalRequest(fake.db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "Amount above threshold",
      urgency: "high",
      expiresAt: null
    });
    const found = await findApprovalRequestById(fake.db, context, inserted.id);
    expect(found?.id).toBe(inserted.id);
    expect(found?.urgency).toBe("high");

    const missing = await findApprovalRequestById(fake.db, context, "appr_does_not_exist");
    expect(missing).toBeNull();
  });

  it("lists only pending requests for a given approver", async () => {
    await insertApprovalRequest(fake.db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "r1",
      urgency: "normal",
      expiresAt: null
    });
    await insertApprovalRequest(fake.db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_other",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_2",
      reason: "r2",
      urgency: "normal",
      expiresAt: null
    });
    const pending = await listPendingApprovalsForApprover(fake.db, context, "uid_human");
    expect(pending).toHaveLength(1);
    expect(pending[0]!.approverUserIdentityId).toBe("uid_human");
  });

  it("records a decision and transitions the request out of pending", async () => {
    const inserted = await insertApprovalRequest(fake.db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "r",
      urgency: "normal",
      expiresAt: null
    });
    const decided = await recordApprovalDecision(fake.db, context, {
      approvalRequestId: inserted.id,
      approverUserIdentityId: "uid_human",
      decision: "approved",
      decisionReason: "policy clear",
      decidedAt: "2026-05-14T12:30:00.000Z"
    });
    expect(decided?.status).toBe("approved");
    expect(decided?.decisionReason).toBe("policy clear");

    // Second decision attempt fails (no longer pending).
    const reAttempt = await recordApprovalDecision(fake.db, context, {
      approvalRequestId: inserted.id,
      approverUserIdentityId: "uid_human",
      decision: "rejected",
      decisionReason: "should not work",
      decidedAt: "2026-05-14T12:31:00.000Z"
    });
    expect(reAttempt).toBeNull();
  });

  it("expires pending requests past their deadline", async () => {
    await insertApprovalRequest(fake.db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "r",
      urgency: "normal",
      expiresAt: "2026-05-14T10:00:00.000Z"
    });
    const count = await expireApprovalRequests(fake.db, context, "2026-05-14T11:00:00.000Z");
    expect(count).toBe(1);
  });

  it("knows which statuses are terminal", () => {
    expect(isTerminalStatus("approved")).toBe(true);
    expect(isTerminalStatus("rejected")).toBe(true);
    expect(isTerminalStatus("expired")).toBe(true);
    expect(isTerminalStatus("pending")).toBe(false);
    expect(isTerminalStatus("escalated")).toBe(false);
  });
});
