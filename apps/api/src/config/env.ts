import {
  resolveIdentitySessionSecret,
  resolveIdentitySigningConfiguration,
} from "../foundation/identity-configuration.js";

export interface ApiEnv {
  databaseUrl: string;
  platformAuthEnabled: boolean;
  sessionSecret: string;
  sessionIssuer: string;
  sessionAudience: string | undefined;
  appVersion: string;
  oauthIssuerUrl: string | undefined;
  oauthClientId: string | undefined;
  oauthClientSecret: string | undefined;
  oauthRedirectUri: string | undefined;
  smtpHost: string | undefined;
  smtpPort: string | undefined;
  smtpSecure: string | undefined;
  smtpUser: string | undefined;
  smtpPassword: string | undefined;
  smtpFromAddress: string | undefined;
}

/**
 * The platform surface is deliberately dark by default. Only the literal
 * value "1" enables it; unset, "0", and every other value keep it absent.
 */
export function readPlatformAuthEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.OPENERP_PLATFORM_AUTH_ENABLED === "1";
}

export function readApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  const databaseUrl = env.OPENERP_DATABASE_URL ?? env.DATABASE_URL;
  const sessionSecret = resolveIdentitySessionSecret(env);
  const appVersion = env.APP_VERSION ?? "0.0.0-dev";

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!sessionSecret) throw new Error("SESSION_SECRET is required");
  const identitySigning = resolveIdentitySigningConfiguration(env);

  return {
    databaseUrl,
    platformAuthEnabled: readPlatformAuthEnabled(env),
    sessionSecret,
    sessionIssuer: identitySigning.issuer,
    sessionAudience: identitySigning.audience,
    appVersion,
    oauthIssuerUrl: env.OAUTH_ISSUER_URL,
    oauthClientId: env.OAUTH_CLIENT_ID,
    oauthClientSecret: env.OAUTH_CLIENT_SECRET,
    oauthRedirectUri: env.OAUTH_REDIRECT_URI,
    smtpHost: env.OPENERP_SMTP_HOST,
    smtpPort: env.OPENERP_SMTP_PORT,
    smtpSecure: env.OPENERP_SMTP_SECURE,
    smtpUser: env.OPENERP_SMTP_USER,
    smtpPassword: env.OPENERP_SMTP_PASSWORD,
    smtpFromAddress: env.OPENERP_SMTP_FROM_ADDRESS,
  };
}
