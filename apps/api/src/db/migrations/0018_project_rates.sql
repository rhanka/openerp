-- Rate entity (delivery module — Demo Slice 3.3: tariff / pricing primitive).
-- A rate is a tenant-configured hourly price with effective dating.
-- Money is stored as a jsonb snapshot {amountMinor, currency, scale} aligned with
-- the CRM Opportunity expected_value column.
-- Soft-delete consistent with DS 2.3 / DS 3.0 / DS 3.1 / DS 3.2.

create table rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  amount jsonb not null,
  effective_from date not null,
  effective_to date,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rates_org_name_unique unique (organization_id, name)
);

create index rates_org_active_idx on rates (organization_id, active);

do $$
declare
  protected_table text := 'rates';
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
