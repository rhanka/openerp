-- Invoice + InvoiceLine entities (billing module — Demo Slice 4.0).
-- Invoice is the final revenue document. An approved InvoiceProposal can be
-- converted into a draft Invoice. Payment, taxes (GST/HST/QST), and journal
-- entries are later slices.
-- Money is stored as jsonb {amountMinor, currency, scale} aligned with CRM + Project.

create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  company_id uuid not null references companies(id),
  project_id uuid references projects(id),
  invoice_proposal_id uuid references invoice_proposals(id),
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'partially_paid', 'void', 'written_off')),
  currency text not null,
  subtotal jsonb not null,
  tax_total jsonb not null,
  total jsonb not null,
  issue_date date,
  due_date date,
  issued_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create index invoices_org_status_idx on invoices (organization_id, status);
create index invoices_org_company_idx on invoices (organization_id, company_id);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  invoice_id uuid not null references invoices(id),
  source_type text not null,
  source_id uuid,
  description text,
  quantity integer not null,
  unit_price jsonb not null,
  amount jsonb not null,
  created_at timestamptz not null default now()
);

create index invoice_lines_org_invoice_idx on invoice_lines (organization_id, invoice_id);

do $$
declare
  protected_table text := 'invoices';
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
  protected_table text := 'invoice_lines';
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
