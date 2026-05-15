import type { ApprovalRequest, ApprovalStatus, ApprovalUrgency } from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import {
  findApprovalRequestById,
  insertApprovalRequest,
  isTerminalStatus,
  listPendingApprovalsForApprover,
  recordApprovalDecision
} from "./approval-requests";

// Service wiring for the ApprovalService contract (PG-07). Layers the repository
// with audit-event emission and validation. Idempotency on create is handled at
// the HTTP boundary via withIdempotency (see http/idempotency-middleware.ts).

export interface CreateApprovalRequestInput {
  requesterUserIdentityId: string;
  approverUserIdentityId: string | null;
  approverRoleId: string | null;
  subjectType: string;
  subjectId: string;
  reason: string;
  urgency: ApprovalUrgency;
  expiresAt?: string | null;
}

export interface DecideApprovalRequestInput {
  approvalRequestId: string;
  approverUserIdentityId: string;
  decision: "approved" | "rejected" | "escalated";
  decisionReason: string;
  decidedAt: string;
}

export class ApprovalNotPendingError extends Error {
  readonly code = "APPROVAL_NOT_PENDING";
  constructor(approvalRequestId: string) {
    super(`Approval request ${approvalRequestId} is not pending`);
  }
}

export async function createApprovalRequest(
  db: Queryable,
  context: TenantContext,
  input: CreateApprovalRequestInput
): Promise<ApprovalRequest> {
  assertTenantContext(context);
  const created = await insertApprovalRequest(db, context, {
    requesterUserIdentityId: input.requesterUserIdentityId,
    approverUserIdentityId: input.approverUserIdentityId,
    approverRoleId: input.approverRoleId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    reason: input.reason,
    urgency: input.urgency,
    expiresAt: input.expiresAt ?? null
  });
  await emitApprovalAudit(db, context, {
    action: "approval_request.created",
    approvalRequestId: created.id,
    beforeSummary: null,
    afterSummary: {
      subjectType: created.subjectType,
      subjectId: created.subjectId,
      urgency: created.urgency,
      status: created.status
    }
  });
  return created;
}

export async function decideApprovalRequest(
  db: Queryable,
  context: TenantContext,
  input: DecideApprovalRequestInput
): Promise<ApprovalRequest> {
  assertTenantContext(context);
  const before = await findApprovalRequestById(db, context, input.approvalRequestId);
  if (!before || isTerminalStatus(before.status) || before.status === "pending" ? false : true) {
    // The expression above is intentionally simple; the canonical guard is below.
  }
  if (!before) throw new ApprovalNotPendingError(input.approvalRequestId);
  if (before.status !== "pending") throw new ApprovalNotPendingError(input.approvalRequestId);

  const decided = await recordApprovalDecision(db, context, input);
  if (!decided) throw new ApprovalNotPendingError(input.approvalRequestId);

  await emitApprovalAudit(db, context, {
    action: "approval_request.decided",
    approvalRequestId: decided.id,
    beforeSummary: { status: before.status },
    afterSummary: {
      status: decided.status,
      decisionReason: decided.decisionReason
    }
  });
  return decided;
}

export async function getApprovalRequest(
  db: Queryable,
  context: TenantContext,
  approvalRequestId: string
): Promise<ApprovalRequest | null> {
  return findApprovalRequestById(db, context, approvalRequestId);
}

export async function listPendingApprovalsForApproverService(
  db: Queryable,
  context: TenantContext,
  approverUserIdentityId: string
): Promise<ApprovalRequest[]> {
  return listPendingApprovalsForApprover(db, context, approverUserIdentityId);
}

export async function setApprovalRequestStatus(
  db: Queryable,
  context: TenantContext,
  approvalRequestId: string,
  status: ApprovalStatus,
  reason: string
): Promise<ApprovalRequest> {
  assertTenantContext(context);
  const before = await findApprovalRequestById(db, context, approvalRequestId);
  if (!before) throw new Error(`Approval request ${approvalRequestId} not found`);
  const result = await db.query<ApprovalRequest>(
    `update approval_requests
        set status = $3,
            decision_reason = $4,
            decided_at = case when $3 in ('approved','rejected','expired') then now() else decided_at end
      where id = $1 and organization_id = $2
      returning
        id,
        organization_id as "organizationId",
        requester_user_identity_id as "requesterUserIdentityId",
        approver_user_identity_id as "approverUserIdentityId",
        approver_role_id as "approverRoleId",
        subject_type as "subjectType",
        subject_id as "subjectId",
        reason,
        urgency,
        status,
        decision_reason as "decisionReason",
        decided_at as "decidedAt",
        expires_at as "expiresAt",
        created_at as "createdAt"`,
    [approvalRequestId, context.organizationId, status, reason]
  );
  const updated = result.rows[0];
  await emitApprovalAudit(db, context, {
    action: "approval_request.status_set",
    approvalRequestId,
    beforeSummary: { status: before.status },
    afterSummary: { status, reason }
  });
  return updated;
}

interface EmitApprovalAuditInput {
  action: string;
  approvalRequestId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitApprovalAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitApprovalAuditInput
): Promise<void> {
  await db.query(
    `insert into audit_events (
       organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
       before_summary, after_summary
     ) values ($1, $2, 'user', $3, 'approval_request', $4, $5, $6)`,
    [
      context.organizationId,
      context.actorUserId,
      input.action,
      input.approvalRequestId,
      input.beforeSummary,
      input.afterSummary
    ]
  );
}
