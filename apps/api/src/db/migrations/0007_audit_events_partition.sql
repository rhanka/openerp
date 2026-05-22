-- Convert audit_events to a monthly-partitioned, append-only table aligned on
-- the shared-entities-v1 canon (PG-06 article 2.2). Adds the canon columns
-- missing from earlier migrations (correlation_id, idempotency_record_id,
-- agent_run_id, acting_principal, on_behalf_of), partitions by RANGE on
-- created_at with one initial monthly partition, and enforces append-only via
-- BEFORE UPDATE / BEFORE DELETE triggers that cascade to every partition.
--
-- The bootstrap migration role is superuser (BYPASSRLS), so dropping the old
-- table and recreating with the same column list keeps prior data intact.

-- Drop existing RLS policies before renaming. They cannot be re-targeted to
-- the new partitioned table without explicit re-creation.
drop policy if exists audit_events_tenant_select on audit_events;
drop policy if exists audit_events_tenant_modify on audit_events;

-- Preserve any prior rows by parking the legacy table on the side.
alter table audit_events rename to audit_events_legacy;

-- Drop the FK index created in 0001 (still attached to the legacy table); the
-- partitioned version recreates an equivalent (org, created_at) index.
drop index if exists audit_events_org_created_idx;

create table audit_events (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_user_id uuid references users(id),
  actor_type text not null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  before_summary jsonb,
  after_summary jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  -- Agentic extension columns (PG-09, kept from migration 0002).
  source text check (source in ('human', 'agent', 'system')),
  agent_id text,
  tool_call_id text,
  policy_decision_id text,
  delegation_id text,
  approval_request_id uuid references approval_requests(id),
  -- Canon completion (PG-06 article 2.2).
  correlation_id uuid,
  idempotency_record_id uuid,
  agent_run_id uuid,
  acting_principal text,
  on_behalf_of text,
  primary key (id, created_at)
) partition by range (created_at);

create index audit_events_org_created_idx on audit_events (organization_id, created_at desc);

-- Backfill legacy rows into the partitioned table before dropping the old one.
-- The default partition (created below) absorbs rows whose month has not been
-- materialized yet so the copy never fails on a missing partition.
create table audit_events_default partition of audit_events default;

insert into audit_events (
  id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
  before_summary, after_summary, ip_hash, user_agent_hash, created_at,
  source, agent_id, tool_call_id, policy_decision_id, delegation_id, approval_request_id
) select
  id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
  before_summary, after_summary, ip_hash, user_agent_hash, created_at,
  source, agent_id, tool_call_id, policy_decision_id, delegation_id, approval_request_id
from audit_events_legacy;

drop table audit_events_legacy;

-- Helper: create the monthly partition for the given month if missing. Returns
-- the partition name. Callable from the migration, scheduled jobs, or the API
-- before high-volume inserts. The partition covers [first day, first day of
-- next month).
create or replace function app_ensure_audit_partition(target date) returns text
language plpgsql
as $$
declare
  start_date date := date_trunc('month', target)::date;
  end_date date := (start_date + interval '1 month')::date;
  partition_name text := format('audit_events_y%sm%s',
    to_char(start_date, 'YYYY'),
    to_char(start_date, 'MM')
  );
begin
  if not exists (select 1 from pg_class where relname = partition_name) then
    execute format(
      'create table %I partition of audit_events for values from (%L) to (%L)',
      partition_name, start_date::text, end_date::text
    );
  end if;
  return partition_name;
end;
$$;

-- Materialize the current month partition immediately so RLS-scoped inserts
-- routed to the current month land in a dedicated child table rather than the
-- default partition.
select app_ensure_audit_partition(current_date);

-- Append-only enforcement. The trigger function raises on any UPDATE or DELETE
-- regardless of role; the bootstrap role itself cannot bypass it. Inserts go
-- through unchanged. Row-level triggers on a partitioned parent cascade to all
-- partitions in PostgreSQL >= 13.
create or replace function audit_events_block_mutations() returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only (PG-06 article 2.2)';
end;
$$;

drop trigger if exists audit_events_no_update on audit_events;
drop trigger if exists audit_events_no_delete on audit_events;

create trigger audit_events_no_update
  before update on audit_events
  for each row execute function audit_events_block_mutations();

create trigger audit_events_no_delete
  before delete on audit_events
  for each row execute function audit_events_block_mutations();

-- Restore RLS on the recreated table.
alter table audit_events enable row level security;
alter table audit_events force row level security;

create policy audit_events_tenant_select on audit_events
  for select using (organization_id = app_current_organization_id());

create policy audit_events_tenant_modify on audit_events
  for all using (organization_id = app_current_organization_id())
  with check (organization_id = app_current_organization_id());
