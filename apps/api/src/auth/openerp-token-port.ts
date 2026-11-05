import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AuthHonoSessionClaims, AuthHonoTokenPort } from "@sentropic/auth-hono";
import { DEFAULT_IDENTITY_ISSUER } from "../foundation/identity-configuration.js";

// AuthHonoTokenPort adapter — HS256 JWT-based session tokens using the existing
// OPENERP_SESSION_SECRET / SESSION_SECRET env var convention.
//
// Extension over auth-hono's base claim set (Q7 decision):
// signSessionToken embeds an `org` (organization_id) claim so the JWT is
// self-contained for OpenERP's multi-tenant RP model.

export interface OpenERPTokenPortOptions {
  secret: Uint8Array;
  issuer?: string;
  audience?: string;
}

export interface OpenERPSessionClaims extends AuthHonoSessionClaims {
  /** Organization context — OpenERP RP extension (Q7). */
  org: string;
}

export type OpenERPTokenPort = Omit<AuthHonoTokenPort, "signSessionToken" | "verifySessionToken"> & {
  signSessionToken(claims: OpenERPSessionClaims, expiresAt: Date): Promise<string>;
  verifySessionToken(token: string): Promise<OpenERPSessionClaims | null>;
};

export function createOpenERPTokenPort(options: OpenERPTokenPortOptions): OpenERPTokenPort {
  const { secret, issuer = DEFAULT_IDENTITY_ISSUER, audience } = options;
  const verificationOptions = audience ? { issuer, audience } : { issuer };

  return {
    hashSecret(secret: string): string {
      return createHash("sha256").update(secret).digest("hex");
    },

    async signSessionToken(claims: OpenERPSessionClaims, expiresAt: Date): Promise<string> {
      const payload: Record<string, unknown> = {
        role: claims.role,
        ...(claims.email !== undefined ? { email: claims.email } : {}),
        ...(claims.displayName !== undefined ? { displayName: claims.displayName } : {}),
        org: claims.org,
        actor_type: "human",
        scopes: ["session"],
      };

      const jwt = new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.userId)
        .setJti(claims.sessionId)
        .setIssuer(issuer)
        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
        .setIssuedAt();
      if (audience) jwt.setAudience(audience);
      return jwt.sign(secret);
    },

    async verifySessionToken(token: string): Promise<OpenERPSessionClaims | null> {
      try {
        const { payload } = await jwtVerify(token, secret, verificationOptions);
        const sub = payload.sub;
        const jti = payload.jti;
        const org = payload.org;
        const scopes = payload.scopes;
        if (
          !sub ||
          !jti ||
          typeof org !== "string" ||
          payload.actor_type !== "human" ||
          !Array.isArray(scopes) ||
          scopes.length !== 1 ||
          scopes[0] !== "session"
        ) {
          return null;
        }

        const claims: OpenERPSessionClaims = {
          userId: sub,
          sessionId: jti,
          role: (payload.role as string) ?? "user",
          email: (payload.email as string | null | undefined) ?? null,
          displayName: (payload.displayName as string | null | undefined) ?? null,
          org,
        };
        return claims;
      } catch {
        return null;
      }
    },

    async signVerificationToken(input: { email: string; expiresAt: Date }): Promise<string> {
      const jwt = new SignJWT({ email: input.email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(issuer)
        .setExpirationTime(Math.floor(input.expiresAt.getTime() / 1000))
        .setIssuedAt();
      if (audience) jwt.setAudience(audience);
      return jwt.sign(secret);
    },
  };
}
