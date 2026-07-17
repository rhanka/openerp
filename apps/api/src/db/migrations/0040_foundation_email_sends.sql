-- Audited, idempotent email send journal (foundation — D6, owner-ratified in
-- docs/studies/2026-07-11-wave-replacement-decisions.md).
-- The EmailSender PORT lives in apps/api/src/foundation/email-sender.ts; this
-- table is its journal. No concrete SMTP provider is wired yet — that remains
-- a pending owner decision. A no-op provider is used until then.

create table email_sends (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  to_address text not null,
  subject text not null,
  kind text not null,
  resource_type text,
  resource_id uuid,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider text not null,
  idempotency_key text not null,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index email_sends_org_status_idx on email_sends (organization_id, status);

do $$
declare
  protected_table text := 'email_sends';
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
