-- Auth alignment Lot 2. A verified human with several active memberships must
-- select a tenant explicitly. This is deliberately pre-tenant state: NULL
-- organization_id means no organization has been selected and is never a
-- fabricated placeholder.

create table auth_pending_tenant_selections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  user_identity_id uuid not null references user_identities(id) on delete cascade,
  ceremony_id text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index auth_pending_tenant_selections_user_ceremony_idx
  on auth_pending_tenant_selections (user_identity_id, ceremony_id, created_at desc);
create index auth_pending_tenant_selections_expires_at_idx
  on auth_pending_tenant_selections (expires_at);

-- App-role table access remains tenant-scoped. Pending rows exist before a
-- tenant exists, so only the narrowly scoped SECURITY DEFINER functions below
-- can reach NULL-organization rows.
do $$
declare
  protected_table text := 'auth_pending_tenant_selections';
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

grant select, insert, update on auth_pending_tenant_selections to openerp_auth_system;

create or replace function auth_pending_tenant_selection_create(
  p_user_identity_id uuid,
  p_ceremony_id text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_created_at timestamptz
) returns table (
  id uuid,
  user_identity_id uuid,
  ceremony_id text,
  token_hash text,
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  insert into auth_pending_tenant_selections (
    organization_id, user_identity_id, ceremony_id, token_hash, expires_at, created_at
  ) values (
    null, p_user_identity_id, p_ceremony_id, p_token_hash, p_expires_at, p_created_at
  )
  returning id, user_identity_id, ceremony_id, token_hash, expires_at, consumed_at, created_at
$$;

create or replace function auth_pending_tenant_selection_find_valid(
  p_token_hash text,
  p_now timestamptz
) returns table (
  id uuid,
  user_identity_id uuid,
  ceremony_id text,
  token_hash text,
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, user_identity_id, ceremony_id, token_hash, expires_at, consumed_at, created_at
    from auth_pending_tenant_selections
   where organization_id is null
     and token_hash = p_token_hash
     and consumed_at is null
     and expires_at > p_now
$$;

create or replace function auth_pending_tenant_selection_consume(
  p_id uuid,
  p_user_identity_id uuid,
  p_ceremony_id text,
  p_token_hash text,
  p_now timestamptz
) returns boolean
language sql
security definer
set search_path = public
as $$
  with consumed as (
    update auth_pending_tenant_selections
       set consumed_at = p_now
     where id = p_id
       and organization_id is null
       and user_identity_id = p_user_identity_id
       and ceremony_id = p_ceremony_id
       and token_hash = p_token_hash
       and consumed_at is null
       and expires_at > p_now
     returning id
  )
  select exists(select 1 from consumed)
$$;

alter function auth_pending_tenant_selection_create(uuid, text, text, timestamptz, timestamptz) owner to openerp_auth_system;
alter function auth_pending_tenant_selection_find_valid(text, timestamptz) owner to openerp_auth_system;
alter function auth_pending_tenant_selection_consume(uuid, uuid, text, text, timestamptz) owner to openerp_auth_system;

revoke all on function auth_pending_tenant_selection_create(uuid, text, text, timestamptz, timestamptz) from public;
revoke all on function auth_pending_tenant_selection_find_valid(text, timestamptz) from public;
revoke all on function auth_pending_tenant_selection_consume(uuid, uuid, text, text, timestamptz) from public;

grant execute on function auth_pending_tenant_selection_create(uuid, text, text, timestamptz, timestamptz) to openerp_app;
grant execute on function auth_pending_tenant_selection_find_valid(text, timestamptz) to openerp_app;
grant execute on function auth_pending_tenant_selection_consume(uuid, uuid, text, text, timestamptz) to openerp_app;
