-- Assignment entity (delivery module — Demo Slice 3.3: resource allocation).
-- An assignment links a user to a project at an optional allocation percentage
-- and an optional billable rate. Soft-delete consistent with DS 2.3 / DS 3.x.

create table assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id),
  user_id uuid not null references users(id),
  role_label text,
  allocation_percent integer check (allocation_percent between 0 and 100),
  start_date date,
  end_date date,
  billable_rate_id uuid references rates(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_org_project_idx on assignments (organization_id, project_id);
create index assignments_org_user_idx on assignments (organization_id, user_id);

do $$
declare
  protected_table text := 'assignments';
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
