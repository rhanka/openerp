import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { verifyJournalChain } from "@sentropic/h2a";

import { runMigrations } from "../../src/db/migrate";
import { createPgPool, type PgPoolHandle } from "../../src/db/pg-client";
import {
  createApprovalRequest,
  decideApprovalRequest
} from "../../src/foundation/approval-service";
import { readApprovalJournalChain } from "../../src/foundation/h2a-bridge";
import { verifyJournalEntrySignatures } from "../../src/foundation/audit-signing";

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
  }, 15000);

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
        "passkey_challenges",
        "agent_definitions",
        "agent_runs",
        "tool_calls",
        "policy_decisions",
        "supervision_requests"
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
    expect(tables).toContain("agent_definitions");
    expect(tables).toContain("agent_runs");
    expect(tables).toContain("tool_calls");
    expect(tables).toContain("policy_decisions");
    expect(tables).toContain("supervision_requests");
  });

  it("CRM Lead conversion atomically creates Company + Contact + Opportunity (DS 2.4)", async () => {
    const { createPipelineStage } = await import("../../src/crm/pipeline-stage-service");
    const { convertLead, createLead, LeadNotConvertibleError } = await import(
      "../../src/crm/lead-service"
    );

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Lead Co', 'Lead Co', 'lead-co', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sales-lead-id@lead.local', 'Sales', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sales-lead@lead.local', 'Sales', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        // Configure an initial pipeline stage so convertLead can hand off.
        await createPipelineStage(client, tenant, {
          name: "Discovery",
          orderIndex: 0,
          isInitial: true
        });

        const lead = await createLead(client, tenant, {
          displayName: "Acme contact via web form",
          source: "web_form",
          companyName: "Acme Acquisition Corp.",
          contactName: "Alice Tremblay",
          email: "alice@acme.example",
          phone: "+1-514-555-0100"
        });
        expect(lead.status).toBe("new");

        const outcome = await convertLead(client, tenant, lead.id);
        expect(outcome.lead.status).toBe("converted");
        expect(outcome.lead.convertedCompanyId).toBe(outcome.company.id);
        expect(outcome.lead.convertedOpportunityId).toBe(outcome.opportunity.id);
        expect(outcome.company.displayName).toBe("Acme Acquisition Corp.");
        expect(outcome.contact?.displayName).toBe("Alice Tremblay");
        expect(outcome.opportunity.status).toBe("open");

        // Re-conversion is rejected.
        await expect(convertLead(client, tenant, lead.id)).rejects.toBeInstanceOf(
          LeadNotConvertibleError
        );

        const auditRows = await client.query<{ action: string }>(
          `select action
             from audit_events
            where organization_id = $1 and resource_type = 'lead' and resource_id = $2::text
            order by created_at asc, action asc`,
          [orgId, lead.id]
        );
        const actions = auditRows.rows.map((r) => r.action).sort();
        expect(actions).toContain("crm.lead.created");
        expect(actions).toContain("crm.lead.converted");

        const leadTimeline = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'lead' and resource_id = $2
            order by occurred_at asc`,
          [orgId, lead.id]
        );
        const entryTypes = leadTimeline.rows.map((r) => r.entry_type).sort();
        expect(entryTypes).toEqual(["crm.lead.converted", "crm.lead.created"].sort());
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("CRM TimelineEntry projection: meaningful transitions emit canonical entry_type (DS 2.2)", async () => {
    const { createCompany, updateCompany } = await import(
      "../../src/crm/company-service"
    );

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Timeline Co', 'Timeline Co', 'timeline-co', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('timeline-id@timeline.local', 'Sales', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'timeline@timeline.local', 'Sales', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const company = await createCompany(client, tenant, { displayName: "Northwind" });
        await updateCompany(client, tenant, company.id, { displayName: "Northwind Services" });

        const timelineRows = await client.query<{
          entry_type: string;
          payload_summary: Record<string, unknown>;
        }>(
          `select entry_type, payload_summary
             from timeline_entries
            where organization_id = $1 and resource_type = 'company' and resource_id = $2
            order by occurred_at asc, entry_type asc`,
          [orgId, company.id]
        );
        const entryTypes = timelineRows.rows.map((r) => r.entry_type).sort();
        expect(entryTypes).toEqual(["crm.company.created", "crm.company.updated"]);
        const updatedRow = timelineRows.rows.find((r) => r.entry_type === "crm.company.updated");
        expect(updatedRow?.payload_summary).toMatchObject({ displayName: "Northwind Services" });
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("CRM Opportunity h2a engagement chain verifies end-to-end (DS 2.6)", async () => {
    const { createCompany } = await import("../../src/crm/company-service");
    const { createPipelineStage } = await import(
      "../../src/crm/pipeline-stage-service"
    );
    const {
      createOpportunity,
      updateOpportunity
    } = await import("../../src/crm/opportunity-service");
    const { readOpportunityJournalChain } = await import(
      "../../src/crm/h2a-opportunity-bridge"
    );

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Engagement Co', 'Engagement Co', 'engagement-co', 'active', 'fr',
             'CAD', 'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sales-engagement-id@engagement.local', 'Sales', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sales-engagement@engagement.local', 'Sales', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const company = await createCompany(client, tenant, { displayName: "Acme Engagement" });
        const discovery = await createPipelineStage(client, tenant, {
          name: "Discovery",
          orderIndex: 0,
          isInitial: true
        });
        const proposal = await createPipelineStage(client, tenant, {
          name: "Proposal",
          orderIndex: 1
        });
        const closedWon = await createPipelineStage(client, tenant, {
          name: "Closed Won",
          orderIndex: 2,
          isWon: true
        });

        const opp = await createOpportunity(client, tenant, {
          companyId: company.id,
          name: "Annual licence",
          stageId: discovery.id
        });
        await updateOpportunity(client, tenant, opp.id, { stageId: proposal.id });
        await updateOpportunity(client, tenant, opp.id, {
          stageId: closedWon.id,
          status: "won"
        });

        const chain = await readOpportunityJournalChain(client, tenant, opp.id);
        // created (sequence 0) -> stage_changed (1) -> stage_changed (2)
        //   + won (3); the second updateOpportunity flips both stage AND status,
        //   producing two journal entries on the same call.
        expect(chain.length).toBeGreaterThanOrEqual(3);
        expect(chain[0]!.type).toBe("propose");
        expect(chain[chain.length - 1]!.type).toBe("accept");
        expect(verifyJournalChain(chain).ok).toBe(true);
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("CRM Pipeline + Opportunity end-to-end: stage_changed + won/lost audit grammar", async () => {
    const { createCompany } = await import("../../src/crm/company-service");
    const { createPipelineStage } = await import(
      "../../src/crm/pipeline-stage-service"
    );
    const {
      createOpportunity,
      updateOpportunity
    } = await import("../../src/crm/opportunity-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Pipe Co', 'Pipe Co', 'pipe-co', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sales-pipe-id@pipe.local', 'Sales', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sales-pipe@pipe.local', 'Sales', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const company = await createCompany(client, tenant, { displayName: "Acme" });
        const discovery = await createPipelineStage(client, tenant, {
          name: "Discovery",
          orderIndex: 0,
          isInitial: true
        });
        const proposal = await createPipelineStage(client, tenant, {
          name: "Proposal",
          orderIndex: 1
        });
        const closedWon = await createPipelineStage(client, tenant, {
          name: "Closed Won",
          orderIndex: 2,
          isWon: true
        });

        const opp = await createOpportunity(client, tenant, {
          companyId: company.id,
          name: "Annual licence",
          stageId: discovery.id,
          expectedValue: { amountMinor: 12_000_00, currency: "CAD", scale: 2 },
          currency: "CAD"
        });

        await updateOpportunity(client, tenant, opp.id, { stageId: proposal.id });
        await updateOpportunity(client, tenant, opp.id, {
          stageId: closedWon.id,
          status: "won"
        });

        const auditRows = await client.query<{ action: string }>(
          `select action
             from audit_events
            where organization_id = $1 and resource_type = 'opportunity' and resource_id = $2::text
            order by created_at asc, (after_summary->>'status') asc`,
          [orgId, opp.id]
        );
        const actions = auditRows.rows.map((r) => r.action);
        // created, then 2x updated + 2x stage_changed (one per stage move),
        // plus 1x won on the final close. Ordering is non-deterministic among
        // events sharing the same created_at; we assert presence only.
        expect(actions).toContain("crm.opportunity.created");
        expect(actions.filter((a) => a === "crm.opportunity.updated").length).toBeGreaterThanOrEqual(2);
        expect(actions.filter((a) => a === "crm.opportunity.stage_changed").length).toBe(2);
        expect(actions).toContain("crm.opportunity.won");
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("CRM Contact end-to-end: create -> filter by company -> update emits crm.contact.* audit", async () => {
    const {
      createContact,
      listContacts,
      updateContact
    } = await import("../../src/crm/contact-service");
    const { createCompany } = await import("../../src/crm/company-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Contact Co', 'Contact Co', 'contact-co', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sales-it-id@contact.local', 'Sales IT', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sales-it@contact.local', 'Sales IT', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const company = await createCompany(client, tenant, { displayName: "Northwind" });

        const alice = await createContact(client, tenant, {
          displayName: "Alice Tremblay",
          firstName: "Alice",
          lastName: "Tremblay",
          email: "alice@northwind.local",
          companyId: company.id
        });
        await createContact(client, tenant, {
          displayName: "Bob Orphan",
          email: "bob@elsewhere.local"
        });

        const scoped = await listContacts(client, tenant, { companyId: company.id });
        expect(scoped.map((c) => c.displayName)).toEqual(["Alice Tremblay"]);

        const updated = await updateContact(client, tenant, alice.id, {
          status: "inactive",
          title: "VP Operations"
        });
        expect(updated.status).toBe("inactive");
        expect(updated.title).toBe("VP Operations");

        const auditRows = await client.query<{ action: string }>(
          `select action
             from audit_events
            where organization_id = $1 and resource_type = 'contact' and resource_id = $2::text
            order by ((after_summary->>'status')::text) asc`,
          [orgId, alice.id]
        );
        const actions = auditRows.rows.map((r) => r.action).sort();
        expect(actions).toEqual(["crm.contact.created", "crm.contact.updated"]);
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("CRM Company end-to-end: create -> list -> update emits crm.company.* audit", async () => {
    const {
      createCompany,
      listCompanies,
      updateCompany
    } = await import("../../src/crm/company-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('CRM Co', 'CRM Co', 'crm-co', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sales-id@crm.local', 'Sales', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sales@crm.local', 'Sales', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const created = await createCompany(client, tenant, {
          displayName: "Northwind",
          legalName: "Northwind Services Inc.",
          language: "fr",
          taxRegion: "CA-QC"
        });
        expect(created.id).toBeTruthy();
        expect(created.status).toBe("active");
        expect(created.displayName).toBe("Northwind");

        const archived = await updateCompany(client, tenant, created.id, {
          status: "archived",
          displayName: "Northwind Services"
        });
        expect(archived.status).toBe("archived");
        expect(archived.displayName).toBe("Northwind Services");

        const all = await listCompanies(client, tenant);
        expect(all).toHaveLength(1);
        expect(all[0]!.status).toBe("archived");

        const auditRows = await client.query<{ action: string }>(
          `select action
             from audit_events
            where organization_id = $1 and resource_type = 'company' and resource_id = $2::text
            order by ((after_summary->>'status')::text) asc`,
          [orgId, created.id]
        );
        const actions = auditRows.rows.map((r) => r.action).sort();
        expect(actions).toEqual(["crm.company.created", "crm.company.updated"]);
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("isolates agentic tables by tenant via RLS (Article 4.6)", async () => {
    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgs = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values
             ('AgentOrg A', 'A', 'agentorg-a', 'active', 'en', 'CAD', 'America/Toronto', 'CA', 'QC'),
             ('AgentOrg B', 'B', 'agentorg-b', 'active', 'en', 'CAD', 'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const [aId, bId] = orgs.rows.map((r) => r.id) as [string, string];

        await client.query(
          `insert into agent_definitions
             (organization_id, name, identity_mode, status)
           values
             ($1, 'invoice-agent', 'acting_as', 'active'),
             ($2, 'invoice-agent', 'acting_as', 'active')`,
          [aId, bId]
        );

        // Switch to the non-superuser app role so RLS applies.
        await client.query("set local role openerp_app");

        await client.query("select set_config('app.current_organization_id', $1, true)", [aId]);
        const seenAsA = await client.query<{ name: string }>(
          `select name from agent_definitions`,
          []
        );
        expect(seenAsA.rows.map((r) => r.name)).toEqual(["invoice-agent"]);

        await client.query("select set_config('app.current_organization_id', $1, true)", [bId]);
        const seenAsB = await client.query<{ name: string }>(
          `select name from agent_definitions`,
          []
        );
        expect(seenAsB.rows.map((r) => r.name)).toEqual(["invoice-agent"]);

        // Cross-tenant read with the wrong scope returns nothing.
        await client.query("select set_config('app.current_organization_id', $1, true)", [aId]);
        const wrongScope = await client.query<{ count: string }>(
          `select count(*)::text as count from agent_definitions where organization_id = $1`,
          [bId]
        );
        expect(wrongScope.rows[0]!.count).toBe("0");
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("CRM soft-delete hides rows from default reads but preserves audit + timeline (DS 2.3)", async () => {
    const { createCompany, deleteCompany, listCompanies } = await import(
      "../../src/crm/company-service"
    );

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('SoftDel Co', 'SoftDel Co', 'softdel-co', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sd-id@sd.local', 'SD', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sd@sd.local', 'SD', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const company = await createCompany(client, tenant, { displayName: "Vanishing Co" });
        const listBefore = await listCompanies(client, tenant);
        expect(listBefore.length).toBe(1);
        expect(listBefore[0]!.id).toBe(company.id);

        await deleteCompany(client, tenant, company.id);

        const listAfter = await listCompanies(client, tenant);
        expect(listAfter.length).toBe(0);

        // Audit rows preserved.
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'company' and resource_id = $2::text
            order by created_at asc`,
          [orgId, company.id]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("crm.company.created");
        expect(actions).toContain("crm.company.deleted");

        // Timeline rows preserved.
        const tlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'company' and resource_id = $2
            order by occurred_at asc`,
          [orgId, company.id]
        );
        const entryTypes = tlRows.rows.map((r) => r.entry_type);
        expect(entryTypes).toContain("crm.company.created");
        expect(entryTypes).toContain("crm.company.deleted");
      } finally {
        await client.query("rollback");
      }
    });
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

  it("ApprovalRequest journal entries are ed25519-signed and verify when env signing is enabled", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const restore = {
      priv: process.env.OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM,
      pub: process.env.OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM,
      by: process.env.OPENERP_AUDIT_SIGNING_BY
    };
    process.env.OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM = privateKeyPem;
    process.env.OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM = publicKeyPem;
    process.env.OPENERP_AUDIT_SIGNING_BY = "openerp-foundation-it";

    try {
      await pool.withClient(async (client) => {
        await client.query("begin");
        try {
          const orgRes = await client.query<{ id: string }>(
            `insert into organizations (
               legal_name, display_name, slug, status, default_locale, default_currency,
               default_timezone, country, province_state
             ) values ('Signed', 'Signed', 'signed-it', 'active', 'fr', 'CAD',
               'America/Toronto', 'CA', 'QC')
             returning id`,
            []
          );
          const orgId = orgRes.rows[0]!.id;
          const userRes = await client.query<{ id: string }>(
            `insert into users (organization_id, email, display_name, preferred_locale, status)
               values ($1, 'actor-it@signed.local', 'Actor IT', 'fr', 'active')
             returning id`,
            [orgId]
          );
          const actorId = userRes.rows[0]!.id;
          const requesterRes = await client.query<{ id: string }>(
            `insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
               values ('req-it@signed.local', 'Req IT', 'fr', 'passkey', 'active', 'human')
             returning id`,
            []
          );
          const approverRes = await client.query<{ id: string }>(
            `insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
               values ('appr-it@signed.local', 'Appr IT', 'fr', 'passkey', 'active', 'human')
             returning id`,
            []
          );
          const tenantContext = { organizationId: orgId, actorUserId: actorId };

          const created = await createApprovalRequest(client, tenantContext, {
            requesterUserIdentityId: requesterRes.rows[0]!.id,
            approverUserIdentityId: approverRes.rows[0]!.id,
            approverRoleId: null,
            subjectType: "invoice",
            subjectId: "00000000-0000-0000-0000-000000001abc",
            reason: "Signed flow",
            urgency: "normal"
          });
          await decideApprovalRequest(client, tenantContext, {
            approvalRequestId: created.id,
            approverUserIdentityId: approverRes.rows[0]!.id,
            decision: "approved",
            decisionReason: "ok",
            decidedAt: new Date().toISOString()
          });

          const chain = await readApprovalJournalChain(client, tenantContext, created.id);
          expect(chain).toHaveLength(2);
          for (const entry of chain) {
            expect(entry.signatures).toBeDefined();
            expect(entry.signatures).toHaveLength(1);
            expect(entry.signatures![0]!.alg).toBe("ed25519");
            expect(
              verifyJournalEntrySignatures(entry, { publicKeyPem })
            ).toBe(true);
          }
          expect(verifyJournalChain(chain).ok).toBe(true);
        } finally {
          await client.query("rollback");
        }
      });
    } finally {
      if (restore.priv === undefined) delete process.env.OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM;
      else process.env.OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM = restore.priv;
      if (restore.pub === undefined) delete process.env.OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM;
      else process.env.OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM = restore.pub;
      if (restore.by === undefined) delete process.env.OPENERP_AUDIT_SIGNING_BY;
      else process.env.OPENERP_AUDIT_SIGNING_BY = restore.by;
    }
  });

  it("ApprovalRequest emits chained h2a journal entries that verify end-to-end", async () => {
    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Acme', 'Acme', 'acme', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;

        const requesterRes = await client.query<{ id: string }>(
          `insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('req@acme.local', 'Requester', 'fr', 'passkey', 'active', 'human')
           returning id`,
          []
        );
        const requesterId = requesterRes.rows[0]!.id;

        const approverRes = await client.query<{ id: string }>(
          `insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('appr@acme.local', 'Approver', 'fr', 'passkey', 'active', 'human')
           returning id`,
          []
        );
        const approverId = approverRes.rows[0]!.id;

        // approval_service expects an actorUserId; for foundation we keep the
        // legacy users row in sync (audit_events still has FK on users).
        const userRes = await client.query<{ id: string }>(
          `insert into users (organization_id, email, display_name, preferred_locale, status)
             values ($1, 'actor@acme.local', 'Actor', 'fr', 'active')
           returning id`,
          [orgId]
        );
        const actorId = userRes.rows[0]!.id;

        const tenantContext = { organizationId: orgId, actorUserId: actorId };

        const created = await createApprovalRequest(client, tenantContext, {
          requesterUserIdentityId: requesterId,
          approverUserIdentityId: approverId,
          approverRoleId: null,
          subjectType: "invoice",
          subjectId: "00000000-0000-0000-0000-000000000abc",
          reason: "Approve invoice issuance over threshold",
          urgency: "normal"
        });

        await decideApprovalRequest(client, tenantContext, {
          approvalRequestId: created.id,
          approverUserIdentityId: approverId,
          decision: "approved",
          decisionReason: "validated",
          decidedAt: new Date().toISOString()
        });

        const chain = await readApprovalJournalChain(client, tenantContext, created.id);
        expect(chain).toHaveLength(2);
        expect(chain[0]!.type).toBe("propose");
        expect(chain[0]!.sequence).toBe(0);
        expect(chain[0]!.prevHash).toBeUndefined();
        expect(chain[1]!.type).toBe("accept");
        expect(chain[1]!.sequence).toBe(1);
        expect(chain[1]!.prevHash).toBe(chain[0]!.contentHash);

        const verification = verifyJournalChain(chain);
        expect(verification.ok).toBe(true);

        const auditRows = await client.query<{
          correlation_id: string;
          approval_request_id: string;
          action: string;
        }>(
          `select correlation_id, approval_request_id, action
             from audit_events
            where organization_id = $1 and approval_request_id = $2
            order by ((after_summary->'journalEntry'->>'sequence')::int) asc`,
          [orgId, created.id]
        );
        expect(auditRows.rows).toHaveLength(2);
        expect(auditRows.rows[0]!.correlation_id).toBe(chain[0]!.id);
        expect(auditRows.rows[1]!.correlation_id).toBe(chain[1]!.id);
        expect(auditRows.rows.map((r) => r.action)).toEqual([
          "approval_request.created",
          "approval_request.decided"
        ]);
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("ProjectTask end-to-end (DS 3.1): create -> mark done -> soft-delete emits project.task.* audit + timeline", async () => {
    const { createProject } = await import("../../src/project/project-service");
    const {
      createProjectTask,
      deleteProjectTask,
      listProjectTasks,
      updateProjectTask
    } = await import("../../src/project/project-task-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('TaskCo DS31', 'TaskCo DS31', 'taskco-ds31', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-ds31-id@taskco.local', 'PM DS31', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm-ds31@taskco.local', 'PM DS31', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const project = await createProject(client, tenant, {
          name: "DS 3.1 Host Project",
          code: "DS31"
        });

        const task = await createProjectTask(client, tenant, {
          projectId: project.id,
          title: "Implement ProjectTask entity"
        });
        expect(task.id).toBeTruthy();
        expect(task.status).toBe("todo");
        expect(task.projectId).toBe(project.id);

        // Move to done — should emit project.task.updated + project.task.completed
        const done = await updateProjectTask(client, tenant, task.id, { status: "done" });
        expect(done.status).toBe("done");
        expect(done.completedAt).toBeTruthy();

        // List still shows the task (not deleted)
        const listBefore = await listProjectTasks(client, tenant, { projectId: project.id });
        expect(listBefore.length).toBe(1);

        // Soft-delete
        await deleteProjectTask(client, tenant, task.id);
        const listAfter = await listProjectTasks(client, tenant, { projectId: project.id });
        expect(listAfter.length).toBe(0);

        // Audit rows preserved: created, updated, completed, deleted
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'project_task' and resource_id = $2::text
            order by created_at asc`,
          [orgId, task.id]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("project.task.created");
        expect(actions).toContain("project.task.updated");
        expect(actions).toContain("project.task.completed");
        expect(actions).toContain("project.task.deleted");

        // Timeline rows preserved for project_task resource
        const tlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'project_task' and resource_id = $2
            order by occurred_at asc`,
          [orgId, task.id]
        );
        const entryTypes = tlRows.rows.map((r) => r.entry_type);
        expect(entryTypes).toContain("project.task.created");
        expect(entryTypes).toContain("project.task.completed");
        expect(entryTypes).toContain("project.task.deleted");
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("TimeEntry end-to-end (DS 3.2): create -> submit -> approve -> soft-delete emits project.time_entry.* audit + timeline", async () => {
    const { createProject } = await import("../../src/project/project-service");
    const { createProjectTask } = await import("../../src/project/project-task-service");
    const {
      createTimeEntry,
      deleteTimeEntry,
      listTimeEntries,
      updateTimeEntry
    } = await import("../../src/project/time-entry-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('TimeCo DS32', 'TimeCo DS32', 'timeco-ds32', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-ds32-id@timeco.local', 'PM DS32', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm-ds32@timeco.local', 'PM DS32', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;
        const tenant = { organizationId: orgId, actorUserId: userId };

        const project = await createProject(client, tenant, {
          name: "DS 3.2 Host Project",
          code: "DS32"
        });

        const task = await createProjectTask(client, tenant, {
          projectId: project.id,
          title: "Implement time tracking"
        });

        // Log a time entry against the project + task
        const entry = await createTimeEntry(client, tenant, {
          projectId: project.id,
          projectTaskId: task.id,
          userId,
          entryDate: "2026-05-25",
          minutes: 90,
          description: "Initial implementation",
          billable: true
        });
        expect(entry.id).toBeTruthy();
        expect(entry.status).toBe("draft");
        expect(entry.minutes).toBe(90);
        expect(entry.projectId).toBe(project.id);
        expect(entry.projectTaskId).toBe(task.id);

        // Submit — emits project.time_entry.submitted distinctly
        const submitted = await updateTimeEntry(client, tenant, entry.id, { status: "submitted" });
        expect(submitted.status).toBe("submitted");

        // Approve — emits project.time_entry.approved distinctly
        const approved = await updateTimeEntry(client, tenant, entry.id, { status: "approved" });
        expect(approved.status).toBe("approved");

        // listTimeEntries still returns it (soft-delete not yet applied)
        const listBefore = await listTimeEntries(client, tenant, { projectId: project.id });
        expect(listBefore.length).toBe(1);
        expect(listBefore[0]!.id).toBe(entry.id);

        // Soft-delete
        await deleteTimeEntry(client, tenant, entry.id);
        const listAfter = await listTimeEntries(client, tenant, { projectId: project.id });
        expect(listAfter.length).toBe(0);

        // Audit rows preserved: created, updated (x2 for submit+approve), submitted, approved, deleted
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'time_entry' and resource_id = $2::text
            order by created_at asc`,
          [orgId, entry.id]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("project.time_entry.created");
        expect(actions).toContain("project.time_entry.submitted");
        expect(actions).toContain("project.time_entry.approved");
        expect(actions).toContain("project.time_entry.deleted");

        // Timeline rows preserved for time_entry resource
        const tlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'time_entry' and resource_id = $2
            order by occurred_at asc`,
          [orgId, entry.id]
        );
        const entryTypes = tlRows.rows.map((r) => r.entry_type);
        expect(entryTypes).toContain("project.time_entry.created");
        expect(entryTypes).toContain("project.time_entry.submitted");
        expect(entryTypes).toContain("project.time_entry.approved");
        expect(entryTypes).toContain("project.time_entry.deleted");
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("Rate + Assignment end-to-end (DS 3.3): create rate -> create project -> assign user -> update + soft-delete; assert audit + timeline", async () => {
    const { createProject } = await import("../../src/project/project-service");
    const { createRate, deleteRate } = await import("../../src/project/rate-service");
    const {
      createAssignment,
      deleteAssignment,
      listAssignments,
      updateAssignment
    } = await import("../../src/project/assignment-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('RateCo DS33', 'RateCo DS33', 'rateco-ds33', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-ds33-id@rateco.local', 'PM DS33', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm-ds33@rateco.local', 'PM DS33', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;
        const tenant = { organizationId: orgId, actorUserId: userId };

        // Create a rate
        const rate = await createRate(client, tenant, {
          name: "Senior consultant",
          amount: { amountMinor: 15000, currency: "CAD", scale: 2 },
          effectiveFrom: "2026-01-01"
        });
        expect(rate.id).toBeTruthy();
        expect(rate.name).toBe("Senior consultant");
        expect(rate.active).toBe(true);
        expect(rate.amount).toMatchObject({ amountMinor: 15000, currency: "CAD", scale: 2 });

        // Create a project
        const project = await createProject(client, tenant, {
          name: "DS 3.3 Host Project",
          code: "DS33"
        });

        // Assign the user to the project at the rate
        const assignment = await createAssignment(client, tenant, {
          projectId: project.id,
          userId,
          roleLabel: "Lead developer",
          allocationPercent: 80,
          billableRateId: rate.id
        });
        expect(assignment.id).toBeTruthy();
        expect(assignment.projectId).toBe(project.id);
        expect(assignment.userId).toBe(userId);
        expect(assignment.billableRateId).toBe(rate.id);

        // List assignments scoped to project
        const listed = await listAssignments(client, tenant, { projectId: project.id });
        expect(listed.length).toBe(1);
        expect(listed[0]!.id).toBe(assignment.id);

        // Update allocation
        const updated = await updateAssignment(client, tenant, assignment.id, {
          allocationPercent: 100
        });
        expect(updated.allocationPercent).toBe(100);

        // Soft-delete assignment
        await deleteAssignment(client, tenant, assignment.id);
        const listAfterAssign = await listAssignments(client, tenant, { projectId: project.id });
        expect(listAfterAssign.length).toBe(0);

        // Soft-delete rate
        await deleteRate(client, tenant, rate.id);

        // Audit rows for rate
        const rateAuditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'rate' and resource_id = $2::text
            order by created_at asc`,
          [orgId, rate.id]
        );
        const rateActions = rateAuditRows.rows.map((r) => r.action);
        expect(rateActions).toContain("project.rate.created");
        expect(rateActions).toContain("project.rate.deleted");

        // Timeline rows for rate
        const rateTlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'rate' and resource_id = $2
            order by occurred_at asc`,
          [orgId, rate.id]
        );
        const rateEntryTypes = rateTlRows.rows.map((r) => r.entry_type);
        expect(rateEntryTypes).toContain("project.rate.created");
        expect(rateEntryTypes).toContain("project.rate.deleted");

        // Audit rows for assignment
        const assignAuditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'assignment' and resource_id = $2::text
            order by created_at asc`,
          [orgId, assignment.id]
        );
        const assignActions = assignAuditRows.rows.map((r) => r.action);
        expect(assignActions).toContain("project.assignment.created");
        expect(assignActions).toContain("project.assignment.updated");
        expect(assignActions).toContain("project.assignment.deleted");

        // Timeline rows for assignment
        const assignTlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'assignment' and resource_id = $2
            order by occurred_at asc`,
          [orgId, assignment.id]
        );
        const assignEntryTypes = assignTlRows.rows.map((r) => r.entry_type);
        expect(assignEntryTypes).toContain("project.assignment.created");
        expect(assignEntryTypes).toContain("project.assignment.deleted");
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("Project end-to-end: create -> update -> soft-delete emits project.project.* audit + timeline (DS 3.0)", async () => {
    const {
      createProject,
      deleteProject,
      listProjects,
      updateProject
    } = await import("../../src/project/project-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Project Co', 'Project Co', 'project-co', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-id@project.local', 'PM', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm@project.local', 'PM', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        const project = await createProject(client, tenant, {
          name: "Northwind Implementation",
          code: "NW-2026",
          description: "Core ERP delivery"
        });
        expect(project.id).toBeTruthy();
        expect(project.status).toBe("active");
        expect(project.name).toBe("Northwind Implementation");

        const updated = await updateProject(client, tenant, project.id, {
          status: "on_hold",
          name: "Northwind Implementation (on hold)"
        });
        expect(updated.status).toBe("on_hold");

        const listBefore = await listProjects(client, tenant);
        expect(listBefore.length).toBe(1);

        await deleteProject(client, tenant, project.id);

        const listAfter = await listProjects(client, tenant);
        expect(listAfter.length).toBe(0);

        // Audit rows preserved.
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'project' and resource_id = $2::text
            order by created_at asc`,
          [orgId, project.id]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("project.project.created");
        expect(actions).toContain("project.project.updated");
        expect(actions).toContain("project.project.deleted");

        // Timeline rows preserved.
        const tlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'project' and resource_id = $2
            order by occurred_at asc`,
          [orgId, project.id]
        );
        const entryTypes = tlRows.rows.map((r) => r.entry_type);
        expect(entryTypes).toContain("project.project.created");
        expect(entryTypes).toContain("project.project.updated");
        expect(entryTypes).toContain("project.project.deleted");
      } finally {
        await client.query("rollback");
      }
    });
  });
});
