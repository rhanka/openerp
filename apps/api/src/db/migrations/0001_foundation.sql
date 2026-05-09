create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  slug text not null unique,
  status text not null check (status in ('active', 'suspended')),
  default_locale text not null check (default_locale in ('en', 'fr')),
  default_currency text not null,
  default_timezone text not null,
  country text not null,
  province_state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tenant_settings (
  organization_id uuid primary key references organizations(id),
  supported_locales text[] not null,
  primary_locale text not null check (primary_locale in ('en', 'fr')),
  tax_region text not null,
  fiscal_year_start text not null,
  document_numbering_policy jsonb not null,
  retention_policy jsonb not null,
  self_hosted_update_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  email text not null,
  display_name text not null,
  preferred_locale text not null check (preferred_locale in ('en', 'fr')),
  status text not null check (status in ('invited', 'active', 'deactivated')),
  password_hash text,
  mfa_state text not null default 'not_configured',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  parent_team_id uuid references teams(id),
  manager_user_id uuid references users(id),
  status text not null default 'active'
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  description text not null,
  system_role boolean not null,
  status text not null default 'active',
  unique (organization_id, name)
);

create table permission_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  role_id uuid references roles(id),
  user_id uuid references users(id),
  resource text not null,
  action text not null,
  scope text not null,
  conditions jsonb not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  check (role_id is not null or user_id is not null)
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_user_id uuid references users(id),
  actor_type text not null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  before_summary jsonb,
  after_summary jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table file_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  storage_key text not null,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text not null,
  visibility_scope text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  resource_type text not null,
  resource_id text not null,
  body text not null,
  visibility text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  recipient_user_id uuid not null references users(id),
  channel text not null,
  subject_key text not null,
  body_key text not null,
  payload jsonb not null default '{}',
  status text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table domain_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  event_type text not null,
  resource_type text not null,
  resource_id text not null,
  payload_summary jsonb not null default '{}',
  emitted_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index audit_events_org_created_idx on audit_events (organization_id, created_at desc);
create index domain_events_org_type_idx on domain_events (organization_id, event_type, emitted_at desc);
