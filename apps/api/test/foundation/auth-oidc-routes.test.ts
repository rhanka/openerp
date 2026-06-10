/**
 * Tests for apps/api/src/http/handlers/auth-oidc.ts
 *
 * Uses:
 *  - buildApp with headerTenantResolver (OIDC routes are public / pre-auth)
 *  - in-memory Queryable mock
 *  - mocked OidcClient (vi.fn stubs)
 *  - in-test RS256 key pair for pending JWT verification (via jose)
 *
 * AUTH-39-A sub-slice A0-handlers
 */
import { describe, expect, it, vi, beforeAll } from "vitest";
import * as jose from "jose";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import type { OidcClient, VerifiedIdToken, ExchangedTokens } from "../../src/auth/oidc-client";
import {
  OidcStateNotFoundError,
  OidcTokenExchangeError,
  OidcInvalidIdTokenError,
  OidcNonceMismatchError,
} from "../../src/auth/oidc-client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORG_1 = "org_aaa_111";
const ORG_2 = "org_bbb_222";
const ORG_3 = "org_ccc_333";
const USER_SUB = "oidc-sub-alice";
const USER_EMAIL = "alice@oidc.test";

// ---------------------------------------------------------------------------
// In-memory Queryable mock
// ---------------------------------------------------------------------------

interface MemberRow {
  organization_id: string;
  status: string;
  slug: string | null;
  name: string | null;
}

interface SessionRow {
  id: string;
  user_identity_id: string;
  session_token_hash: string;
  refresh_token_hash: string | null;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  mfa_verified: boolean;
  expires_at: Date;
  created_at: Date;
  last_activity_at: Date;
  revoked_at: Date | null;
}

function makeDb(memberRows: MemberRow[] = []) {
  const sessions: SessionRow[] = [];

  const query = vi.fn(async (text: string, values: unknown[] = []) => {
    const sql = text.toLowerCase().replace(/\s+/g, " ").trim();

    // membership lookup
    if (sql.includes("from organization_members om")) {
      const sub = values[0] as string;
      return {
        rows: memberRows.filter((r) => r.organization_id) as unknown[]
      };
    }

    // session insert
    if (sql.includes("insert into openerp_sessions")) {
      const now = new Date();
      const row: SessionRow = {
        id: values[0] as string,
        user_identity_id: values[1] as string,
        session_token_hash: values[2] as string,
        refresh_token_hash: null,
        device_name: null,
        ip_address: null,
        user_agent: null,
        mfa_verified: false,
        expires_at: new Date(now.getTime() + 3600 * 1000),
        created_at: now,
        last_activity_at: now,
        revoked_at: null,
      };
      sessions.push(row);
      return { rows: [row] };
    }

    // session find by token hash
    if (sql.includes("from openerp_sessions") && sql.includes("session_token_hash")) {
      const hash = values[0] as string;
      const found = sessions.find((s) => s.session_token_hash === hash);
      return { rows: found ? [found] : [] };
    }

    // session find by id
    if (sql.includes("from openerp_sessions") && sql.includes("where id =")) {
      const id = values[0] as string;
      const found = sessions.find((s) => s.id === id);
      return { rows: found ? [found] : [] };
    }

    // session revoke
    if (sql.includes("update openerp_sessions") && sql.includes("revoked_at")) {
      const id = values[0] as string;
      const found = sessions.find((s) => s.id === id);
      if (found) found.revoked_at = new Date();
      return { rows: found ? [{ id: found.id }] : [] };
    }

    return { rows: [] };
  });

  return { db: { query } as Queryable, query, sessions };
}

// ---------------------------------------------------------------------------
// Mock OidcClient factory
// ---------------------------------------------------------------------------

