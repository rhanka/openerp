// Integration 1-A — POST /auth/exchange-agent-token HTTP tests.
//
// These are unit-level HTTP tests: they use buildApp with an in-memory fake DB
// and either headerTenantResolver (for 401 / unauth paths) or a JWT-backed
// resolver (for authenticated paths), so the middleware + handler are exercised
// end-to-end without hitting Postgres.

import { describe, expect, it } from "vitest";
import { jwtVerify } from "jose";
import type { OrganizationMember, UserIdentity } from "@sentropic/openerp-domain";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import { createIdentityProvider } from "../../src/foundation/identity-provider";
import { createJwtTenantResolver } from "../../src/http/tenant-resolvers";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const SECRET = new TextEncoder().encode("openerp-test-secret-32-bytes-xyzxyz");
const ISSUER = "openerp-test";
const ORG_ID = "org_exchange_test";
const USER_ID = "uid_human_exchange";

function makeIdentity(extra?: Partial<UserIdentity>): UserIdentity {
  return {
    id: USER_ID,
    email: "alice@exchange.test",
    displayName: "Alice Exchange",
    preferredLocale: "en",
    mfaState: "passkey",
    status: "active",
    actorType: "human",
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra
  };
}

function makeMember(): OrganizationMember {
  return {
    id: "om_exchange_1",
    userIdentityId: USER_ID,
    organizationId: ORG_ID,
    status: "active",
    preferredLocale: null,
    joinedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

// Minimal fake DB that absorbs audit inserts and returns empty rows otherwise.
function makeFakeDb(): Queryable {
  return {
    async query<T = unknown>(text: string): Promise<{ rows: T[] }> {
      if (text.includes("insert into audit_events")) {
        return { rows: [{ id: "audit_1" } as unknown as T] };
      }
      return { rows: [] };
    }
  };
}

// ---------------------------------------------------------------------------
// Helper — build app with JWT resolver + passkey option wired
// ---------------------------------------------------------------------------

async function makeAppWithHumanToken(humanScopes?: string[]): Promise<{
  app: ReturnType<typeof buildApp>;
  humanToken: string;
}> {
  const provider = createIdentityProvider({ secret: SECRET, issuer: ISSUER });
  const db = makeFakeDb();
  const resolver = createJwtTenantResolver(provider);
  const app = buildApp({
    db,
    resolveTenant: resolver,
    passkey: {
      // PasskeyService is not exercised by this handler — supply a stub.
      service: null as never,
      identityProvider: provider
    }
  });

  // Mint a human session token that carries explicit scopes.
  // issueHumanSession always sets scopes: ["session"] internally;
  // to test multi-scope intersection we need exchangeForAgentToken to have a
  // known subject. We use issueHumanSession and accept ["session"] as the
  // human's scope set (sufficient for intersection tests).
  const token = await provider.issueHumanSession(makeIdentity(), makeMember(), 3600);

  // If the caller wants a different scope set, we sign a custom token directly
  // using the same provider secret so the JWT resolver accepts it.
  if (humanScopes !== undefined) {
    const { SignJWT } = await import("jose");
    const custom = await new SignJWT({
      org: ORG_ID,
      actor_type: "human",
      scopes: humanScopes
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti(`jti-${Date.now()}`)
      .setSubject(USER_ID)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(SECRET);
    return { app, humanToken: custom };
  }

  return { app, humanToken: token.raw };
}

// ---------------------------------------------------------------------------
// 1. 401 — no valid session
// ---------------------------------------------------------------------------

describe("POST /auth/exchange-agent-token — unauthenticated", () => {
  it("returns 401 when no Authorization header is provided", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: ISSUER });
    const db = makeFakeDb();
    const app = buildApp({
      db,
      resolveTenant: createJwtTenantResolver(provider),
      passkey: { service: null as never, identityProvider: provider }
    });
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when the Bearer token is forged (wrong secret)", async () => {
    const { randomBytes } = await import("node:crypto");
    const wrongSecret = randomBytes(32);
    const { SignJWT } = await import("jose");
    const forgery = await new SignJWT({
      org: ORG_ID,
      actor_type: "human",
      scopes: ["session"]
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti("jti-forged-exchange")
      .setSubject(USER_ID)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(wrongSecret);

    const provider = createIdentityProvider({ secret: SECRET, issuer: ISSUER });
    const db = makeFakeDb();
    const app = buildApp({
      db,
      resolveTenant: createJwtTenantResolver(provider),
      passkey: { service: null as never, identityProvider: provider }
    });
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${forgery}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    // Middleware rejects the forged token → 401
    expect(res.status).toBe(401);
  });

  it("returns 401 when only plain x-headers are used (no JWT Bearer)", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: ISSUER });
    const db = makeFakeDb();
    const app = buildApp({
      db,
      resolveTenant: createJwtTenantResolver(provider),
      passkey: { service: null as never, identityProvider: provider }
    });
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        "x-organization-id": ORG_ID,
        "x-user-identity-id": USER_ID,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 2. 200 — successful mint
// ---------------------------------------------------------------------------

describe("POST /auth/exchange-agent-token — authenticated mint", () => {
  it("returns 200 with a valid agent token on a plain authenticated call", async () => {
    const { app, humanToken } = await makeAppWithHumanToken();
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${humanToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      token: string;
      expiresAt: string;
      actorType: string;
      scopes: string[];
    };
    expect(body.actorType).toBe("agent");
    expect(typeof body.token).toBe("string");
    expect(typeof body.expiresAt).toBe("string");
    expect(Array.isArray(body.scopes)).toBe(true);
  });

  it("minted agent token has actor_type=agent and act.sub = calling human's id", async () => {
    const { app, humanToken } = await makeAppWithHumanToken();
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${humanToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };

    const { payload } = await jwtVerify(body.token, SECRET, { issuer: ISSUER });
    const claims = payload as {
      actor_type: string;
      act?: { sub: string; actor_type: string };
      scopes: string[];
      sub: string;
    };
    expect(claims.actor_type).toBe("agent");
    expect(claims.act).toBeDefined();
    expect(claims.act!.sub).toBe(USER_ID);
    expect(claims.act!.actor_type).toBe("human");
  });

  it("scopes in minted token are a subset of human scopes", async () => {
    const humanScopes = ["session", "crm.read", "billing.read"];
    const { app, humanToken } = await makeAppWithHumanToken(humanScopes);
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${humanToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ requestedScopes: ["crm.read"] })
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { scopes: string[] };
    expect(body.scopes).toContain("crm.read");
    // No scope outside human's set
    for (const s of body.scopes) {
      expect(humanScopes).toContain(s);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Scope escalation blocked
// ---------------------------------------------------------------------------

describe("POST /auth/exchange-agent-token — scope escalation blocked", () => {
  it("drops scopes the human does not hold (intersection, not union)", async () => {
    const humanScopes = ["session", "crm.read"];
    const { app, humanToken } = await makeAppWithHumanToken(humanScopes);

    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${humanToken}`,
        "content-type": "application/json"
      },
      // Attempt to escalate: requesting a scope the human does NOT have
      body: JSON.stringify({ requestedScopes: ["crm.read", "admin", "billing.write"] })
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { scopes: string[]; token: string };

    // "admin" and "billing.write" must NOT appear in the minted token
    expect(body.scopes).not.toContain("admin");
    expect(body.scopes).not.toContain("billing.write");
    expect(body.scopes).toContain("crm.read");

    // Verify the JWT claims directly — no escalated scope in the signed token
    const { payload } = await jwtVerify(body.token, SECRET, { issuer: ISSUER });
    const claims = payload as { scopes: string[] };
    expect(claims.scopes).not.toContain("admin");
    expect(claims.scopes).not.toContain("billing.write");
  });

  it("returns empty scopes when requestedScopes has no overlap with human scopes", async () => {
    const humanScopes = ["session"];
    const { app, humanToken } = await makeAppWithHumanToken(humanScopes);

    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${humanToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ requestedScopes: ["admin", "billing.write"] })
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { scopes: string[] };
    expect(body.scopes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. TTL capped
// ---------------------------------------------------------------------------

describe("POST /auth/exchange-agent-token — TTL cap", () => {
  it("caps ttlSeconds to 900 when a larger value is requested", async () => {
    const { app, humanToken } = await makeAppWithHumanToken();
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${humanToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ ttlSeconds: 9999 })
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { expiresAt: string; token: string };

    // The expiresAt from the response must be at most 900 s from now (+tolerance)
    const nowMs = Date.now();
    const expiresMs = new Date(body.expiresAt).getTime();
    const diffSeconds = (expiresMs - nowMs) / 1000;
    expect(diffSeconds).toBeLessThanOrEqual(901); // 900 + 1 s tolerance

    // Also check the JWT exp claim
    const { payload } = await jwtVerify(body.token, SECRET, { issuer: ISSUER });
    const claims = payload as { exp: number; iat: number };
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(900);
  });

  it("honours a short ttlSeconds value when below cap", async () => {
    const { app, humanToken } = await makeAppWithHumanToken();
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${humanToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ ttlSeconds: 60 })
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    const { payload } = await jwtVerify(body.token, SECRET, { issuer: ISSUER });
    const claims = payload as { exp: number; iat: number };
    expect(claims.exp - claims.iat).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// 5. Route registry — audited flag
// ---------------------------------------------------------------------------

describe("foundation route registry", () => {
  it("includes POST /auth/exchange-agent-token as audited:true", async () => {
    const { buildFoundationRoutes } = await import("../../src/http/routes/foundation");
    const routes = buildFoundationRoutes();
    const route = routes.find(
      (r) => r.method === "POST" && r.path === "/auth/exchange-agent-token"
    );
    expect(route).toBeDefined();
    expect(route!.audited).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Endpoint is absent when passkey option is not provided
// ---------------------------------------------------------------------------

describe("POST /auth/exchange-agent-token — not mounted without passkey option", () => {
  it("returns 404 when buildApp is called without passkey option", async () => {
    const db = makeFakeDb();
    const app = buildApp({
      db,
      resolveTenant: headerTenantResolver
    });
    const res = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        "x-organization-id": ORG_ID,
        "x-user-identity-id": USER_ID,
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(404);
  });
});
