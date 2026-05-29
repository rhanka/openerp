import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { runMigrations } from "../../src/db/migrate";
import { createPgPool, type PgPoolHandle } from "../../src/db/pg-client";

// Schema smoke test for the quote_handoffs table (migration 0026).
// Runs only when OPENERP_INTEGRATION_DATABASE_URL is set.

const url = process.env.OPENERP_INTEGRATION_DATABASE_URL;
const describeOrSkip = url ? describe : describe.skip;

describeOrSkip("quote_handoffs schema (migration 0026)", () => {
  let pool: PgPoolHandle;

  beforeAll(async () => {
    pool = createPgPool({ connectionString: url! });
    await pool.query("drop schema if exists public cascade");
    await pool.query("create schema public");
    await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname
    });
  }, 20000);

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("quote_handoffs table exists with required columns", async () => {
    const result = await pool.query<{ column_name: string; data_type: string; is_nullable: string }>(
      `select column_name, data_type, is_nullable
         from information_schema.columns
        where table_schema = 'public' and table_name = 'quote_handoffs'
        order by ordinal_position`,
      []
    );
    const cols = result.rows.map((r) => r.column_name);
    expect(cols).toContain("id");
    expect(cols).toContain("organization_id");
    expect(cols).toContain("opportunity_id");
    expect(cols).toContain("target_type");
    expect(cols).toContain("status");
    expect(cols).toContain("requested_by_user_id");
    expect(cols).toContain("accepted_at");
    expect(cols).toContain("deleted_at");
    expect(cols).toContain("created_at");
    expect(cols).toContain("updated_at");
  });

  it("quote_handoffs target_type check constraint rejects invalid values", async () => {
    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Schema Test', 'Schema Test', 'schema-qh-27', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;

        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('schema-qh-id@test.local', 'Schema QH', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'schema-qh@test.local', 'Schema QH', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;

        const stageRes = await client.query<{ id: string }>(
          `insert into pipeline_stages (organization_id, name, order_index, is_initial, is_won, is_lost, active)
           values ($1, 'Discovery', 0, true, false, false, true)
           returning id`,
          [orgId]
        );
        const stageId = stageRes.rows[0]!.id;

        const companyRes = await client.query<{ id: string }>(
          `insert into companies (organization_id, display_name)
           values ($1, 'Test Corp')
           returning id`,
          [orgId]
        );
        const companyId = companyRes.rows[0]!.id;

        const oppRes = await client.query<{ id: string }>(
          `insert into opportunities (organization_id, company_id, name, stage_id, status)
           values ($1, $2, 'Test opp', $3, 'won')
           returning id`,
          [orgId, companyId, stageId]
        );
        const opportunityId = oppRes.rows[0]!.id;

        // Valid insert
        const validRes = await client.query<{ id: string }>(
          `insert into quote_handoffs (organization_id, opportunity_id, target_type, requested_by_user_id)
           values ($1, $2, 'invoice', $3)
           returning id`,
          [orgId, opportunityId, userId]
        );
        expect(validRes.rows[0]!.id).toBeTruthy();

        // Invalid target_type
        await client.query("savepoint try_bad_target");
        await expect(
          client.query(
            `insert into quote_handoffs (organization_id, opportunity_id, target_type)
             values ($1, $2, 'bad_type')`,
            [orgId, opportunityId]
          )
        ).rejects.toThrow();
        await client.query("rollback to savepoint try_bad_target");

        // Invalid status
        await client.query("savepoint try_bad_status");
        await expect(
          client.query(
            `insert into quote_handoffs (organization_id, opportunity_id, target_type, status)
             values ($1, $2, 'invoice', 'nonsense')`,
            [orgId, opportunityId]
          )
        ).rejects.toThrow();
        await client.query("rollback to savepoint try_bad_status");
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("quote_handoffs RLS isolates rows by organization", async () => {
    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgsRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values
             ('QH Org A', 'A', 'qh-rls-a', 'active', 'fr', 'CAD', 'America/Toronto', 'CA', 'QC'),
             ('QH Org B', 'B', 'qh-rls-b', 'active', 'fr', 'CAD', 'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const [aId, bId] = orgsRes.rows.map((r) => r.id) as [string, string];

        // Seed stages, companies, opportunities for each org
        for (const orgId of [aId, bId]) {
          const stageRes = await client.query<{ id: string }>(
            `insert into pipeline_stages (organization_id, name, order_index, is_initial, is_won, is_lost, active)
             values ($1, 'Disc', 0, true, false, false, true) returning id`,
            [orgId]
          );
          const compRes = await client.query<{ id: string }>(
            `insert into companies (organization_id, display_name) values ($1, 'Co') returning id`,
            [orgId]
          );
          const oppRes = await client.query<{ id: string }>(
            `insert into opportunities (organization_id, company_id, name, stage_id, status)
             values ($1, $2, 'Opp', $3, 'won') returning id`,
            [orgId, compRes.rows[0]!.id, stageRes.rows[0]!.id]
          );
          await client.query(
            `insert into quote_handoffs (organization_id, opportunity_id, target_type)
             values ($1, $2, 'invoice')`,
            [orgId, oppRes.rows[0]!.id]
          );
        }

        await client.query("set local role openerp_app");

        await client.query("select set_config('app.current_organization_id', $1, true)", [aId]);
        const seenAsA = await client.query<{ count: string }>(
          "select count(*)::text as count from quote_handoffs",
          []
        );
        expect(seenAsA.rows[0]!.count).toBe("1");

        await client.query("select set_config('app.current_organization_id', $1, true)", [bId]);
        const seenAsB = await client.query<{ count: string }>(
          "select count(*)::text as count from quote_handoffs",
          []
        );
        expect(seenAsB.rows[0]!.count).toBe("1");
      } finally {
        await client.query("rollback");
      }
    });
  });
});
