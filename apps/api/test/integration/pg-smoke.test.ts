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
import { createEphemeralDb, type EphemeralDb } from "./helpers/ephemeral-db";

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
  let ephemeral: EphemeralDb;

  beforeAll(async () => {
    // Each integration file gets its own ephemeral database so concurrent or
    // sequential sibling files cannot contaminate this suite's schema state.
    ephemeral = await createEphemeralDb("pgsmoke");
    pool = createPgPool({ connectionString: ephemeral.connectionString });
    // Fresh database: run migrations from scratch.
    await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname
    });
  }, 30000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (ephemeral) await ephemeral.drop();
  });

  it("applies every migration once, then skips on re-run", async () => {
    // beforeAll already ran migrations on the fresh ephemeral database.
    // A re-run must skip every migration that was already applied.
    const reRun = await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname
    });
    expect(reRun.applied.length).toBe(0);
    expect(reRun.skipped.length).toBeGreaterThan(0);
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

  it("Invoice end-to-end (DS 4.0): approved InvoiceProposal -> convert to Invoice -> lines mapped + total equals proposal total + issue/pay lifecycle + void draft + soft-delete", async () => {
    const { createProject } = await import("../../src/project/project-service");
    const { createRate } = await import("../../src/project/rate-service");
    const { createAssignment } = await import("../../src/project/assignment-service");
    const { createTimeEntry } = await import("../../src/project/time-entry-service");
    const {
      generateInvoiceProposal,
      submitInvoiceProposal,
      approveInvoiceProposal
    } = await import("../../src/project/invoice-proposal-service");
    const {
      createInvoice,
      createInvoiceFromProposal,
      issueInvoice,
      markPaid,
      voidInvoice,
      deleteInvoice,
      getInvoiceById,
      InvoiceTransitionError
    } = await import("../../src/billing/invoice-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Billing Co DS40', 'Billing Co DS40', 'billing-ds40', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-ds40-id@billing.local', 'PM DS40', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm-ds40@billing.local', 'PM DS40', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;
        const tenant = { organizationId: orgId, actorUserId: userId };

        // Build the project chain (DS 3.4 pattern)
        const project = await createProject(client, tenant, {
          name: "DS 4.0 Billing Test",
          code: "DS40"
        });
        const companyRes = await client.query<{ id: string }>(
          `insert into companies (organization_id, display_name, status)
           values ($1, 'DS40 Client Co', 'active')
           returning id`,
          [orgId]
        );
        const companyId = companyRes.rows[0]!.id;

        // Link project to company
        await client.query(
          `update projects set company_id = $1 where id = $2`,
          [companyId, project.id]
        );

        const rate = await createRate(client, tenant, {
          name: "Standard hourly DS40",
          amount: { amountMinor: 10000, currency: "CAD", scale: 2 },
          effectiveFrom: "2026-01-01",
          active: true
        });
        await createAssignment(client, tenant, {
          projectId: project.id,
          userId,
          billableRateId: rate.id
        });

        // 2 approved billable time entries
        await createTimeEntry(client, tenant, {
          projectId: project.id,
          userId,
          entryDate: "2026-05-01",
          minutes: 60,
          billable: true,
          status: "approved"
        });
        await createTimeEntry(client, tenant, {
          projectId: project.id,
          userId,
          entryDate: "2026-05-02",
          minutes: 30,
          billable: true,
          status: "approved"
        });

        // Generate -> submit -> approve proposal
        const proposal = await generateInvoiceProposal(client, tenant, {
          projectId: project.id,
          currency: "CAD"
        });
        expect(proposal.lines).toHaveLength(2);
        expect(proposal.total.amountMinor).toBe(15000);

        const submitted = await submitInvoiceProposal(client, tenant, proposal.id);
        expect(submitted.status).toBe("submitted");

        const approved = await approveInvoiceProposal(client, tenant, proposal.id);
        expect(approved.status).toBe("approved");

        // Convert approved proposal -> invoice
        const invoice = await createInvoiceFromProposal(client, tenant, proposal.id);
        expect(invoice.status).toBe("draft");
        expect(invoice.invoiceProposalId).toBe(proposal.id);
        expect(invoice.total.amountMinor).toBe(15000);
        expect(invoice.total.currency).toBe("CAD");
        expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}$/);
        expect(invoice.lines).toHaveLength(2);
        expect(invoice.lines.every((l) => l.sourceType === "invoice_proposal_line")).toBe(true);

        // Assert lines mapped from proposal lines
        const proposalLineIds = proposal.lines.map((l) => l.id).sort();
        const invoiceLineSourceIds = invoice.lines.map((l) => l.sourceId).sort();
        expect(invoiceLineSourceIds).toEqual(proposalLineIds);

        // Verify through getInvoiceById
        const fetched = await getInvoiceById(client, tenant, invoice.id);
        expect(fetched).not.toBeNull();
        expect(fetched!.lines).toHaveLength(2);

        // Issue the invoice
        const issued = await issueInvoice(client, tenant, invoice.id);
        expect(issued.status).toBe("issued");
        expect(issued.issuedAt).toBeTruthy();

        // Audit: billing.invoice.created + billing.invoice.issued
        const auditAfterIssue = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2::text
            order by created_at asc`,
          [orgId, invoice.id]
        );
        const auditActions = auditAfterIssue.rows.map((r) => r.action);
        expect(auditActions).toContain("billing.invoice.created");
        expect(auditActions).toContain("billing.invoice.issued");

        // Timeline: billing.invoice.created + billing.invoice.issued
        const tlAfterIssue = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2
            order by occurred_at asc`,
          [orgId, invoice.id]
        );
        const tlEntryTypes = tlAfterIssue.rows.map((r) => r.entry_type);
        expect(tlEntryTypes).toContain("billing.invoice.created");
        expect(tlEntryTypes).toContain("billing.invoice.issued");

        // Pay the invoice
        const paid = await markPaid(client, tenant, invoice.id);
        expect(paid.status).toBe("paid");

        const auditAfterPay = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2::text
              and action = 'billing.invoice.paid'`,
          [orgId, invoice.id]
        );
        expect(auditAfterPay.rows).toHaveLength(1);

        // Illegal transition: issue a paid invoice
        await expect(issueInvoice(client, tenant, invoice.id)).rejects.toBeInstanceOf(InvoiceTransitionError);

        // Create a second invoice (manual), void it, then delete is blocked
        const inv2 = await createInvoice(client, tenant, {
          companyId,
          lines: [
            {
              quantity: 1,
              unitPrice: { amountMinor: 5000, currency: "CAD", scale: 2 },
              amount: { amountMinor: 5000, currency: "CAD", scale: 2 }
            }
          ]
        });
        expect(inv2.invoiceNumber).not.toBe(invoice.invoiceNumber);

        await voidInvoice(client, tenant, inv2.id);
        const voided = await getInvoiceById(client, tenant, inv2.id);
        expect(voided!.status).toBe("void");

        // Soft-delete a third draft invoice
        const inv3 = await createInvoice(client, tenant, {
          companyId,
          lines: [
            {
              quantity: 1,
              unitPrice: { amountMinor: 3000, currency: "CAD", scale: 2 },
              amount: { amountMinor: 3000, currency: "CAD", scale: 2 }
            }
          ]
        });
        await deleteInvoice(client, tenant, inv3.id);
        const deletedLookup = await getInvoiceById(client, tenant, inv3.id);
        expect(deletedLookup).toBeNull();

        const auditDeleted = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2::text
              and action = 'billing.invoice.deleted'`,
          [orgId, inv3.id]
        );
        expect(auditDeleted.rows).toHaveLength(1);
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("Payment reconciliation end-to-end (DS 4.1): partial -> partially_paid -> paid -> delete -> partially_paid", async () => {
    const { createProject } = await import("../../src/project/project-service");
    const { createRate } = await import("../../src/project/rate-service");
    const { createAssignment } = await import("../../src/project/assignment-service");
    const { createTimeEntry } = await import("../../src/project/time-entry-service");
    const {
      generateInvoiceProposal,
      submitInvoiceProposal,
      approveInvoiceProposal
    } = await import("../../src/project/invoice-proposal-service");
    const {
      createInvoiceFromProposal,
      issueInvoice,
      getInvoiceById
    } = await import("../../src/billing/invoice-service");
    const {
      recordPayment,
      deletePayment,
      listPayments,
      InvoiceNotPayableError
    } = await import("../../src/billing/payment-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Payment Co DS41', 'Payment Co DS41', 'payment-ds41', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-ds41-id@payment.local', 'PM DS41', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm-ds41@payment.local', 'PM DS41', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;
        const tenant = { organizationId: orgId, actorUserId: userId };

        // Build project chain (DS 4.0 pattern)
        const project = await createProject(client, tenant, {
          name: "DS 4.1 Payment Test",
          code: "DS41"
        });
        const companyRes = await client.query<{ id: string }>(
          `insert into companies (organization_id, display_name, status)
           values ($1, 'DS41 Client Co', 'active')
           returning id`,
          [orgId]
        );
        const companyId = companyRes.rows[0]!.id;
        await client.query(
          `update projects set company_id = $1 where id = $2`,
          [companyId, project.id]
        );

        const rate = await createRate(client, tenant, {
          name: "Standard DS41",
          amount: { amountMinor: 10000, currency: "CAD", scale: 2 },
          effectiveFrom: "2026-01-01",
          active: true
        });
        await createAssignment(client, tenant, {
          projectId: project.id,
          userId,
          billableRateId: rate.id
        });

        // 2 approved billable time entries totaling 15000 amountMinor
        await createTimeEntry(client, tenant, {
          projectId: project.id,
          userId,
          entryDate: "2026-05-01",
          minutes: 60,
          billable: true,
          status: "approved"
        });
        await createTimeEntry(client, tenant, {
          projectId: project.id,
          userId,
          entryDate: "2026-05-02",
          minutes: 30,
          billable: true,
          status: "approved"
        });

        // Generate -> submit -> approve -> convert -> issue
        const proposal = await generateInvoiceProposal(client, tenant, {
          projectId: project.id,
          currency: "CAD"
        });
        await submitInvoiceProposal(client, tenant, proposal.id);
        await approveInvoiceProposal(client, tenant, proposal.id);

        const invoice = await createInvoiceFromProposal(client, tenant, proposal.id);
        expect(invoice.total.amountMinor).toBe(15000);
        const issued = await issueInvoice(client, tenant, invoice.id);
        expect(issued.status).toBe("issued");

        // Assert: recording against a draft invoice is rejected (use a separate draft)
        await expect(
          recordPayment(client, tenant, {
            invoiceId: invoice.id,
            amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
            paymentDate: "2026-05-03",
            method: "cash"
          })
        ).resolves.toBeTruthy(); // issued -> ok, this records the partial payment

        // Refetch
        const afterPartial = await getInvoiceById(client, tenant, invoice.id);
        expect(afterPartial!.status).toBe("partially_paid");

        // Audit: billing.invoice.partially_paid emitted
        const auditPartial = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2::text
              and action = 'billing.invoice.partially_paid'`,
          [orgId, invoice.id]
        );
        expect(auditPartial.rows).toHaveLength(1);

        // Timeline: billing.invoice.partially_paid emitted
        const tlPartial = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2
              and entry_type = 'billing.invoice.partially_paid'`,
          [orgId, invoice.id]
        );
        expect(tlPartial.rows).toHaveLength(1);

        // Record remainder: 10000 more → total = 15000 >= 15000 → paid
        const payFull = await recordPayment(client, tenant, {
          invoiceId: invoice.id,
          amount: { amountMinor: 10000, currency: "CAD", scale: 2 },
          paymentDate: "2026-05-04",
          method: "bank_transfer"
        });
        expect(payFull.invoiceId).toBe(invoice.id);

        const afterFull = await getInvoiceById(client, tenant, invoice.id);
        expect(afterFull!.status).toBe("paid");

        // Audit: billing.invoice.paid emitted
        const auditPaid = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2::text
              and action = 'billing.invoice.paid'`,
          [orgId, invoice.id]
        );
        expect(auditPaid.rows).toHaveLength(1);

        // List payments for invoice
        const payments = await listPayments(client, tenant, { invoiceId: invoice.id });
        expect(payments).toHaveLength(2);

        // Soft-delete the full payment → back to partially_paid
        await deletePayment(client, tenant, payFull.id);

        const afterDelete = await getInvoiceById(client, tenant, invoice.id);
        expect(afterDelete!.status).toBe("partially_paid");

        // Audit: billing.payment.deleted
        const auditDeleted = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'payment' and resource_id = $2::text
              and action = 'billing.payment.deleted'`,
          [orgId, payFull.id]
        );
        expect(auditDeleted.rows).toHaveLength(1);

        // Recording against a void invoice → InvoiceNotPayableError
        const inv2Res = await client.query<{ id: string }>(
          `insert into invoices (
             organization_id, company_id, invoice_number, status, currency,
             subtotal, tax_total, total
           ) values ($1, $2, 'INV-VOID-TEST', 'void', 'CAD',
             '{"amountMinor":5000,"currency":"CAD","scale":2}'::jsonb,
             '{"amountMinor":0,"currency":"CAD","scale":2}'::jsonb,
             '{"amountMinor":5000,"currency":"CAD","scale":2}'::jsonb)
           returning id`,
          [orgId, companyId]
        );
        const voidInvoiceId = inv2Res.rows[0]!.id;
        await expect(
          recordPayment(client, tenant, {
            invoiceId: voidInvoiceId,
            amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
            paymentDate: "2026-05-05",
            method: "cash"
          })
        ).rejects.toBeInstanceOf(InvoiceNotPayableError);
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("InvoiceProposal end-to-end (DS 3.4): create project + rate + assignment + 2 approved billable entries -> generate -> 2 lines -> summed total -> submit -> approve", async () => {
    const { createProject } = await import("../../src/project/project-service");
    const { createRate } = await import("../../src/project/rate-service");
    const { createAssignment } = await import("../../src/project/assignment-service");
    const { createTimeEntry } = await import("../../src/project/time-entry-service");
    const {
      generateInvoiceProposal,
      submitInvoiceProposal,
      approveInvoiceProposal,
      deleteInvoiceProposal,
      InvoiceProposalTransitionError
    } = await import("../../src/project/invoice-proposal-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('InvProp Co DS34', 'InvProp Co DS34', 'invprop-ds34', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-ds34-id@invprop.local', 'PM DS34', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm-ds34@invprop.local', 'PM DS34', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;
        const tenant = { organizationId: orgId, actorUserId: userId };

        // Create a project
        const project = await createProject(client, tenant, {
          name: "DS 3.4 Invoice Test",
          code: "DS34"
        });

        // Create a rate: $100/hr in CAD (amountMinor = 10000, scale = 2)
        const rate = await createRate(client, tenant, {
          name: "Standard hourly",
          amount: { amountMinor: 10000, currency: "CAD", scale: 2 },
          effectiveFrom: "2026-01-01",
          active: true
        });

        // Assign user to project with the rate
        await createAssignment(client, tenant, {
          projectId: project.id,
          userId,
          billableRateId: rate.id
        });

        // Create 2 approved billable time entries
        // Entry 1: 60 minutes (1h) → $100.00
        const te1 = await createTimeEntry(client, tenant, {
          projectId: project.id,
          userId,
          entryDate: "2026-05-01",
          minutes: 60,
          billable: true,
          status: "approved"
        });

        // Entry 2: 30 minutes (0.5h) → $50.00
        const te2 = await createTimeEntry(client, tenant, {
          projectId: project.id,
          userId,
          entryDate: "2026-05-02",
          minutes: 30,
          billable: true,
          status: "approved"
        });

        // Generate proposal — should produce 2 lines, total = 15000 (amountMinor)
        const proposal = await generateInvoiceProposal(client, tenant, {
          projectId: project.id,
          currency: "CAD"
        });

        expect(proposal.status).toBe("draft");
        expect(proposal.projectId).toBe(project.id);
        expect(proposal.lines).toHaveLength(2);

        const lineSourceIds = proposal.lines.map((l) => l.sourceId).sort();
        expect(lineSourceIds).toContain(te1.id);
        expect(lineSourceIds).toContain(te2.id);

        // Total: 60 min → 10000 * 60 / 60 = 10000; 30 min → 10000 * 30 / 60 = 5000; sum = 15000
        expect(proposal.total.amountMinor).toBe(15000);
        expect(proposal.total.currency).toBe("CAD");

        // Audit: created
        const auditAfterGenerate = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice_proposal' and resource_id = $2::text
            order by created_at asc`,
          [orgId, proposal.id]
        );
        expect(auditAfterGenerate.rows.map((r) => r.action)).toContain("project.invoice_proposal.created");

        // Timeline: created
        const tlAfterGenerate = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'invoice_proposal' and resource_id = $2
            order by occurred_at asc`,
          [orgId, proposal.id]
        );
        expect(tlAfterGenerate.rows.map((r) => r.entry_type)).toContain("project.invoice_proposal.created");

        // Illegal transition: approve from draft → must throw
        await expect(approveInvoiceProposal(client, tenant, proposal.id)).rejects.toBeInstanceOf(
          InvoiceProposalTransitionError
        );

        // Submit
        const submitted = await submitInvoiceProposal(client, tenant, proposal.id);
        expect(submitted.status).toBe("submitted");
        expect(submitted.submittedAt).toBeTruthy();

        // Approve
        const approved = await approveInvoiceProposal(client, tenant, proposal.id);
        expect(approved.status).toBe("approved");

        // Audit chain: created, submitted, approved
        const auditFinal = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice_proposal' and resource_id = $2::text
            order by created_at asc`,
          [orgId, proposal.id]
        );
        const actions = auditFinal.rows.map((r) => r.action);
        expect(actions).toContain("project.invoice_proposal.created");
        expect(actions).toContain("project.invoice_proposal.submitted");
        expect(actions).toContain("project.invoice_proposal.approved");

        // Timeline chain
        const tlFinal = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'invoice_proposal' and resource_id = $2
            order by occurred_at asc`,
          [orgId, proposal.id]
        );
        const entryTypesFinal = tlFinal.rows.map((r) => r.entry_type);
        expect(entryTypesFinal).toContain("project.invoice_proposal.created");
        expect(entryTypesFinal).toContain("project.invoice_proposal.submitted");
        expect(entryTypesFinal).toContain("project.invoice_proposal.approved");

        // Soft-delete (the service allows deletion from any non-deleted state in our implementation;
        // here we confirm it emits the audit event)
        await deleteInvoiceProposal(client, tenant, proposal.id);
        const auditDeleted = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice_proposal' and resource_id = $2::text
              and action = 'project.invoice_proposal.deleted'`,
          [orgId, proposal.id]
        );
        expect(auditDeleted.rows).toHaveLength(1);
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("Invoice taxes end-to-end (DS 4.2): GST+QST data-driven computation — exact Quebec math anchor", async () => {
    const { createTaxCategory, createTaxRateVersion, computeInvoiceTaxes } = await import(
      "../../src/billing/tax-service"
    );
    const { createInvoice, getInvoiceById } = await import("../../src/billing/invoice-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        // Seed org + user identity via CTE pattern.
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('TaxCo DS42', 'TaxCo DS42', 'taxco-ds42', 'active', 'fr', 'CAD',
             'America/Montreal', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('billing-ds42-id@taxco.local', 'Billing DS42', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'billing-ds42@taxco.local', 'Billing DS42', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        // Create a company for the invoice
        const companyRes = await client.query<{ id: string }>(
          `insert into companies (organization_id, display_name, status)
           values ($1, 'DS42 Client Corp', 'active')
           returning id`,
          [orgId]
        );
        const companyId = companyRes.rows[0]!.id;

        // Create a tax category: "Standard rate" with code "STD"
        const category = await createTaxCategory(client, tenant, {
          name: "Standard rate",
          code: "STD",
          description: "Federal + Quebec provincial taxes",
          active: true
        });
        expect(category.id).toBeTruthy();
        expect(category.code).toBe("STD");

        // Create GST rate version (5.000% → rateBps = 5000 milli-percent, non-compound).
        const gstRate = await createTaxRateVersion(client, tenant, {
          taxCategoryId: category.id,
          jurisdiction: "CA-GST",
          label: "Federal GST",
          rateBps: 5000,
          compound: false,
          effectiveFrom: "2013-01-01",
          active: true
        });
        expect(gstRate.rateBps).toBe(5000);
        expect(gstRate.compound).toBe(false);

        // Create QST rate version (9.975% → rateBps = 9975 milli-percent, non-compound).
        // Per 2013 Quebec rule: QST applies on the pre-GST base (not compounded).
        const qstRate = await createTaxRateVersion(client, tenant, {
          taxCategoryId: category.id,
          jurisdiction: "CA-QC-QST",
          label: "Quebec QST",
          rateBps: 9975,
          compound: false,
          effectiveFrom: "2013-01-01",
          active: true
        });
        expect(qstRate.rateBps).toBe(9975);
        expect(qstRate.compound).toBe(false);

        // Create an invoice with subtotal $100.00 (10000 minor, scale 2) and assign the tax category.
        const invoice = await createInvoice(client, tenant, {
          companyId,
          taxCategoryId: category.id,
          currency: "CAD",
          lines: [
            {
              description: "Consulting services",
              quantity: 1,
              unitPrice: { amountMinor: 10000, currency: "CAD", scale: 2 },
              amount: { amountMinor: 10000, currency: "CAD", scale: 2 }
            }
          ]
        });
        expect(invoice.subtotal.amountMinor).toBe(10000);
        expect(invoice.taxCategoryId).toBe(category.id);

        // Run computeInvoiceTaxes — the Quebec math anchor.
        const computed = await computeInvoiceTaxes(client, tenant, invoice.id, "2026-05-25");

        // Verify exact integers from the spec anchor:
        //   subtotal = 10000, GST 5000 bps → round(10000*5000/100000) = round(500) = 500
        //   QST  9975 bps → round(10000*9975/100000) = round(997.5) = 998
        //   tax_total = 500 + 998 = 1498, total = 10000 + 1498 = 11498
        expect(computed.taxTotal.amountMinor).toBe(1498);
        expect(computed.total.amountMinor).toBe(11498);

        const gstLine = computed.taxBreakdown?.find((l) => l.jurisdiction === "CA-GST");
        expect(gstLine?.amount.amountMinor).toBe(500);

        const qstLine = computed.taxBreakdown?.find((l) => l.jurisdiction === "CA-QC-QST");
        expect(qstLine?.amount.amountMinor).toBe(998);

        // Verify audit events for tax_category + tax_rate_version + invoice.updated
        const auditRows = await client.query<{ action: string; resource_type: string }>(
          `select action, resource_type from audit_events
            where organization_id = $1
            order by created_at asc`,
          [orgId]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("billing.tax_category.created");
        expect(actions).toContain("billing.tax_rate_version.created");
        expect(actions).toContain("billing.invoice.updated");

        // Verify timeline entries for tax events
        const tlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1
            order by occurred_at asc`,
          [orgId]
        );
        const entryTypes = tlRows.rows.map((r) => r.entry_type);
        expect(entryTypes).toContain("billing.tax_category.created");
        expect(entryTypes).toContain("billing.tax_rate_version.created");
        expect(entryTypes).toContain("billing.invoice.updated");

        // Verify the persisted state via getInvoiceById.
        const persisted = await getInvoiceById(client, tenant, invoice.id);
        expect(persisted!.taxTotal.amountMinor).toBe(1498);
        expect(persisted!.total.amountMinor).toBe(11498);
        expect(persisted!.taxBreakdown).toHaveLength(2);
      } finally {
        await client.query("rollback");
      }
    });
  }, 20000);

  it("Accounting end-to-end (DS 4.3): chart of accounts + balanced posted journal entries from invoice/payment", async () => {
    const { createAccount, postInvoiceToJournal, postPaymentToJournal } = await import(
      "../../src/billing/accounting-service"
    );
    const { createInvoice, issueInvoice } = await import("../../src/billing/invoice-service");
    const { createTaxCategory, createTaxRateVersion, computeInvoiceTaxes } = await import(
      "../../src/billing/tax-service"
    );
    const { recordPayment } = await import("../../src/billing/payment-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Acct Co DS43', 'Acct Co DS43', 'acct-co-ds43', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('acct-ds43-id@acct.local', 'Acct DS43', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'acct-ds43@acct.local', 'Acct DS43', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        // 1. Seed a company for the invoice.
        const companyRes = await client.query<{ id: string }>(
          `insert into companies (organization_id, display_name, legal_name, status, owner_user_id)
           values ($1, 'Acct Client', 'Acct Client Inc.', 'active', $2)
           returning id`,
          [orgId, tenant.actorUserId]
        );
        const companyId = companyRes.rows[0]!.id;

        // 2. Seed default chart of accounts (mirrors seed-dev-lib).
        const ar = await createAccount(client, tenant, { code: "1100", name: "Accounts Receivable", type: "asset" });
        const cash = await createAccount(client, tenant, { code: "1000", name: "Cash / Bank", type: "asset" });
        await createAccount(client, tenant, { code: "2300", name: "Tax Payable", type: "liability" });
        const gstPayable = await createAccount(client, tenant, { code: "2310", name: "GST Payable", type: "liability" });
        const qstPayable = await createAccount(client, tenant, { code: "2320", name: "QST Payable", type: "liability" });
        const revenue = await createAccount(client, tenant, { code: "4000", name: "Service Revenue", type: "revenue" });

        expect(ar.code).toBe("1100");
        expect(cash.code).toBe("1000");
        expect(gstPayable.code).toBe("2310");
        expect(qstPayable.code).toBe("2320");
        expect(revenue.code).toBe("4000");

        // 3. Build an issued invoice with GST + QST taxes (reuse DS 4.2 chain).
        // Both GST and QST rates live under ONE combined category, matching the DS 4.2 pattern.
        const combinedCategory = await createTaxCategory(client, tenant, {
          name: "Standard CA-QC",
          code: "CA-QC",
          description: "Federal GST + Quebec QST"
        });
        await createTaxRateVersion(client, tenant, {
          taxCategoryId: combinedCategory.id,
          jurisdiction: "CA-GST",
          label: "GST 5%",
          rateBps: 5000,
          effectiveFrom: "2020-01-01"
        });
        await createTaxRateVersion(client, tenant, {
          taxCategoryId: combinedCategory.id,
          jurisdiction: "CA-QC-QST",
          label: "QST 9.975%",
          rateBps: 9975,
          effectiveFrom: "2020-01-01"
        });

        // Create invoice: 1 line = 100 CAD (amountMinor 10000, scale 2).
        const invoice = await createInvoice(client, tenant, {
          companyId,
          taxCategoryId: combinedCategory.id,
          lines: [
            {
              description: "Consulting",
              quantity: 1,
              unitPrice: { amountMinor: 10000, currency: "CAD", scale: 2 },
              amount: { amountMinor: 10000, currency: "CAD", scale: 2 }
            }
          ]
        });

        // Compute taxes: subtotal 10000 -> GST 500 + QST 998 -> total 11498.
        const taxed = await computeInvoiceTaxes(client, tenant, invoice.id, "2026-05-25");
        expect(taxed.total.amountMinor).toBe(11498);
        expect(taxed.taxBreakdown).toHaveLength(2);

        const issued = await issueInvoice(client, tenant, invoice.id);
        expect(issued.status).toBe("issued");

        // 4. Post invoice to journal — expect a balanced entry.
        const je = await postInvoiceToJournal(client, tenant, invoice.id);
        expect(je.status).toBe("posted");
        expect(je.sourceType).toBe("invoice");
        expect(je.sourceId).toBe(invoice.id);
        expect(je.lines).toHaveLength(4); // 1 debit AR + 3 credits (Revenue, GST, QST)

        const debitLines = je.lines.filter((l) => l.debit.amountMinor > 0);
        const creditLines = je.lines.filter((l) => l.credit.amountMinor > 0);
        expect(debitLines).toHaveLength(1);
        expect(debitLines[0]!.debit.amountMinor).toBe(11498); // AR = total

        expect(creditLines).toHaveLength(3);
        const creditAmounts = creditLines.map((l) => l.credit.amountMinor).sort((a, b) => b - a);
        expect(creditAmounts).toEqual([10000, 998, 500]); // Revenue, QST, GST

        const sumDebits = debitLines.reduce((s, l) => s + l.debit.amountMinor, 0);
        const sumCredits = creditLines.reduce((s, l) => s + l.credit.amountMinor, 0);
        expect(sumDebits).toBe(11498);
        expect(sumCredits).toBe(11498); // balanced

        // Verify in DB.
        const dbEntry = await client.query<{
          status: string;
          source_type: string;
          source_id: string;
        }>(
          `select status, source_type, source_id from journal_entries where id = $1`,
          [je.id]
        );
        expect(dbEntry.rows[0]!.status).toBe("posted");
        expect(dbEntry.rows[0]!.source_type).toBe("invoice");

        const dbLines = await client.query<{ debit: { amountMinor: number }; credit: { amountMinor: number } }>(
          `select debit, credit from journal_entry_lines where journal_entry_id = $1 order by created_at asc`,
          [je.id]
        );
        expect(dbLines.rows).toHaveLength(4);
        const dbSumDebits = dbLines.rows.reduce((s, l) => s + l.debit.amountMinor, 0);
        const dbSumCredits = dbLines.rows.reduce((s, l) => s + l.credit.amountMinor, 0);
        expect(dbSumDebits).toBe(11498);
        expect(dbSumCredits).toBe(11498);

        // 5. Record a payment + post to journal.
        const payment = await recordPayment(client, tenant, {
          invoiceId: invoice.id,
          amount: { amountMinor: 11498, currency: "CAD", scale: 2 },
          paymentDate: "2026-05-25",
          method: "bank_transfer",
          reference: "TRF-DS43-001"
        });
        expect(payment.id).toBeTruthy();

        const je2 = await postPaymentToJournal(client, tenant, payment.id);
        expect(je2.status).toBe("posted");
        expect(je2.sourceType).toBe("payment");
        expect(je2.sourceId).toBe(payment.id);
        expect(je2.lines).toHaveLength(2); // debit Cash + credit AR

        const pDebitLines = je2.lines.filter((l) => l.debit.amountMinor > 0);
        const pCreditLines = je2.lines.filter((l) => l.credit.amountMinor > 0);
        expect(pDebitLines[0]!.debit.amountMinor).toBe(11498);
        expect(pCreditLines[0]!.credit.amountMinor).toBe(11498);
        const pSumDebits = pDebitLines.reduce((s, l) => s + l.debit.amountMinor, 0);
        const pSumCredits = pCreditLines.reduce((s, l) => s + l.credit.amountMinor, 0);
        expect(pSumDebits).toBe(pSumCredits); // balanced

        // 6. Verify audit events for accounting.
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'journal_entry'
            order by created_at asc`,
          [orgId]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("billing.journal_entry.created");
        expect(actions).toContain("billing.journal_entry.posted");

        // 7. Verify timeline entries for journal_entry resource.
        const tlRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'journal_entry'
            order by occurred_at asc`,
          [orgId]
        );
        const entryTypes = tlRows.rows.map((r) => r.entry_type);
        expect(entryTypes).toContain("billing.journal_entry.posted");
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("TimeApproval end-to-end (DS 3.5): submit creates ApprovalRequest + h2a chain; approve flips entry", async () => {
    const { createProject } = await import("../../src/project/project-service");
    const { createProjectTask } = await import("../../src/project/project-task-service");
    const { createTimeEntry, submitTimeEntry, approveTimeEntry } = await import(
      "../../src/project/time-entry-service"
    );

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('TimeApproval Co DS35', 'TimeApproval Co DS35', 'timeapproval-ds35',
             'active', 'fr', 'CAD', 'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;

        // Actor user (submitter) — uses CTE pattern to keep user_identity + users in sync
        const actorRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('pm-ds35-id@timeapproval.local', 'PM DS35', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'pm-ds35@timeapproval.local', 'PM DS35', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const actorId = actorRes.rows[0]!.id;

        // Approver user_identity (standalone — no users row needed for approval path)
        const approverRes = await client.query<{ id: string }>(
          `insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('manager-ds35-id@timeapproval.local', 'Manager DS35', 'fr', 'passkey', 'active', 'human')
           returning id`,
          []
        );
        const approverIdentityId = approverRes.rows[0]!.id;

        const tenant = { organizationId: orgId, actorUserId: actorId };

        const project = await createProject(client, tenant, {
          name: "DS 3.5 TimeApproval Project",
          code: "DS35"
        });

        const task = await createProjectTask(client, tenant, {
          projectId: project.id,
          title: "Implement TimeApproval"
        });

        const entry = await createTimeEntry(client, tenant, {
          projectId: project.id,
          projectTaskId: task.id,
          userId: actorId,
          entryDate: "2026-05-28",
          minutes: 120,
          description: "DS 3.5 implementation",
          billable: true
        });
        expect(entry.status).toBe("draft");
        expect(entry.approvalRequestId).toBeNull();

        // Submit — should create an ApprovalRequest and link it
        const submitted = await submitTimeEntry(client, tenant, entry.id, {
          approverUserIdentityId: approverIdentityId
        });
        expect(submitted.status).toBe("submitted");
        expect(submitted.approvalRequestId).toBeTruthy();

        // Assert approval_requests row exists with correct subject
        const approvalRows = await client.query<{
          id: string;
          subject_type: string;
          subject_id: string;
          status: string;
          approver_user_identity_id: string;
        }>(
          `select id, subject_type, subject_id, status, approver_user_identity_id
             from approval_requests
            where organization_id = $1 and id = $2`,
          [orgId, submitted.approvalRequestId]
        );
        expect(approvalRows.rows).toHaveLength(1);
        expect(approvalRows.rows[0]!.subject_type).toBe("time_entry");
        expect(approvalRows.rows[0]!.subject_id).toBe(entry.id);
        expect(approvalRows.rows[0]!.status).toBe("pending");
        expect(approvalRows.rows[0]!.approver_user_identity_id).toBe(approverIdentityId);

        // Assert time_entries.approval_request_id is set
        const teRow = await client.query<{ approval_request_id: string; status: string }>(
          `select approval_request_id, status from time_entries where id = $1`,
          [entry.id]
        );
        expect(teRow.rows[0]!.approval_request_id).toBe(submitted.approvalRequestId);
        expect(teRow.rows[0]!.status).toBe("submitted");

        // Approve — should decide the ApprovalRequest and flip the entry
        const approved = await approveTimeEntry(client, tenant, entry.id, {
          decisionReason: "Verified correct"
        });
        expect(approved.status).toBe("approved");

        // Assert approval_requests row is now approved
        const approvalAfter = await client.query<{ status: string; decision_reason: string }>(
          `select status, decision_reason from approval_requests where id = $1`,
          [submitted.approvalRequestId]
        );
        expect(approvalAfter.rows[0]!.status).toBe("approved");
        expect(approvalAfter.rows[0]!.decision_reason).toBe("Verified correct");

        // Assert time entry is approved
        const teAfter = await client.query<{ status: string }>(
          `select status from time_entries where id = $1`,
          [entry.id]
        );
        expect(teAfter.rows[0]!.status).toBe("approved");

        // Assert h2a journal chain for the approval verifies
        const chain = await readApprovalJournalChain(
          client,
          tenant,
          submitted.approvalRequestId!
        );
        expect(chain.length).toBeGreaterThanOrEqual(2);
        expect(chain[0]!.type).toBe("propose");
        expect(chain[chain.length - 1]!.type).toBe("accept");
        expect(verifyJournalChain(chain).ok).toBe(true);

        // Assert project.time_entry.submitted + project.time_entry.approved in audit
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

        // Assert foundation approval_request audit events
        const approvalAuditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and approval_request_id = $2
            order by created_at asc`,
          [orgId, submitted.approvalRequestId]
        );
        const approvalActions = approvalAuditRows.rows.map((r) => r.action);
        expect(approvalActions).toContain("approval_request.created");
        expect(approvalActions).toContain("approval_request.decided");
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("QuoteHandoff CRM→Billing end-to-end (DS 2.7): won → handoff → invoice, totals + audit verified", async () => {
    const { createCompany } = await import("../../src/crm/company-service");
    const { createPipelineStage } = await import("../../src/crm/pipeline-stage-service");
    const { createOpportunity, updateOpportunity } = await import("../../src/crm/opportunity-service");
    const { createInvoiceFromQuoteHandoff } = await import("../../src/billing/invoice-service");
    const { getInvoiceById } = await import("../../src/billing/invoice-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('QuoteHandoff Co DS27', 'QuoteHandoff Co DS27', 'qh-ds27', 'active', 'fr',
             'CAD', 'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sales-ds27-id@qh.local', 'Sales DS27', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sales-ds27@qh.local', 'Sales DS27', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;
        const tenant = { organizationId: orgId, actorUserId: userId };

        const company = await createCompany(client, tenant, { displayName: "DS27 Client Corp" });
        const discovery = await createPipelineStage(client, tenant, {
          name: "Discovery",
          orderIndex: 0,
          isInitial: true
        });
        const closedWon = await createPipelineStage(client, tenant, {
          name: "Closed Won",
          orderIndex: 1,
          isWon: true
        });

        const expectedValue = { amountMinor: 2500000, currency: "CAD", scale: 2 };

        const opp = await createOpportunity(client, tenant, {
          companyId: company.id,
          name: "DS27 Commercial Deal",
          stageId: discovery.id,
          expectedValue,
          currency: "CAD"
        });

        // Transition to won — should auto-raise a QuoteHandoff
        await updateOpportunity(client, tenant, opp.id, {
          stageId: closedWon.id,
          status: "won"
        });

        // Assert a quote_handoffs row was created (status pending, target invoice)
        const handoffRows = await client.query<{
          id: string;
          status: string;
          target_type: string;
          requested_by_user_id: string;
        }>(
          `select id, status, target_type, requested_by_user_id
             from quote_handoffs
            where organization_id = $1 and opportunity_id = $2 and deleted_at is null`,
          [orgId, opp.id]
        );
        expect(handoffRows.rows).toHaveLength(1);
        const handoff = handoffRows.rows[0]!;
        expect(handoff.status).toBe("pending");
        expect(handoff.target_type).toBe("invoice");
        expect(handoff.requested_by_user_id).toBe(userId);

        // POST from-quote-handoff — builds a draft invoice with 1 line from expectedValue
        const invoice = await createInvoiceFromQuoteHandoff(client, tenant, handoff.id);
        expect(invoice.status).toBe("draft");
        expect(invoice.lines).toHaveLength(1);
        expect(invoice.lines[0]!.sourceType).toBe("quote_handoff");
        expect(invoice.lines[0]!.sourceId).toBe(handoff.id);
        expect(invoice.lines[0]!.description).toBe("DS27 Commercial Deal");
        expect(invoice.total.amountMinor).toBe(2500000);
        expect(invoice.total.currency).toBe("CAD");

        // Verify through getInvoiceById
        const fetched = await getInvoiceById(client, tenant, invoice.id);
        expect(fetched).not.toBeNull();
        expect(fetched!.lines).toHaveLength(1);
        expect(fetched!.total.amountMinor).toBe(2500000);

        // Handoff should now be accepted
        const handoffAfter = await client.query<{ status: string; accepted_at: string }>(
          `select status, accepted_at from quote_handoffs where id = $1`,
          [handoff.id]
        );
        expect(handoffAfter.rows[0]!.status).toBe("accepted");
        expect(handoffAfter.rows[0]!.accepted_at).toBeTruthy();

        // Check audit rows: crm.quote_handoff.requested + .accepted + billing.invoice.created
        const auditHandoffRequested = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'quote_handoff' and resource_id = $2::text
            order by created_at asc`,
          [orgId, handoff.id]
        );
        const auditActions = auditHandoffRequested.rows.map((r) => r.action);
        expect(auditActions).toContain("crm.quote_handoff.requested");
        expect(auditActions).toContain("crm.quote_handoff.accepted");

        const auditInvoice = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2::text`,
          [orgId, invoice.id]
        );
        expect(auditInvoice.rows.map((r) => r.action)).toContain("billing.invoice.created");

        // Timeline: crm.quote_handoff.requested on the opportunity
        const timelineRows = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'opportunity' and resource_id = $2
            order by occurred_at asc`,
          [orgId, opp.id]
        );
        const entryTypes = timelineRows.rows.map((r) => r.entry_type);
        expect(entryTypes).toContain("crm.quote_handoff.requested");
        expect(entryTypes).toContain("crm.quote_handoff.accepted");
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("listUsers returns the seeded demo user for the tenant (users endpoint smoke)", async () => {
    const { listUsers } = await import("../../src/foundation/user-identities");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('Users Smoke', 'Users Smoke', 'users-smoke', 'active', 'en', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `insert into users (organization_id, email, display_name, preferred_locale, status)
             values ($1, 'demo-user@users-smoke.local', 'Demo User', 'en', 'active')
           returning id`,
          [orgId]
        );
        const userId = userRes.rows[0]!.id;
        const tenant = { organizationId: orgId, actorUserId: userId };

        const users = await listUsers(client, tenant);
        expect(users.length).toBe(1);
        expect(users[0]!.email).toBe("demo-user@users-smoke.local");
        expect(users[0]!.displayName).toBe("Demo User");
        expect(users[0]!.status).toBe("active");

        // Deactivated users are excluded.
        await client.query(
          `insert into users (organization_id, email, display_name, preferred_locale, status)
             values ($1, 'inactive@users-smoke.local', 'Inactive User', 'en', 'deactivated')`,
          [orgId]
        );
        const usersFiltered = await listUsers(client, tenant);
        expect(usersFiltered.length).toBe(1);
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("RecurringBilling end-to-end (DS 4.4): due schedule fires one invoice + advances; future schedule untouched", async () => {
    const {
      createRecurringBillingSchedule,
      runDueRecurringBilling
    } = await import("../../src/billing/recurring-schedule-service");
    const { getInvoiceById } = await import("../../src/billing/invoice-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        // Seed org + user identity via CTE pattern.
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('RecBill Co DS44', 'RecBill Co DS44', 'recbill-ds44', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('billing-ds44-id@recbill.local', 'Billing DS44', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'billing-ds44@recbill.local', 'Billing DS44', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        // Create a company.
        const companyRes = await client.query<{ id: string }>(
          `insert into companies (organization_id, display_name, status)
           values ($1, 'DS44 Client Co', 'active')
           returning id`,
          [orgId]
        );
        const companyId = companyRes.rows[0]!.id;

        const scheduleAmount = { amountMinor: 250000, currency: "CAD", scale: 2 };

        // Schedule 1: next_run_at in the past → due.
        const dueSchedule = await createRecurringBillingSchedule(client, tenant, {
          companyId,
          description: "Monthly retainer DS44",
          cadence: "monthly",
          amount: scheduleAmount,
          nextRunAt: "2026-04-01"
        });
        expect(dueSchedule.id).toBeTruthy();
        expect(dueSchedule.nextRunAt).toBe("2026-04-01");

        // Schedule 2: next_run_at in the future → must NOT fire.
        const futureSchedule = await createRecurringBillingSchedule(client, tenant, {
          companyId,
          description: "Future quarterly DS44",
          cadence: "quarterly",
          amount: { amountMinor: 100000, currency: "CAD", scale: 2 },
          nextRunAt: "2026-09-01"
        });
        expect(futureSchedule.id).toBeTruthy();

        // Run with asOfDate = today (2026-05-28 >= 2026-04-01 → fires).
        const runResult = await runDueRecurringBilling(client, tenant, "2026-05-28");
        expect(runResult.generated).toBe(1);
        expect(runResult.invoiceIds).toHaveLength(1);

        const invoiceId = runResult.invoiceIds[0]!;

        // Assert exactly 1 invoice generated with a single line whose amount == schedule amount.
        const invoice = await getInvoiceById(client, tenant, invoiceId);
        expect(invoice).not.toBeNull();
        expect(invoice!.status).toBe("draft");
        expect(invoice!.companyId).toBe(companyId);
        expect(invoice!.total.amountMinor).toBe(scheduleAmount.amountMinor);
        expect(invoice!.total.currency).toBe("CAD");
        expect(invoice!.lines).toHaveLength(1);
        expect(invoice!.lines[0]!.sourceType).toBe("recurring_schedule");
        expect(invoice!.lines[0]!.sourceId).toBe(dueSchedule.id);
        expect(invoice!.lines[0]!.amount.amountMinor).toBe(scheduleAmount.amountMinor);

        // Assert schedule.last_invoice_id set, next_run_at advanced ~1 month.
        const scheduleAfter = await client.query<{
          last_invoice_id: string;
          last_run_at: string;
          next_run_at: string;
        }>(
          `select last_invoice_id, last_run_at, next_run_at::text as next_run_at
             from recurring_billing_schedules
            where id = $1`,
          [dueSchedule.id]
        );
        expect(scheduleAfter.rows).toHaveLength(1);
        expect(scheduleAfter.rows[0]!.last_invoice_id).toBe(invoiceId);
        expect(scheduleAfter.rows[0]!.last_run_at).toBeTruthy();
        // next_run_at advanced from 2026-04-01 by 1 month → 2026-05-01
        expect(scheduleAfter.rows[0]!.next_run_at).toBe("2026-05-01");

        // Assert future schedule completely untouched.
        const futureAfter = await client.query<{
          last_invoice_id: string | null;
          next_run_at: string;
        }>(
          `select last_invoice_id, next_run_at::text as next_run_at
             from recurring_billing_schedules
            where id = $1`,
          [futureSchedule.id]
        );
        expect(futureAfter.rows[0]!.last_invoice_id).toBeNull();
        expect(futureAfter.rows[0]!.next_run_at).toBe("2026-09-01");

        // Assert audit rows: billing.recurring_schedule.created (x2) + .scheduled (x1) + billing.invoice.created (x1).
        const auditSchedule = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'recurring_schedule' and resource_id = $2::text
            order by created_at asc`,
          [orgId, dueSchedule.id]
        );
        const scheduleActions = auditSchedule.rows.map((r) => r.action);
        expect(scheduleActions).toContain("billing.recurring_schedule.created");
        expect(scheduleActions).toContain("billing.recurring_schedule.scheduled");

        const auditInvoice = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'invoice' and resource_id = $2::text`,
          [orgId, invoiceId]
        );
        expect(auditInvoice.rows.map((r) => r.action)).toContain("billing.invoice.created");

        // Assert timeline entries.
        const tlSchedule = await client.query<{ entry_type: string }>(
          `select entry_type from timeline_entries
            where organization_id = $1 and resource_type = 'recurring_schedule' and resource_id = $2
            order by occurred_at asc`,
          [orgId, dueSchedule.id]
        );
        const tlTypes = tlSchedule.rows.map((r) => r.entry_type);
        expect(tlTypes).toContain("billing.recurring_schedule.created");
        expect(tlTypes).toContain("billing.recurring_schedule.scheduled");
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("SavedView end-to-end (DS 5.0): create -> list filtered by resourceType -> update -> soft-delete; audit rows persist", async () => {
    const { createSavedView, updateSavedView, deleteSavedView, listSavedViews } = await import(
      "../../src/reporting/saved-view-service"
    );

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('ReportCo DS50', 'ReportCo DS50', 'reportco-ds50', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('report-ds50-id@reportco.local', 'Report DS50', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'report-ds50@reportco.local', 'Report DS50', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenant = { organizationId: orgId, actorUserId: userRes.rows[0]!.id };

        // Create a saved view for crm.opportunity
        const sv = await createSavedView(client, tenant, {
          resourceType: "crm.opportunity",
          name: "Open opps DS50",
          filters: { status: "open" },
          columns: ["name", "status"],
          isShared: false
        });
        expect(sv.id).toBeTruthy();
        expect(sv.resourceType).toBe("crm.opportunity");
        expect(sv.name).toBe("Open opps DS50");
        expect(sv.isShared).toBe(false);

        // Create a second view for billing.invoice — must NOT appear in crm filter
        await createSavedView(client, tenant, {
          resourceType: "billing.invoice",
          name: "Draft invoices DS50",
          isShared: true
        });

        // List filtered by resourceType — returns only the crm.opportunity one
        const listed = await listSavedViews(client, tenant, { resourceType: "crm.opportunity" });
        expect(listed).toHaveLength(1);
        expect(listed[0]!.id).toBe(sv.id);

        // Update — name changes
        const updated = await updateSavedView(client, tenant, sv.id, {
          name: "Open opps DS50 updated",
          isShared: true
        });
        expect(updated.name).toBe("Open opps DS50 updated");
        expect(updated.isShared).toBe(true);

        // Soft-delete — must not appear in list any more
        await deleteSavedView(client, tenant, sv.id);
        const afterDelete = await listSavedViews(client, tenant, { resourceType: "crm.opportunity" });
        expect(afterDelete).toHaveLength(0);

        // Audit rows preserved: created, updated, deleted
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'saved_view' and resource_id = $2::text
            order by created_at asc`,
          [orgId, sv.id]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("reporting.saved_view.created");
        expect(actions).toContain("reporting.saved_view.updated");
        expect(actions).toContain("reporting.saved_view.deleted");
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("DS 5.2: Dashboard CRUD + widget + render non-persisting + audit + ownership-403", async () => {
    const { createReportDefinition } = await import("../../src/reporting/report-definition-service");
    const { createDashboard, deleteDashboard, listDashboards, addWidget, renderDashboard, DashboardForbiddenError } = await import(
      "../../src/reporting/dashboard-service"
    );
    const { createPipelineStage } = await import("../../src/crm/pipeline-stage-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('DashCo DS52', 'DashCo DS52', 'dashco-ds52', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userARes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('dash-ds52-a-id@dashco.local', 'Dash A DS52', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'dash-ds52-a@dashco.local', 'Dash A DS52', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userBRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('dash-ds52-b-id@dashco.local', 'Dash B DS52', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'dash-ds52-b@dashco.local', 'Dash B DS52', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenantA = { organizationId: orgId, actorUserId: userARes.rows[0]!.id };
        const tenantB = { organizationId: orgId, actorUserId: userBRes.rows[0]!.id };

        // Seed pipeline stage + opportunity for crm.pipeline_funnel report
        const stage = await createPipelineStage(client, tenantA, {
          name: "Discovery DS52",
          orderIndex: 0,
          isInitial: true
        });
        void stage;

        // Create a ReportDefinition
        const rd = await createReportDefinition(client, tenantA, {
          reportType: "crm.pipeline_funnel",
          name: "Pipeline funnel DS52",
          ownerUserId: tenantA.actorUserId,
          isShared: false
        });
        expect(rd.id).toBeTruthy();

        // Create a Dashboard
        const dash = await createDashboard(client, tenantA, {
          name: "My dashboard DS52",
          ownerUserId: tenantA.actorUserId,
          isShared: false
        });
        expect(dash.id).toBeTruthy();
        expect(dash.name).toBe("My dashboard DS52");

        // Add a widget
        const widget = await addWidget(client, tenantA, dash.id, {
          reportDefinitionId: rd.id,
          position: 0
        });
        expect(widget.id).toBeTruthy();
        expect(widget.dashboardId).toBe(dash.id);

        // Count report_runs before render
        const runCountBefore = await client.query<{ count: string }>(
          `select count(*)::text as count from report_runs where organization_id = $1`,
          [orgId]
        );
        const runCountBeforeN = parseInt(runCountBefore.rows[0]!.count);

        // GET render — transient, non-persisting
        const rendered = await renderDashboard(client, tenantA, dash.id);
        expect(rendered.dashboard.id).toBe(dash.id);
        expect(rendered.widgets).toHaveLength(1);
        expect(rendered.widgets[0]!.columns.length).toBeGreaterThan(0);
        expect(rendered.widgets[0]!.rowCount).toBeGreaterThanOrEqual(1);

        // Assert NO new report_runs row was created by render
        const runCountAfter = await client.query<{ count: string }>(
          `select count(*)::text as count from report_runs where organization_id = $1`,
          [orgId]
        );
        expect(parseInt(runCountAfter.rows[0]!.count)).toBe(runCountBeforeN);

        // Assert audit rows: reporting.dashboard.created + reporting.dashboard_widget.created
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1
              and action in ('reporting.dashboard.created', 'reporting.dashboard_widget.created')
            order by created_at asc`,
          [orgId]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("reporting.dashboard.created");
        expect(actions).toContain("reporting.dashboard_widget.created");

        // Soft-delete removes dashboard from list
        await deleteDashboard(client, tenantA, dash.id);
        const listed = await listDashboards(client, tenantA);
        expect(listed.find((d) => d.id === dash.id)).toBeUndefined();

        // Shared dashboard owner-only 403: user B cannot add widget to user A's shared dashboard
        const dashShared = await createDashboard(client, tenantA, {
          name: "Shared DS52",
          ownerUserId: tenantA.actorUserId,
          isShared: true
        });
        const rd2 = await createReportDefinition(client, tenantA, {
          reportType: "crm.pipeline_funnel",
          name: "Funnel shared DS52",
          ownerUserId: tenantA.actorUserId,
          isShared: true
        });
        await expect(
          addWidget(client, tenantB, dashShared.id, { reportDefinitionId: rd2.id })
        ).rejects.toBeInstanceOf(DashboardForbiddenError);
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("DS 5.1: ReportDefinition CRUD + run + audit + ownership-403", async () => {
    const { createReportDefinition, deleteReportDefinition, listReportDefinitions, runReportDefinition, ForbiddenError } = await import(
      "../../src/reporting/report-definition-service"
    );
    const { createPipelineStage } = await import("../../src/crm/pipeline-stage-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('ReportCo DS51', 'ReportCo DS51', 'reportco-ds51', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;
        const userARes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('report-ds51-a-id@reportco.local', 'Report A DS51', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'report-ds51-a@reportco.local', 'Report A DS51', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userBRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('report-ds51-b-id@reportco.local', 'Report B DS51', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'report-ds51-b@reportco.local', 'Report B DS51', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenantA = { organizationId: orgId, actorUserId: userARes.rows[0]!.id };
        const tenantB = { organizationId: orgId, actorUserId: userBRes.rows[0]!.id };

        // Seed a pipeline stage so the crm.pipeline_funnel report produces rows
        await createPipelineStage(client, tenantA, {
          name: "Discovery DS51",
          orderIndex: 0,
          isInitial: true
        });

        // Create a ReportDefinition (crm.pipeline_funnel — no required params)
        const rd = await createReportDefinition(client, tenantA, {
          reportType: "crm.pipeline_funnel",
          name: "Pipeline funnel DS51",
          ownerUserId: tenantA.actorUserId,
          isShared: false
        });
        expect(rd.id).toBeTruthy();
        expect(rd.reportType).toBe("crm.pipeline_funnel");

        // Run it
        const run = await runReportDefinition(client, tenantA, rd.id);
        expect(run.status).toBe("completed");
        expect(run.rowCount).toBeGreaterThanOrEqual(1);
        expect(run.resultColumns.length).toBeGreaterThan(0);
        const colKeys = run.resultColumns.map((c) => c.key);
        expect(colKeys).toContain("stage");
        expect(colKeys).toContain("open_count");
        expect(colKeys).toContain("pipeline_value_minor");

        // Verify report_runs row exists with correct data
        const runRow = await client.query<{
          status: string;
          row_count: number;
          result_columns: unknown;
        }>(
          `select status, row_count, result_columns from report_runs
            where organization_id = $1 and id = $2`,
          [orgId, run.id]
        );
        expect(runRow.rows[0]!.status).toBe("completed");
        expect(runRow.rows[0]!.row_count).toBeGreaterThanOrEqual(1);

        // Verify audit events: report_definition.created + report_run.completed
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1
              and action in ('reporting.report_definition.created', 'reporting.report_run.completed')
            order by created_at asc`,
          [orgId]
        );
        const actions = auditRows.rows.map((r) => r.action);
        expect(actions).toContain("reporting.report_definition.created");
        expect(actions).toContain("reporting.report_run.completed");

        // Soft-delete leaves the definition out of list
        await deleteReportDefinition(client, tenantA, rd.id);
        const listed = await listReportDefinitions(client, tenantA);
        expect(listed.find((d) => d.id === rd.id)).toBeUndefined();

        // --- Ownership-403: shared definition owned by A, user B cannot delete ---
        const rdShared = await createReportDefinition(client, tenantA, {
          reportType: "crm.pipeline_funnel",
          name: "Shared funnel DS51",
          ownerUserId: tenantA.actorUserId,
          isShared: true
        });
        await expect(
          deleteReportDefinition(client, tenantB, rdShared.id)
        ).rejects.toBeInstanceOf(ForbiddenError);
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("DS 5.3: ScheduledDelivery run + delivery_runs + frozen snapshot + audit + manual-no-advance + ownership-403", async () => {
    const { createReportDefinition } = await import("../../src/reporting/report-definition-service");
    const {
      createScheduledDelivery,
      deleteScheduledDelivery,
      getScheduledDeliveryById,
      listScheduledDeliveries,
      runDueDeliveries,
      runDeliveryNow,
      ScheduledDeliveryForbiddenError
    } = await import("../../src/reporting/scheduled-delivery-service");
    const { createPipelineStage } = await import("../../src/crm/pipeline-stage-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('SchedDelivCo DS53', 'SchedDelivCo DS53', 'scheddeliv-ds53', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;

        const userARes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sched-ds53-a-id@scheddeliv.local', 'Sched A DS53', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sched-ds53-a@scheddeliv.local', 'Sched A DS53', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userBRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('sched-ds53-b-id@scheddeliv.local', 'Sched B DS53', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'sched-ds53-b@scheddeliv.local', 'Sched B DS53', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenantA = { organizationId: orgId, actorUserId: userARes.rows[0]!.id };
        const tenantB = { organizationId: orgId, actorUserId: userBRes.rows[0]!.id };

        // Seed pipeline stage + opportunity so crm.pipeline_funnel returns rows
        await createPipelineStage(client, tenantA, {
          name: "Discovery DS53",
          orderIndex: 0,
          isInitial: true
        });

        // Create a ReportDefinition
        const rd = await createReportDefinition(client, tenantA, {
          reportType: "crm.pipeline_funnel",
          name: "Pipeline funnel DS53",
          ownerUserId: tenantA.actorUserId,
          isShared: false
        });
        expect(rd.id).toBeTruthy();

        // Create a ScheduledDelivery with next_run_at in the PAST so it is due
        const pastDate = "2020-01-01T00:00:00.000Z";
        // We directly insert with a past next_run_at bypassing the service's future-only constraint
        const sdRes = await client.query<{ id: string }>(
          `insert into scheduled_deliveries (
             organization_id, owner_user_id, name, target_type, target_id,
             cadence, timezone, next_run_at, channel, recipient_user_ids, is_shared, active
           ) values ($1, $2, $3, 'report_definition', $4, 'weekly', 'UTC', $5::timestamptz,
             'in_app', $6::jsonb, false, true)
           returning id`,
          [orgId, tenantA.actorUserId, "DS53 funnel delivery", rd.id, pastDate,
           JSON.stringify([tenantA.actorUserId])]
        );
        const sdId = sdRes.rows[0]!.id;
        expect(sdId).toBeTruthy();

        // Capture report_runs count before
        const runCountBefore = await client.query<{ count: string }>(
          `select count(*)::text as count from report_runs where organization_id = $1`,
          [orgId]
        );
        const runCountBeforeN = parseInt(runCountBefore.rows[0]!.count);

        // POST /reporting/scheduled-deliveries/run → process due deliveries
        const result = await runDueDeliveries(client, tenantA);
        expect(result.processed).toBe(1);
        expect(result.results[0]!.status).toBe("completed");

        // A delivery_runs row should exist with status='completed' and non-null report_run_id
        const drRows = await client.query<{
          id: string;
          status: string;
          triggered_by: string;
          report_run_id: string | null;
        }>(
          `select id, status, triggered_by, report_run_id
             from delivery_runs
            where organization_id = $1 and scheduled_delivery_id = $2`,
          [orgId, sdId]
        );
        expect(drRows.rows).toHaveLength(1);
        const dr = drRows.rows[0]!;
        expect(dr.status).toBe("completed");
        expect(dr.triggered_by).toBe("schedule");
        expect(dr.report_run_id).not.toBeNull();

        // A new report_runs row (frozen snapshot) should have been created
        const runCountAfter = await client.query<{ count: string }>(
          `select count(*)::text as count from report_runs where organization_id = $1`,
          [orgId]
        );
        expect(parseInt(runCountAfter.rows[0]!.count)).toBeGreaterThan(runCountBeforeN);

        // The schedule's next_run_at is now in the FUTURE (SKIP semantics)
        const sdAfter = await getScheduledDeliveryById(client, tenantA, sdId);
        expect(sdAfter).not.toBeNull();
        const nextRunAtMs = new Date(sdAfter!.nextRunAt).getTime();
        // next_run_at must now be in the FUTURE (SKIP semantics — skipped missed windows)
        expect(nextRunAtMs).toBeGreaterThan(Date.now() - 60000); // within the last minute or in the future
        expect(nextRunAtMs).toBeGreaterThan(new Date("2020-01-01").getTime()); // definitely past the seed value
        // last_run_at must be set
        expect(sdAfter!.lastRunAt).not.toBeNull();

        // Audit rows: reporting.scheduled_delivery.created + reporting.delivery_run.completed
        // Note: the direct INSERT above does not emit the created event — check delivery_run.completed
        const auditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1
              and action in ('reporting.delivery_run.completed', 'reporting.delivery_run.failed')
            order by created_at asc`,
          [orgId]
        );
        const auditActions = auditRows.rows.map((r) => r.action);
        expect(auditActions).toContain("reporting.delivery_run.completed");

        // Manual single run: triggered_by=manual AND next_run_at UNCHANGED
        const nextRunAtBefore = sdAfter!.nextRunAt;
        const manualRun = await runDeliveryNow(client, tenantA, sdId);
        expect(manualRun.triggeredBy).toBe("manual");
        expect(manualRun.status).toBe("completed");

        // next_run_at must NOT have changed (compare as epoch ms to avoid tz-string precision diffs)
        const sdAfterManual = await getScheduledDeliveryById(client, tenantA, sdId);
        const nextRunAtBeforeMs = new Date(nextRunAtBefore).getTime();
        const nextRunAtAfterMs = new Date(sdAfterManual!.nextRunAt).getTime();
        expect(nextRunAtAfterMs).toBe(nextRunAtBeforeMs);

        // Two delivery_runs now (schedule + manual)
        const drRows2 = await client.query<{ triggered_by: string }>(
          `select triggered_by from delivery_runs
            where organization_id = $1 and scheduled_delivery_id = $2
            order by created_at asc`,
          [orgId, sdId]
        );
        expect(drRows2.rows.map((r) => r.triggered_by)).toEqual(["schedule", "manual"]);

        // Shared delivery owner-only 403: user B cannot PATCH user A's shared delivery
        const sdShared = await createScheduledDelivery(client, tenantA, {
          name: "Shared DS53",
          targetType: "report_definition",
          targetId: rd.id,
          cadence: "monthly",
          ownerUserId: tenantA.actorUserId,
          isShared: true
        });
        await expect(
          // attempt to update as tenantB
          client.query(
            `update scheduled_deliveries set name = 'Hacked' where id = $1`,
            [sdShared.id]
          )
        ).resolves.toBeDefined(); // Direct SQL bypasses service; use service for 403
        await expect(
          import("../../src/reporting/scheduled-delivery-service").then(({ updateScheduledDelivery }) =>
            updateScheduledDelivery(client, tenantB, sdShared.id, { name: "Hacked via service" })
          )
        ).rejects.toBeInstanceOf(ScheduledDeliveryForbiddenError);

        // Soft-delete removes from list
        await deleteScheduledDelivery(client, tenantA, sdShared.id);
        const listed = await listScheduledDeliveries(client, tenantA);
        expect(listed.find((d) => d.id === sdShared.id)).toBeUndefined();
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("DS 5.4: WorkflowDefinition + WorkflowRun — fire + created resource + idempotency/cascade guard + ownership-403", async () => {
    const {
      createWorkflowDefinition,
      deleteWorkflowDefinition,
      listWorkflowDefinitions,
      runWorkflowNow,
      listWorkflowRuns,
      WorkflowForbiddenError
    } = await import("../../src/workflow/workflow-service");

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const orgRes = await client.query<{ id: string }>(
          `insert into organizations (
             legal_name, display_name, slug, status, default_locale, default_currency,
             default_timezone, country, province_state
           ) values ('WfCo DS54', 'WfCo DS54', 'wfco-ds54', 'active', 'fr', 'CAD',
             'America/Toronto', 'CA', 'QC')
           returning id`,
          []
        );
        const orgId = orgRes.rows[0]!.id;

        const userARes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('wf-ds54-a-id@wfco.local', 'WF A DS54', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'wf-ds54-a@wfco.local', 'WF A DS54', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const userBRes = await client.query<{ id: string }>(
          `with id as (
             insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
             values ('wf-ds54-b-id@wfco.local', 'WF B DS54', 'fr', 'passkey', 'active', 'human')
             returning id
           )
           insert into users (id, organization_id, email, display_name, preferred_locale, status)
           select id.id, $1, 'wf-ds54-b@wfco.local', 'WF B DS54', 'fr', 'active' from id
           returning id`,
          [orgId]
        );
        const tenantA = { organizationId: orgId, actorUserId: userARes.rows[0]!.id };
        const tenantB = { organizationId: orgId, actorUserId: userBRes.rows[0]!.id };

        // Create a WorkflowDefinition: trigger=crm.opportunity.won → action=create_notification
        const wf = await createWorkflowDefinition(client, tenantA, {
          name: "Notify on opp won DS54",
          triggerType: "crm.opportunity.won",
          actionType: "create_notification",
          actionConfig: {
            subjectKey: "workflow.test.subject",
            bodyKey: "workflow.test.body",
            recipientUserId: tenantA.actorUserId
          },
          isActive: true,
          isShared: false,
          ownerUserId: tenantA.actorUserId
        });
        expect(wf.id).toBeTruthy();
        expect(wf.triggerType).toBe("crm.opportunity.won");
        expect(wf.actionType).toBe("create_notification");

        // Audit row: workflow.workflow_definition.created
        const defAuditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'workflow_definition' and resource_id = $2::text
            order by created_at asc`,
          [orgId, wf.id]
        );
        expect(defAuditRows.rows.map((r) => r.action)).toContain("workflow.workflow_definition.created");

        // -----------------------------------------------------------------------
        // Manual run via runWorkflowNow — proves the action fires and creates a resource
        // -----------------------------------------------------------------------
        const run = await runWorkflowNow(client, tenantA, wf.id);
        expect(run.id).toBeTruthy();
        expect(run.status).toBe("completed");
        expect(run.triggeredBy).toBe("manual");
        expect(run.createdResourceType).toBe("notification");
        expect(run.createdResourceId).not.toBeNull();

        // Exactly ONE workflow_runs row
        const runCountRows = await client.query<{ count: string }>(
          `select count(*)::text as count from workflow_runs
            where organization_id = $1 and workflow_definition_id = $2`,
          [orgId, wf.id]
        );
        expect(runCountRows.rows[0]!.count).toBe("1");

        // The run row has the correct shape
        const runRows = await client.query<{
          status: string;
          triggered_by: string;
          created_resource_type: string | null;
          created_resource_id: string | null;
        }>(
          `select status, triggered_by, created_resource_type, created_resource_id
             from workflow_runs where id = $1`,
          [run.id]
        );
        const runRow = runRows.rows[0]!;
        expect(runRow.status).toBe("completed");
        expect(runRow.triggered_by).toBe("manual");
        expect(runRow.created_resource_type).toBe("notification");
        expect(runRow.created_resource_id).not.toBeNull();

        // A notifications row must exist
        const notifRows = await client.query<{ id: string }>(
          `select id from notifications where id = $1`,
          [run.createdResourceId]
        );
        expect(notifRows.rows).toHaveLength(1);

        // Audit rows: workflow_run.completed present
        const runAuditRows = await client.query<{ action: string }>(
          `select action from audit_events
            where organization_id = $1 and resource_type = 'workflow_run' and resource_id = $2::text
            order by created_at asc`,
          [orgId, run.id]
        );
        expect(runAuditRows.rows.map((r) => r.action)).toContain("workflow.workflow_run.completed");

        // -----------------------------------------------------------------------
        // CASCADE GUARD — the notification's own audit event must NOT have spawned
        // a second workflow_run. Count must stay 1.
        // -----------------------------------------------------------------------
        const cascadeCountRows = await client.query<{ count: string }>(
          `select count(*)::text as count from workflow_runs
            where organization_id = $1 and workflow_definition_id = $2`,
          [orgId, wf.id]
        );
        expect(cascadeCountRows.rows[0]!.count).toBe("1");

        // -----------------------------------------------------------------------
        // listWorkflowRuns returns the one run
        // -----------------------------------------------------------------------
        const runs = await listWorkflowRuns(client, tenantA, wf.id);
        expect(runs).toHaveLength(1);
        expect(runs[0]!.id).toBe(run.id);

        // -----------------------------------------------------------------------
        // listWorkflowDefinitions returns the definition
        // -----------------------------------------------------------------------
        const defs = await listWorkflowDefinitions(client, tenantA);
        expect(defs.find((d) => d.id === wf.id)).toBeDefined();

        // -----------------------------------------------------------------------
        // Ownership-403: shared workflow owned by A; user B cannot mutate it.
        // -----------------------------------------------------------------------
        const wfShared = await createWorkflowDefinition(client, tenantA, {
          name: "Shared WF DS54",
          triggerType: "crm.opportunity.won",
          actionType: "create_notification",
          actionConfig: {
            subjectKey: "workflow.test.subject",
            bodyKey: "workflow.test.body"
          },
          isActive: true,
          isShared: true,
          ownerUserId: tenantA.actorUserId
        });
        await expect(
          import("../../src/workflow/workflow-service").then(({ updateWorkflowDefinition }) =>
            updateWorkflowDefinition(client, tenantB, wfShared.id, { name: "Hacked via service" })
          )
        ).rejects.toBeInstanceOf(WorkflowForbiddenError);

        // Soft-delete removes from list
        await deleteWorkflowDefinition(client, tenantA, wfShared.id);
        const listedAfterDelete = await listWorkflowDefinitions(client, tenantA);
        expect(listedAfterDelete.find((d) => d.id === wfShared.id)).toBeUndefined();
      } finally {
        await client.query("rollback");
      }
    });
  }, 30000);

  it("DS 5.5: WebhookEndpoint + WebhookDelivery — signed pending_egress + idempotency + secret-not-in-GET + no-egress + ownership-403", async () => {
    const { createHmac } = await import("node:crypto");
    const { createWebhookEndpoint, deleteWebhookEndpoint, getWebhookEndpointById, listWebhookEndpoints, WebhookForbiddenError } = await import("../../src/webhook/webhook-service");
    const { buildApp, headerTenantResolver } = await import("../../src/http/app");

    // Use ephemeral DB isolated for this suite instance
    const ephemeralDs55 = await createEphemeralDb("pgsmoke-ds55");
    const poolDs55 = createPgPool({ connectionString: ephemeralDs55.connectionString });

    try {
      await runMigrations(poolDs55, {
        directory: new URL("../../src/db/migrations", import.meta.url).pathname
      });

      await poolDs55.withClient(async (client) => {
        await client.query("begin");
        try {
          const orgRes = await client.query<{ id: string }>(
            `insert into organizations (
               legal_name, display_name, slug, status, default_locale, default_currency,
               default_timezone, country, province_state
             ) values ('WH DS55 Co', 'WH DS55 Co', 'wh-ds55', 'active', 'fr', 'CAD',
               'America/Toronto', 'CA', 'QC')
             returning id`,
            []
          );
          const orgId = orgRes.rows[0]!.id;

          const userARes = await client.query<{ id: string }>(
            `with id as (
               insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
               values ('wh-ds55-a-id@wh.local', 'WH A DS55', 'fr', 'passkey', 'active', 'human')
               returning id
             )
             insert into users (id, organization_id, email, display_name, preferred_locale, status)
             select id.id, $1, 'wh-ds55-a@wh.local', 'WH A DS55', 'fr', 'active' from id
             returning id`,
            [orgId]
          );
          const userBRes = await client.query<{ id: string }>(
            `with id as (
               insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
               values ('wh-ds55-b-id@wh.local', 'WH B DS55', 'fr', 'passkey', 'active', 'human')
               returning id
             )
             insert into users (id, organization_id, email, display_name, preferred_locale, status)
             select id.id, $1, 'wh-ds55-b@wh.local', 'WH B DS55', 'fr', 'active' from id
             returning id`,
            [orgId]
          );
          const tenantA = { organizationId: orgId, actorUserId: userARes.rows[0]!.id };
          const tenantB = { organizationId: orgId, actorUserId: userBRes.rows[0]!.id };

          // 1. Create endpoint subscribed to project.task.completed
          const createResult = await createWebhookEndpoint(client, tenantA, {
            name: "Task completed webhook",
            targetUrl: "https://hooks.example.com/task-done",
            eventTypes: ["project.task.completed"],
            isActive: true,
            isShared: false,
            ownerUserId: tenantA.actorUserId
          });

          // Assert create response carries signingSecret
          expect(typeof createResult.signingSecret).toBe("string");
          expect(createResult.signingSecret.length).toBe(64);
          const storedSecret = createResult.signingSecret;

          // 2. GET /webhook/endpoints/:id response must NOT contain signingSecret
          // Test via the service (which mirrors the HTTP handler)
          const retrieved = await getWebhookEndpointById(client, tenantA, createResult.id);
          expect(retrieved).not.toBeNull();
          expect((retrieved as unknown as Record<string, unknown>).signingSecret).toBeUndefined();
          expect((retrieved as unknown as Record<string, unknown>).signing_secret).toBeUndefined();

          // Also verify via buildApp (HTTP handler path)
          const app = buildApp({ db: client, resolveTenant: headerTenantResolver });
          const getRes = await app.request(`/webhook/endpoints/${createResult.id}`, {
            headers: {
              "x-organization-id": orgId,
              "x-user-identity-id": tenantA.actorUserId
            }
          });
          expect(getRes.status).toBe(200);
          const httpBody = await getRes.json() as Record<string, unknown>;
          expect(httpBody.signingSecret).toBeUndefined();
          expect(httpBody.signing_secret).toBeUndefined();

          // 3. Perform a mutation that fires project.task.completed
          // We need a project task — create one via the service and mark it complete
          const { createProject } = await import("../../src/project/project-service");
          const { createProjectTask, updateProjectTask } = await import("../../src/project/project-task-service");

          const project = await createProject(client, tenantA, {
            name: "Test project DS55"
          });
          const task = await createProjectTask(client, tenantA, {
            projectId: project.id,
            title: "Test task for webhook",
            status: "todo"
          });

          // Mark task as done → fires project.task.completed → webhook evaluator records delivery
          await updateProjectTask(client, tenantA, task.id, { status: "done" });

          // 4. Assert exactly ONE webhook_deliveries row exists, status=pending_egress
          const deliveries = await client.query<{
            id: string;
            status: string;
            http_status: number | null;
            delivered_at: string | null;
            signature: string;
            payload: Record<string, unknown>;
            trigger_audit_event_id: string;
            signed_at: string;
          }>(
            `select id, status, http_status, delivered_at, signature, payload,
                    trigger_audit_event_id, signed_at
               from webhook_deliveries
              where organization_id = $1 and webhook_endpoint_id = $2
              order by created_at`,
            [orgId, createResult.id]
          );
          expect(deliveries.rows.length).toBe(1);
          const delivery = deliveries.rows[0]!;
          expect(delivery.status).toBe("pending_egress");
          expect(delivery.http_status).toBeNull();    // NO egress
          expect(delivery.delivered_at).toBeNull();  // NO egress
          expect(delivery.signature).toMatch(/^v1=/);
          expect(delivery.signature.length).toBeGreaterThan(65);

          // 5. Verify HMAC signature is correct.
          // Use the same canonical serialization (sorted keys) as the evaluator
          // to produce a rawBody that matches despite JSONB key reordering.
          const { canonicalizePayload } = await import("../../src/webhook/webhook-signer");
          const rawBody = canonicalizePayload(delivery.payload as Record<string, unknown>);
          const signedAtUnix = Math.floor(new Date(delivery.signed_at).getTime() / 1000);
          const message = `${delivery.trigger_audit_event_id}.${signedAtUnix}.${rawBody}`;
          const expected = "v1=" + createHmac("sha256", storedSecret).update(message).digest("hex");
          expect(delivery.signature).toBe(expected);

          // 6. Idempotency: complete the task again (would fire the same audit event?) - we simulate by
          //    calling the webhook evaluator directly with the same auditEventId
          const { makeWebhookEvaluator } = await import("../../src/webhook/webhook-evaluator");
          const evaluator = makeWebhookEvaluator();
          await evaluator(client, tenantA, {
            auditEventId: delivery.trigger_audit_event_id,
            action: "project.task.completed",
            resourceType: "project_task",
            resourceId: task.id
          });

          // Still only one delivery (idempotent on auditEventId)
          const deliveriesAfter = await client.query<{ id: string }>(
            `select id from webhook_deliveries where organization_id = $1 and webhook_endpoint_id = $2`,
            [orgId, createResult.id]
          );
          expect(deliveriesAfter.rows.length).toBe(1);

          // 7. Ownership-403: user B cannot PATCH user A's shared endpoint
          // First make it shared
          await client.query(
            `update webhook_endpoints set is_shared = true, owner_user_id = $3, updated_at = now()
              where id = $1 and organization_id = $2`,
            [createResult.id, orgId, tenantA.actorUserId]
          );
          await expect(
            import("../../src/webhook/webhook-service").then(({ updateWebhookEndpoint }) =>
              updateWebhookEndpoint(client, tenantB, createResult.id, { name: "Hacked" })
            )
          ).rejects.toBeInstanceOf(WebhookForbiddenError);

          // 8. Soft-delete removes from list
          await deleteWebhookEndpoint(client, tenantA, createResult.id);
          const listedAfterDelete = await listWebhookEndpoints(client, tenantA);
          expect(listedAfterDelete.find((e) => e.id === createResult.id)).toBeUndefined();

        } finally {
          await client.query("rollback");
        }
      });
    } finally {
      await poolDs55.end();
      await ephemeralDs55.drop();
    }
  }, 60000);

  it("RecurringBilling concurrent-fire regression: two concurrent runDueRecurringBilling calls on one due schedule produce exactly one invoice", async () => {
    const { runDueRecurringBilling } = await import(
      "../../src/billing/recurring-schedule-service"
    );

    // Use a dedicated ephemeral DB so data is committed and visible across connections.
    const ephemeralConc = await createEphemeralDb("pgsmoke-recbill-conc");
    const poolConc = createPgPool({ connectionString: ephemeralConc.connectionString });

    try {
      await runMigrations(poolConc, {
        directory: new URL("../../src/db/migrations", import.meta.url).pathname
      });

      // Seed org + user + company + one due schedule (all committed so both concurrent connections see them).
      const orgRes = await poolConc.query<{ id: string }>(
        `insert into organizations (
           legal_name, display_name, slug, status, default_locale, default_currency,
           default_timezone, country, province_state
         ) values ('ConcBill Co', 'ConcBill Co', 'concbill-co', 'active', 'fr', 'CAD',
           'America/Toronto', 'CA', 'QC')
         returning id`,
        []
      );
      const orgId = orgRes.rows[0]!.id;

      const userRes = await poolConc.query<{ id: string }>(
        `with uid as (
           insert into user_identities (email, display_name, preferred_locale, mfa_state, status, actor_type)
           values ('conc-bill-id@concbill.local', 'Conc Bill', 'fr', 'passkey', 'active', 'human')
           returning id
         )
         insert into users (id, organization_id, email, display_name, preferred_locale, status)
         select uid.id, $1, 'conc-bill@concbill.local', 'Conc Bill', 'fr', 'active' from uid
         returning id`,
        [orgId]
      );
      const userId = userRes.rows[0]!.id;
      const tenant = { organizationId: orgId, actorUserId: userId };

      const companyRes = await poolConc.query<{ id: string }>(
        `insert into companies (organization_id, display_name, status)
         values ($1, 'Conc Client', 'active')
         returning id`,
        [orgId]
      );
      const companyId = companyRes.rows[0]!.id;

      // Insert one due schedule directly (committed; visible to all connections).
      await poolConc.query(
        `insert into recurring_billing_schedules
           (organization_id, company_id, description, cadence, amount, currency, next_run_at, active)
         values ($1, $2, 'Conc monthly retainer', 'monthly',
                 '{"amountMinor":300000,"currency":"CAD","scale":2}'::jsonb,
                 'CAD', '2026-04-01'::date, true)`,
        [orgId, companyId]
      );

      // Fire two concurrent runDueRecurringBilling calls.
      // asOfDate = 2026-04-30: the schedule (next_run_at=2026-04-01) is due, but
      // once advanced to 2026-05-01 it will NOT be due any more on that same date.
      // This guarantees exactly one claim fires and the other returns 0.
      const [result1, result2] = await Promise.all([
        runDueRecurringBilling(poolConc, tenant, "2026-04-30"),
        runDueRecurringBilling(poolConc, tenant, "2026-04-30")
      ]);

      const totalGenerated = result1.generated + result2.generated;
      const allInvoiceIds = [...result1.invoiceIds, ...result2.invoiceIds];

      // Exactly one invoice must have been created across both concurrent runs.
      expect(totalGenerated).toBe(1);
      expect(allInvoiceIds).toHaveLength(1);

      // Confirm in the DB: exactly one invoice row for this org.
      const invoiceCount = await poolConc.query<{ cnt: string }>(
        `select count(*)::text as cnt from invoices where organization_id = $1`,
        [orgId]
      );
      expect(invoiceCount.rows[0]!.cnt).toBe("1");

      // Confirm next_run_at was advanced exactly once.
      const scheduleRow = await poolConc.query<{ next_run_at: string; last_invoice_id: string }>(
        `select next_run_at::text as next_run_at, last_invoice_id
           from recurring_billing_schedules
          where organization_id = $1`,
        [orgId]
      );
      expect(scheduleRow.rows).toHaveLength(1);
      // Advanced from 2026-04-01 by one month → 2026-05-01.
      expect(scheduleRow.rows[0]!.next_run_at).toBe("2026-05-01");
      expect(scheduleRow.rows[0]!.last_invoice_id).toBe(allInvoiceIds[0]);

      // Confirm exactly one billing.recurring_schedule.scheduled audit event.
      const auditRows = await poolConc.query<{ action: string }>(
        `select action from audit_events
          where organization_id = $1 and action = 'billing.recurring_schedule.scheduled'`,
        [orgId]
      );
      expect(auditRows.rows).toHaveLength(1);
    } finally {
      await poolConc.end();
      await ephemeralConc.drop();
    }
  }, 60000);
});
