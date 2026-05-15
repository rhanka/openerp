import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

import type {
  IdentityProvider,
  IdentityToken,
  OrganizationMember,
  TokenExchangeRequest,
  UserIdentity
} from "@openerp/domain";

// IdentityProvider implementation backed by HS256 JWTs (PG-09, Lot 1).
// Supports RFC 8693 token exchange via the `act` claim (acting entity) and an
// optional `may_act` claim that bounds further delegation.
//
// MVP scope:
// - HS256 signing for simplicity. RS256/EdDSA can be added by swapping signKey
//   for a KeyLike and the verify side for a JWK lookup.
// - In-memory revocation store. Production swaps via the RevocationStore interface.
// - SPIFFE/SVID is deferred (post-MVP) but the contract remains stable.

export interface RevocationStore {
  isRevoked(jti: string): Promise<boolean>;
  revoke(jti: string, expiresAt: string): Promise<void>;
  purgeExpired(asOf: string): Promise<number>;
}

export class InMemoryRevocationStore implements RevocationStore {
  private readonly entries = new Map<string, string>(); // jti → expiresAt ISO

  async isRevoked(jti: string): Promise<boolean> {
    const expiresAt = this.entries.get(jti);
    if (!expiresAt) return false;
    if (expiresAt <= new Date().toISOString()) {
      this.entries.delete(jti);
      return false;
    }
    return true;
  }

  async revoke(jti: string, expiresAt: string): Promise<void> {
    this.entries.set(jti, expiresAt);
  }

  async purgeExpired(asOf: string): Promise<number> {
    let purged = 0;
    for (const [jti, exp] of this.entries) {
      if (exp <= asOf) {
        this.entries.delete(jti);
        purged++;
      }
    }
    return purged;
  }
}

export interface IdentityProviderOptions {
  secret: Uint8Array;
  issuer: string;
  audience?: string;
  revocationStore?: RevocationStore;
  now?: () => Date;
}

export class IdentityTokenInvalidError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class IdentityTokenRevokedError extends IdentityTokenInvalidError {
  constructor() {
    super("IDENTITY_TOKEN_REVOKED", "Identity token has been revoked");
  }
}

interface ActClaim {
  sub: string;
  actor_type: "human" | "agent" | "system";
}

interface MayActClaim {
  sub: string;
  actor_type: "agent" | "system";
  scopes?: string[];
}

interface OpenERPJwtClaims {
  jti: string;
  sub: string;
  iss: string;
  aud?: string;
  iat: number;
  exp: number;
  org: string;
  actor_type: "human" | "agent" | "system";
  scopes: string[];
  act?: ActClaim;
  may_act?: MayActClaim;
  policy_decision_id?: string;
  approval_request_id?: string;
}

