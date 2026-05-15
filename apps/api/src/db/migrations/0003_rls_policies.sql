-- Row Level Security policies — PG-03 arbitrage 2026-05-14, Lot 1 foundation.
-- Adopts strict row-level isolation via Postgres RLS, scoped by a session-local
-- setting `app.current_organization_id` applied by RowLevelRlsStrategy.applyScope().
--
-- The setting is a TEXT/UUID accessor via current_setting('app.current_organization_id', true).
-- The `true` second argument returns NULL when missing rather than raising, so a
-- query without scope simply returns no rows for protected tables (safe default).
--
-- Tables without organization_id (user_identities is global) are intentionally
-- excluded from RLS.

-- Application role — used by the runtime API for tenant-scoped queries. It has
-- standard CRUD privileges but lacks BYPASSRLS and superuser flags so that
-- forced row level security policies actually apply. The bootstrap connection
-- (which may be superuser) keeps the right to perform schema migrations and
-- seed data without scope.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'openerp_app') then
    create role openerp_app nologin nobypassrls;
  end if;
end$$;

grant usage on schema public to openerp_app;
grant select, insert, update, delete on all tables in schema public to openerp_app;
grant usage, select on all sequences in schema public to openerp_app;
alter default privileges in schema public
  grant select, insert, update, delete on tables to openerp_app;
alter default privileges in schema public
  grant usage, select on sequences to openerp_app;

-- Helper: returns the current scope as UUID or NULL.
create or replace function app_current_organization_id() returns uuid
language sql stable
as $$
  select nullif(current_setting('app.current_organization_id', true), '')::uuid
$$;

-- Tenant-owned tables to protect. user_identities is GLOBAL (no organization_id).
do $$
declare
  protected_table text;
  tables text[] := array[
    'organizations',
    'tenant_settings',
    'users',
    'teams',
    'roles',
    'permission_grants',
    'audit_events',
    'file_objects',
    'comments',
    'notifications',
    'domain_events',
    'organization_members',
    'fx_rate_snapshots',
    'timeline_entries',
    'approval_requests',
    'idempotency_records'
  ];
  scope_column text;
begin
  foreach protected_table in array tables loop
    -- organizations uses its own id column; others use organization_id.
    if protected_table = 'organizations' then
      scope_column := 'id';
    else
      scope_column := 'organization_id';
    end if;

    execute format('alter table %I enable row level security', protected_table);
    -- force row level security so table owners (and other BYPASSRLS roles) are
    -- still subject to policies. Without this the connection user that owns the
    -- table would bypass scoping entirely.
    execute format('alter table %I force row level security', protected_table);
    execute format('drop policy if exists %I_tenant_select on %I', protected_table, protected_table);
    execute format('drop policy if exists %I_tenant_modify on %I', protected_table, protected_table);
    execute format(
      'create policy %I_tenant_select on %I for select using (%I = app_current_organization_id())',
      protected_table, protected_table, scope_column
    );
    execute format(
      'create policy %I_tenant_modify on %I for all using (%I = app_current_organization_id()) with check (%I = app_current_organization_id())',
      protected_table, protected_table, scope_column, scope_column
    );
  end loop;
end$$;
