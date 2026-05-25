-- InvoiceProposal + InvoiceProposalLine entities (delivery module — Demo Slice 3.4).
-- An InvoiceProposal aggregates approved billable TimeEntries × the resourcing Rate
-- into proposal lines and a total. It is the project-side handoff toward Billing
-- (Project owns the proposal; the Invoice itself belongs to the future Billing module).
-- Money is stored as jsonb {amountMinor, currency, scale} aligned with CRM + Rate.

create table invoice_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id),
  company_id uuid references companies(id),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  period_start date,
  period_end date,
  total jsonb not null,
  currency text not null,
  submitted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoice_proposals_org_project_idx on invoice_proposals (organization_id, project_id);
create index invoice_proposals_org_status_idx on invoice_proposals (organization_id, status);

create table invoice_proposal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  invoice_proposal_id uuid not null references invoice_proposals(id),
  source_type text not null,
  source_id uuid,
  description text,
  quantity_minutes integer not null,
  unit_rate jsonb not null,
  amount jsonb not null,
  created_at timestamptz not null default now()
);

create index invoice_proposal_lines_org_proposal_idx on invoice_proposal_lines (organization_id, invoice_proposal_id);

do $$
declare
  protected_table text := 'invoice_proposals';
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
  protected_table text := 'invoice_proposal_lines';
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
