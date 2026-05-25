-- TimeEntry entity (delivery module — Demo Slice 3.2).
-- A time entry logs minutes against a project (and optionally a task) by a user.
-- Carries a billable flag and a draft -> submitted -> approved lifecycle.
-- Soft-delete from day one (deleted_at) consistent with DS 2.3 / DS 3.0 / DS 3.1.

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id),
  project_task_id uuid references project_tasks(id),
  user_id uuid not null references users(id),
  entry_date date not null,
  minutes integer not null check (minutes > 0),
  description text,
  billable boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index time_entries_org_project_idx on time_entries (organization_id, project_id);
create index time_entries_org_user_date_idx on time_entries (organization_id, user_id, entry_date);
create index time_entries_org_status_idx on time_entries (organization_id, status);

do $$
declare
  protected_table text := 'time_entries';
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
