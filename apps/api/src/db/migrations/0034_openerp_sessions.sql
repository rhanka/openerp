-- AUTH-39-A sub-slice A0-migrations
-- DB-backed sessions for the new OIDC RP auth path (auth-hono AuthHonoSessionPort).
-- Carries organization_id as an OpenERP-specific extension (auth-hono's session
-- record does not have it; OpenERP is multi-tenant at its own level).

create table openerp_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_identity_id    uuid not null references user_identities(id) on delete cascade,
  organization_id     uuid not null references organizations(id) on delete cascade,
  session_token_hash  text not null unique,
  refresh_token_hash  text unique,
  device_name         text,
  ip_address          text,
  user_agent          text,
  mfa_verified        boolean not null default false,
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now(),
  last_activity_at    timestamptz not null default now(),
  revoked_at          timestamptz
);

create index openerp_sessions_user_idx        on openerp_sessions(user_identity_id);
create index openerp_sessions_org_idx         on openerp_sessions(organization_id);
create index openerp_sessions_expires_at_idx  on openerp_sessions(expires_at);
