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
  });
});
