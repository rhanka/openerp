-- Tax engine entities (billing module — Demo Slice 4.2).
-- TaxCategory + TaxRateVersion are tenant-configurable. Rates are DATA not
-- hardcoded statutory rules. Quebec GST 5% + QST 9.975% ship as seed/fixtures.
-- The per-rate `compound` flag drives non-compounded vs compounded calculation
-- so the engine stays general (no province-specific branching).

create table tax_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  code text not null,
  description text,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create index tax_categories_org_active_idx on tax_categories (organization_id, active);

create table tax_rate_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  tax_category_id uuid not null references tax_categories(id),
  jurisdiction text not null,
  label text not null,
  -- Integer milli-percent (rate * 1000): 5000 = 5.000%, 9975 = 9.975%.
  -- The engine computes round(base * rate_bps / 100000). QST 9.975% is only
  -- representable as an integer in milli-percent (basis points would be 997.5),
  -- so DO NOT seed GST 5% as 500 — that is 0.5%. GST 5% = 5000.
  rate_bps integer not null check (rate_bps >= 0),
  -- When false (default): rate applies on pre-tax subtotal base.
  -- When true: rate applies on subtotal + sum of prior taxes (compounded).
  compound boolean not null default false,
  effective_from date not null,
  effective_to date,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tax_rate_versions_org_category_idx on tax_rate_versions (organization_id, tax_category_id, effective_from);

-- Additive ALTER on invoices: existing rows get NULL (no data loss).
alter table invoices
  add column tax_category_id uuid references tax_categories(id),
  add column tax_breakdown jsonb;

-- RLS for tax_categories
do $$
declare
  protected_table text := 'tax_categories';
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

-- RLS for tax_rate_versions
do $$
declare
  protected_table text := 'tax_rate_versions';
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
