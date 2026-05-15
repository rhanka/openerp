import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

interface ApprovalRow {
  id: string;
  organization_id: string;
  status: string;
  requester_user_identity_id: string;
  approver_user_identity_id: string | null;
  approver_role_id: string | null;
  subject_type: string;
  subject_id: string;
  reason: string;
  urgency: "low" | "normal" | "high";
  decision_reason: string | null;
  decided_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface IdempotencyRow {
  organization_id: string;
  key: string;
  request_hash: string;
  response_body_hash: string;
  status_code: number;
  created_at: string;
  expires_at: string;
}

function makeFakeDb() {
  const approvals: ApprovalRow[] = [];
  const audits: { action: string; resource_id: string }[] = [];
  const idempotency: IdempotencyRow[] = [];

  function approvalReturning(row: ApprovalRow) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      requesterUserIdentityId: row.requester_user_identity_id,
      approverUserIdentityId: row.approver_user_identity_id,
      approverRoleId: row.approver_role_id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      reason: row.reason,
      urgency: row.urgency,
      status: row.status,
      decisionReason: row.decision_reason,
      decidedAt: row.decided_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("with attempt") && t.includes("insert into idempotency_records")) {
        const [organizationId, key, requestHash, responseBodyHash, statusCode, createdAt, expiresAt] =
          values as [string, string, string, string, number, string, string];
        const existing = idempotency.find((r) => r.organization_id === organizationId && r.key === key);
        if (existing) {
          return {
            rows: [{
              replay: true,
              organizationId: existing.organization_id,
              key: existing.key,
              requestHash: existing.request_hash,
              responseBodyHash: existing.response_body_hash,
              statusCode: existing.status_code,
              createdAt: existing.created_at,
              expiresAt: existing.expires_at
            } as unknown as T]
          };
        }
        const row: IdempotencyRow = {
          organization_id: organizationId, key, request_hash: requestHash,
          response_body_hash: responseBodyHash, status_code: statusCode,
          created_at: createdAt, expires_at: expiresAt
        };
        idempotency.push(row);
        return {
          rows: [{
            replay: false,
            organizationId, key, requestHash, responseBodyHash, statusCode, createdAt, expiresAt
          } as unknown as T]
        };
      }

      if (t.includes("update idempotency_records")) {
        const [organizationId, key, responseBodyHash, statusCode] = values as [
          string, string, string, number
        ];
        const idx = idempotency.findIndex((r) => r.organization_id === organizationId && r.key === key);
        if (idx === -1) return { rows: [] };
        idempotency[idx] = { ...idempotency[idx]!, response_body_hash: responseBodyHash, status_code: statusCode };
        return { rows: [idempotency[idx]! as unknown as T] };
      }

      if (t.includes("insert into approval_requests")) {
        const [organizationId, requesterUserIdentityId, approverUserIdentityId, approverRoleId,
               subjectType, subjectId, reason, urgency, expiresAt] = values as [
          string, string, string | null, string | null, string, string, string,
          "low" | "normal" | "high", string | null
        ];
        const row: ApprovalRow = {
          id: `appr_${approvals.length + 1}`,
          organization_id: organizationId,
          requester_user_identity_id: requesterUserIdentityId,
          approver_user_identity_id: approverUserIdentityId,
          approver_role_id: approverRoleId,
          subject_type: subjectType,
          subject_id: subjectId,
          reason,
          urgency,
          status: "pending",
          decision_reason: null,
          decided_at: null,
          expires_at: expiresAt,
          created_at: "2026-05-14T22:00:00.000Z"
        };
        approvals.push(row);
        return { rows: [approvalReturning(row) as unknown as T] };
      }

      if (t.includes("from approval_requests") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = approvals.find((r) => r.id === id && r.organization_id === organizationId);
        return { rows: found ? [approvalReturning(found) as unknown as T] : [] };
      }

      if (t.includes("from approval_requests") && t.includes("approver_user_identity_id = $2")) {
        const [organizationId, approverId] = values as [string, string];
        return {
          rows: approvals
            .filter((r) => r.organization_id === organizationId
              && r.approver_user_identity_id === approverId
              && r.status === "pending")
            .map((r) => approvalReturning(r) as unknown as T)
        };
      }

