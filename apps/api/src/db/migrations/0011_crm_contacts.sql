-- CRM Contact entity (shared-entities-v1 Article 4.2, Demo Slice 2.1).
-- company_id is nullable: a Contact may exist before being linked to a Company
-- (lead conversion path) and may be reassigned later.

create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  company_id uuid references companies(id),
  display_name text not null,
  first_name text,
  last_name text,
  title text,
  email text,
  phone text,
  language text check (language is null or language in ('en', 'fr')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  owner_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_org_company_idx on contacts (organization_id, company_id);
create index contacts_org_display_idx on contacts (organization_id, display_name);

do $$
declare
  protected_table text := 'contacts';
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
