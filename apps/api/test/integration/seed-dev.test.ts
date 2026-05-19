import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runMigrations } from "../../src/db/migrate";
import { createPgPool, type PgPoolHandle } from "../../src/db/pg-client";
import { DEMO_ORG_SLUG, runSeedDev } from "../../src/scripts/seed-dev-lib";

const url = process.env.OPENERP_INTEGRATION_DATABASE_URL;
const describeOrSkip = url ? describe : describe.skip;

describeOrSkip("seed-dev integration", () => {
  let pool: PgPoolHandle;

  beforeAll(async () => {
    pool = createPgPool({ connectionString: url! });
    await pool.query("drop schema if exists public cascade");
    await pool.query("create schema public");
    await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname
    });
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("re-seeds the demo tenant after idempotency records have been written", async () => {
    const first = await runSeedDev(pool);

    await pool.query(
      `insert into idempotency_records (
         organization_id, key, request_hash, response_body_hash, status_code, expires_at
       ) values ($1, $2, $3, $4, $5, $6)`,
      [
        first.organizationId,
        "approval_request:demo",
        "sha256:req",
        "sha256:res",
        200,
        new Date(Date.now() + 60_000).toISOString()
      ]
    );

    const second = await runSeedDev(pool);

    expect(second.approvalRequestCount).toBe(3);

    const orgCount = await pool.query<{ count: string }>(
      `select count(*)::text as count from organizations where slug = $1`,
      [DEMO_ORG_SLUG]
    );
    expect(orgCount.rows[0]?.count).toBe("1");

    const idempotencyCount = await pool.query<{ count: string }>(
      `select count(*)::text as count from idempotency_records`
    );
    expect(idempotencyCount.rows[0]?.count).toBe("0");
  });
});
