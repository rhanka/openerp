-- AUTH-39-A sub-slice A0-migrations
-- One-shot state store for in-flight OIDC authorization-code + PKCE flows.
-- Each row is consumed (deleted) on callback. No tenant scope: pre-auth.

create table oidc_state (
  state            text primary key,
  nonce            text not null,
  code_verifier    text not null,
  redirect_after   text,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null
);

create index oidc_state_expires_at_idx on oidc_state(expires_at);
