-- Auth alignment Lot 1. Email proof is intentionally pre-tenant: a caller
-- proves control of an address before a membership can select a tenant. The
-- nullable organization_id records that explicit non-tenant state; it is never
-- populated with a fabricated all-zero organization.

alter table user_identities
  add column email_verified boolean not null default false;

create table auth_email_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  email text not null,
  code_hash text not null,
  verification_token text,
  expires_at timestamptz not null,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index auth_email_verifications_email_created_idx
  on auth_email_verifications (email, created_at desc);
create index auth_email_verifications_expires_at_idx
  on auth_email_verifications (expires_at);

-- App-role table access remains strictly tenant-scoped. Pre-tenant proof rows
-- are reached only through the narrowly scoped SECURITY DEFINER functions
-- below; an unscoped openerp_app connection cannot enumerate or mutate them.
do $$
declare
  protected_table text := 'auth_email_verifications';
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

-- Authentication telemetry and verification mail occur before a tenant or a
-- human actor has been selected. Null is the explicit non-tenant
-- representation, not a fake organization.
alter table audit_events
  alter column organization_id drop not null;

alter table email_sends
  alter column organization_id drop not null;

create unique index email_sends_system_idempotency_key_idx
  on email_sends (idempotency_key)
  where organization_id is null;

-- A non-login function owner is the only principal that can bypass forced RLS
-- for these specific pre-auth operations. openerp_app receives EXECUTE only;
-- it is not a member of this role and keeps its ordinary tenant table policy.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'openerp_auth_system') then
    create role openerp_auth_system nologin bypassrls;
  end if;
end$$;

grant usage on schema public to openerp_auth_system;
grant select, insert, update on auth_email_verifications, email_sends to openerp_auth_system;
grant select, insert on audit_events to openerp_auth_system;
-- INSERT privilege is checked on the selected audit partition as well as its
-- parent. Grant current children and make future monthly partitions available
-- to this non-login function owner; callers still receive EXECUTE-only access
-- to the one narrowly scoped audit function below.
do $$
declare
  audit_partition regclass;
begin
  for audit_partition in
    select inhrelid::regclass
      from pg_inherits
     where inhparent = 'audit_events'::regclass
  loop
    execute format('grant select, insert on table %s to openerp_auth_system', audit_partition);
  end loop;
end$$;
alter default privileges in schema public
  grant select, insert on tables to openerp_auth_system;

create or replace function auth_email_verification_count_recent(
  p_email text,
  p_since timestamptz
) returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)
    from auth_email_verifications
   where organization_id is null
     and email = p_email
     and created_at >= p_since
$$;

