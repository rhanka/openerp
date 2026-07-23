import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0041_banking_reconciliation.sql", "utf8");

describe("D9 banking reconciliation migration", () => {
  it("uses tenant-safe composite foreign keys and provider/account agreement", () => {
    expect(migration).toContain("provider text not null check (provider in ('ofx', 'plaid_sandbox'))");
    expect(migration).toContain("unique (organization_id, id, provider)");
    expect(migration).toContain("foreign key (organization_id, bank_account_id, provider)");
    expect(migration).toContain("references bank_accounts (organization_id, id, provider)");
    expect(migration).toContain("unique (organization_id, id)");
    expect(migration).toContain("foreign key (organization_id, bank_transaction_id)");
    expect(migration).toContain("references bank_transactions (organization_id, id)");
    expect(migration).toContain("foreign key (organization_id, candidate_id)");
    expect(migration).toContain("references payments (organization_id, id)");
  });

  it("keeps imported evidence immutable, payment-only, and enforces the two confirmed uniqueness rules", () => {
    const transactionBlock = migration.slice(migration.indexOf("create table bank_transactions"), migration.indexOf("create table reconciliation_links"));
    expect(transactionBlock).not.toContain("deleted_at");
    expect(transactionBlock).toContain("bank_transactions_amount_shape_check");
    expect(transactionBlock).toContain("bank_transactions_snapshot_shape_check");
    expect(transactionBlock).toContain("octet_length(normalized_snapshot::text) <= 16384");
    expect(migration).toContain("candidate_kind text not null check (candidate_kind = 'payment')");
    expect(migration).toContain("create trigger bank_transactions_immutable_evidence");
    expect(migration).toContain("before update or delete on bank_transactions");
    expect(migration).toContain("reconciliation_links_one_confirmed_transaction_idx");
    expect(migration).toContain("reconciliation_links_one_confirmed_candidate_idx");
    expect(migration).toContain("where status = 'confirmed'");
  });

  it("uses JSONB money/snapshot, RLS enable+force, and no accounting mutation", () => {
    expect(migration).toContain("amount jsonb not null");
    expect(migration).toContain("normalized_snapshot jsonb not null");
    expect(migration).not.toContain("allocated_amount_minor");
    for (const table of ["bank_accounts", "bank_transactions", "reconciliation_links"]) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toMatch(/alter table %I enable row level security/i);
    expect(migration).toMatch(/alter table %I force row level security/i);
    expect(migration).not.toMatch(/alter\s+table\s+journal_entries/i);
  });
});
