import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Hono } from "hono";

import type { Queryable } from "../../db/client";
import type { OidcClient } from "../../auth/oidc-client";
import {
  OidcStateNotFoundError,
  OidcTokenExchangeError,
  OidcInvalidIdTokenError,
  OidcNonceMismatchError,
} from "../../auth/oidc-client";
import { createOpenERPTokenPort } from "../../auth/openerp-token-port";
import { createOpenERPSessionPort } from "../../auth/openerp-session-port";
import { createOpenERPCookiePort } from "../../auth/openerp-cookie-port";
import {
  resolveIdentitySessionSecret,
  resolveIdentitySigningConfiguration,
} from "../../foundation/identity-configuration";

import type { AppBindings } from "../app";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Membership {
  organizationId: string;
  slug: string | null;
  name: string | null;
  status: string;
}

export interface AuthOidcRouteOptions {
  /** When false (default), all 4 routes return 503 AUTH_OIDC_DISABLED. */
  enabled?: boolean;
  /** Required when enabled === true. */
  oidcClient?: OidcClient;
  /** HS256 key for signing/verifying pending org-selection tokens. */
  pendingSecret?: Uint8Array;
  /** Session TTL in seconds. Default: 3600. */
  sessionTtlSeconds?: number;
  /** Override db for the session+cookie operations when enabled. Defaults to the app-level db. */
  db?: Queryable;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DISABLED_RESPONSE = { code: "AUTH_OIDC_DISABLED" } as const;

/** Raw SQL: list active memberships by OIDC sub (user_identity_id = sub). */
async function listMembershipsForSub(db: Queryable, sub: string): Promise<Membership[]> {
  interface Row {
    organization_id: string;
    status: string;
    slug: string | null;
    name: string | null;
  }
  const result = await db.query<Row>(
    `select om.organization_id, om.status, o.slug, o.name
       from organization_members om
       join organizations o on om.organization_id = o.id
      where om.user_identity_id = $1
        and om.status = 'active'
      order by om.joined_at desc`,
    [sub]
  );
  return result.rows.map((r) => ({
    organizationId: r.organization_id,
    status: r.status,
    slug: r.slug,
    name: r.name,
  }));
}

/** Mint a short-lived HS256 pending JWT (5 min) carrying sub+email. */
async function mintPendingToken(
  secret: Uint8Array,
  payload: { sub: string; email: string | null; redirectAfter: string | null }
): Promise<string> {
  return new SignJWT({ sub: payload.sub, email: payload.email, redirectAfter: payload.redirectAfter })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomBytes(16).toString("hex"))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 300) // 5 min
    .sign(secret);
}

/** Verify and extract a pending token; returns null if invalid/expired. */
async function verifyPendingToken(
  secret: Uint8Array,
  token: string
): Promise<{ sub: string; email: string | null; redirectAfter: string | null } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;
    return {
      sub,
      email: typeof payload["email"] === "string" ? payload["email"] : null,
      redirectAfter: typeof payload["redirectAfter"] === "string" ? payload["redirectAfter"] : null,
    };
  } catch {
    return null;
  }
}

/** Validate that redirect_to is a safe same-origin path. */
function sanitizeRedirectTo(raw: string | null | undefined): string {
  if (!raw) return "/admin";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/admin";
}

// ---------------------------------------------------------------------------
// Session mint helper — shared by 1-membership path and org-select path
// ---------------------------------------------------------------------------

interface SessionMintDeps {
  db: Queryable;
  sessionSecret: Uint8Array;
  sessionIssuer: string;
  sessionAudience?: string;
  sessionTtlSeconds: number;
  sub: string;
  orgId: string;
  email: string | null;
}

