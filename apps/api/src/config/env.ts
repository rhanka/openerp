export interface ApiEnv {
  databaseUrl: string;
  sessionSecret: string;
  appVersion: string;
}

export function readApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  const databaseUrl = env.DATABASE_URL;
  const sessionSecret = env.SESSION_SECRET;
  const appVersion = env.APP_VERSION ?? "0.0.0-dev";

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!sessionSecret) throw new Error("SESSION_SECRET is required");

  return { databaseUrl, sessionSecret, appVersion };
}
