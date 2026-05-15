import { describe, expect, it } from "vitest";
import type { ApprovalRequest } from "@openerp/domain";
import type { Queryable } from "../../src/db/client";
import {
  ApprovalNotPendingError,
  createApprovalRequest,
  decideApprovalRequest,
  setApprovalRequestStatus
} from "../../src/foundation/approval-service";

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
  const approvals: ApprovalRequest[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into approval_requests")) {
        const [organizationId, requesterUserIdentityId, approverUserIdentityId, approverRoleId,
               subjectType, subjectId, reason, urgency, expiresAt] = values as [
          string, string, string | null, string | null, string, string, string,
          "low" | "normal" | "high", string | null
        ];
        const row: ApprovalRequest = {
          id: `appr_${approvals.length + 1}`,
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
        approvals.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from approval_requests") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = approvals.find((r) => r.id === id && r.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("update approval_requests") && t.includes("set status = $3")
          && t.includes("decided_at = case when")) {
        const [id, organizationId, status, reason] = values as [
          string, string, "approved" | "rejected" | "escalated" | "expired" | "pending", string
        ];
        const idx = approvals.findIndex((r) => r.id === id && r.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        approvals[idx] = { ...approvals[idx], status, decisionReason: reason };
        return { rows: [approvals[idx] as unknown as T] };
      }

      if (t.includes("update approval_requests") && t.includes("decision_reason")) {
        const [id, organizationId, decision, decisionReason, decidedAt, approverFallback] = values as [
          string, string, "approved" | "rejected" | "escalated", string, string, string
        ];
        const idx = approvals.findIndex((r) =>
          r.id === id && r.organizationId === organizationId && r.status === "pending");
        if (idx === -1) return { rows: [] };
        approvals[idx] = {
          ...approvals[idx],
          status: decision,
          decisionReason,
          decidedAt,
          approverUserIdentityId: approvals[idx].approverUserIdentityId ?? approverFallback
        };
        return { rows: [approvals[idx] as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const [organizationId, actorUserId, action, resourceId, beforeSummary, afterSummary] =
          values as [string, string, string, string, unknown, unknown];
        audits.push({
          organizationId, actorUserId,
          action, resourceType: "approval_request",
          resourceId, beforeSummary, afterSummary
        });
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, audits, approvals };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("ApprovalService (PG-07)", () => {
  it("emits audit event on create with the after summary", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createApprovalRequest(db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "Amount above threshold",
      urgency: "normal"
    });
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("approval_request.created");
    expect(audits[0].resourceId).toBe(created.id);
    expect(audits[0].afterSummary).toMatchObject({ status: "pending" });
  });

  it("emits audit event on decide with before/after status", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createApprovalRequest(db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "r",
      urgency: "high"
    });
    const decided = await decideApprovalRequest(db, context, {
      approvalRequestId: created.id,
      approverUserIdentityId: "uid_human",
      decision: "approved",
      decisionReason: "ok",
      decidedAt: "2026-05-14T12:30:00.000Z"
    });
    expect(decided.status).toBe("approved");
    const decideAudits = audits.filter((a) => a.action === "approval_request.decided");
    expect(decideAudits).toHaveLength(1);
    expect(decideAudits[0].beforeSummary).toMatchObject({ status: "pending" });
    expect(decideAudits[0].afterSummary).toMatchObject({ status: "approved" });
  });

  it("throws ApprovalNotPendingError when deciding an unknown or terminal request", async () => {
    const { db } = makeFakeDb();
    await expect(
      decideApprovalRequest(db, context, {
        approvalRequestId: "appr_nope",
        approverUserIdentityId: "uid_human",
        decision: "approved",
        decisionReason: "r",
        decidedAt: "2026-05-14T12:30:00.000Z"
      })
    ).rejects.toBeInstanceOf(ApprovalNotPendingError);

    const created = await createApprovalRequest(db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "r",
      urgency: "normal"
    });
    await decideApprovalRequest(db, context, {
      approvalRequestId: created.id,
      approverUserIdentityId: "uid_human",
      decision: "approved",
      decisionReason: "ok",
      decidedAt: "2026-05-14T12:30:00.000Z"
    });
    await expect(
      decideApprovalRequest(db, context, {
        approvalRequestId: created.id,
        approverUserIdentityId: "uid_human",
        decision: "rejected",
        decisionReason: "late",
        decidedAt: "2026-05-14T13:00:00.000Z"
      })
    ).rejects.toBeInstanceOf(ApprovalNotPendingError);
  });

  it("setApprovalRequestStatus updates and emits an audit event", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createApprovalRequest(db, context, {
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      approverRoleId: null,
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "r",
      urgency: "normal"
    });
    const updated = await setApprovalRequestStatus(db, context, created.id, "expired", "ttl");
    expect(updated.status).toBe("expired");
    expect(audits.filter((a) => a.action === "approval_request.status_set")).toHaveLength(1);
  });
});
