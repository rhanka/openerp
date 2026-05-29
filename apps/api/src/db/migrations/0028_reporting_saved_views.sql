-- SavedView: persisted filter/column/sort set per resource type (DS 5.0).
-- shared-entities-v1 Article 4.5. Owner-scoped or org-shared.

create table saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_user_id uuid references users(id),
  resource_type text not null,
  name text not null,
  filters jsonb not null default '{}',
  columns jsonb not null default '[]',
  sort_by text,
  is_shared boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_views_org_resource_idx on saved_views (organization_id, resource_type);
create index saved_views_org_owner_idx on saved_views (organization_id, owner_user_id);

do $$
declare
  protected_table text := 'saved_views';
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
