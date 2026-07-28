/**
 * The JWT values shared by the business IdentityProvider and the dark
 * platform-auth adapters. A platform-issued human session is only useful if
 * the existing tenant resolver can verify it with this exact configuration.
 */
export const DEFAULT_IDENTITY_ISSUER = "openerp-dev";

export interface IdentitySigningConfiguration {
  issuer: string;
  audience?: string;
}

export function resolveIdentitySessionSecret(
  env: { SESSION_SECRET?: string; OPENERP_SESSION_SECRET?: string },
  fallback?: string
): string | undefined {
  return env.SESSION_SECRET ?? env.OPENERP_SESSION_SECRET ?? fallback;
}

export function resolveIdentitySigningConfiguration(
  env: { OPENERP_ISSUER?: string; OPENERP_AUDIENCE?: string }
): IdentitySigningConfiguration {
  const issuer = env.OPENERP_ISSUER ?? DEFAULT_IDENTITY_ISSUER;
  const audience = env.OPENERP_AUDIENCE;
  return audience ? { issuer, audience } : { issuer };
}
