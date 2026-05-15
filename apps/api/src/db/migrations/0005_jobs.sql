-- Jobs table — PG-04 (JobQueue abstraction).
-- MVP backend is a SELECT FOR UPDATE SKIP LOCKED loop in apps/worker (pgmq
-- extension is deferred; the JobQueue interface stays stable so the swap is
-- transparent to consumers).

create table jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  job_type text not null,
  payload jsonb not null default '{}',
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  attempts integer not null default 0,
  idempotency_key text,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  unique (organization_id, idempotency_key)
);

create index jobs_org_status_scheduled_idx
  on jobs (organization_id, status, scheduled_at);

create index jobs_status_scheduled_idx
  on jobs (status, scheduled_at)
  where status = 'queued';

-- RLS (PG-03).
alter table jobs enable row level security;
alter table jobs force row level security;
drop policy if exists jobs_tenant_select on jobs;
drop policy if exists jobs_tenant_modify on jobs;
create policy jobs_tenant_select on jobs for select
  using (organization_id = app_current_organization_id());
create policy jobs_tenant_modify on jobs for all
  using (organization_id = app_current_organization_id())
  with check (organization_id = app_current_organization_id());
