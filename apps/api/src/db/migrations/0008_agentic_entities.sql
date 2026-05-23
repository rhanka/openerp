-- Canon Agentic entities (shared-entities-v1 Article 4.6) — owned by the
-- agentic module but defined in the foundation database so the existing
-- audit_events.agent_*/policy_decision_id columns and ApprovalRequest -> agent
-- handoffs resolve at the schema level. Pure schema; no runtime wiring yet.

create table agent_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  capabilities jsonb not null default '[]',
  tools jsonb not null default '[]',
  policies jsonb not null default '[]',
  budget_caps jsonb not null default '{}',
  identity_mode text not null check (identity_mode in ('acting_as', 'service_principal', 'on_behalf_of')),
  status text not null check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agent_definition_id uuid not null references agent_definitions(id),
  triggered_by_user_id uuid references users(id),
  triggered_by_workflow_run_id uuid,
  acting_principal text not null,
  on_behalf_of text,
  mode text not null check (mode in ('acting_as', 'service_principal', 'on_behalf_of')),
  status text not null check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled', 'awaiting_approval')),
  started_at timestamptz,
  completed_at timestamptz,
  budget_consumed jsonb not null default '{}',
  approval_request_id uuid references approval_requests(id),
  trace_id text,
  created_at timestamptz not null default now()
);

create index agent_runs_org_status_idx on agent_runs (organization_id, status, created_at desc);
create index agent_runs_definition_idx on agent_runs (agent_definition_id);

create table policy_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agent_run_id uuid not null references agent_runs(id),
  tool_call_id uuid,
  policy_id text not null,
  decision text not null check (decision in ('allow', 'deny', 'require_approval')),
  reason text not null,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index policy_decisions_run_idx on policy_decisions (agent_run_id, evaluated_at desc);

-- agent_runs.policy_decision_id is the entry-decision pointer. Added once
-- policy_decisions exists so the FK can be enforced.
alter table agent_runs
  add column policy_decision_id uuid references policy_decisions(id);

create table tool_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agent_run_id uuid not null references agent_runs(id),
  tool_name text not null,
  input jsonb not null,
  output jsonb,
  status text not null check (status in ('pending', 'running', 'succeeded', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  otel_span_id text,
  created_at timestamptz not null default now()
);

create index tool_calls_run_idx on tool_calls (agent_run_id, created_at desc);

-- Late FK: policy_decisions.tool_call_id now resolves against tool_calls(id).
alter table policy_decisions
  add constraint policy_decisions_tool_call_id_fkey
  foreign key (tool_call_id) references tool_calls(id);

create table supervision_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  agent_run_id uuid not null references agent_runs(id),
  mode text not null check (mode in ('inline', 'panel')),
  assigned_to_user_id uuid references users(id),
  decision text check (decision in ('approve', 'reject', 'escalate')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index supervision_requests_run_idx on supervision_requests (agent_run_id, created_at desc);

-- RLS — tenant-scoped on every agentic table, identical pattern to migration 0003.
do $$
declare
  protected_table text;
  tables text[] := array[
    'agent_definitions',
    'agent_runs',
    'policy_decisions',
    'tool_calls',
    'supervision_requests'
  ];
begin
  foreach protected_table in array tables loop
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
  end loop;
end$$;
