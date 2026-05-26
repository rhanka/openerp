import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0022 (Payment — Demo Slice 4.1).
const migration = readFileSync("src/db/migrations/0022_billing_payments.sql", "utf8");

describe("payments migration (DS 4.1)", () => {
  it("creates the payments table tenant-scoped", () => {
    expect(migration).toContain("create table payments");
    const start = migration.indexOf("create table payments");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Payment columns from the spec", () => {
    const start = migration.indexOf("create table payments");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "invoice_id uuid not null references invoices(id)",
      "company_id uuid references companies(id)",
      "amount jsonb not null",
      "payment_date date not null",
      "method text not null",
      "reference text",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains method to the allowed payment method values", () => {
    expect(migration).toMatch(
      /check\s*\(\s*method\s+in\s*\('bank_transfer'\s*,\s*'card'\s*,\s*'cheque'\s*,\s*'cash'\s*,\s*'other'\s*\)\s*\)/i
    );
  });

  it("creates indexes for (organization_id, invoice_id) and (organization_id, payment_date)", () => {
    expect(migration).toMatch(
      /create\s+index\s+payments_org_invoice_idx\s+on\s+payments\s*\(\s*organization_id\s*,\s*invoice_id\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+payments_org_date_idx\s+on\s+payments\s*\(\s*organization_id\s*,\s*payment_date\s*\)/i
    );
  });

  it("enables and forces RLS via the do-block pattern", () => {
    expect(migration).toContain("'payments'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
    expect(migration).toMatch(/'alter table %I force row level security'/i);
  });
});
