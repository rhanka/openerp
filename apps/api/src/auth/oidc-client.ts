import { createHash, randomBytes } from "node:crypto";
import * as jose from "jose";
import type { Queryable } from "../db/client";

// ---------------------------------------------------------------------------
// Config / option types
// ---------------------------------------------------------------------------

export interface OidcClientConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** State row TTL in seconds. Default: 600 (10 min). */
  ttlSeconds?: number;
  /** Overridable fetch for testing. Default: global fetch. */
  fetchImpl?: typeof fetch;
  /** Overridable clock for testing. */
  clock?: { now(): Date };
  /**
   * Override JWKS key resolver (for testing). When provided, the module-level
   * JWKS cache is bypassed entirely. Use `jose.createLocalJWKSet(jwksDoc)` to
   * supply in-memory test JWKS.
   */
  jwksFn?: Parameters<typeof jose.jwtVerify>[1];
}

export interface StartAuthorizationOptions {
  redirectAfter?: string;
}

export interface StartAuthorizationResult {
  authorizeUrl: string;
  state: string;
}

export interface ExchangeCodeOptions {
  code: string;
  state: string;
}

export interface ExchangedTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string | undefined;
  tokenType: string;
  expiresInSeconds?: number | undefined;
}

export interface VerifiedIdToken {
  sub: string;
  email?: string | undefined;
  emailVerified?: boolean | undefined;
  name?: string | undefined;
  nonce?: string | undefined;
  aud: string | string[];
  iss: string;
  iat: number;
  exp: number;
  /** The raw compact JWT string. */
  raw: string;
}

// ---------------------------------------------------------------------------
// OidcClient interface
// ---------------------------------------------------------------------------

export interface OidcClient {
  startAuthorization(
    db: Queryable,
    opts?: StartAuthorizationOptions
  ): Promise<StartAuthorizationResult>;

  exchangeCode(
    db: Queryable,
    opts: ExchangeCodeOptions
  ): Promise<{ tokens: ExchangedTokens; idToken: VerifiedIdToken; redirectAfter: string | null }>;
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class OidcClientError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "OidcClientError";
  }
}

export class OidcStateNotFoundError extends OidcClientError {
  constructor() {
    super("OIDC state not found or expired", "oidc.state_not_found");
    this.name = "OidcStateNotFoundError";
  }
}

export class OidcTokenExchangeError extends OidcClientError {
  constructor(
    message: string,
    public readonly upstreamStatus: number,
    public readonly upstreamMessage: string
  ) {
    super(message, "oidc.token_exchange_failed");
    this.name = "OidcTokenExchangeError";
  }
}

export class OidcNonceMismatchError extends OidcClientError {
  constructor() {
    super("ID token nonce does not match stored nonce", "oidc.nonce_mismatch");
    this.name = "OidcNonceMismatchError";
  }
}

export class OidcInvalidIdTokenError extends OidcClientError {
  constructor(cause?: unknown) {
    super(
      `Invalid ID token: ${cause instanceof Error ? cause.message : String(cause)}`,
      "oidc.invalid_id_token"
    );
    this.name = "OidcInvalidIdTokenError";
  }
}

// ---------------------------------------------------------------------------
// JWKS cache — one JWKS instance per issuerUrl, created lazily
// ---------------------------------------------------------------------------

const jwksCache = new Map<
  string,
  ReturnType<typeof jose.createRemoteJWKSet>
>();

