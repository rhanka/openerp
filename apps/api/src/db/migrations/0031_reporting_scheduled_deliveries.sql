-- ScheduledDelivery + DeliveryRun: tenant-configured recurring report delivery (DS 5.3).
-- A schedule targets a ReportDefinition on a cadence; firing executes the report
-- once and persists a frozen ReportRun snapshot plus an audited delivery_runs record
-- (in-app channel; outbound email/webhook deferred).
-- Missed cadence windows are skipped — advancement anchors on now() (freshest snapshot wins).

create table scheduled_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_user_id uuid references users(id),
  name text not null,
  target_type text not null check (target_type in ('report_definition')),
  target_id uuid not null,
  cadence text not null check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'annual')),
  timezone text not null default 'UTC',
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  channel text not null default 'in_app' check (channel in ('in_app')),
  recipient_user_ids jsonb not null default '[]',
  is_shared boolean not null default false,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_deliveries_org_active_next_idx
  on scheduled_deliveries (organization_id, active, next_run_at)
  where deleted_at is null;

create table delivery_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  scheduled_delivery_id uuid not null references scheduled_deliveries(id),
  report_run_id uuid references report_runs(id),
  triggered_by text not null check (triggered_by in ('schedule', 'manual')),
  status text not null check (status in ('completed', 'failed', 'skipped')),
  error_detail text,
  snapshot_summary jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index delivery_runs_org_delivery_idx
  on delivery_runs (organization_id, scheduled_delivery_id);

do $$
declare
  protected_table text := 'scheduled_deliveries';
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
  protected_table text := 'delivery_runs';
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
