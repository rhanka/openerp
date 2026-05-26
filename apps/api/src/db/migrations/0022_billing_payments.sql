-- Payment entity (billing module — Demo Slice 4.1).
-- A Payment records cash received against an Invoice. Recording a payment
-- reconciles the Invoice status automatically: sum(payments) >= total =>
-- 'paid', 0 < sum < total => 'partially_paid'.
-- Money is stored as jsonb {amountMinor, currency, scale} aligned with Invoice.

create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  invoice_id uuid not null references invoices(id),
  company_id uuid references companies(id),
  amount jsonb not null,
  payment_date date not null,
  method text not null check (method in ('bank_transfer', 'card', 'cheque', 'cash', 'other')),
  reference text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_org_invoice_idx on payments (organization_id, invoice_id);
create index payments_org_date_idx on payments (organization_id, payment_date);

do $$
declare
  protected_table text := 'payments';
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
