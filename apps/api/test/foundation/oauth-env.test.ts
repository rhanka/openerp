import { describe, expect, it } from "vitest";

import { readApiEnv } from "../../src/config/env";

const BASE_ENV: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgres://test:test@localhost/test",
  SESSION_SECRET: "a-test-session-secret-at-least-32-bytes!",
};

describe("readApiEnv — OAUTH_* vars", () => {
  it("returns all four OAUTH vars when present", () => {
    const env = readApiEnv({
      ...BASE_ENV,
      OAUTH_ISSUER_URL: "https://auth.sent-tech.ca",
      OAUTH_CLIENT_ID: "openerp-client",
      OAUTH_CLIENT_SECRET: "s3cr3t",
      OAUTH_REDIRECT_URI: "https://app.sent-tech.ca/auth/callback",
    });

    expect(env.oauthIssuerUrl).toBe("https://auth.sent-tech.ca");
    expect(env.oauthClientId).toBe("openerp-client");
    expect(env.oauthClientSecret).toBe("s3cr3t");
    expect(env.oauthRedirectUri).toBe("https://app.sent-tech.ca/auth/callback");
  });

  it("returns undefined for all four OAUTH vars when absent", () => {
    const env = readApiEnv({ ...BASE_ENV });

    expect(env.oauthIssuerUrl).toBeUndefined();
    expect(env.oauthClientId).toBeUndefined();
    expect(env.oauthClientSecret).toBeUndefined();
    expect(env.oauthRedirectUri).toBeUndefined();
  });

  it("does not throw when OAUTH vars are absent (no breaking change to dev defaults)", () => {
    expect(() => readApiEnv({ ...BASE_ENV })).not.toThrow();
  });

  it("still exposes core vars when OAUTH vars are absent", () => {
    const env = readApiEnv({ ...BASE_ENV });

    expect(env.databaseUrl).toBe("postgres://test:test@localhost/test");
    expect(env.sessionSecret).toBe("a-test-session-secret-at-least-32-bytes!");
    expect(env.appVersion).toBe("0.0.0-dev");
  });

  it("returns only the provided OAUTH vars when a subset is set", () => {
    const env = readApiEnv({
      ...BASE_ENV,
      OAUTH_ISSUER_URL: "https://auth.sent-tech.ca",
    });

    expect(env.oauthIssuerUrl).toBe("https://auth.sent-tech.ca");
    expect(env.oauthClientId).toBeUndefined();
    expect(env.oauthClientSecret).toBeUndefined();
    expect(env.oauthRedirectUri).toBeUndefined();
  });
});
