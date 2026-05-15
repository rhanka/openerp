import type {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalUrgency
} from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for ApprovalRequest entity (PG-07).
// Pure SQL surface. Service composition (validation, audit emission, MCP tool wiring) happens
// in apps/api/src/foundation/service.ts or in a dedicated approval-service.ts.

const APPROVAL_COLUMNS = `
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
  created_at as "createdAt"
`;

export interface CreateApprovalRow {
  requesterUserIdentityId: string;
  approverUserIdentityId: string | null;
  approverRoleId: string | null;
  subjectType: string;
  subjectId: string;
  reason: string;
  urgency: ApprovalUrgency;
  expiresAt: string | null;
}

export async function insertApprovalRequest(
  db: Queryable,
  context: TenantContext,
  row: CreateApprovalRow
): Promise<ApprovalRequest> {
  assertTenantContext(context);
  if (row.approverUserIdentityId === null && row.approverRoleId === null) {
    throw new Error("ApprovalRequest requires approverUserIdentityId or approverRoleId");
  }
  const result = await db.query<ApprovalRequest>(
    `insert into approval_requests (
       organization_id,
       requester_user_identity_id,
       approver_user_identity_id,
       approver_role_id,
       subject_type,
       subject_id,
       reason,
       urgency,
       status,
       expires_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
     returning ${APPROVAL_COLUMNS}`,
    [
      context.organizationId,
      row.requesterUserIdentityId,
      row.approverUserIdentityId,
      row.approverRoleId,
      row.subjectType,
      row.subjectId,
      row.reason,
      row.urgency,
      row.expiresAt
    ]
  );
  return result.rows[0]!;
}

export async function findApprovalRequestById(
  db: Queryable,
  context: TenantContext,
  approvalRequestId: string
): Promise<ApprovalRequest | null> {
  assertTenantContext(context);
  const result = await db.query<ApprovalRequest>(
    `select ${APPROVAL_COLUMNS}
       from approval_requests
      where id = $1 and organization_id = $2`,
    [approvalRequestId, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listPendingApprovalsForApprover(
  db: Queryable,
  context: TenantContext,
  approverUserIdentityId: string
): Promise<ApprovalRequest[]> {
  assertTenantContext(context);
  const result = await db.query<ApprovalRequest>(
    `select ${APPROVAL_COLUMNS}
       from approval_requests
      where organization_id = $1
        and approver_user_identity_id = $2
        and status = 'pending'
      order by created_at desc`,
    [context.organizationId, approverUserIdentityId]
  );
  return result.rows;
}

export async function recordApprovalDecision(
  db: Queryable,
  context: TenantContext,
  params: {
    approvalRequestId: string;
    approverUserIdentityId: string;
    decision: "approved" | "rejected" | "escalated";
    decisionReason: string;
    decidedAt: string;
  }
): Promise<ApprovalRequest | null> {
  assertTenantContext(context);
  const result = await db.query<ApprovalRequest>(
    `update approval_requests
        set status = $3,
            decision_reason = $4,
            decided_at = $5,
            approver_user_identity_id = coalesce(approver_user_identity_id, $6)
      where id = $1
        and organization_id = $2
        and status = 'pending'
      returning ${APPROVAL_COLUMNS}`,
    [
      params.approvalRequestId,
      context.organizationId,
      params.decision,
      params.decisionReason,
      params.decidedAt,
      params.approverUserIdentityId
    ]
  );
  return result.rows[0] ?? null;
}

export async function expireApprovalRequests(
  db: Queryable,
  context: TenantContext,
  asOf: string
): Promise<number> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update approval_requests
        set status = 'expired'
      where organization_id = $1
        and status = 'pending'
        and expires_at is not null
        and expires_at <= $2
      returning id`,
    [context.organizationId, asOf]
  );
  return result.rows.length;
}

export function isTerminalStatus(status: ApprovalStatus): boolean {
  return status === "approved" || status === "rejected" || status === "expired";
}
