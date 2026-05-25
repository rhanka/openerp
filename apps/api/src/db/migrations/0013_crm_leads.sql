-- CRM Lead entity (shared-entities-v1 Article 4.2, Demo Slice 2.4).
-- Lead is the entry to the funnel: unqualified prospect captured from web,
-- import or referral, then converted into Company + Contact + Opportunity in
-- a single transaction (lead-service.convertLead). The converted_* FKs are
-- populated on the conversion path and stay NULL otherwise.

create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  source text,
  display_name text not null,
  company_name text,
  contact_name text,
  email text,
  phone text,
  description text,
  status text not null default 'new' check (status in ('new', 'working', 'converted', 'disqualified')),
  owner_user_id uuid references users(id),
  team_id uuid references teams(id),
  converted_at timestamptz,
  converted_company_id uuid references companies(id),
  converted_contact_id uuid references contacts(id),
  converted_opportunity_id uuid references opportunities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_org_status_idx on leads (organization_id, status);

do $$
declare
  protected_table text := 'leads';
begin
  execute format('alter table %I enable row level security', protected_table);
  execute format('alter table %I force row level security', protected_table);
  execute format('drop policy if exists %I_tenant_select on %I', protected_table, protected_table);
  execute format('drop policy if exists %I_tenant_modify on %I', protected_table, protected_table);
  execute format(
    'create policy %I_tenant_select on %I for select using (organization_id = app_current_organization_id())',
    protected_table, protected_table
  );
  execute format(
    'create policy %I_tenant_modify on %I for all using (organization_id = app_current_organization_id()) with check (organization_id = app_current_organization_id())',
    protected_table, protected_table
  );
end$$;