      if (t.includes("update approval_requests") && t.includes("decision_reason = $4")
          && t.includes("status = $3")
          && t.includes("decided_at = $5")) {
        const [id, organizationId, decision, decisionReason, decidedAt, approverFallback] = values as [
          string, string, "approved" | "rejected" | "escalated", string, string, string
        ];
        const idx = approvals.findIndex((r) => r.id === id && r.organization_id === organizationId && r.status === "pending");
        if (idx === -1) return { rows: [] };
        approvals[idx] = {
          ...approvals[idx]!,
          status: decision,
          decision_reason: decisionReason,
          decided_at: decidedAt,
          approver_user_identity_id: approvals[idx]!.approver_user_identity_id ?? approverFallback
        };
        return { rows: [approvalReturning(approvals[idx]!) as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const [, , action, resourceId] = values as [string, string, string, string];
        audits.push({ action, resource_id: resourceId });
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, approvals, audits, idempotency };
}

function tenantHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "x-organization-id": "org_1",
    "x-user-identity-id": "uid_caller",
    "content-type": "application/json",
    ...extra
  };
}

describe("Hono app integration (PG-07 + PG-08 + Lot 4)", () => {
  it("returns 401 when tenant headers are missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/healthz");
    expect(res.status).toBe(401);
  });

  it("answers /healthz with the tenant context resolved", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/healthz", { headers: tenantHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("requires Idempotency-Key on POST /approval-requests", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/approval-requests", {
      method: "POST",
      headers: tenantHeaders(),
      body: JSON.stringify({
        requesterUserIdentityId: "uid_agent",
        approverUserIdentityId: "uid_human",
        subjectType: "invoice",
        subjectId: "invoice_1",
        reason: "Amount above threshold",
        urgency: "normal"
      })
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "IDEMPOTENCY_KEY_REQUIRED" });
  });

  it("creates an ApprovalRequest end-to-end and replays the same Idempotency-Key", async () => {
    const { db, audits } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const body = JSON.stringify({
      requesterUserIdentityId: "uid_agent",
      approverUserIdentityId: "uid_human",
      subjectType: "invoice",
      subjectId: "invoice_1",
      reason: "Amount above threshold",
      urgency: "normal"
    });
    const firstRes = await app.request("/approval-requests", {
      method: "POST",
      headers: tenantHeaders({ "idempotency-key": "k-first" }),
      body
    });
    expect(firstRes.status).toBe(201);
    const created = (await firstRes.json()) as { id: string; status: string };
    expect(created.status).toBe("pending");
    expect(audits.some((a) => a.action === "approval_request.created")).toBe(true);

    const replayRes = await app.request("/approval-requests", {
      method: "POST",
      headers: tenantHeaders({ "idempotency-key": "k-first" }),
      body
    });
    expect(replayRes.status).toBe(201);
    const replay = (await replayRes.json()) as { replayed?: boolean; key?: string };
    expect(replay.replayed).toBe(true);
    expect(replay.key).toBe("k-first");
  });

  it("decides an approval request via PATCH and returns 409 on second attempt", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const create = await app.request("/approval-requests", {
      method: "POST",
      headers: tenantHeaders({ "idempotency-key": "k-create" }),
      body: JSON.stringify({
        requesterUserIdentityId: "uid_agent",
        approverUserIdentityId: "uid_human",
        subjectType: "invoice",
        subjectId: "invoice_1",
        reason: "r",
        urgency: "normal"
      })
    });
    const created = (await create.json()) as { id: string };

    const decideRes = await app.request(`/approval-requests/${created.id}/decide`, {
      method: "PATCH",
      headers: tenantHeaders({ "idempotency-key": "k-decide-1" }),
      body: JSON.stringify({ decision: "approved", decisionReason: "ok" })
    });
    expect(decideRes.status).toBe(200);
    const decided = (await decideRes.json()) as { status: string };
    expect(decided.status).toBe("approved");

    const secondTry = await app.request(`/approval-requests/${created.id}/decide`, {
      method: "PATCH",
      headers: tenantHeaders({ "idempotency-key": "k-decide-2" }),
      body: JSON.stringify({ decision: "rejected", decisionReason: "late" })
    });
    expect(secondTry.status).toBe(409);
  });
});
