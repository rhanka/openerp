-- RecurringBillingSchedule: tenant-configured recurring billing (DS 4.4).
-- A schedule with a cadence (weekly/monthly/quarterly/annual) generates draft
-- Invoices when runDueRecurringBilling is called. The run service is callable;
-- a pgmq/cron trigger can wire to it later.
-- Money (amount) is stored as jsonb {amountMinor, currency, scale}.

create table recurring_billing_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  company_id uuid not null references companies(id),
  description text,
  cadence text not null check (cadence in ('weekly', 'monthly', 'quarterly', 'annual')),
  amount jsonb not null,
  currency text not null,
  next_run_at date not null,
  active boolean not null default true,
  last_invoice_id uuid references invoices(id),
  last_run_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recurring_billing_schedules_org_active_next_idx
  on recurring_billing_schedules (organization_id, active, next_run_at)
  where deleted_at is null;

do $$
declare
  protected_table text := 'recurring_billing_schedules';
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