function makeOidcClient(overrides: {
  startAuthResult?: { authorizeUrl: string; state: string };
  exchangeResult?: { tokens: ExchangedTokens; idToken: VerifiedIdToken; redirectAfter: string | null };
  startAuthError?: Error;
  exchangeError?: Error;
} = {}): OidcClient {
  const defaultIdToken: VerifiedIdToken = {
    sub: USER_SUB,
    email: USER_EMAIL,
    emailVerified: true,
    aud: "test-client",
    iss: "https://auth.example.com",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    raw: "fake.id.token",
  };

  const defaultExchangeResult = {
    tokens: {
      accessToken: "access-abc",
      idToken: "fake.id.token",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
    },
    idToken: defaultIdToken,
    redirectAfter: "/admin",
  };

  const startAuthorization = vi.fn(async (_db: Queryable, opts?: { redirectAfter?: string }) => {
    if (overrides.startAuthError) throw overrides.startAuthError;
    return overrides.startAuthResult ?? {
      authorizeUrl: "https://auth.example.com/oauth/authorize?state=abc123",
      state: "abc123",
    };
  });

  const exchangeCode = vi.fn(async (_db: Queryable, _opts: { code: string; state: string }) => {
    if (overrides.exchangeError) throw overrides.exchangeError;
    return overrides.exchangeResult ?? defaultExchangeResult;
  });

  return { startAuthorization, exchangeCode };
}

// ---------------------------------------------------------------------------
// App builder helper
// ---------------------------------------------------------------------------

