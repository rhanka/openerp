import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { Queryable } from "../../src/db/client";
import { createOpenERPSessionPort } from "../../src/auth/openerp-session-port";
import { createOpenERPUserPort } from "../../src/auth/openerp-user-port";
import { createOpenERPCookiePort } from "../../src/auth/openerp-cookie-port";
import { createOpenERPTokenPort } from "../../src/auth/openerp-token-port";
import { createOpenERPAccountPolicyPort } from "../../src/auth/openerp-account-policy-port";
import { createOpenERPClockPort } from "../../src/auth/openerp-clock-port";
import { createOpenERPRandomPort } from "../../src/auth/openerp-random-port";
import { createStubCredentialsPort } from "../../src/auth/stub-credentials-port";
import { createStubChallengesPort } from "../../src/auth/stub-challenges-port";
import { createStubEmailVerificationPort } from "../../src/auth/stub-email-verification-port";
import { createStubMagicLinksPort } from "../../src/auth/stub-magic-links-port";
import { createStubEmailDeliveryPort } from "../../src/auth/stub-email-delivery-port";
import { createStubOauthStateStorePort } from "../../src/auth/stub-oauth-state-store-port";
import { createStubJwksPort } from "../../src/auth/stub-jwks-port";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spyQueryable(rowFactory: (text: string, values: unknown[]) => unknown[] = () => []) {
  const query = vi.fn(async (text: string, values: unknown[] = []) => ({
    rows: rowFactory(text, values),
  }));
  const db = { query } as unknown as Queryable;
  return { db, query };
}

const TEST_SECRET = randomBytes(32);

// ---------------------------------------------------------------------------
// SessionPort
// ---------------------------------------------------------------------------

