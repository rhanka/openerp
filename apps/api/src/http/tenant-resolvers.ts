import type { IdentityProvider } from "@sentropic/openerp-domain";
import type { TenantContext } from "../db/client";

// JWT-verifying tenant resolver (PG-09 / integration 0-A).
//
// Reads `Authorization: Bearer <token>` from the inbound request and verifies
// the signature + standard claims using the IdentityProvider. Derives the
// TenantContext from the verified JWT payload (org → organizationId, sub →
// actorUserId). Returns null (→ 401) on missing, invalid, or expired tokens.
//
// NEVER trusts unsigned x-organization-id / x-user-identity-id headers.

export function createJwtTenantResolver(
  identityProvider: IdentityProvider
): (request: Request) => Promise<TenantContext | null> {
  return async function jwtTenantResolver(request: Request): Promise<TenantContext | null> {
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader) return null;
    const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
    if (!match || !match[1]) return null;
    const rawToken = match[1];
    try {
      const token = await identityProvider.verify(rawToken);
      return {
        organizationId: token.organizationId,
        actorUserId: token.subjectUserIdentityId
      };
    } catch {
      // Invalid signature, expired, revoked, or malformed — fall through to null
      return null;
    }
  };
}
