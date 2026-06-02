import type { Queryable } from "../db/client";
import { createIdentityProvider } from "../foundation/identity-provider";
import { createPasskeyService } from "../foundation/passkey-service";
import { headerTenantResolver, type StartServerOptions } from "../server";
import { createJwtTenantResolver } from "../http/tenant-resolvers";

const DEFAULT_WEB_ORIGIN = "http://127.0.0.1:4173";
const DEFAULT_DEV_SESSION_SECRET = "openerp-dev-session-secret-change-me-32-bytes";

export function buildDevServerOptions(
  db: Queryable,
  env: NodeJS.ProcessEnv = process.env
): StartServerOptions {
  const webOrigin = env.OPENERP_WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN;
  const rpID = env.OPENERP_WEBAUTHN_RP_ID ?? hostnameFromOrigin(webOrigin);
  const sessionSecret = env.SESSION_SECRET
    ?? env.OPENERP_SESSION_SECRET
    ?? DEFAULT_DEV_SESSION_SECRET;

  // Production default: JWT-verifying resolver (PG-09 / 0-A).
  // Set OPENERP_TRUST_HEADERS=1 to fall back to the dev-convenience
  // headerTenantResolver (unsigned x-organization-id/x-user-identity-id).
  // This gate is OFF by default — never trust plain headers in production.
  const identityProvider = createIdentityProvider({
    secret: new TextEncoder().encode(sessionSecret),
    issuer: env.OPENERP_ISSUER ?? "openerp-dev",
    ...(env.OPENERP_AUDIENCE ? { audience: env.OPENERP_AUDIENCE } : {})
  });
  const resolveTenant =
    env.OPENERP_TRUST_HEADERS === "1"
      ? headerTenantResolver
      : createJwtTenantResolver(identityProvider);

  return {
    db,
    resolveTenant,
    passkey: {
      service: createPasskeyService({
        rpName: env.OPENERP_WEBAUTHN_RP_NAME ?? "OpenERP",
        rpID,
        expectedOrigin: webOrigin
      }),
      identityProvider,
      sessionTtlSeconds: Number(env.OPENERP_SESSION_TTL_SECONDS ?? "3600")
    }
  };
}

function hostnameFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return "127.0.0.1";
  }
}
