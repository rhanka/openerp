import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import { buildApp } from "../../src/http/app";
import { buildDevServerOptions } from "../../src/scripts/dev-server-options";

function makeChallengeDb(): Queryable {
  return {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("insert into passkey_challenges")) {
        expect(values[1]).toEqual(expect.any(String));
        expect(values[2]).toBe("authentication");
        return { rows: [{} as T] };
      }
      throw new Error(`unexpected query: ${text}`);
    }
  };
}

describe("dev server options", () => {
  it("mounts public WebAuthn routes for local development", async () => {
    const db = makeChallengeDb();
    const app = buildApp(buildDevServerOptions(db, {
      OPENERP_WEB_ORIGIN: "http://127.0.0.1:4173",
      OPENERP_WEBAUTHN_RP_ID: "127.0.0.1"
    }));

    const res = await app.request("/webauthn/login/begin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      challenge: expect.any(String),
      rpId: "127.0.0.1"
    });
    const platformHealth = await app.request("/api/v1/auth/health");
    expect(platformHealth.status).toBe(404);
  });

  it("mounts the platform surface only when OPENERP_PLATFORM_AUTH_ENABLED is literal 1", async () => {
    const db = makeChallengeDb();
    const app = buildApp(buildDevServerOptions(db, {
      OPENERP_DATABASE_URL: "postgresql://openerp.test/dev-options",
      OPENERP_PLATFORM_AUTH_ENABLED: "1",
      OPENERP_SMTP_HOST: "smtp.test",
      OPENERP_SMTP_FROM_ADDRESS: "auth@openerp.test",
    }));

    const response = await app.request("/api/v1/auth/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", service: "openerp-auth" });
  });
});
