-- Canon entities migration — arbitrage 2026-05-14 (shared-entities-v1.md)
-- PG-02 (identity), PG-06 (canon), PG-07 (ApprovalRequest), PG-08 (Idempotency), PG-09 (agentic audit)
-- Additive: does not modify existing tables except audit_events (optional new columns).

create table user_identities (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  preferred_locale text not null check (preferred_locale in ('en', 'fr')),
  mfa_state text not null check (mfa_state in ('not_configured', 'passkey', 'totp')),
  status text not null check (status in ('invited', 'active', 'deactivated')),
  actor_type text not null check (actor_type in ('human', 'agent', 'system')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  user_identity_id uuid not null references user_identities(id),
  organization_id uuid not null references organizations(id),
  status text not null check (status in ('invited', 'active', 'deactivated')),
  preferred_locale text check (preferred_locale in ('en', 'fr')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_identity_id, organization_id)
);

create index organization_members_org_idx on organization_members (organization_id);
create index organization_members_identity_idx on organization_members (user_identity_id);

create table fx_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  source_currency char(3) not null,
  target_currency char(3) not null,
  rate numeric(20, 10) not null check (rate > 0),
  effective_at timestamptz not null,
  source text not null,
  created_at timestamptz not null default now()
);

create index fx_rate_snapshots_org_pair_idx
  on fx_rate_snapshots (organization_id, source_currency, target_currency, effective_at desc);

create table timeline_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  resource_type text not null,
  resource_id text not null,
  actor_user_identity_id uuid references user_identities(id),
  entry_type text not null,
  payload_summary jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index timeline_entries_org_resource_idx
  on timeline_entries (organization_id, resource_type, resource_id, occurred_at desc);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  requester_user_identity_id uuid not null references user_identities(id),
  approver_user_identity_id uuid references user_identities(id),
  approver_role_id uuid references roles(id),
  subject_type text not null,
  subject_id text not null,
  reason text not null,
  urgency text not null check (urgency in ('low', 'normal', 'high')),
  status text not null check (status in ('pending', 'approved', 'rejected', 'escalated', 'expired')),
  decision_reason text,
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (approver_user_identity_id is not null or approver_role_id is not null)
);

create index approval_requests_org_status_idx
  on approval_requests (organization_id, status, created_at desc);

create index approval_requests_approver_idx
  on approval_requests (approver_user_identity_id, status);

create table idempotency_records (
  organization_id uuid not null references organizations(id),
  key text not null,
  request_hash text not null,
  response_body_hash text not null,
  status_code integer not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (organization_id, key)
);

create index idempotency_records_expiry_idx on idempotency_records (expires_at);

-- AuditEvent agentic extension (PG-09 / AGT-D-08). Optional columns for backward compat.
alter table audit_events add column source text check (source in ('human', 'agent', 'system'));
alter table audit_events add column agent_id text;
alter table audit_events add column tool_call_id text;
alter table audit_events add column policy_decision_id text;
alter table audit_events add column delegation_id text;
alter table audit_events add column approval_request_id uuid references approval_requests(id);