create or replace function auth_email_verification_create(
  p_email text,
  p_code_hash text,
  p_expires_at timestamptz,
  p_created_at timestamptz
) returns table (
  id uuid,
  email text,
  code_hash text,
  verification_token text,
  expires_at timestamptz,
  used boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  insert into auth_email_verifications (
    organization_id, email, code_hash, expires_at, created_at
  ) values (null, p_email, p_code_hash, p_expires_at, p_created_at)
  returning id, email, code_hash, verification_token, expires_at, used, created_at
$$;

create or replace function auth_email_verification_find_latest_valid(
  p_email text,
  p_code_hash text,
  p_now timestamptz
) returns table (
  id uuid,
  email text,
  code_hash text,
  verification_token text,
  expires_at timestamptz,
  used boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, email, code_hash, verification_token, expires_at, used, created_at
    from auth_email_verifications
   where organization_id is null
     and email = p_email
     and code_hash = p_code_hash
     and used = false
     and expires_at > p_now
   order by created_at desc
   limit 1
$$;

create or replace function auth_email_verification_consume(
  p_id uuid,
  p_verification_token text
) returns boolean
language sql
security definer
set search_path = public
as $$
  with consumed as (
    update auth_email_verifications
       set used = true,
           used_at = now(),
           verification_token = p_verification_token
     where id = p_id
       and organization_id is null
       and used = false
       and expires_at > now()
     returning id
  )
  select exists(select 1 from consumed)
$$;

create or replace function auth_email_verification_verify_token(
  p_email text,
  p_verification_token text,
  p_now timestamptz
) returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
      from auth_email_verifications
     where organization_id is null
       and email = p_email
       and verification_token = p_verification_token
       and used = true
       and expires_at > p_now
  )
$$;

-- System mail-journal functions deliberately operate only on NULL-org rows.
-- The partial unique index makes their idempotency key stable across retries.
create or replace function auth_system_email_find(p_idempotency_key text)
returns table (
  id uuid,
  organization_id uuid,
  to_address text,
  subject text,
  kind text,
  resource_type text,
  resource_id uuid,
  status text,
  provider text,
  idempotency_key text,
  error text,
  sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, organization_id, to_address, subject, kind, resource_type,
         resource_id, status, provider, idempotency_key, error, sent_at,
         created_at, updated_at
    from email_sends
   where organization_id is null
     and idempotency_key = p_idempotency_key
$$;

create or replace function auth_system_email_enqueue(
  p_to_address text,
  p_subject text,
  p_kind text,
  p_resource_type text,
  p_resource_id uuid,
  p_provider text,
  p_idempotency_key text
) returns table (
  id uuid,
  organization_id uuid,
  to_address text,
  subject text,
  kind text,
  resource_type text,
  resource_id uuid,
  status text,
  provider text,
  idempotency_key text,
  error text,
  sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  insert into email_sends (
    organization_id, to_address, subject, kind, resource_type, resource_id,
    status, provider, idempotency_key
  ) values (
    null, p_to_address, p_subject, p_kind, p_resource_type, p_resource_id,
    'queued', p_provider, p_idempotency_key
  )
  on conflict (idempotency_key) where organization_id is null
  do update set idempotency_key = excluded.idempotency_key
  returning id, organization_id, to_address, subject, kind, resource_type,
            resource_id, status, provider, idempotency_key, error, sent_at,
            created_at, updated_at
$$;

create or replace function auth_system_email_mark_sent(
  p_id uuid,
  p_provider text
) returns table (
  id uuid,
  organization_id uuid,
  to_address text,
  subject text,
  kind text,
  resource_type text,
  resource_id uuid,
  status text,
  provider text,
  idempotency_key text,
  error text,
  sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  update email_sends
     set status = 'sent', sent_at = now(), provider = p_provider, updated_at = now()
   where id = p_id and organization_id is null
  returning id, organization_id, to_address, subject, kind, resource_type,
            resource_id, status, provider, idempotency_key, error, sent_at,
            created_at, updated_at
$$;

create or replace function auth_system_email_mark_failed(
  p_id uuid,
  p_error text
) returns table (
  id uuid,
  organization_id uuid,
  to_address text,
  subject text,
  kind text,
  resource_type text,
  resource_id uuid,
  status text,
  provider text,
  idempotency_key text,
  error text,
  sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  update email_sends
     set status = 'failed', error = p_error, updated_at = now()
   where id = p_id and organization_id is null
  returning id, organization_id, to_address, subject, kind, resource_type,
            resource_id, status, provider, idempotency_key, error, sent_at,
            created_at, updated_at
$$;

create or replace function auth_system_audit_record(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_after_summary jsonb
) returns uuid
language sql
security definer
set search_path = public
as $$
  insert into audit_events (
    organization_id, actor_user_id, actor_type, action, resource_type,
    resource_id, after_summary, source
  ) values (
    null, null, 'system', p_action, p_resource_type,
    p_resource_id, p_after_summary, 'system'
  )
  returning id
$$;

alter function auth_email_verification_count_recent(text, timestamptz) owner to openerp_auth_system;
alter function auth_email_verification_create(text, text, timestamptz, timestamptz) owner to openerp_auth_system;
alter function auth_email_verification_find_latest_valid(text, text, timestamptz) owner to openerp_auth_system;
alter function auth_email_verification_consume(uuid, text) owner to openerp_auth_system;
alter function auth_email_verification_verify_token(text, text, timestamptz) owner to openerp_auth_system;
alter function auth_system_email_find(text) owner to openerp_auth_system;
alter function auth_system_email_enqueue(text, text, text, text, uuid, text, text) owner to openerp_auth_system;
alter function auth_system_email_mark_sent(uuid, text) owner to openerp_auth_system;
alter function auth_system_email_mark_failed(uuid, text) owner to openerp_auth_system;
alter function auth_system_audit_record(text, text, text, jsonb) owner to openerp_auth_system;

revoke all on function auth_email_verification_count_recent(text, timestamptz) from public;
revoke all on function auth_email_verification_create(text, text, timestamptz, timestamptz) from public;
revoke all on function auth_email_verification_find_latest_valid(text, text, timestamptz) from public;
revoke all on function auth_email_verification_consume(uuid, text) from public;
revoke all on function auth_email_verification_verify_token(text, text, timestamptz) from public;
revoke all on function auth_system_email_find(text) from public;
revoke all on function auth_system_email_enqueue(text, text, text, text, uuid, text, text) from public;
revoke all on function auth_system_email_mark_sent(uuid, text) from public;
revoke all on function auth_system_email_mark_failed(uuid, text) from public;
revoke all on function auth_system_audit_record(text, text, text, jsonb) from public;

grant execute on function auth_email_verification_count_recent(text, timestamptz) to openerp_app;
grant execute on function auth_email_verification_create(text, text, timestamptz, timestamptz) to openerp_app;
grant execute on function auth_email_verification_find_latest_valid(text, text, timestamptz) to openerp_app;
grant execute on function auth_email_verification_consume(uuid, text) to openerp_app;
grant execute on function auth_email_verification_verify_token(text, text, timestamptz) to openerp_app;
grant execute on function auth_system_email_find(text) to openerp_app;
grant execute on function auth_system_email_enqueue(text, text, text, text, uuid, text, text) to openerp_app;
grant execute on function auth_system_email_mark_sent(uuid, text) to openerp_app;
grant execute on function auth_system_email_mark_failed(uuid, text) to openerp_app;
grant execute on function auth_system_audit_record(text, text, text, jsonb) to openerp_app;
