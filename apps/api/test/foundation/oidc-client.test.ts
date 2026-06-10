/**
 * Tests for apps/api/src/auth/oidc-client.ts
 *
 * Uses:
 *  - in-memory Queryable mock (vi.fn)
 *  - fetchImpl injection for token endpoint
 *  - in-test RS256 key pair via jose.generateKeyPair to sign fake id_tokens
 *  - jwksFn injection via jose.createLocalJWKSet (no network)
 */
import { describe, expect, it, vi, beforeAll } from "vitest";
import * as jose from "jose";
import type { Queryable } from "../../src/db/client";
import {
  createOidcClient,
  OidcStateNotFoundError,
  OidcTokenExchangeError,
  OidcNonceMismatchError,
  OidcInvalidIdTokenError,
} from "../../src/auth/oidc-client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ISSUER = "https://auth.example.com";
const CLIENT_ID = "test-client";
const CLIENT_SECRET = "test-secret";
const REDIRECT_URI = "https://app.example.com/auth/callback";

// ---------------------------------------------------------------------------
// In-memory Queryable mock helper
// ---------------------------------------------------------------------------

interface MockRow {
  nonce: string;
  code_verifier: string;
  redirect_after: string | null;
}

function makeDb(options: {
  stateRows?: MockRow[];
} = {}) {
  const { stateRows = [] } = options;

  const insertedValues: unknown[][] = [];
  const deletedStates: unknown[] = [];

  const query = vi.fn(async (text: string, values: unknown[] = []) => {
    const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized.startsWith("insert into oidc_state")) {
      insertedValues.push(values);
      return { rows: [] };
    }
    if (normalized.startsWith("select") && normalized.includes("oidc_state")) {
      return { rows: stateRows };
    }
    if (normalized.startsWith("delete from oidc_state")) {
      deletedStates.push(values[0]);
      return { rows: [] };
    }
    return { rows: [] };
  });

  const db: Queryable = { query };
  return { db, query, insertedValues, deletedStates };
}

// ---------------------------------------------------------------------------
// Signing key setup (shared across exchangeCode tests)
// ---------------------------------------------------------------------------

let privateKey: jose.KeyLike;
let localJwksFn: Parameters<typeof jose.jwtVerify>[1];
let wrongLocalJwksFn: Parameters<typeof jose.jwtVerify>[1];

beforeAll(async () => {
  const kp = await jose.generateKeyPair("RS256", { extractable: true });
  privateKey = kp.privateKey;
  const jwk = await jose.exportJWK(kp.publicKey);
  const jwksDoc = { keys: [{ ...jwk, use: "sig", alg: "RS256" }] };
  localJwksFn = jose.createLocalJWKSet(jwksDoc);

  const kp2 = await jose.generateKeyPair("RS256", { extractable: true });
  const jwk2 = await jose.exportJWK(kp2.publicKey);
  const jwksDoc2 = { keys: [{ ...jwk2, use: "sig", alg: "RS256" }] };
  wrongLocalJwksFn = jose.createLocalJWKSet(jwksDoc2);
});

// ---------------------------------------------------------------------------
// Helper: mint a signed id_token
// ---------------------------------------------------------------------------

