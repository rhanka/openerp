export interface ApiEnv {
  databaseUrl: string;
  sessionSecret: string;
  appVersion: string;
  oauthIssuerUrl: string | undefined;
  oauthClientId: string | undefined;
  oauthClientSecret: string | undefined;
  oauthRedirectUri: string | undefined;
}

export function readApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  const databaseUrl = env.DATABASE_URL;
  const sessionSecret = env.SESSION_SECRET;
  const appVersion = env.APP_VERSION ?? "0.0.0-dev";

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!sessionSecret) throw new Error("SESSION_SECRET is required");

  return {
    databaseUrl,
    sessionSecret,
    appVersion,
    oauthIssuerUrl: env.OAUTH_ISSUER_URL,
    oauthClientId: env.OAUTH_CLIENT_ID,
    oauthClientSecret: env.OAUTH_CLIENT_SECRET,
    oauthRedirectUri: env.OAUTH_REDIRECT_URI,
  };
}
