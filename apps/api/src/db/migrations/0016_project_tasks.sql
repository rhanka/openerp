-- ProjectTask entity (delivery module — Demo Slice 3.1).
-- A task belongs to a project and carries a lifecycle status.
-- Soft-delete from day one (deleted_at) consistent with DS 2.3 / DS 3.0.
-- Completing a task (status -> done) stamps completed_at automatically via the
-- service layer (not a DB trigger) to keep audit emission explicit.

create table project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  assignee_user_id uuid references users(id),
  due_date date,
  completed_at timestamptz,
  parent_task_id uuid references project_tasks(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_tasks_org_project_idx on project_tasks (organization_id, project_id);
create index project_tasks_org_status_idx on project_tasks (organization_id, status);

do $$
declare
  protected_table text := 'project_tasks';
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
