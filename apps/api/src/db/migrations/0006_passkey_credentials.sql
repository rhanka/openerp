-- Passkey / WebAuthn credentials (PG-02, Lot 2). Credentials are owned by a
-- UserIdentity, which is itself global (not tenant-scoped). The same passkey
-- can therefore authenticate the same human across all organizations they are
-- a member of. Tenant binding happens at session issuance via
-- OrganizationMember, not here.

create table passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_identity_id uuid not null references user_identities(id) on delete cascade,
  -- The WebAuthn credentialId is binary; we store its base64url form.
  credential_id text not null unique,
  -- COSE-encoded public key, base64url.
  public_key_cose text not null,
  -- Signature counter from the authenticator (used to detect cloned authenticators).
  sign_count bigint not null default 0,
  transports text[] not null default '{}',
  aaguid uuid,
  label text not null,
  -- Optional credential metadata coming from registration response.
  backed_up boolean not null default false,
  device_type text not null default 'singleDevice' check (device_type in ('singleDevice', 'multiDevice')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index passkey_credentials_user_idx on passkey_credentials(user_identity_id);

-- Challenge cache for in-flight registration / authentication ceremonies. The
-- WebAuthn server library issues a random challenge in /begin and we must
-- verify it again in /finish. Using a DB row instead of in-memory means the
-- finish call survives a pod restart and works across replicas.
create table passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  user_identity_id uuid references user_identities(id) on delete cascade,
  challenge text not null,
  purpose text not null check (purpose in ('registration', 'authentication')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index passkey_challenges_expires_at_idx on passkey_challenges(expires_at);
create index passkey_challenges_challenge_idx on passkey_challenges(challenge);

-- Cross-tenant lookup needed by pre-auth passkey login: the API role does not
-- have a tenant scope yet, so RLS would hide all organization_members rows.
-- This SECURITY DEFINER function returns the minimal info the login endpoint
-- needs to mint a session JWT (organization + role), restricted to a single
-- user_identity. Authorization remains tight because the function takes a
-- specific user_identity_id chosen by the verified passkey ceremony.
create or replace function list_active_memberships_for_user(p_user_identity_id uuid)
returns table (
  id uuid,
  organization_id uuid,
  user_identity_id uuid,
  status text,
  preferred_locale text,
  joined_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, organization_id, user_identity_id, status, preferred_locale, joined_at, updated_at
    from organization_members
   where user_identity_id = p_user_identity_id
     and status = 'active'
   order by joined_at desc
$$;

grant execute on function list_active_memberships_for_user(uuid) to openerp_app;