describe("OpenERPSessionPort", () => {
  it("create round-trips via insert returning", async () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const expires = new Date("2026-06-11T00:00:00.000Z");

    const fakeRow = {
      id: "sess_1",
      user_identity_id: "uid_1",
      session_token_hash: "hash_token",
      refresh_token_hash: "hash_refresh",
      device_name: "Test Device",
      ip_address: "127.0.0.1",
      user_agent: "TestAgent",
      mfa_verified: false,
      expires_at: expires,
      created_at: now,
      last_activity_at: now,
      revoked_at: null,
    };

    const { db } = spyQueryable(() => [fakeRow]);
    const port = createOpenERPSessionPort(db);

    const record = await port.create({
      id: "sess_1",
      userId: "uid_1",
      sessionTokenHash: "hash_token",
      refreshTokenHash: "hash_refresh",
      deviceInfo: { name: "Test Device", ipAddress: "127.0.0.1", userAgent: "TestAgent" },
      mfaVerified: false,
      expiresAt: expires,
      now,
    });

    expect(record.id).toBe("sess_1");
    expect(record.userId).toBe("uid_1");
    expect(record.sessionTokenHash).toBe("hash_token");
    expect(record.refreshTokenHash).toBe("hash_refresh");
    expect(record.revokedAt).toBeNull();
  });

  it("findByTokenHash returns null for unknown hash", async () => {
    const { db } = spyQueryable(() => []);
    const port = createOpenERPSessionPort(db);
    const result = await port.findByTokenHash("unknown_hash");
    expect(result).toBeNull();
  });

  it("findByRefreshTokenHash returns null for unknown hash", async () => {
    const { db } = spyQueryable(() => []);
    const port = createOpenERPSessionPort(db);
    const result = await port.findByRefreshTokenHash("unknown_refresh");
    expect(result).toBeNull();
  });

  it("revoke returns false when no rows affected", async () => {
    const { db } = spyQueryable(() => []);
    const port = createOpenERPSessionPort(db);
    const result = await port.revoke("sess_missing");
    expect(result).toBe(false);
  });

  it("revokeAllForUser returns 0 when no sessions", async () => {
    const { db } = spyQueryable(() => []);
    const port = createOpenERPSessionPort(db);
    const count = await port.revokeAllForUser("uid_missing");
    expect(count).toBe(0);
  });

  it("listForUser returns empty array when no sessions", async () => {
    const { db } = spyQueryable(() => []);
    const port = createOpenERPSessionPort(db);
    const list = await port.listForUser("uid_1");
    expect(list).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// UserPort
// ---------------------------------------------------------------------------

describe("OpenERPUserPort", () => {
  it("findByEmail maps fields correctly", async () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const fakeRow = {
      id: "uid_1",
      email: "alice@example.com",
      display_name: "Alice",
      actor_type: "human",
      status: "active",
      created_at: now,
      updated_at: now,
    };

    const { db } = spyQueryable((text) => {
      if (text.includes("lower(email)")) return [fakeRow];
      return [];
    });
    const port = createOpenERPUserPort(db);

    const user = await port.findByEmail("ALICE@example.com");
    expect(user).not.toBeNull();
    expect(user!.id).toBe("uid_1");
    expect(user!.email).toBe("alice@example.com");
    expect(user!.displayName).toBe("Alice");
    expect(user!.role).toBe("user"); // "human" → "user"
    expect(user!.accountStatus).toBe("active");
    expect(user!.emailVerified).toBe(true);
  });

  it("findByEmail returns null for unknown email", async () => {
    const { db } = spyQueryable(() => []);
    const port = createOpenERPUserPort(db);
    const result = await port.findByEmail("nobody@example.com");
    expect(result).toBeNull();
  });

  it("findById returns null for unknown id", async () => {
    const { db } = spyQueryable(() => []);
    const port = createOpenERPUserPort(db);
    const result = await port.findById("uid_missing");
    expect(result).toBeNull();
  });

  it("maps deactivated status to disabled_by_admin accountStatus", async () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    const fakeRow = {
      id: "uid_2",
      email: "bob@example.com",
      display_name: "Bob",
      actor_type: "human",
      status: "deactivated",
      created_at: now,
      updated_at: now,
    };

    const { db } = spyQueryable(() => [fakeRow]);
    const port = createOpenERPUserPort(db);
    const user = await port.findById("uid_2");
    expect(user!.accountStatus).toBe("disabled_by_admin");
    expect(user!.emailVerified).toBe(false);
  });

  it("count returns parsed integer", async () => {
    const { db } = spyQueryable(() => [{ n: "42" }]);
    const port = createOpenERPUserPort(db);
    const count = await port.count();
    expect(count).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// CookiePort
// ---------------------------------------------------------------------------

describe("OpenERPCookiePort", () => {
  it("serializeSessionCookie / readSessionToken round-trip", () => {
    const port = createOpenERPCookiePort();
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    const cookie = port.serializeSessionCookie({ token: "my_session_token", expiresAt });

    expect(cookie).toContain("openerp_session=my_session_token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    const mockRequest = new Request("https://example.com", {
      headers: { cookie },
    });
    const token = port.readSessionToken(mockRequest);
    expect(token).toBe("my_session_token");
  });

  it("serializeRefreshCookie / readRefreshToken round-trip", () => {
    const port = createOpenERPCookiePort();
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    const cookie = port.serializeRefreshCookie({ token: "my_refresh_token", expiresAt });

    expect(cookie).toContain("openerp_refresh=my_refresh_token");

    const mockRequest = new Request("https://example.com", {
      headers: { cookie },
    });
    const token = port.readRefreshToken(mockRequest);
    expect(token).toBe("my_refresh_token");
  });

  it("serializeClearedSessionCookie produces Max-Age=0", () => {
    const port = createOpenERPCookiePort();
    const cleared = port.serializeClearedSessionCookie();
    expect(cleared).toContain("openerp_session=");
    expect(cleared).toContain("Max-Age=0");
  });

  it("serializeClearedRefreshCookie produces Max-Age=0", () => {
    const port = createOpenERPCookiePort();
    const cleared = port.serializeClearedRefreshCookie();
    expect(cleared).toContain("openerp_refresh=");
    expect(cleared).toContain("Max-Age=0");
  });

  it("readSessionToken returns null when cookie absent", () => {
    const port = createOpenERPCookiePort();
    const req = new Request("https://example.com");
    expect(port.readSessionToken(req)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TokenPort
// ---------------------------------------------------------------------------

describe("OpenERPTokenPort", () => {
  const secret = TEST_SECRET;

  it("signSessionToken → verifySessionToken round-trip with org claim", async () => {
    const port = createOpenERPTokenPort({ secret });
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    const token = await port.signSessionToken(
      {
        userId: "uid_1",
        sessionId: "sess_1",
        role: "user",
        email: "alice@example.com",
        displayName: "Alice",
        org: "org_abc",
      },
      expiresAt
    );

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const claims = await port.verifySessionToken(token);
    expect(claims).not.toBeNull();
    expect(claims!.userId).toBe("uid_1");
    expect(claims!.sessionId).toBe("sess_1");
    expect(claims!.role).toBe("user");
    expect(claims!.email).toBe("alice@example.com");
    expect((claims as { org?: string }).org).toBe("org_abc");
  });

  it("verifySessionToken returns null for invalid token", async () => {
    const port = createOpenERPTokenPort({ secret });
    const result = await port.verifySessionToken("not.a.valid.jwt");
    expect(result).toBeNull();
  });

  it("verifySessionToken returns null for token signed with different secret", async () => {
    const port1 = createOpenERPTokenPort({ secret: randomBytes(32) });
    const port2 = createOpenERPTokenPort({ secret: randomBytes(32) });

    const expiresAt = new Date(Date.now() + 3600 * 1000);
    const token = await port1.signSessionToken(
      { userId: "uid_1", sessionId: "sess_1", role: "user" },
      expiresAt
    );
    const result = await port2.verifySessionToken(token);
    expect(result).toBeNull();
  });

  it("hashSecret is deterministic", async () => {
    const port = createOpenERPTokenPort({ secret });
    const h1 = await port.hashSecret("test_secret");
    const h2 = await port.hashSecret("test_secret");
    expect(h1).toBe(h2);
    expect(typeof h1).toBe("string");
    expect((h1 as string).length).toBe(64); // sha256 hex = 64 chars
  });

  it("signVerificationToken produces a verifiable JWT", async () => {
    const port = createOpenERPTokenPort({ secret });
    const expiresAt = new Date(Date.now() + 600 * 1000);
    const token = await port.signVerificationToken({
      email: "alice@example.com",
      expiresAt,
    });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// AccountPolicyPort
// ---------------------------------------------------------------------------

describe("OpenERPAccountPolicyPort", () => {
  const port = createOpenERPAccountPolicyPort();
  const now = new Date("2026-06-10T00:00:00.000Z");

  it("normalizeEmail lowercases and trims", () => {
    expect(port.normalizeEmail("  ALICE@Example.COM  ")).toBe("alice@example.com");
  });

  it("deriveDisplayName capitalizes local part", () => {
    expect(port.deriveDisplayName("fabien.antoine@example.com")).toBe("Fabien Antoine");
    expect(port.deriveDisplayName("john_doe@example.com")).toBe("John Doe");
  });

  it("roleForNewUser always returns 'user'", () => {
    expect(port.roleForNewUser({ email: "x@x.com", isFirstUser: true })).toBe("user");
    expect(port.roleForNewUser({ email: "x@x.com", isFirstUser: false })).toBe("user");
  });

  it("statusForNewUser returns active with no approvalDueAt", async () => {
    const result = await port.statusForNewUser({ email: "x@x.com", isFirstUser: true, now });
    expect(result.accountStatus).toBe("active");
    expect(result.approvalDueAt).toBeNull();
  });

  it("canAuthenticate allows active users", async () => {
    const user = {
      id: "uid_1",
      email: "a@a.com",
      displayName: "A",
      role: "user",
      emailVerified: true,
      accountStatus: "active" as const,
      approvalDueAt: null,
      createdAt: now,
      updatedAt: now,
    };
    expect(await port.canAuthenticate(user, now)).toEqual({ allowed: true });
  });

  it("canAuthenticate blocks disabled accounts", async () => {
    const user = {
      id: "uid_1",
      email: "a@a.com",
      displayName: "A",
      role: "user",
      emailVerified: false,
      accountStatus: "disabled_by_admin" as const,
      approvalDueAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const decision = await port.canAuthenticate(user, now);
    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe("account_not_active");
  });

  it("resolveSessionRole returns user role", async () => {
    const user = {
      id: "uid_1",
      email: "a@a.com",
      displayName: "A",
      role: "admin",
      emailVerified: true,
      accountStatus: "active" as const,
      approvalDueAt: null,
      createdAt: now,
      updatedAt: now,
    };
    expect(await port.resolveSessionRole(user, now)).toBe("admin");
  });
});

// ---------------------------------------------------------------------------
// ClockPort
// ---------------------------------------------------------------------------

describe("OpenERPClockPort", () => {
  it("now() returns a Date close to current time", () => {
    const port = createOpenERPClockPort();
    const before = Date.now();
    const d = port.now();
    const after = Date.now();
    expect(d.getTime()).toBeGreaterThanOrEqual(before);
    expect(d.getTime()).toBeLessThanOrEqual(after);
  });

  it("addSeconds adds the correct ms", () => {
    const port = createOpenERPClockPort();
    const base = new Date("2026-06-10T00:00:00.000Z");
    const result = port.addSeconds(base, 3600);
    expect(result.getTime() - base.getTime()).toBe(3600 * 1000);
  });
});

// ---------------------------------------------------------------------------
// RandomPort
// ---------------------------------------------------------------------------

describe("OpenERPRandomPort", () => {
  const port = createOpenERPRandomPort();

  it("uuid() produces a v4-like uuid string", () => {
    const id = port.uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("uuid() is not deterministic (two calls differ)", () => {
    expect(port.uuid()).not.toBe(port.uuid());
  });

  it("bytes(n) returns a Uint8Array of length n", () => {
    const buf = port.bytes(16);
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBe(16);
  });

  it("numericCode(n) returns a decimal string of length n", () => {
    const code = port.numericCode(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("token(n) returns a non-empty base64url string", () => {
    const t = port.token(16);
    expect(typeof t).toBe("string");
    expect(t.length).toBeGreaterThan(0);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

// ---------------------------------------------------------------------------
// Stub ports — assert they throw the tagged error
// ---------------------------------------------------------------------------

describe("Stub ports throw tagged errors", () => {
  it("credentials port throws OpenERPCredentialStubError", async () => {
    const port = createStubCredentialsPort();
    await expect(port.findById("x")).rejects.toMatchObject({
      name: "OpenERPCredentialStubError",
    });
    await expect(port.listForUser("x")).rejects.toMatchObject({
      name: "OpenERPCredentialStubError",
    });
  });

  it("challenges port throws OpenERPChallengeStubError", async () => {
    const port = createStubChallengesPort();
    await expect(
      port.create({ challenge: "c", type: "registration", expiresAt: new Date() })
    ).rejects.toMatchObject({ name: "OpenERPChallengeStubError" });
  });

  it("email verification port throws OpenERPEmailVerificationStubError", async () => {
    const port = createStubEmailVerificationPort();
    await expect(port.countRecent("a@a.com", new Date())).rejects.toMatchObject({
      name: "OpenERPEmailVerificationStubError",
    });
  });

  it("magic links port throws OpenERPMagicLinkStubError", async () => {
    const port = createStubMagicLinksPort();
    await expect(
      port.create({ email: "a@a.com", tokenHash: "h", expiresAt: new Date(), now: new Date() })
    ).rejects.toMatchObject({ name: "OpenERPMagicLinkStubError" });
  });

  it("email delivery port throws OpenERPEmailDeliveryStubError", async () => {
    const port = createStubEmailDeliveryPort();
    await expect(
      port.sendVerificationCode({ email: "a@a.com", code: "123", expiresAt: new Date() })
    ).rejects.toMatchObject({ name: "OpenERPEmailDeliveryStubError" });
  });

  it("oauth state store port throws OpenERPOauthStateStubError", async () => {
    const port = createStubOauthStateStorePort();
    await expect(port.findClient("client_id")).rejects.toMatchObject({
      name: "OpenERPOauthStateStubError",
    });
  });

  it("jwks port throws OpenERPJwksStubError", async () => {
    const port = createStubJwksPort();
    await expect(port.getActiveKey()).rejects.toMatchObject({
      name: "OpenERPJwksStubError",
    });
  });
});
