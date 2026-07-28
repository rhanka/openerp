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
  it("exposes no ceremony surface at all until the platform flag is set", async () => {
    const db = makeChallengeDb();
    const app = buildApp(buildDevServerOptions(db, {
      OPENERP_WEB_ORIGIN: "http://127.0.0.1:4173",
      OPENERP_WEBAUTHN_RP_ID: "127.0.0.1"
    }));

    // The removed local WebAuthn mount must not come back under any name. Its
    // handler is gone and /webauthn/ is no longer a public prefix, so the
    // tenant guard now answers first — the ceremony is unreachable either way.
    const legacy = await app.request("/webauthn/login/begin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    expect(legacy.status).toBe(401);
    await expect(legacy.json()).resolves.toEqual({ code: "TENANT_RESOLUTION_REQUIRED" });

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
