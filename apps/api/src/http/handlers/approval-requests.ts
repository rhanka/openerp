import type { Hono } from "hono";

import type { ApprovalUrgency } from "@openerp/domain";

import type { AppBindings } from "../app";
import {
  ApprovalNotPendingError,
  createApprovalRequest,
  decideApprovalRequest,
  getApprovalRequest,
  listPendingApprovalsForApproverService
} from "../../foundation/approval-service";
import {
  IDEMPOTENCY_TTL_SECONDS,
  IdempotencyKeyRequiredError,
  withIdempotency
} from "../idempotency-middleware";

const URGENCIES: readonly ApprovalUrgency[] = ["low", "normal", "high"];
const DECISIONS = ["approved", "rejected", "escalated"] as const;

interface CreateBody {
  requesterUserIdentityId: string;
  approverUserIdentityId?: string | null;
  approverRoleId?: string | null;
  subjectType: string;
  subjectId: string;
  reason: string;
  urgency: ApprovalUrgency;
  expiresAt?: string | null;
}

interface DecideBody {
  approverUserIdentityId?: string;
  decision: (typeof DECISIONS)[number];
  decisionReason: string;
}

export function mountApprovalRequestRoutes(app: Hono<AppBindings>): void {
  app.post("/approval-requests", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let parsed: CreateBody;
    try {
      parsed = await c.req.json<CreateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    const validation = validateCreate(parsed);
    if (!validation.ok) {
      return c.json({ code: "INVALID_INPUT", errors: validation.errors }, 400);
    }
    const headers = readHeaders(c.req.raw.headers);
    try {
      const outcome = await withIdempotency(
        db,
        tenant,
        {
          method: "POST",
          path: "/approval-requests",
          body: parsed,
          headers
        },
        async () => {
          const created = await createApprovalRequest(db, tenant, {
            requesterUserIdentityId: parsed.requesterUserIdentityId,
            approverUserIdentityId: parsed.approverUserIdentityId ?? null,
            approverRoleId: parsed.approverRoleId ?? null,
            subjectType: parsed.subjectType,
            subjectId: parsed.subjectId,
            reason: parsed.reason,
            urgency: parsed.urgency,
            expiresAt: parsed.expiresAt ?? null
          });
          return { statusCode: 201, body: created };
        },
        () => new Date().toISOString()
      );
      return c.json(outcome.body, outcome.statusCode as 200 | 201);
    } catch (err) {
      if (err instanceof IdempotencyKeyRequiredError) {
        return c.json({ code: err.code }, 400);
      }
      throw err;
    }
  });

  app.get("/approval-requests", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const approver = c.req.query("approver");
    if (!approver) {
      return c.json({ code: "APPROVER_REQUIRED" }, 400);
    }
    const list = await listPendingApprovalsForApproverService(db, tenant, approver);
    return c.json(list);
  });

  app.get("/approval-requests/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getApprovalRequest(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/approval-requests/:id/decide", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const approvalRequestId = c.req.param("id");
    let parsed: DecideBody;
    try {
      parsed = await c.req.json<DecideBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    const validation = validateDecide(parsed);
    if (!validation.ok) {
      return c.json({ code: "INVALID_INPUT", errors: validation.errors }, 400);
    }
    const headers = readHeaders(c.req.raw.headers);
    try {
      const outcome = await withIdempotency(
        db,
        tenant,
        {
          method: "PATCH",
          path: `/approval-requests/${approvalRequestId}/decide`,
          body: parsed,
          headers
        },
        async () => {
          try {
            const updated = await decideApprovalRequest(db, tenant, {
              approvalRequestId,
              approverUserIdentityId: parsed.approverUserIdentityId ?? tenant.actorUserId,
              decision: parsed.decision,
              decisionReason: parsed.decisionReason,
              decidedAt: new Date().toISOString()
            });
            return { statusCode: 200, body: updated };
          } catch (err) {
            if (err instanceof ApprovalNotPendingError) {
              return { statusCode: 409, body: { code: err.code } };
            }
            throw err;
          }
        },
        () => new Date().toISOString()
      );
      return c.json(outcome.body, outcome.statusCode as 200 | 409);
    } catch (err) {
      if (err instanceof IdempotencyKeyRequiredError) {
        return c.json({ code: err.code }, 400);
      }
      throw err;
    }
  });
}

interface Validation {
  ok: boolean;
  errors: Record<string, string>;
}

function validateCreate(body: CreateBody): Validation {
  const errors: Record<string, string> = {};
  if (!body?.requesterUserIdentityId) errors.requesterUserIdentityId = "REQUIRED";
  if (!body?.subjectType) errors.subjectType = "REQUIRED";
  if (!body?.subjectId) errors.subjectId = "REQUIRED";
  if (!body?.reason) errors.reason = "REQUIRED";
  if (!URGENCIES.includes(body?.urgency)) errors.urgency = "INVALID";
  if (!body?.approverUserIdentityId && !body?.approverRoleId) {
    errors.approver = "APPROVER_USER_OR_ROLE_REQUIRED";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateDecide(body: DecideBody): Validation {
  const errors: Record<string, string> = {};
  if (!DECISIONS.includes(body?.decision)) errors.decision = "INVALID";
  if (!body?.decisionReason) errors.decisionReason = "REQUIRED";
  return { ok: Object.keys(errors).length === 0, errors };
}

function readHeaders(headers: Headers): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  headers.forEach((value, name) => {
    out[name] = value;
  });
  return out;
}

// IDEMPOTENCY_TTL_SECONDS is re-exported for tests that need the literal value.
export const IDEMPOTENCY_TTL = IDEMPOTENCY_TTL_SECONDS;
