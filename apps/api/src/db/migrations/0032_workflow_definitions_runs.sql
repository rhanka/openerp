-- WorkflowDefinition + WorkflowRun: tenant-configured automation rules (DS 5.4).
-- A WorkflowDefinition binds one curated trigger event type to one curated action.
-- Workflows fire synchronously in-request via a hook at recordAuditEvent; firing
-- is best-effort (never fails the originating mutation), re-entrancy-guarded, and
-- idempotent per trigger audit event.

create table workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_user_id uuid references users(id),
  name text not null,
  description text,
  trigger_type text not null,
  trigger_config jsonb not null default '{}',
  action_type text not null,
  action_config jsonb not null default '{}',
  is_active boolean not null default true,
  is_shared boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workflow_definitions_org_trigger_active_idx
  on workflow_definitions (organization_id, trigger_type, is_active)
  where deleted_at is null;

create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  workflow_definition_id uuid not null references workflow_definitions(id),
  trigger_audit_event_id uuid,
  trigger_event_type text not null,
  trigger_resource_type text,
  trigger_resource_id uuid,
  triggered_by text not null check (triggered_by in ('event', 'manual')),
  status text not null check (status in ('completed', 'failed', 'skipped')),
  created_resource_type text,
  created_resource_id uuid,
  action_result jsonb not null default '{}',
  error_detail text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index workflow_runs_idempotency_idx
  on workflow_runs (workflow_definition_id, trigger_audit_event_id)
  where trigger_audit_event_id is not null;

create index workflow_runs_org_def_idx
  on workflow_runs (organization_id, workflow_definition_id);

do $$
declare
  protected_table text := 'workflow_definitions';
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
  protected_table text := 'workflow_runs';
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
