import type { ClientQueryable, PgPoolHandle } from "../db/pg-client";

export interface SeedResult {
  organizationId: string;
  userIdentityId: string;
  auditEventCount: number;
  approvalRequestCount: number;
  pipelineStageCount: number;
  companyCount: number;
  opportunityCount: number;
}

export const DEMO_ORG_SLUG = "northwind-services";
export const DEMO_ADMIN_EMAIL = "alice@northwind.local";

export async function runSeedDev(pool: PgPoolHandle): Promise<SeedResult> {
  return pool.withClient(async (client) => {
    await client.query("begin");
    try {
      const out = await seedDev(client);
      await client.query("commit");
      return out;
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  });
}

export async function seedDev(client: ClientQueryable): Promise<SeedResult> {
  // Drop existing rows scoped to the demo org for idempotency. Order matters
  // because of FK constraints.
  const existing = await client.query<{ id: string }>(
    `select id from organizations where slug = $1`,
    [DEMO_ORG_SLUG]
  );
  if (existing.rows.length > 0) {
    const orgId = existing.rows[0]!.id;
    // session_replication_role = replica disables both the audit_events
    // append-only triggers (PG-06 article 2.2) and FK triggers; manual ordering
    // below keeps referential integrity intact for the purge.
    await client.query("set local session_replication_role = replica");
    await client.query(`delete from audit_events where organization_id = $1`, [orgId]);
    await client.query(`delete from opportunities where organization_id = $1`, [orgId]);
    await client.query(`delete from pipeline_stages where organization_id = $1`, [orgId]);
    await client.query(`delete from contacts where organization_id = $1`, [orgId]);
    await client.query(`delete from companies where organization_id = $1`, [orgId]);
    await client.query(`delete from approval_requests where organization_id = $1`, [orgId]);
    await client.query(`delete from idempotency_records where organization_id = $1`, [orgId]);
    await client.query(`delete from organization_members where organization_id = $1`, [orgId]);
    await client.query(`delete from users where organization_id = $1`, [orgId]);
    await client.query(`delete from tenant_settings where organization_id = $1`, [orgId]);
    await client.query(`delete from organizations where id = $1`, [orgId]);
    await client.query("set local session_replication_role = default");
  }
  await client.query(
    `delete from user_identities where lower(email) = lower($1)`,
    [DEMO_ADMIN_EMAIL]
  );

  // Organization + tenant settings.
  const orgRes = await client.query<{ id: string }>(
    `insert into organizations (
       legal_name, display_name, slug, status, default_locale, default_currency,
       default_timezone, country, province_state
     ) values ($1, $2, $3, 'active', 'fr', 'CAD', 'America/Toronto', 'CA', 'QC')
     returning id`,
    ["Northwind Services Inc.", "Northwind Services", DEMO_ORG_SLUG]
  );
  const organizationId = orgRes.rows[0]!.id;

  await client.query(
    `insert into tenant_settings (
       organization_id, supported_locales, primary_locale, tax_region,
       fiscal_year_start, document_numbering_policy, retention_policy,
       self_hosted_update_state
     ) values ($1, $2, 'fr', 'CA-QC', '01-01', $3, $4, $5)`,
    [
      organizationId,
      ["fr", "en"],
      JSON.stringify({ invoice: { prefix: "NW-", padding: 6 } }),
      JSON.stringify({ audit_years: 7, payroll_years: 6 }),
      JSON.stringify({ status: "supported", window: "under_12_months" })
    ]
  );

  // UserIdentity (canon, global) + matching per-tenant `users` row so the
  // legacy audit_events FK is satisfied.
  const identityRes = await client.query<{ id: string }>(
    `insert into user_identities (
       email, display_name, preferred_locale, mfa_state, status, actor_type
     ) values ($1, 'Alice Tremblay', 'fr', 'passkey', 'active', 'human')
     returning id`,
    [DEMO_ADMIN_EMAIL]
  );
  const userIdentityId = identityRes.rows[0]!.id;

  await client.query(
    `insert into users (
       id, organization_id, email, display_name, preferred_locale, status
     ) values ($1, $2, $3, 'Alice Tremblay', 'fr', 'active')`,
    [userIdentityId, organizationId, DEMO_ADMIN_EMAIL]
  );

  await client.query(
    `insert into organization_members (
       user_identity_id, organization_id, status, preferred_locale
     ) values ($1, $2, 'active', 'fr')`,
    [userIdentityId, organizationId]
  );

  const auditSamples: Array<{
    action: string;
    resourceType: string;
    resourceId: string;
    daysAgo: number;
    source: "human" | "agent" | "system";
  }> = [
    { action: "organization.created", resourceType: "organization", resourceId: organizationId, daysAgo: 7, source: "system" },
    { action: "tenant_settings.initialized", resourceType: "tenant_settings", resourceId: organizationId, daysAgo: 7, source: "system" },
    { action: "user_identity.invited", resourceType: "user_identity", resourceId: userIdentityId, daysAgo: 6, source: "human" },
    { action: "user_identity.activated", resourceType: "user_identity", resourceId: userIdentityId, daysAgo: 6, source: "human" },
    { action: "passkey.registered", resourceType: "passkey_credential", resourceId: userIdentityId, daysAgo: 5, source: "human" },
    { action: "user_identity.login", resourceType: "user_identity", resourceId: userIdentityId, daysAgo: 4, source: "human" },
    { action: "approval_request.created", resourceType: "approval_request", resourceId: "ar-demo-1", daysAgo: 3, source: "agent" },
    { action: "approval_request.created", resourceType: "approval_request", resourceId: "ar-demo-2", daysAgo: 2, source: "agent" },
    { action: "approval_request.decided", resourceType: "approval_request", resourceId: "ar-demo-1", daysAgo: 2, source: "human" },
    { action: "organization.settings_changed", resourceType: "tenant_settings", resourceId: organizationId, daysAgo: 1, source: "human" },
    { action: "user_identity.login", resourceType: "user_identity", resourceId: userIdentityId, daysAgo: 1, source: "human" },
    { action: "user_identity.login", resourceType: "user_identity", resourceId: userIdentityId, daysAgo: 0, source: "human" }
  ];
  for (const sample of auditSamples) {
    const createdAt = new Date(Date.now() - sample.daysAgo * 86_400_000).toISOString();
    await client.query(
      `insert into audit_events (
         organization_id, actor_user_id, actor_type, action, resource_type,
         resource_id, source, created_at
       ) values ($1, $2, 'user', $3, $4, $5, $6, $7)`,
      [
        organizationId,
        sample.source === "system" ? null : userIdentityId,
        sample.action,
        sample.resourceType,
        sample.resourceId,
        sample.source,
        createdAt
      ]
    );
  }

  await client.query(
    `insert into approval_requests (
       organization_id, requester_user_identity_id, approver_user_identity_id,
       approver_role_id, subject_type, subject_id, reason, urgency, status,
       expires_at, created_at
     ) values
       ($1, $2, $2, null, 'invoice', 'INV-2026-000123', 'Montant > 10 000 $ CAD',
        'high', 'pending', $3, now() - interval '2 days'),
       ($1, $2, $2, null, 'expense_report', 'EXP-2026-00042', 'Catégorie sensible',
        'normal', 'pending', $3, now() - interval '1 day'),
       ($1, $2, $2, null, 'vendor', 'VND-2026-0007', 'Nouveau fournisseur étranger',
        'normal', 'approved', null, now() - interval '4 days')`,
    [
      organizationId,
      userIdentityId,
      new Date(Date.now() + 7 * 86_400_000).toISOString()
    ]
  );

  // CRM seed: 3 pipeline stages (Discovery initial / Proposal / Closed Won) +
  // 1 demo Company + 1 demo Opportunity so /admin/crm/opportunities renders a
  // realistic funnel without requiring tenant setup.
  const stageRows = await client.query<{ id: string; name: string }>(
    `insert into pipeline_stages (
       organization_id, name, order_index, is_initial, is_won, is_lost, active
     ) values
       ($1, 'Discovery', 0, true,  false, false, true),
       ($1, 'Proposal',  1, false, false, false, true),
       ($1, 'Closed Won', 2, false, true,  false, true),
       ($1, 'Closed Lost', 3, false, false, true,  true)
     returning id, name`,
    [organizationId]
  );
  const discoveryStageId = stageRows.rows.find((r) => r.name === "Discovery")!.id;

  const companyRes = await client.query<{ id: string }>(
    `insert into companies (
       organization_id, display_name, legal_name, status, owner_user_id,
       website, email, language, tax_region
     ) values ($1, 'Acme Logistics', 'Acme Logistics Inc.', 'active', $2,
       'https://acme.example', 'contact@acme.example', 'fr', 'CA-QC')
     returning id`,
    [organizationId, userIdentityId]
  );
  const acmeCompanyId = companyRes.rows[0]!.id;

  const opportunityRes = await client.query<{ id: string }>(
    `insert into opportunities (
       organization_id, company_id, name, stage_id, status, owner_user_id,
       expected_value, currency, probability_band, service_summary
     ) values ($1, $2, 'Acme — Annual platform licence', $3, 'open', $4,
       $5::jsonb, 'CAD', 'medium', 'Bilingual SaaS licence + onboarding')
     returning id`,
    [
      organizationId,
      acmeCompanyId,
      discoveryStageId,
      userIdentityId,
      JSON.stringify({ amountMinor: 4_800_000, currency: "CAD", scale: 2 })
    ]
  );
  const opportunityCount = opportunityRes.rows.length;

  return {
    organizationId,
    userIdentityId,
    auditEventCount: auditSamples.length,
    approvalRequestCount: 3,
    pipelineStageCount: stageRows.rows.length,
    companyCount: 1,
    opportunityCount
  };
}
