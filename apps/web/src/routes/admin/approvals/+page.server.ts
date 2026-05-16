import { env } from "$env/dynamic/private";
import { fail, type Actions } from "@sveltejs/kit";

import type { ApprovalRequest } from "@sentropic/openerp-domain";

import { createApiClient } from "$lib/api/client";

import type { PageServerLoad } from "./$types";

// SSR loader + form action for the pending approvals queue. The list is
// restricted to ApprovalRequest rows where the dev user is the approver —
// same model that the live UI will use once the session JWT lands.

const DEMO_FALLBACK: ApprovalRequest[] = [
  {
    id: "demo-1",
    organizationId: "demo-org",
    requesterUserIdentityId: "demo-agent",
    approverUserIdentityId: "demo-user",
    approverRoleId: null,
    subjectType: "invoice",
    subjectId: "INV-DEMO-000001",
    reason: "Demo: amount above tenant threshold",
    urgency: "high",
    status: "pending",
    decisionReason: null,
    decidedAt: null,
    expiresAt: null,
    createdAt: new Date().toISOString()
  }
];

function clientFromEnv(fetchImpl: typeof fetch) {
  const baseUrl = env.OPENERP_API_URL ?? "http://127.0.0.1:4000";
  const organizationId = env.OPENERP_DEV_ORG_ID ?? "";
  const actorUserId = env.OPENERP_DEV_USER_ID ?? "";
  if (!organizationId || !actorUserId) return null;
  return {
    client: createApiClient({
      baseUrl,
      organizationId,
      actorUserId,
      fetch: fetchImpl as typeof globalThis.fetch
    }),
    actorUserId
  };
}

export const load: PageServerLoad = async ({ fetch }) => {
  const session = clientFromEnv(fetch);
  if (!session) {
    return { approvals: DEMO_FALLBACK, source: "demo" as const };
  }
  try {
    const approvals = await session.client.listPendingApprovalsForApprover(session.actorUserId);
    return { approvals, source: "api" as const };
  } catch (err) {
    return {
      approvals: [] as ApprovalRequest[],
      source: "error" as const,
      message: err instanceof Error ? err.message : String(err)
    };
  }
};

export const actions: Actions = {
  decide: async ({ request, fetch }) => {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    const decision = String(form.get("decision") ?? "") as
      | "approved"
      | "rejected"
      | "escalated";
    const decisionReason = String(form.get("decisionReason") ?? "").trim();
    if (!id) return fail(400, { code: "ID_REQUIRED" });
    if (!["approved", "rejected", "escalated"].includes(decision)) {
      return fail(400, { code: "INVALID_DECISION" });
    }
    if (!decisionReason) return fail(400, { code: "REASON_REQUIRED", id });

    const session = clientFromEnv(fetch);
    if (!session) {
      return fail(503, { code: "DEMO_MODE_NO_API" });
    }
    try {
      const result = await session.client.decideApprovalRequest({
        id,
        decision,
        decisionReason,
        idempotencyKey: `web-${id}-${Date.now()}`,
        approverUserIdentityId: session.actorUserId
      });
      if ("code" in result) {
        return fail(409, { code: result.code, id });
      }
      return { ok: true as const, id, decision };
    } catch (err) {
      return fail(502, { code: "API_ERROR", message: err instanceof Error ? err.message : String(err) });
    }
  }
};
