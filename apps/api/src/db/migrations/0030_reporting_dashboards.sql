-- Dashboard + DashboardWidget: compose ReportDefinitions as ordered widgets (DS 5.2).
-- shared-entities-v1 Article 4.5 — live non-persisted render via the report registry.

create table dashboards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_user_id uuid references users(id),
  name text not null,
  description text,
  is_shared boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dashboards_org_idx on dashboards (organization_id);

create table dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  dashboard_id uuid not null references dashboards(id),
  report_definition_id uuid not null references report_definitions(id),
  title text,
  position integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dashboard_widgets_org_dash_idx on dashboard_widgets (organization_id, dashboard_id);

do $$
declare
  protected_table text := 'dashboards';
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

do $$
declare
  protected_table text := 'dashboard_widgets';
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
