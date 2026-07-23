-- D9 v1 — reconciliation attestation ledger only. This migration deliberately
-- does not alter journal_entries.source_type and never creates accounting rows.
-- Imported bank transactions are immutable: there is no deleted_at column or
-- delete API for them. The retained snapshot is a redacted normalized shape,
-- not provider raw payload / credentials / cursors.

create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  provider text not null check (provider in ('ofx', 'plaid_sandbox')),
  provider_account_ref text not null,
  display_name text not null,
  account_type text not null check (account_type in ('checking', 'savings', 'credit', 'loan', 'investment', 'other')),
  currency text not null,
  institution text not null,
  active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_account_ref),
  unique (organization_id, id, provider)
);

create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  bank_account_id uuid not null,
  provider text not null check (provider in ('ofx', 'plaid_sandbox')),
  provider_transaction_ref text not null,
  posted_at timestamptz not null,
  amount jsonb not null,
  raw_description text not null,
  normalized_snapshot jsonb not null,
  reconciliation_status text not null default 'unmatched'
    check (reconciliation_status in ('unmatched', 'matched', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_transactions_amount_shape_check check (
    jsonb_typeof(amount) = 'object'
    and amount ?& array['amountMinor', 'currency', 'scale']
    and (amount - 'amountMinor' - 'currency' - 'scale') = '{}'::jsonb
    and jsonb_typeof(amount -> 'amountMinor') = 'number'
    and jsonb_typeof(amount -> 'currency') = 'string'
    and jsonb_typeof(amount -> 'scale') = 'number'
    and (amount ->> 'currency') ~ '^[A-Z]{3}$'
  ),
  constraint bank_transactions_snapshot_shape_check check (
    jsonb_typeof(normalized_snapshot) = 'object'
    and normalized_snapshot ?& array['sourceId', 'providerRef', 'postedAt', 'amount', 'description']
    and (normalized_snapshot - 'sourceId' - 'providerRef' - 'postedAt' - 'amount' - 'description' - 'merchant' - 'category') = '{}'::jsonb
    and jsonb_typeof(normalized_snapshot -> 'sourceId') = 'string'
    and jsonb_typeof(normalized_snapshot -> 'providerRef') = 'string'
    and jsonb_typeof(normalized_snapshot -> 'postedAt') = 'string'
    and jsonb_typeof(normalized_snapshot -> 'amount') = 'object'
    and jsonb_typeof(normalized_snapshot -> 'description') = 'string'
    and (not (normalized_snapshot ? 'merchant') or jsonb_typeof(normalized_snapshot -> 'merchant') = 'string')
    and (not (normalized_snapshot ? 'category') or jsonb_typeof(normalized_snapshot -> 'category') = 'string')
    and normalized_snapshot -> 'providerRef' = to_jsonb(provider_transaction_ref)
    and normalized_snapshot ->> 'postedAt' = to_char(posted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    and normalized_snapshot -> 'amount' = amount
    and normalized_snapshot -> 'description' = to_jsonb(raw_description)
    and octet_length(normalized_snapshot::text) <= 16384
  ),
  constraint bank_transactions_account_provider_fk
    foreign key (organization_id, bank_account_id, provider)
    references bank_accounts (organization_id, id, provider),
  unique (organization_id, bank_account_id, provider, provider_transaction_ref),
  unique (organization_id, id)
);

create index bank_transactions_org_status_idx
  on bank_transactions (organization_id, reconciliation_status);
create index bank_transactions_org_posted_idx
  on bank_transactions (organization_id, posted_at);

-- D9 is payment-only. This tenant composite key lets the attestation link
-- enforce that its payment candidate belongs to the same organization.
alter table payments
  add constraint payments_organization_id_id_key unique (organization_id, id);

create table reconciliation_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  bank_transaction_id uuid not null,
  candidate_kind text not null check (candidate_kind = 'payment'),
  candidate_id uuid not null,
  score numeric not null check (score >= 0 and score <= 1),
  reasons jsonb not null,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reconciliation_links_transaction_fk
    foreign key (organization_id, bank_transaction_id)
    references bank_transactions (organization_id, id),
  constraint reconciliation_links_payment_fk
    foreign key (organization_id, candidate_id)
    references payments (organization_id, id),
  unique (organization_id, bank_transaction_id, candidate_kind, candidate_id)
);

create unique index reconciliation_links_one_confirmed_transaction_idx
  on reconciliation_links (organization_id, bank_transaction_id)
  where status = 'confirmed';
create unique index reconciliation_links_one_confirmed_candidate_idx
  on reconciliation_links (organization_id, candidate_kind, candidate_id)
  where status = 'confirmed';
create index reconciliation_links_org_status_idx
  on reconciliation_links (organization_id, status, bank_transaction_id);

-- RLS grants the application role tenant-scoped UPDATE/DELETE. Keep imported
-- evidence immutable at the database boundary, while permitting the only D9
-- mutation: reconciliation_status (with its timestamp) inside audited service
-- transactions. The DELETE branch intentionally has no API escape hatch.
create or replace function protect_imported_bank_transaction() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'imported bank transactions cannot be deleted'
      using errcode = '23514';
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.bank_account_id is distinct from old.bank_account_id
    or new.provider is distinct from old.provider
    or new.provider_transaction_ref is distinct from old.provider_transaction_ref
    or new.posted_at is distinct from old.posted_at
    or new.amount is distinct from old.amount
    or new.raw_description is distinct from old.raw_description
    or new.normalized_snapshot is distinct from old.normalized_snapshot
    or new.created_at is distinct from old.created_at then
    raise exception 'imported bank transaction evidence is immutable'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger bank_transactions_immutable_evidence
before update or delete on bank_transactions
for each row execute function protect_imported_bank_transaction();

do $$
declare
  protected_table text;
begin
  foreach protected_table in array array['bank_accounts', 'bank_transactions', 'reconciliation_links']
  loop
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
  end loop;
end$$;
