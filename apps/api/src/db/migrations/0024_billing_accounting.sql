-- Accounting backbone (billing module — Demo Slice 4.3).
-- Tenant chart of Accounts + balanced double-entry JournalEntry / JournalEntryLine.
-- Every entry must balance: sum(debit.amountMinor) == sum(credit.amountMinor).
-- Money snapshots stored as jsonb {amountMinor, currency, scale} aligned with BillingMoney.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index accounts_org_type_idx on accounts (organization_id, type);
create index accounts_org_active_idx on accounts (organization_id, active);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  entry_date date not null,
  reference text,
  description text,
  source_type text not null check (source_type in ('invoice', 'payment', 'manual')),
  source_id uuid,
  status text not null default 'draft' check (status in ('draft', 'posted', 'void')),
  posted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index journal_entries_org_status_idx on journal_entries (organization_id, status);
create index journal_entries_org_source_idx on journal_entries (organization_id, source_type, source_id);

create table journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  journal_entry_id uuid not null references journal_entries(id),
  account_id uuid not null references accounts(id),
  -- Money snapshot: exactly one of debit/credit is non-zero per line.
  debit jsonb not null,
  credit jsonb not null,
  description text,
  created_at timestamptz not null default now()
);

create index journal_entry_lines_org_entry_idx on journal_entry_lines (organization_id, journal_entry_id);

-- RLS for accounts
do $$
declare
  protected_table text := 'accounts';
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

-- RLS for journal_entries
do $$
declare
  protected_table text := 'journal_entries';
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

-- RLS for journal_entry_lines
do $$
declare
  protected_table text := 'journal_entry_lines';
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
