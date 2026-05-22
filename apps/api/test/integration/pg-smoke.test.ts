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
    pool = createPgPool({ connectionString: url! });
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
        "jobs",
        "passkey_credentials",
        "passkey_challenges"
      ]]
    );
    const tables = result.rows.map((r) => r.table_name).sort();
    expect(tables).toContain("organizations");
    expect(tables).toContain("user_identities");
    expect(tables).toContain("approval_requests");
    expect(tables).toContain("jobs");
    expect(tables).toContain("translation_keys");
    expect(tables).toContain("passkey_credentials");
    expect(tables).toContain("passkey_challenges");
  });

  it("partitions audit_events monthly and rejects UPDATE/DELETE (PG-06 article 2.2)", async () => {
    // audit_events is now a partitioned parent (relkind = 'p'); the current
    // month partition was materialized by migration 0007.
    const parent = await pool.query<{ relkind: string }>(
      "select relkind::text from pg_class where relname = 'audit_events'",
      []
    );
    expect(parent.rows[0]?.relkind).toBe("p");

    const partitions = await pool.query<{ relname: string }>(
      "select relname from pg_class where relname like 'audit_events_y____m__' order by relname",
      []
    );
    expect(partitions.rows.length).toBeGreaterThanOrEqual(1);

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Audit Inv', 'Audit Inv', 'audit-inv', 'active', 'en', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;

        const eventRes = await client.query<{ id: string }>(
          `insert into audit_events (
             organization_id, actor_type, action, resource_type, resource_id
           ) values ($1::uuid, 'system', 'organization.created', 'organization', $1::text)
           returning id`,
          [orgId]
        );
        const eventId = eventRes.rows[0]!.id;

        // Each tamper attempt runs inside a savepoint so the failure does not
        // abort the surrounding test transaction.
        await client.query("savepoint try_update");
        await expect(
          client.query(
            "update audit_events set action = 'tamper' where id = $1",
            [eventId]
          )
        ).rejects.toThrow(/append-only/i);
        await client.query("rollback to savepoint try_update");

        await client.query("savepoint try_delete");
        await expect(
          client.query("delete from audit_events where id = $1", [eventId])
        ).rejects.toThrow(/append-only/i);
        await client.query("rollback to savepoint try_delete");
      } finally {
        await client.query("rollback");
      }
    });
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

        // Switch to the non-superuser application role so forced RLS applies.
        await client.query("set local role openerp_app");

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
