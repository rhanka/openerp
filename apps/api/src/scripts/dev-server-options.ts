import type { Queryable } from "../db/client";
import { readApiEnv } from "../config/env";
import { createIdentityProvider } from "../foundation/identity-provider";
import {
  resolveIdentitySessionSecret,
  resolveIdentitySigningConfiguration,
} from "../foundation/identity-configuration";
import { createPasskeyService } from "../foundation/passkey-service";
import { headerTenantResolver, type StartServerOptions } from "../server";
import { createJwtTenantResolver } from "../http/tenant-resolvers";

const DEFAULT_WEB_ORIGIN = "http://127.0.0.1:4173";
const DEFAULT_DEV_SESSION_SECRET = "openerp-dev-session-secret-change-me-32-bytes";

export function buildDevServerOptions(
  db: Queryable,
  env: NodeJS.ProcessEnv = process.env
): StartServerOptions {
  return buildServerOptions(db, env, DEFAULT_DEV_SESSION_SECRET);
}

/** Production uses the same identity resolver but never falls back to a dev secret. */
export function buildProductionServerOptions(
  db: Queryable,
  env: NodeJS.ProcessEnv = process.env
): StartServerOptions {
  return buildServerOptions(db, env);
}

function buildServerOptions(
  db: Queryable,
  env: NodeJS.ProcessEnv,
  defaultSessionSecret?: string
): StartServerOptions {
  const webOrigin = env.OPENERP_WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN;
  const rpID = env.OPENERP_WEBAUTHN_RP_ID ?? hostnameFromOrigin(webOrigin);
  const sessionSecret = resolveIdentitySessionSecret(env, defaultSessionSecret);
  if (!sessionSecret) throw new Error("SESSION_SECRET is required");
  const identitySigning = resolveIdentitySigningConfiguration(env);

  // Production default: JWT-verifying resolver (PG-09 / 0-A).
  // Set OPENERP_TRUST_HEADERS=1 to fall back to the dev-convenience
  // headerTenantResolver (unsigned x-organization-id/x-user-identity-id).
  // This gate is OFF by default — never trust plain headers in production.
  const identityProvider = createIdentityProvider({
    secret: new TextEncoder().encode(sessionSecret),
    ...identitySigning,
  });
  const resolveTenant =
    env.OPENERP_TRUST_HEADERS === "1"
      ? headerTenantResolver
      : createJwtTenantResolver(identityProvider);
  const sessionTtlSeconds = Number(env.OPENERP_SESSION_TTL_SECONDS ?? "3600");
  // The platform surface is the only authentication left, so it is mounted
  // unconditionally. Gating it would let an environment ship with no way to
  // sign in at all, which is exactly what a missing flag would have produced
  // once the legacy ceremonies were removed. It needs nothing beyond the
  // database URL and session secret that are already mandatory above.
  const platformAuth = {
    enabled: true as const,
    env: readApiEnv({
      ...env,
      DATABASE_URL: env.OPENERP_DATABASE_URL ?? env.DATABASE_URL,
      SESSION_SECRET: sessionSecret,
    }),
    identityProvider,
    rp: { id: rpID, expectedOrigin: webOrigin },
    sessionTtlSeconds,
  };

  return {
    db,
    identityProvider,
    platformAuth,
    resolveTenant,
    passkey: {
      service: createPasskeyService({
        rpName: env.OPENERP_WEBAUTHN_RP_NAME ?? "OpenERP",
        rpID,
        expectedOrigin: webOrigin
      }),
      identityProvider,
      sessionTtlSeconds
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
