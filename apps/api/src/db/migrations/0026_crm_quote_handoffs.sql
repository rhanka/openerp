-- DS 2.7 QuoteHandoff: CRM owns the handoff event (Article 4.2 / D-CRM-09).
-- A won Opportunity produces a QuoteHandoff; Billing consumes an accepted
-- handoff to generate a draft Invoice (single-line from the opportunity's
-- expected value).

create table quote_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  opportunity_id uuid not null references opportunities(id),
  target_type text not null check (target_type in ('invoice', 'project', 'subscription')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  requested_by_user_id uuid references users(id),
  accepted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quote_handoffs_org_opp_idx on quote_handoffs (organization_id, opportunity_id);
create index quote_handoffs_org_status_idx on quote_handoffs (organization_id, status);

do $$
declare
  protected_table text := 'quote_handoffs';
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
