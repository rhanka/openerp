-- CRM Company entity (shared-entities-v1 Article 4.2, Demo Slice 2).
-- Status: active | archived. Soft-delete deferred; archived absorbs the hide-from-active-pipeline use case.
-- Addresses stored as structured jsonb to avoid duplicating the legacy
-- province/state columns of organizations.

create table companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  display_name text not null,
  legal_name text,
  status text not null default 'active' check (status in ('active', 'archived')),
  owner_user_id uuid references users(id),
  team_id uuid references teams(id),
  website text,
  phone text,
  email text,
  language text check (language is null or language in ('en', 'fr')),
  tax_region text,
  billing_address jsonb,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_org_display_idx on companies (organization_id, display_name);

do $$
declare
  protected_table text := 'companies';
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
