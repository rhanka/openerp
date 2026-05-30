-- ReportDefinition + ReportRun: curated parameterized report catalog (DS 5.1).
-- shared-entities-v1 Article 4.5 — Archetype A: server-curated synchronous execution.

create table report_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_user_id uuid references users(id),
  report_type text not null,
  name text not null,
  parameters jsonb not null default '{}',
  is_shared boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index report_definitions_org_type_idx on report_definitions (organization_id, report_type);

create table report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  report_definition_id uuid not null references report_definitions(id),
  triggered_by_user_id uuid references users(id),
  status text not null check (status in ('completed', 'failed')),
  parameters_snapshot jsonb not null default '{}',
  result_columns jsonb not null default '[]',
  result_rows jsonb not null default '[]',
  row_count integer not null default 0,
  error_detail text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index report_runs_org_def_idx on report_runs (organization_id, report_definition_id);

do $$
declare
  protected_table text := 'report_definitions';
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
  protected_table text := 'report_runs';
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