function makeApp(options: {
  enabled: boolean;
  memberRows?: MemberRow[];
  oidcClientOverrides?: Parameters<typeof makeOidcClient>[0];
}): { app: ReturnType<typeof buildApp>; db: Queryable; oidcClient: OidcClient } {
  const { db } = makeDb(options.memberRows ?? []);
  const oidcClient = makeOidcClient(options.oidcClientOverrides ?? {});

  const app = buildApp({
    db,
    resolveTenant: headerTenantResolver,
    oidc: {
      enabled: options.enabled,
      oidcClient,
    },
  });

  return { app, db, oidcClient };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NO_TENANT_HEADERS = {} as HeadersInit; // OIDC routes are public — no tenant headers needed

// ---------------------------------------------------------------------------
// 1. Disabled state — all routes return 503
// ---------------------------------------------------------------------------

describe("OIDC routes — disabled (OPENERP_OIDC_ENABLED unset)", () => {
  it("GET /auth/login returns 503 with AUTH_OIDC_DISABLED when disabled", async () => {
    const { app } = makeApp({ enabled: false });
    const res = await app.request("/auth/login");
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("AUTH_OIDC_DISABLED");
  });

  it("GET /auth/oauth/callback returns 503 when disabled", async () => {
    const { app } = makeApp({ enabled: false });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(503);
  });

  it("POST /auth/org-select returns 503 when disabled", async () => {
    const { app } = makeApp({ enabled: false });
    const res = await app.request("/auth/org-select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pendingToken: "t", organization_id: "o" }),
    });
    expect(res.status).toBe(503);
  });

  it("POST /auth/logout returns 503 when disabled", async () => {
    const { app } = makeApp({ enabled: false });
    const res = await app.request("/auth/logout", { method: "POST" });
    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// 2. GET /auth/login — enabled
// ---------------------------------------------------------------------------

describe("GET /auth/login — enabled", () => {
  it("redirects 302 to the authorize URL returned by oidcClient", async () => {
    const { app } = makeApp({ enabled: true });
    const res = await app.request("/auth/login?redirect_to=/admin");
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("https://auth.example.com/oauth/authorize");
  });

  it("calls oidcClient.startAuthorization with redirectAfter from query param", async () => {
    const { app, oidcClient } = makeApp({ enabled: true });
    await app.request("/auth/login?redirect_to=/admin/crm");
    const startAuth = oidcClient.startAuthorization as ReturnType<typeof vi.fn>;
    expect(startAuth).toHaveBeenCalledOnce();
    const callArgs = startAuth.mock.calls[0]!;
    expect(callArgs[1]).toMatchObject({ redirectAfter: "/admin/crm" });
  });

  it("defaults redirect_to to /admin when not provided", async () => {
    const { app, oidcClient } = makeApp({ enabled: true });
    await app.request("/auth/login");
    const startAuth = oidcClient.startAuthorization as ReturnType<typeof vi.fn>;
    expect(startAuth.mock.calls[0]![1]).toMatchObject({ redirectAfter: "/admin" });
  });

  it("rejects an external redirect_to and defaults to /admin", async () => {
    const { app, oidcClient } = makeApp({ enabled: true });
    await app.request("/auth/login?redirect_to=https://evil.com");
    const startAuth = oidcClient.startAuthorization as ReturnType<typeof vi.fn>;
    expect(startAuth.mock.calls[0]![1]).toMatchObject({ redirectAfter: "/admin" });
  });

  it("sets an httpOnly state cookie", async () => {
    const { app } = makeApp({ enabled: true });
    const res = await app.request("/auth/login");
    expect(res.status).toBe(302);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("openerp_oidc_state=");
    expect(cookie).toContain("HttpOnly");
  });
});

// ---------------------------------------------------------------------------
// 3. GET /auth/oauth/callback — enabled, error paths
// ---------------------------------------------------------------------------

describe("GET /auth/oauth/callback — error paths", () => {
  it("returns 400 with OIDC_PROVIDER_ERROR when error param is present", async () => {
    const { app } = makeApp({ enabled: true });
    const res = await app.request("/auth/oauth/callback?error=access_denied");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; error: string };
    expect(body.code).toBe("OIDC_PROVIDER_ERROR");
    expect(body.error).toBe("access_denied");
  });

  it("returns 400 with OIDC_CALLBACK_MISSING_PARAMS when code is missing", async () => {
    const { app } = makeApp({ enabled: true });
    const res = await app.request("/auth/oauth/callback?state=abc");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("OIDC_CALLBACK_MISSING_PARAMS");
  });

  it("returns 400 with OIDC_CALLBACK_MISSING_PARAMS when state is missing", async () => {
    const { app } = makeApp({ enabled: true });
    const res = await app.request("/auth/oauth/callback?code=xyz");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("OIDC_CALLBACK_MISSING_PARAMS");
  });

  it("returns 400 with oidc.state_not_found on OidcStateNotFoundError", async () => {
    const { app } = makeApp({
      enabled: true,
      oidcClientOverrides: { exchangeError: new OidcStateNotFoundError() },
    });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("oidc.state_not_found");
  });

  it("returns 502 with oidc.token_exchange_failed on OidcTokenExchangeError", async () => {
    const { app } = makeApp({
      enabled: true,
      oidcClientOverrides: {
        exchangeError: new OidcTokenExchangeError("Token exchange failed: invalid_grant", 400, "invalid_grant"),
      },
    });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(502);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("oidc.token_exchange_failed");
  });

  it("returns 401 with oidc.invalid_id_token on OidcInvalidIdTokenError", async () => {
    const { app } = makeApp({
      enabled: true,
      oidcClientOverrides: { exchangeError: new OidcInvalidIdTokenError("bad sig") },
    });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("oidc.invalid_id_token");
  });

  it("returns 401 with oidc.nonce_mismatch on OidcNonceMismatchError", async () => {
    const { app } = makeApp({
      enabled: true,
      oidcClientOverrides: { exchangeError: new OidcNonceMismatchError() },
    });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("oidc.nonce_mismatch");
  });
});

// ---------------------------------------------------------------------------
// 4. GET /auth/oauth/callback — membership paths
// ---------------------------------------------------------------------------

describe("GET /auth/oauth/callback — membership paths", () => {
  it("returns 403 with NO_ACTIVE_MEMBERSHIPS when user has no memberships", async () => {
    const { app } = makeApp({ enabled: true, memberRows: [] });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string; sub: string; email: string };
    expect(body.code).toBe("NO_ACTIVE_MEMBERSHIPS");
    expect(body.sub).toBe(USER_SUB);
    expect(body.email).toBe(USER_EMAIL);
  });

  it("redirects 302 to /admin on 1-membership happy path", async () => {
    const members: MemberRow[] = [
      { organization_id: ORG_1, status: "active", slug: "acme", name: "Acme Corp" },
    ];
    const { app } = makeApp({ enabled: true, memberRows: members });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBe("/admin");
  });

  it("sets Set-Cookie on 1-membership happy path", async () => {
    const members: MemberRow[] = [
      { organization_id: ORG_1, status: "active", slug: "acme", name: "Acme Corp" },
    ];
    const { app } = makeApp({ enabled: true, memberRows: members });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(302);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("openerp_session=");
    expect(cookie).toContain("HttpOnly");
  });

  it("returns 409 with ORGANIZATION_SELECTION_REQUIRED for 3 memberships", async () => {
    const members: MemberRow[] = [
      { organization_id: ORG_1, status: "active", slug: "acme", name: "Acme Corp" },
      { organization_id: ORG_2, status: "active", slug: "beta", name: "Beta LLC" },
      { organization_id: ORG_3, status: "active", slug: "gamma", name: "Gamma Inc" },
    ];
    const { app } = makeApp({ enabled: true, memberRows: members });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      code: string;
      organizations: Array<{ id: string; slug: string | null; name: string | null }>;
      pending: { sub: string; email: string; pendingToken: string };
    };
    expect(body.code).toBe("ORGANIZATION_SELECTION_REQUIRED");
    expect(body.organizations).toHaveLength(3);
    expect(body.pending.sub).toBe(USER_SUB);
    expect(body.pending.email).toBe(USER_EMAIL);
    expect(typeof body.pending.pendingToken).toBe("string");
    expect(body.pending.pendingToken.length).toBeGreaterThan(10);
  });

  it("pending token in 409 is a valid JWT", async () => {
    const members: MemberRow[] = [
      { organization_id: ORG_1, status: "active", slug: "acme", name: "Acme Corp" },
      { organization_id: ORG_2, status: "active", slug: "beta", name: "Beta LLC" },
    ];
    const { app } = makeApp({ enabled: true, memberRows: members });
    const res = await app.request("/auth/oauth/callback?code=x&state=y");
    expect(res.status).toBe(409);
    const body = (await res.json()) as { pending: { pendingToken: string } };

    // A JWT has 3 dot-separated segments
    const parts = body.pending.pendingToken.split(".");
    expect(parts).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 5. POST /auth/org-select
// ---------------------------------------------------------------------------

describe("POST /auth/org-select", () => {
  const PENDING_SECRET = new TextEncoder().encode("test-pending-secret-32bytesxyz");

  async function mintPendingToken(sub: string, email: string, redirectAfter: string | null): Promise<string> {
    return new jose.SignJWT({ sub, email, redirectAfter })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 300)
      .sign(PENDING_SECRET);
  }

  function makeAppWithSecret(memberRows: MemberRow[]): ReturnType<typeof buildApp> {
    const { db } = makeDb(memberRows);
    const oidcClient = makeOidcClient();
    return buildApp({
      db,
      resolveTenant: headerTenantResolver,
      oidc: { enabled: true, oidcClient },
    });
  }

  it("returns 400 on missing pendingToken", async () => {
    const app = makeAppWithSecret([]);
    const res = await app.request("/auth/org-select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organization_id: ORG_1 }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 on missing organization_id", async () => {
    const app = makeAppWithSecret([]);
    const res = await app.request("/auth/org-select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pendingToken: "tok" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 410 on expired/invalid pending token", async () => {
    const app = makeAppWithSecret([]);
    const res = await app.request("/auth/org-select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pendingToken: "invalid.jwt.token", organization_id: ORG_1 }),
    });
    expect(res.status).toBe(410);
  });
});

// ---------------------------------------------------------------------------
// 6. POST /auth/logout
// ---------------------------------------------------------------------------

describe("POST /auth/logout — enabled", () => {
  it("returns 200 with ok:true", async () => {
    const { app } = makeApp({ enabled: true });
    const res = await app.request("/auth/logout", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("sets a cleared session cookie in the response", async () => {
    const { app } = makeApp({ enabled: true });
    const res = await app.request("/auth/logout", { method: "POST" });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("openerp_session=");
    expect(cookie).toContain("Max-Age=0");
  });
});