export function createIdentityProvider(options: IdentityProviderOptions): IdentityProvider {
  if (options.secret.length < 32) {
    throw new Error("IdentityProvider secret must be at least 32 bytes for HS256");
  }
  const revocations = options.revocationStore ?? new InMemoryRevocationStore();
  const now = options.now ?? (() => new Date());

  async function signToken(claims: OpenERPJwtClaims): Promise<string> {
    const jwt = new SignJWT({
      org: claims.org,
      actor_type: claims.actor_type,
      scopes: claims.scopes,
      act: claims.act,
      may_act: claims.may_act,
      policy_decision_id: claims.policy_decision_id,
      approval_request_id: claims.approval_request_id
    })
      .setProtectedHeader({ alg: "HS256" })
      .setJti(claims.jti)
      .setSubject(claims.sub)
      .setIssuer(claims.iss)
      .setIssuedAt(claims.iat)
      .setExpirationTime(claims.exp);
    if (claims.aud) jwt.setAudience(claims.aud);
    return jwt.sign(options.secret);
  }

  function tokenFromClaims(raw: string, claims: OpenERPJwtClaims): IdentityToken {
    return {
      raw,
      subjectUserIdentityId: claims.sub,
      actingForUserIdentityId: claims.act?.sub ?? null,
      actorType: claims.actor_type,
      organizationId: claims.org,
      scopes: claims.scopes,
      issuedAt: new Date(claims.iat * 1000).toISOString(),
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      policyDecisionId: claims.policy_decision_id ?? null,
      approvalRequestId: claims.approval_request_id ?? null
    };
  }

  async function parseClaims(rawToken: string): Promise<OpenERPJwtClaims> {
    let payload: Record<string, unknown>;
    try {
      const verifyOptions = options.audience
        ? { issuer: options.issuer, audience: options.audience }
        : { issuer: options.issuer };
      const verified = await jwtVerify(rawToken, options.secret, verifyOptions);
      payload = verified.payload as Record<string, unknown>;
    } catch (err) {
      throw new IdentityTokenInvalidError(
        "IDENTITY_TOKEN_INVALID",
        err instanceof Error ? err.message : "verify failed"
      );
    }
    const claims = payload as unknown as OpenERPJwtClaims;
    if (!claims.jti || !claims.sub || !claims.org || !claims.actor_type) {
      throw new IdentityTokenInvalidError("IDENTITY_TOKEN_INVALID", "missing required claims");
    }
    return claims;
  }

  return {
    async verify(rawToken) {
      const claims = await parseClaims(rawToken);
      if (await revocations.isRevoked(claims.jti)) {
        throw new IdentityTokenRevokedError();
      }
      return tokenFromClaims(rawToken, claims);
    },

    async issueHumanSession(identity: UserIdentity, member: OrganizationMember, ttlSeconds: number) {
      if (identity.id !== member.userIdentityId) {
        throw new Error("issueHumanSession: identity and member do not match");
      }
      if (identity.actorType !== "human") {
        throw new Error("issueHumanSession: identity.actorType must be 'human'");
      }
      const iat = Math.floor(now().getTime() / 1000);
      const exp = iat + ttlSeconds;
      const jti = randomUUID();
      const claims: OpenERPJwtClaims = {
        jti,
        sub: identity.id,
        iss: options.issuer,
        ...(options.audience ? { aud: options.audience } : {}),
        iat,
        exp,
        org: member.organizationId,
        actor_type: "human",
        scopes: ["session"]
      };
      const raw = await signToken(claims);
      return tokenFromClaims(raw, claims);
    },

    async exchangeForAgentToken(req: TokenExchangeRequest) {
      const subjectClaims = await parseClaims(req.subjectToken);
      if (subjectClaims.actor_type !== "human") {
        throw new IdentityTokenInvalidError(
          "TOKEN_EXCHANGE_FORBIDDEN",
          "subject token must belong to a human actor"
        );
      }
      if (subjectClaims.org !== req.organizationId) {
        throw new IdentityTokenInvalidError(
          "TOKEN_EXCHANGE_FORBIDDEN",
          "subject token organization does not match request"
        );
      }
      if (subjectClaims.sub !== req.subjectUserIdentityId) {
        throw new IdentityTokenInvalidError(
          "TOKEN_EXCHANGE_FORBIDDEN",
          "subject token user identity does not match request"
        );
      }
      const ttlSeconds = req.ttlSeconds ?? 600;
      const iat = Math.floor(now().getTime() / 1000);
      const exp = iat + ttlSeconds;
      const actingFor = req.actingForUserIdentityId ?? subjectClaims.sub;
      const jti = randomUUID();
      const claims: OpenERPJwtClaims = {
        jti,
        sub: actingFor,
        iss: options.issuer,
        ...(options.audience ? { aud: options.audience } : {}),
        iat,
        exp,
        org: req.organizationId,
        actor_type: "agent",
        scopes: req.requestedScopes,
        act: { sub: subjectClaims.sub, actor_type: "human" },
        ...(req.approvalRequestId ? { approval_request_id: req.approvalRequestId } : {}),
        ...(req.policyDecisionId ? { policy_decision_id: req.policyDecisionId } : {})
      };
      const raw = await signToken(claims);
      return tokenFromClaims(raw, claims);
    },

    async revoke(rawToken) {
      const claims = await parseClaims(rawToken);
      const exp = new Date(claims.exp * 1000).toISOString();
      await revocations.revoke(claims.jti, exp);
    }
  };
}