function getJwks(issuerUrl: string): ReturnType<typeof jose.createRemoteJWKSet> {
  const cached = jwksCache.get(issuerUrl);
  if (cached !== undefined) return cached;
  const jwks = jose.createRemoteJWKSet(
    new URL(issuerUrl + "/.well-known/jwks.json")
  );
  jwksCache.set(issuerUrl, jwks);
  return jwks;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base64url-encode a Buffer / Uint8Array, no padding. */
function toBase64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Generate a PKCE S256 code_challenge from a code_verifier string. */
function pkceChallenge(verifier: string): string {
  return toBase64url(createHash("sha256").update(verifier).digest());
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOidcClient(config: OidcClientConfig): OidcClient {
  const {
    issuerUrl,
    clientId,
    clientSecret,
    redirectUri,
    ttlSeconds = 600,
    fetchImpl = fetch,
    clock = { now: () => new Date() },
    jwksFn,
  } = config;

  return {
    // -----------------------------------------------------------------------
    async startAuthorization(
      db: Queryable,
      opts: StartAuthorizationOptions = {}
    ): Promise<StartAuthorizationResult> {
      const state = toBase64url(randomBytes(32));
      const nonce = toBase64url(randomBytes(32));
      // PKCE verifier: 96 random bytes → base64url = 128 chars (within 43-128 spec)
      const codeVerifier = toBase64url(randomBytes(72));
      const codeChallenge = pkceChallenge(codeVerifier);

      const now = clock.now();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

      await db.query(
        `insert into oidc_state (state, nonce, code_verifier, redirect_after, expires_at)
         values ($1, $2, $3, $4, $5)`,
        [state, nonce, codeVerifier, opts.redirectAfter ?? null, expiresAt.toISOString()]
      );

      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "openid profile email",
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      const authorizeUrl = `${issuerUrl}/oauth/authorize?${params.toString()}`;

      return { authorizeUrl, state };
    },

    // -----------------------------------------------------------------------
    async exchangeCode(
      db: Queryable,
      opts: ExchangeCodeOptions
    ): Promise<{ tokens: ExchangedTokens; idToken: VerifiedIdToken; redirectAfter: string | null }> {
      // --- 1. Fetch + consume state row ---
      interface StateRow {
        nonce: string;
        code_verifier: string;
        redirect_after: string | null;
      }

      const selectResult = await db.query<StateRow>(
        `select nonce, code_verifier, redirect_after
           from oidc_state
          where state = $1 and expires_at > $2
          limit 1`,
        [opts.state, clock.now().toISOString()]
      );

      const row = selectResult.rows[0];
      if (row === undefined) {
        throw new OidcStateNotFoundError();
      }

      // Delete (single-use)
      await db.query(`delete from oidc_state where state = $1`, [opts.state]);

      const storedNonce = row.nonce;
      const storedVerifier = row.code_verifier;
      const redirectAfter = row.redirect_after;

      // --- 2. Token endpoint ---
      const basicCredential = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: opts.code,
        redirect_uri: redirectUri,
        code_verifier: storedVerifier,
        client_id: clientId,
      });

      const tokenResponse = await fetchImpl(`${issuerUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicCredential}`,
        },
        body: body.toString(),
      });

      if (!tokenResponse.ok) {
        let upstreamMessage = `HTTP ${tokenResponse.status}`;
        try {
          const errBody = (await tokenResponse.json()) as Record<string, unknown>;
          if (typeof errBody["error_description"] === "string") {
            upstreamMessage = errBody["error_description"];
          } else if (typeof errBody["error"] === "string") {
            upstreamMessage = errBody["error"];
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new OidcTokenExchangeError(
          `Token exchange failed: ${upstreamMessage}`,
          tokenResponse.status,
          upstreamMessage
        );
      }

      const tokenJson = (await tokenResponse.json()) as Record<string, unknown>;

      const tokens: ExchangedTokens = {
        accessToken: String(tokenJson["access_token"] ?? ""),
        idToken: String(tokenJson["id_token"] ?? ""),
        tokenType: String(tokenJson["token_type"] ?? "Bearer"),
        ...(typeof tokenJson["refresh_token"] === "string"
          ? { refreshToken: tokenJson["refresh_token"] }
          : {}),
        ...(typeof tokenJson["expires_in"] === "number"
          ? { expiresInSeconds: tokenJson["expires_in"] }
          : {}),
      };

      // --- 3. Verify id_token ---
      const jwks = jwksFn ?? getJwks(issuerUrl);

      let verifyResult: jose.JWTVerifyResult;
      try {
        verifyResult = await jose.jwtVerify(tokens.idToken, jwks, {
          issuer: issuerUrl,
          audience: clientId,
        });
      } catch (err) {
        throw new OidcInvalidIdTokenError(err);
      }

      const payload = verifyResult.payload;

      // --- 4. Nonce check ---
      if (payload["nonce"] !== storedNonce) {
        throw new OidcNonceMismatchError();
      }

      const idToken: VerifiedIdToken = {
        sub: String(payload.sub ?? ""),
        ...(typeof payload["email"] === "string" ? { email: payload["email"] } : {}),
        ...(typeof payload["email_verified"] === "boolean"
          ? { emailVerified: payload["email_verified"] }
          : {}),
        ...(typeof payload["name"] === "string" ? { name: payload["name"] } : {}),
        ...(typeof payload["nonce"] === "string" ? { nonce: payload["nonce"] } : {}),
        aud: payload.aud ?? clientId,
        iss: String(payload.iss ?? issuerUrl),
        iat: Number(payload.iat),
        exp: Number(payload.exp),
        raw: tokens.idToken,
      };

      return { tokens, idToken, redirectAfter };
    },
  };
}
