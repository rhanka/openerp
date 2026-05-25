-- Project entity (delivery module — Demo Slice 3.0).
-- The Project is the delivery container linked to a CRM Company (optional at
-- creation; company_id is nullable to allow pre-CRM projects).
-- Status: draft | active | on_hold | completed | cancelled.
-- Soft-delete from day one (deleted_at) consistent with CRM DS 2.3.

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
  code text,
  company_id uuid references companies(id),
  owner_user_id uuid references users(id),
  start_date date,
  end_date date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_org_status_idx on projects (organization_id, status);

do $$
declare
  protected_table text := 'projects';
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