async function mintAndPersistSession(deps: SessionMintDeps): Promise<string> {
  const { db, sessionSecret, sessionIssuer, sessionAudience, sessionTtlSeconds, sub, orgId, email } = deps;
  const tokenPort = createOpenERPTokenPort({
    secret: sessionSecret,
    issuer: sessionIssuer,
    ...(sessionAudience ? { audience: sessionAudience } : {}),
  });
  const sessionPort = createOpenERPSessionPort(db);
  const cookiePort = createOpenERPCookiePort();

  const sessionId = randomBytes(16).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionTtlSeconds * 1000);

  const jwt = await tokenPort.signSessionToken(
    { userId: sub, sessionId, role: "user", org: orgId, email: email ?? null, displayName: null },
    expiresAt
  );

  const tokenHash = await Promise.resolve(tokenPort.hashSecret(jwt));

  await sessionPort.create({
    id: sessionId,
    userId: sub,
    organizationId: orgId,
    sessionTokenHash: tokenHash,
    mfaVerified: false,
    expiresAt,
    now,
  });

  return cookiePort.serializeSessionCookie({ token: jwt, expiresAt });
}

// ---------------------------------------------------------------------------
// Route mount function
// ---------------------------------------------------------------------------

export function mountAuthOidcRoutes(
  app: Hono<AppBindings>,
  options: AuthOidcRouteOptions = {}
): void {
  const sessionSecretValue = resolveIdentitySessionSecret(process.env, "dev-pending-secret");
  const {
    enabled = false,
    oidcClient,
    pendingSecret = new TextEncoder().encode(sessionSecretValue),
    sessionTtlSeconds = 3600,
    db: optDb,
  } = options;

  const sessionSecret = new TextEncoder().encode(sessionSecretValue);
  const identitySigning = resolveIdentitySigningConfiguration(process.env);

  // -------------------------------------------------------------------------
  // GET /auth/login
  // -------------------------------------------------------------------------

  app.get("/auth/login", async (c) => {
    if (!enabled) return c.json(DISABLED_RESPONSE, 503);

    const db = optDb ?? c.get("db");
    const redirectTo = sanitizeRedirectTo(c.req.query("redirect_to"));

    const { authorizeUrl, state } = await oidcClient!.startAuthorization(db, {
      redirectAfter: redirectTo,
    });

    // Set a short-lived state cookie as defense-in-depth (optional extra check)
    c.header(
      "Set-Cookie",
      `openerp_oidc_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`
    );
    return c.redirect(authorizeUrl, 302);
  });

  // -------------------------------------------------------------------------
  // GET /auth/oauth/callback
  // -------------------------------------------------------------------------

  app.get("/auth/oauth/callback", async (c) => {
    if (!enabled) return c.json(DISABLED_RESPONSE, 503);

    const db = optDb ?? c.get("db");

    const error = c.req.query("error");
    if (error) {
      return c.json({ code: "OIDC_PROVIDER_ERROR", error }, 400);
    }

    const code = c.req.query("code");
    const state = c.req.query("state");

    if (!code || !state) {
      return c.json({ code: "OIDC_CALLBACK_MISSING_PARAMS" }, 400);
    }

    let exchangeResult: Awaited<ReturnType<OidcClient["exchangeCode"]>>;
    try {
      exchangeResult = await oidcClient!.exchangeCode(db, { code, state });
    } catch (err) {
      if (err instanceof OidcStateNotFoundError) {
        return c.json({ code: "oidc.state_not_found" }, 400);
      }
      if (err instanceof OidcTokenExchangeError) {
        return c.json({ code: "oidc.token_exchange_failed", message: (err as OidcTokenExchangeError).message }, 502);
      }
      if (err instanceof OidcInvalidIdTokenError) {
        return c.json({ code: "oidc.invalid_id_token" }, 401);
      }
      if (err instanceof OidcNonceMismatchError) {
        return c.json({ code: "oidc.nonce_mismatch" }, 401);
      }
      throw err;
    }

    const { idToken, redirectAfter } = exchangeResult;
    const sub = idToken.sub;
    const email = idToken.email ?? null;

    const memberships = await listMembershipsForSub(db, sub);

    if (memberships.length === 0) {
      return c.json({ code: "NO_ACTIVE_MEMBERSHIPS", sub, email }, 403);
    }

    if (memberships.length === 1) {
      const org = memberships[0]!;
      const cookieHeader = await mintAndPersistSession({
        db,
        sessionSecret,
        sessionIssuer: identitySigning.issuer,
        ...(identitySigning.audience ? { sessionAudience: identitySigning.audience } : {}),
        sessionTtlSeconds,
        sub,
        orgId: org.organizationId,
        email,
      });
      c.header("Set-Cookie", cookieHeader);
      return c.redirect(redirectAfter ?? "/admin", 302);
    }

    // Multiple memberships — return selection payload with pending token
    const pendingToken = await mintPendingToken(pendingSecret, {
      sub,
      email,
      redirectAfter: redirectAfter ?? null,
    });

    return c.json(
      {
        code: "ORGANIZATION_SELECTION_REQUIRED",
        organizations: memberships.map((m) => ({
          id: m.organizationId,
          slug: m.slug,
          name: m.name,
        })),
        pending: { sub, email, pendingToken },
      },
      409
    );
  });

  // -------------------------------------------------------------------------
  // POST /auth/org-select
  // -------------------------------------------------------------------------

  app.post("/auth/org-select", async (c) => {
    if (!enabled) return c.json(DISABLED_RESPONSE, 503);

    const db = optDb ?? c.get("db");

    let body: { pendingToken?: unknown; organization_id?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }

    const pendingTokenRaw = typeof body.pendingToken === "string" ? body.pendingToken : null;
    const organizationId = typeof body.organization_id === "string" ? body.organization_id : null;

    if (!pendingTokenRaw || !organizationId) {
      return c.json({ code: "INVALID_INPUT", errors: { pendingToken: "REQUIRED", organization_id: "REQUIRED" } }, 400);
    }

    const pending = await verifyPendingToken(pendingSecret, pendingTokenRaw);
    if (!pending) {
      return c.json({ code: "PENDING_TOKEN_EXPIRED_OR_INVALID" }, 410);
    }

    // Verify the user is actually a member of the requested org
    const memberships = await listMembershipsForSub(db, pending.sub);
    const chosen = memberships.find((m) => m.organizationId === organizationId);
    if (!chosen) {
      return c.json({ code: "ORGANIZATION_NOT_MEMBER" }, 403);
    }

    const cookieHeader = await mintAndPersistSession({
      db,
      sessionSecret,
      sessionIssuer: identitySigning.issuer,
      ...(identitySigning.audience ? { sessionAudience: identitySigning.audience } : {}),
      sessionTtlSeconds,
      sub: pending.sub,
      orgId: organizationId,
      email: pending.email,
    });

    c.header("Set-Cookie", cookieHeader);
    return c.redirect(pending.redirectAfter ?? "/admin", 302);
  });

  // -------------------------------------------------------------------------
  // POST /auth/logout
  // -------------------------------------------------------------------------

  app.post("/auth/logout", async (c) => {
    if (!enabled) return c.json(DISABLED_RESPONSE, 503);

    const db = optDb ?? c.get("db");
    const cookiePort = createOpenERPCookiePort();
    const tokenPort = createOpenERPTokenPort({
      secret: sessionSecret,
      issuer: identitySigning.issuer,
      ...(identitySigning.audience ? { audience: identitySigning.audience } : {}),
    });
    const sessionPort = createOpenERPSessionPort(db);

    const sessionJwt = cookiePort.readSessionToken(c.req.raw);
    if (sessionJwt) {
      const claims = await tokenPort.verifySessionToken(sessionJwt);
      if (claims?.sessionId) {
        await sessionPort.revoke(claims.sessionId);
      }
    }

    c.header("Set-Cookie", cookiePort.serializeClearedSessionCookie(), { append: true });
    c.header("Set-Cookie", cookiePort.serializeClearedRefreshCookie(), { append: true });
    return c.json({ ok: true }, 200);
  });
}
