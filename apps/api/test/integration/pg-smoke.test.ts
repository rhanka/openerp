import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { runMigrations } from "../../src/db/migrate";
import { createPgPool, type PgPoolHandle } from "../../src/db/pg-client";

// Smoke test against a real Postgres. Skipped automatically when
// OPENERP_INTEGRATION_DATABASE_URL is not set (CI without docker compose).
// Run locally:
//   docker compose up -d postgres
//   OPENERP_INTEGRATION_DATABASE_URL=postgresql://openerp:openerp@127.0.0.1:5433/openerp_dev \
//     npm test -w @sentropic/openerp-api -- pg-smoke

const url = process.env.OPENERP_INTEGRATION_DATABASE_URL;
const describeOrSkip = url ? describe : describe.skip;

describeOrSkip("pg-client + migrate (integration)", () => {
  let pool: PgPoolHandle;

  beforeAll(async () => {
    pool = createPgPool({ connectionString: url });
    // Hard reset: drop public schema and recreate. Migrations rebuild from 0001.
    await pool.query("drop schema if exists public cascade");
    await pool.query("create schema public");
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("applies every migration once, then skips on re-run", async () => {
    const firstRun = await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname
    });
    expect(firstRun.applied.length).toBeGreaterThan(0);
    expect(firstRun.skipped.length).toBe(0);

    const secondRun = await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname
    });
    expect(secondRun.applied.length).toBe(0);
    expect(secondRun.skipped.length).toBe(firstRun.applied.length);
  });

  it("creates the canon tables", async () => {
    const result = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_name = any($1::text[])`,
      [[
        "organizations",
        "user_identities",
        "organization_members",
        "approval_requests",
        "idempotency_records",
        "fx_rate_snapshots",
        "timeline_entries",
        "translation_keys",
        "jobs"
      ]]
    );
    const tables = result.rows.map((r) => r.table_name).sort();
    expect(tables).toContain("organizations");
    expect(tables).toContain("user_identities");
    expect(tables).toContain("approval_requests");
    expect(tables).toContain("jobs");
    expect(tables).toContain("translation_keys");
  });

  it("enforces RLS isolation between two organizations", async () => {
    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgs = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values
             ('Org Alpha', 'Alpha', 'alpha', 'active', 'en', 'CAD', 'America/Toronto', 'CA', 'QC'),
             ('Org Beta',  'Beta',  'beta',  'active', 'en', 'CAD', 'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const [alphaId, betaId] = orgs.rows.map((r) => r.id) as [string, string];

        await client.query(
          `insert into translation_keys (organization_id, namespace, key, locale, label)
           values ($1, 'crm.pipeline_stage', 'discovery', 'fr', 'Découverte'),
                  ($2, 'crm.pipeline_stage', 'discovery', 'fr', 'Discovery')`,
          [alphaId, betaId]
        );

        await client.query("select set_config('app.current_organization_id', $1, true)", [alphaId]);
        const visibleAsAlpha = await client.query<{ label: string }>(
          `select label from translation_keys where namespace = 'crm.pipeline_stage'`,
          []
        );
        expect(visibleAsAlpha.rows.map((r) => r.label)).toEqual(["Découverte"]);

        await client.query("select set_config('app.current_organization_id', $1, true)", [betaId]);
        const visibleAsBeta = await client.query<{ label: string }>(
          `select label from translation_keys where namespace = 'crm.pipeline_stage'`,
          []
        );
        expect(visibleAsBeta.rows.map((r) => r.label)).toEqual(["Discovery"]);
      } finally {
        await client.query("rollback");
      }
    });
  });
});
