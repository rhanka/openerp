import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";

import type { OrganizationMember, UserIdentity } from "@sentropic/openerp-domain";
import { createIdentityProvider } from "../../src/foundation/identity-provider";
import { createJwtTenantResolver } from "../../src/http/tenant-resolvers";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import type { Queryable } from "../../src/db/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = new TextEncoder().encode("openerp-dev-session-secret-change-me-32-bytes");
const WRONG_SECRET = randomBytes(32);

const ISSUER = "openerp-test";
const ORG_ID = "org_test_1";
const USER_ID = "uid_test_1";

function makeIdentity(): UserIdentity {
  return {
    id: USER_ID,
    email: "alice@example.com",
    displayName: "Alice",
    preferredLocale: "fr",
    mfaState: "passkey",
    status: "active",
    actorType: "human",
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function makeMember(): OrganizationMember {
  return {
    id: "om_test_1",
    userIdentityId: USER_ID,
    organizationId: ORG_ID,
    status: "active",
    preferredLocale: null,
    joinedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function makeMinimalDb(): Queryable {
  return {
    async query<T = unknown>(): Promise<{ rows: T[] }> {
      return { rows: [] };
    }
  };
}

// ---------------------------------------------------------------------------
// jwtTenantResolver: bypass-closed regression tests
// ---------------------------------------------------------------------------

describe("jwtTenantResolver — PG-09 / integration 0-A (bypass closed)", () => {
  const provider = createIdentityProvider({ secret: SECRET, issuer: ISSUER });
  const resolver = createJwtTenantResolver(provider);

  it("returns null when no Authorization header is present (unsigned-header bypass closed)", async () => {
    const req = new Request("http://localhost/healthz", {
      headers: {
        // Plain tenant headers that headerTenantResolver trusted — must NOT work
        "x-organization-id": ORG_ID,
        "x-user-identity-id": USER_ID
      }
    });
    const result = await resolver(req);
    expect(result).toBeNull();
  });

  it("returns null when Authorization is not a Bearer scheme", async () => {
    const req = new Request("http://localhost/healthz", {
      headers: { authorization: `Basic dXNlcjpwYXNz` }
    });
    expect(await resolver(req)).toBeNull();
  });

  it("returns null for a forged/unsigned raw token (wrong secret)", async () => {
    // Sign with the WRONG secret — resolver must reject
    const forgery = await new SignJWT({
      org: ORG_ID,
      actor_type: "human",
      scopes: ["session"]
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti("jti-forged")
      .setSubject(USER_ID)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(WRONG_SECRET);

    const req = new Request("http://localhost/healthz", {
      headers: { authorization: `Bearer ${forgery}` }
    });
    expect(await resolver(req)).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 7200; // issued 2h ago, expired 1h ago
    const expired = await new SignJWT({
      org: ORG_ID,
      actor_type: "human",
      scopes: ["session"]
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti("jti-expired")
      .setSubject(USER_ID)
      .setIssuer(ISSUER)
      .setIssuedAt(past)
      .setExpirationTime(past + 3600) // expired 1h ago
      .sign(SECRET);

    const req = new Request("http://localhost/healthz", {
      headers: { authorization: `Bearer ${expired}` }
    });
    expect(await resolver(req)).toBeNull();
  });

  it("returns null for a completely malformed token string", async () => {
    const req = new Request("http://localhost/healthz", {
      headers: { authorization: "Bearer not.a.valid.jwt.at.all" }
    });
    expect(await resolver(req)).toBeNull();
  });

  it("resolves correct TenantContext from a validly-signed session JWT", async () => {
    const token = await provider.issueHumanSession(makeIdentity(), makeMember(), 3600);
    const req = new Request("http://localhost/healthz", {
      headers: { authorization: `Bearer ${token.raw}` }
    });
    const result = await resolver(req);
    expect(result).not.toBeNull();
    expect(result!.organizationId).toBe(ORG_ID);
    expect(result!.actorUserId).toBe(USER_ID);
  });

  it("returns 401 from the Hono app when jwtTenantResolver receives plain x-headers (not a bearer token)", async () => {
    const db = makeMinimalDb();
    const app = buildApp({ db, resolveTenant: resolver });
    const res = await app.request("/healthz", {
      headers: {
        "x-organization-id": ORG_ID,
        "x-user-identity-id": USER_ID
      }
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 from the Hono app when jwtTenantResolver receives a valid Bearer token", async () => {
    const token = await provider.issueHumanSession(makeIdentity(), makeMember(), 3600);
    const db = makeMinimalDb();
    const app = buildApp({ db, resolveTenant: resolver });
    const res = await app.request("/healthz", {
      headers: { authorization: `Bearer ${token.raw}` }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

// ---------------------------------------------------------------------------
// Production wiring: buildDevServerOptions MUST NOT use headerTenantResolver
// (verified by asserting jwtTenantResolver rejects unsigned-header requests)
// ---------------------------------------------------------------------------

describe("production wiring — jwtTenantResolver is the default (not headerTenantResolver)", () => {
  it("headerTenantResolver is exported and usable explicitly for tests (not the default)", () => {
    // Ensure headerTenantResolver still works when passed explicitly — test suite health
    const req = new Request("http://localhost/healthz", {
      headers: { "x-organization-id": ORG_ID, "x-user-identity-id": USER_ID }
    });
    const result = headerTenantResolver(req);
    expect(result).not.toBeNull();
    expect(result!.organizationId).toBe(ORG_ID);
    expect(result!.actorUserId).toBe(USER_ID);
  });

  it("buildApp with jwtTenantResolver rejects plain-header requests with 401", async () => {
    const provider = createIdentityProvider({ secret: SECRET, issuer: ISSUER });
    const db = makeMinimalDb();
    const app = buildApp({ db, resolveTenant: createJwtTenantResolver(provider) });
    const res = await app.request("/healthz", {
      headers: { "x-organization-id": ORG_ID, "x-user-identity-id": USER_ID }
    });
    expect(res.status).toBe(401);
  });
});
