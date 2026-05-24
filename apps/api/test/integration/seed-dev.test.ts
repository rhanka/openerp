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
    expect(second.pipelineStageCount).toBe(4);
    expect(second.companyCount).toBe(1);
    expect(second.opportunityCount).toBe(1);

    const orgCount = await pool.query<{ count: string }>(
      `select count(*)::text as count from organizations where slug = $1`,
      [DEMO_ORG_SLUG]
    );
    expect(orgCount.rows[0]?.count).toBe("1");

    const idempotencyCount = await pool.query<{ count: string }>(
      `select count(*)::text as count from idempotency_records`
    );
    expect(idempotencyCount.rows[0]?.count).toBe("0");

    // Pipeline stages exist for the demo org with the expected initial flag.
    const stages = await pool.query<{ name: string; is_initial: boolean }>(
      `select name, is_initial from pipeline_stages
        where organization_id = $1
        order by order_index asc`,
      [second.organizationId]
    );
    expect(stages.rows.map((r) => r.name)).toEqual([
      "Discovery",
      "Proposal",
      "Closed Won",
      "Closed Lost"
    ]);
    expect(stages.rows[0]!.is_initial).toBe(true);

    // The demo opportunity is wired against the demo company + Discovery stage.
    const opp = await pool.query<{ name: string; status: string }>(
      `select name, status from opportunities where organization_id = $1`,
      [second.organizationId]
    );
    expect(opp.rows).toHaveLength(1);
    expect(opp.rows[0]!.status).toBe("open");
  });
});
