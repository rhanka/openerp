import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AuthHonoSessionClaims, AuthHonoTokenPort } from "@sentropic/auth-hono";

// AuthHonoTokenPort adapter — HS256 JWT-based session tokens using the existing
// OPENERP_SESSION_SECRET / SESSION_SECRET env var convention.
//
// Extension over auth-hono's base claim set (Q7 decision):
// signSessionToken embeds an `org` (organization_id) claim so the JWT is
// self-contained for OpenERP's multi-tenant RP model.

export interface OpenERPTokenPortOptions {
  secret: Uint8Array;
  issuer?: string;
}

export interface OpenERPSessionClaims extends AuthHonoSessionClaims {
  /** Organization context — OpenERP RP extension (Q7). */
  org?: string;
}

export function createOpenERPTokenPort(options: OpenERPTokenPortOptions): AuthHonoTokenPort & {
  signSessionToken(claims: OpenERPSessionClaims, expiresAt: Date): Promise<string>;
  verifySessionToken(token: string): Promise<OpenERPSessionClaims | null>;
} {
  const { secret, issuer = "openerp" } = options;

  return {
    hashSecret(secret: string): string {
      return createHash("sha256").update(secret).digest("hex");
    },

    async signSessionToken(claims: OpenERPSessionClaims, expiresAt: Date): Promise<string> {
      const payload: Record<string, unknown> = {
        role: claims.role,
        ...(claims.email !== undefined ? { email: claims.email } : {}),
        ...(claims.displayName !== undefined ? { displayName: claims.displayName } : {}),
        ...(claims.org !== undefined ? { org: claims.org } : {}),
      };

      return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(claims.userId)
        .setJti(claims.sessionId)
        .setIssuer(issuer)
        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
        .setIssuedAt()
        .sign(secret);
    },

    async verifySessionToken(token: string): Promise<OpenERPSessionClaims | null> {
      try {
        const { payload } = await jwtVerify(token, secret, { issuer });
        const sub = payload.sub;
        const jti = payload.jti;
        if (!sub || !jti) return null;

        const claims: OpenERPSessionClaims = {
          userId: sub,
          sessionId: jti,
          role: (payload.role as string) ?? "user",
          email: (payload.email as string | null | undefined) ?? null,
          displayName: (payload.displayName as string | null | undefined) ?? null,
        };
        if (payload.org !== undefined) {
          claims.org = payload.org as string;
        }
        return claims;
      } catch {
        return null;
      }
    },

    async signVerificationToken(input: { email: string; expiresAt: Date }): Promise<string> {
      return new SignJWT({ email: input.email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(issuer)
        .setExpirationTime(Math.floor(input.expiresAt.getTime() / 1000))
        .setIssuedAt()
        .sign(secret);
    },
  };
}
