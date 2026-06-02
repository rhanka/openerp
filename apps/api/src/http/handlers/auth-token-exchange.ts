import type { Hono } from "hono";

import type { IdentityProvider } from "@sentropic/openerp-domain";

import type { AppBindings } from "../app";
import { recordAuditEvent } from "../../foundation/audit-emit";

// POST /auth/exchange-agent-token
//
// Trades an authenticated human session token (already verified by the JWT
// tenant resolver in the middleware) for a short-lived actor_type=agent token.
// Follows RFC 8693 semantics via IdentityProvider.exchangeForAgentToken.
//
// Security properties:
// - Endpoint is NOT public: tenant middleware has already verified the Bearer
//   token before this handler runs (401 if absent/invalid).
// - Scope intersection: minted agent token scopes ⊆ human session scopes
//   (no escalation — requestedScopes outside the human's set are silently
//   dropped).
// - TTL cap: ttlSeconds is capped to AGENT_TOKEN_MAX_TTL (900 s).
// - Issuance is audited as foundation.agent_token.issued.
// - The raw signing secret is never returned or logged.

export interface AgentTokenExchangeDeps {
  identityProvider: IdentityProvider;
}

const AGENT_TOKEN_MAX_TTL = 900; // 15 minutes

interface ExchangeBody {
  requestedScopes?: unknown;
  audience?: unknown;
  ttlSeconds?: unknown;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  return match?.[1] ?? null;
}

export function mountAgentTokenExchangeRoute(
  app: Hono<AppBindings>,
  deps: AgentTokenExchangeDeps
): void {
  app.post("/auth/exchange-agent-token", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");

    // The middleware has already verified the session — re-read the raw Bearer
    // token so we can pass it as subjectToken to exchangeForAgentToken.
    const rawSubjectToken = extractBearerToken(c.req.raw);
    if (!rawSubjectToken) {
      // Should not happen (middleware guards it), but be defensive.
      return c.json({ code: "UNAUTHORIZED" }, 401);
    }

    // Verify again to read claims (scopes, org) needed for the exchange.
    // This is a second in-process verify — no network/DB, just signature check.
    let subjectToken;
    try {
      subjectToken = await deps.identityProvider.verify(rawSubjectToken);
    } catch {
      return c.json({ code: "UNAUTHORIZED" }, 401);
    }

    // Only human actors may mint agent tokens.
    if (subjectToken.actorType !== "human") {
      return c.json({ code: "FORBIDDEN", message: "Only human session tokens may mint agent tokens" }, 403);
    }

    // Parse + validate request body.
    let body: ExchangeBody;
    try {
      body = await c.req.json<ExchangeBody>();
    } catch {
      body = {};
    }

    const rawRequestedScopes: string[] =
      Array.isArray(body.requestedScopes)
        ? (body.requestedScopes as unknown[]).filter((s): s is string => typeof s === "string")
        : [];

    const audience: string | undefined =
      typeof body.audience === "string" ? body.audience : undefined;

    const rawTtl =
      typeof body.ttlSeconds === "number" && Number.isFinite(body.ttlSeconds)
        ? Math.floor(body.ttlSeconds)
        : AGENT_TOKEN_MAX_TTL;
    const ttlSeconds = Math.min(Math.max(rawTtl, 1), AGENT_TOKEN_MAX_TTL);

    // Scope intersection — NO escalation.
    const humanScopes = new Set(subjectToken.scopes);
    const intersectedScopes =
      rawRequestedScopes.length > 0
        ? rawRequestedScopes.filter((s) => humanScopes.has(s))
        : subjectToken.scopes.slice(); // default: same scopes as human (still ⊆)

    // Mint the agent token via the domain layer.
    let agentToken;
    try {
      agentToken = await deps.identityProvider.exchangeForAgentToken({
        subjectToken: rawSubjectToken,
        subjectUserIdentityId: subjectToken.subjectUserIdentityId,
        actingForUserIdentityId: subjectToken.subjectUserIdentityId,
        requestedScopes: intersectedScopes,
        organizationId: tenant.organizationId,
        approvalRequestId: null,
        policyDecisionId: null,
        ttlSeconds,
        ...(audience ? { audience } : {})
      });
    } catch (err: unknown) {
      const code = err instanceof Error && "code" in err
        ? (err as { code: string }).code
        : "TOKEN_EXCHANGE_FAILED";
      return c.json({ code }, 403);
    }

    // Emit audited issuance event.
    // foundation.agent_token.issued — "issued" is in ALLOWED_VERBS.
    try {
      await recordAuditEvent(db, tenant, {
        action: "foundation.agent_token.issued",
        resourceType: "agent_token",
        resourceId: agentToken.subjectUserIdentityId,
        actorType: "human",
        afterSummary: {
          actorType: agentToken.actorType,
          scopes: agentToken.scopes,
          expiresAt: agentToken.expiresAt,
          actSub: subjectToken.subjectUserIdentityId
        }
      });
    } catch {
      // Audit failure must never block the issuance response.
    }

    return c.json(
      {
        token: agentToken.raw,
        expiresAt: agentToken.expiresAt,
        actorType: agentToken.actorType,
        scopes: agentToken.scopes
      },
      200
    );
  });
}
