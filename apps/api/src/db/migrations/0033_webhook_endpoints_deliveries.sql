-- WebhookEndpoint + WebhookDelivery: tenant-configured outbound webhooks (DS 5.5).
-- A WebhookEndpoint subscribes to a set of curated audit event types and holds
-- an HMAC-SHA256 signing secret. When a subscribed event fires, a WebhookDelivery
-- is recorded (status pending_egress) — RECORD-ONLY in v1. Real egress is a
-- deferred slice; the schema already carries the inert retry/circuit-breaker
-- columns (consecutive_failures, disabled_at, http_status, attempt_count,
-- next_retry_at) so the egress slice lands without a migration.

create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_user_id uuid references users(id),
  name text not null,
  target_url text not null check (target_url like 'https://%'),
  signing_secret text not null,
  event_types jsonb not null default '[]',
  is_active boolean not null default true,
  is_shared boolean not null default false,
  consecutive_failures integer not null default 0,
  disabled_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index webhook_endpoints_org_active_idx
  on webhook_endpoints (organization_id, is_active)
  where deleted_at is null;

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  webhook_endpoint_id uuid not null references webhook_endpoints(id),
  event_type text not null,
  trigger_audit_event_id uuid,
  payload jsonb not null,
  signature text not null,
  status text not null default 'pending_egress' check (status in ('pending_egress', 'succeeded', 'failed')),
  http_status integer,
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  error_detail text,
  signed_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Idempotency: one delivery row per (endpoint, trigger audit event).
create unique index webhook_deliveries_idempotency_idx
  on webhook_deliveries (webhook_endpoint_id, trigger_audit_event_id)
  where trigger_audit_event_id is not null;

create index webhook_deliveries_org_endpoint_idx
  on webhook_deliveries (organization_id, webhook_endpoint_id);

do $$
declare
  protected_table text := 'webhook_endpoints';
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
  protected_table text := 'webhook_deliveries';
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