async function mintIdToken(overrides: {
  iss?: string;
  aud?: string;
  nonce?: string;
  sub?: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  exp?: number;
} = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({
    sub: overrides.sub ?? "user-sub-123",
    email: overrides.email ?? "alice@example.com",
    email_verified: overrides.emailVerified ?? true,
    name: overrides.name ?? "Alice",
    nonce: overrides.nonce ?? "test-nonce",
    aud: overrides.aud ?? CLIENT_ID,
    iss: overrides.iss ?? ISSUER,
    iat: now,
    exp: overrides.exp ?? now + 3600,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);
}

// ---------------------------------------------------------------------------
// Helper: build a fetch mock for the token endpoint only
// ---------------------------------------------------------------------------

function makeFetch(options: {
  tokenStatus?: number;
  tokenBody?: Record<string, unknown>;
  nonce?: string;
  idToken?: string;
}) {
  const { tokenStatus = 200, tokenBody, nonce = "test-nonce", idToken } = options;

  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;

    if (url.includes("/oauth/token")) {
      if (tokenStatus !== 200) {
        return new Response(
          JSON.stringify({ error: "invalid_grant", error_description: "code expired" }),
          {
            status: tokenStatus,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const resolvedIdToken = idToken ?? (await mintIdToken({ nonce }));
      const body = tokenBody ?? {
        access_token: "access-abc",
        id_token: resolvedIdToken,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh-xyz",
      };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch to: ${url}`);
  }) as unknown as typeof fetch;
}

// ---------------------------------------------------------------------------
// startAuthorization tests
// ---------------------------------------------------------------------------

describe("OidcClient.startAuthorization", () => {
  it("persists state/nonce/code_verifier row and returns valid authorize URL", async () => {
    const { db, insertedValues } = makeDb();
    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
    });

    const result = await client.startAuthorization(db);

    expect(result.authorizeUrl).toContain(ISSUER + "/oauth/authorize");
    expect(result.state).toBeTruthy();
    expect(result.state.length).toBeGreaterThan(10);
    expect(insertedValues).toHaveLength(1);
    const row = insertedValues[0]!;
    expect(row[0]).toBe(result.state);
    expect(typeof row[1]).toBe("string");
    expect(typeof row[2]).toBe("string");
    expect(row[3]).toBeNull();
    expect(typeof row[4]).toBe("string");
  });

  it("includes all required PKCE + OIDC query params", async () => {
    const { db } = makeDb();
    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
    });

    const { authorizeUrl } = await client.startAuthorization(db);
    const parsed = new URL(authorizeUrl);

    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(parsed.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(parsed.searchParams.get("scope")).toBe("openid profile email");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("code_challenge")).toBeTruthy();
    expect(parsed.searchParams.get("state")).toBeTruthy();
    expect(parsed.searchParams.get("nonce")).toBeTruthy();
  });

  it("stores redirectAfter when provided", async () => {
    const { db, insertedValues } = makeDb();
    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
    });

    await client.startAuthorization(db, { redirectAfter: "/dashboard" });

    const row = insertedValues[0]!;
    expect(row[3]).toBe("/dashboard");
  });

  it("code_challenge is the base64url(SHA256(code_verifier))", async () => {
    const { createHash } = await import("node:crypto");
    const { db, insertedValues } = makeDb();
    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
    });

    const { authorizeUrl } = await client.startAuthorization(db);
    const parsed = new URL(authorizeUrl);
    const challenge = parsed.searchParams.get("code_challenge")!;
    const verifier = insertedValues[0]![2] as string;

    const expectedChallenge = Buffer.from(createHash("sha256").update(verifier).digest())
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(challenge).toBe(expectedChallenge);
  });
});

// ---------------------------------------------------------------------------
// exchangeCode tests
// ---------------------------------------------------------------------------

describe("OidcClient.exchangeCode — happy path", () => {
  it("returns verified tokens and idToken on success", async () => {
    const nonce = "nonce-happy";
    const idToken = await mintIdToken({ nonce });
    const stateRows: MockRow[] = [
      { nonce, code_verifier: "verifier-abc", redirect_after: "/home" },
    ];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ nonce, idToken });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    const result = await client.exchangeCode(db, { code: "auth-code-1", state: "state-1" });

    expect(result.tokens.accessToken).toBe("access-abc");
    expect(result.tokens.tokenType).toBe("Bearer");
    expect(result.tokens.expiresInSeconds).toBe(3600);
    expect(result.tokens.refreshToken).toBe("refresh-xyz");
    expect(result.idToken.sub).toBe("user-sub-123");
    expect(result.idToken.email).toBe("alice@example.com");
    expect(result.idToken.emailVerified).toBe(true);
    expect(result.idToken.nonce).toBe(nonce);
    expect(result.idToken.iss).toBe(ISSUER);
    expect(result.idToken.aud).toBe(CLIENT_ID);
    expect(result.idToken.raw).toBe(idToken);
    expect(result.redirectAfter).toBe("/home");
  });

  it("deletes state row after successful exchange (single-use)", async () => {
    const nonce = "nonce-del";
    const idToken = await mintIdToken({ nonce });
    const stateRows: MockRow[] = [
      { nonce, code_verifier: "verifier-del", redirect_after: null },
    ];
    const { db, query } = makeDb({ stateRows });
    const fetchMock = makeFetch({ nonce, idToken });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    await client.exchangeCode(db, { code: "code-x", state: "state-del" });

    const deleteCalls = query.mock.calls.filter(
      ([text]: unknown[]) =>
        typeof text === "string" && text.toLowerCase().includes("delete from oidc_state")
    );
    expect(deleteCalls).toHaveLength(1);
  });

  it("returns null redirectAfter when not stored", async () => {
    const nonce = "nonce-null-redirect";
    const idToken = await mintIdToken({ nonce });
    const stateRows: MockRow[] = [{ nonce, code_verifier: "v", redirect_after: null }];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ nonce, idToken });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    const result = await client.exchangeCode(db, { code: "c", state: "s" });
    expect(result.redirectAfter).toBeNull();
  });
});

describe("OidcClient.exchangeCode — error cases", () => {
  it("throws OidcStateNotFoundError when state row is missing", async () => {
    const { db } = makeDb({ stateRows: [] });
    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: makeFetch({}),
      jwksFn: localJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "missing-state" })
    ).rejects.toThrow(OidcStateNotFoundError);
  });

  it("throws OidcStateNotFoundError with correct code", async () => {
    const { db } = makeDb({ stateRows: [] });
    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: makeFetch({}),
      jwksFn: localJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "missing" })
    ).rejects.toMatchObject({ code: "oidc.state_not_found" });
  });

  it("throws OidcTokenExchangeError on non-2xx token response", async () => {
    const stateRows: MockRow[] = [{ nonce: "n", code_verifier: "v", redirect_after: null }];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ tokenStatus: 400 });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "s" })
    ).rejects.toThrow(OidcTokenExchangeError);
  });

  it("OidcTokenExchangeError exposes upstream status and message", async () => {
    const stateRows: MockRow[] = [{ nonce: "n", code_verifier: "v", redirect_after: null }];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ tokenStatus: 401 });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "s" })
    ).rejects.toMatchObject({
      code: "oidc.token_exchange_failed",
      upstreamStatus: 401,
    });
  });

  it("throws OidcNonceMismatchError when id_token nonce does not match stored nonce", async () => {
    const storedNonce = "correct-nonce";
    const wrongNonce = "wrong-nonce";
    const idToken = await mintIdToken({ nonce: wrongNonce });
    const stateRows: MockRow[] = [
      { nonce: storedNonce, code_verifier: "v", redirect_after: null },
    ];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ idToken });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "s" })
    ).rejects.toThrow(OidcNonceMismatchError);
  });

  it("throws OidcInvalidIdTokenError when id_token has wrong issuer", async () => {
    const nonce = "nonce-bad-issuer";
    const idToken = await mintIdToken({ nonce, iss: "https://evil.example.com" });
    const stateRows: MockRow[] = [{ nonce, code_verifier: "v", redirect_after: null }];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ idToken });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "s" })
    ).rejects.toThrow(OidcInvalidIdTokenError);
  });

  it("throws OidcInvalidIdTokenError when id_token has wrong audience", async () => {
    const nonce = "nonce-bad-aud";
    const idToken = await mintIdToken({ nonce, aud: "other-client" });
    const stateRows: MockRow[] = [{ nonce, code_verifier: "v", redirect_after: null }];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ idToken });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: localJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "s" })
    ).rejects.toThrow(OidcInvalidIdTokenError);
  });

  it("throws OidcInvalidIdTokenError when id_token signature is invalid (wrong key)", async () => {
    const nonce = "nonce-bad-sig";
    const idToken = await mintIdToken({ nonce });
    const stateRows: MockRow[] = [{ nonce, code_verifier: "v", redirect_after: null }];
    const { db } = makeDb({ stateRows });
    const fetchMock = makeFetch({ idToken });

    const client = createOidcClient({
      issuerUrl: ISSUER,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      fetchImpl: fetchMock,
      jwksFn: wrongLocalJwksFn,
    });

    await expect(
      client.exchangeCode(db, { code: "c", state: "s" })
    ).rejects.toThrow(OidcInvalidIdTokenError);
  });
});
