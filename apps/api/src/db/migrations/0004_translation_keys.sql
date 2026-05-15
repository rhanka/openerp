-- TranslationKey table — PG-05 (i18n catalog ICU JSON, foundation table).
-- Holds dynamic translations for tenant-owned data labels (pipeline stages,
-- service activity catalogue, etc.). Static UI strings stay in the workspace
-- catalogs under packages/i18n. This table is tenant-scoped.

create table translation_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  namespace text not null,
  key text not null,
  locale text not null check (locale in ('en', 'fr')),
  label text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  updated_at timestamptz not null default now(),
  unique (organization_id, namespace, key, locale)
);

create index translation_keys_org_namespace_idx
  on translation_keys (organization_id, namespace);

-- RLS scope (PG-03).
alter table translation_keys enable row level security;
drop policy if exists translation_keys_tenant_select on translation_keys;
drop policy if exists translation_keys_tenant_modify on translation_keys;
create policy translation_keys_tenant_select on translation_keys for select
  using (organization_id = app_current_organization_id());
create policy translation_keys_tenant_modify on translation_keys for all
  using (organization_id = app_current_organization_id())
  with check (organization_id = app_current_organization_id());
