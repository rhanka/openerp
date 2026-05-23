-- CRM PipelineStage + Opportunity (Article 4.2, Demo Slice 2.5).
-- PipelineStage is tenant-configurable; one row per stage with explicit
-- order_index and is_initial/is_won/is_lost flags. Opportunity references the
-- stage and the company; primary_contact_id is optional until a contact is
-- linked. status is independent of stage flags (status is closed/archived
-- bookkeeping; is_won/is_lost mark which stage the opportunity transitions
-- THROUGH on close).

create table pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  order_index integer not null,
  is_initial boolean not null default false,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, order_index)
);

create index pipeline_stages_org_order_idx on pipeline_stages (organization_id, order_index);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  company_id uuid not null references companies(id),
  primary_contact_id uuid references contacts(id),
  name text not null,
  stage_id uuid not null references pipeline_stages(id),
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'archived')),
  owner_user_id uuid references users(id),
  team_id uuid references teams(id),
  expected_value jsonb,
  currency text,
  expected_close_date date,
  probability_band text check (probability_band is null or probability_band in ('low', 'medium', 'high')),
  service_summary text,
  loss_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_org_company_idx on opportunities (organization_id, company_id);
create index opportunities_org_stage_idx on opportunities (organization_id, stage_id);
create index opportunities_org_status_idx on opportunities (organization_id, status);

do $$
declare
  protected_table text;
  tables text[] := array['pipeline_stages', 'opportunities'];
begin
  foreach protected_table in array tables loop
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
  end loop;
end$$;
