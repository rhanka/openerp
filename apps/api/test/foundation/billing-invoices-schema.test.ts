import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0021 (Invoice + InvoiceLine — Demo Slice 4.0).
const migration = readFileSync("src/db/migrations/0021_billing_invoices.sql", "utf8");

describe("invoices migration (DS 4.0)", () => {
  it("creates the invoices table tenant-scoped", () => {
    expect(migration).toContain("create table invoices");
    const start = migration.indexOf("create table invoices");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Invoice columns from the spec", () => {
    const start = migration.indexOf("create table invoices");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "company_id uuid not null references companies(id)",
      "project_id uuid references projects(id)",
      "invoice_proposal_id uuid references invoice_proposals(id)",
      "invoice_number text not null",
      "status text not null default 'draft'",
      "currency text not null",
      "subtotal jsonb not null",
      "tax_total jsonb not null",
      "total jsonb not null",
      "issue_date date",
      "due_date date",
      "issued_at timestamptz",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains status to the allowed values", () => {
    expect(migration).toMatch(/check\s*\(\s*status\s+in\s*\('draft'\s*,\s*'issued'\s*,\s*'paid'\s*,\s*'partially_paid'\s*,\s*'void'\s*,\s*'written_off'\s*\)\s*\)/i);
  });

  it("enforces unique invoice_number per organization", () => {
    expect(migration).toContain("unique (organization_id, invoice_number)");
  });

  it("creates the invoice_lines table tenant-scoped", () => {
    expect(migration).toContain("create table invoice_lines");
    const start = migration.indexOf("create table invoice_lines");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical InvoiceLine columns from the spec", () => {
    const start = migration.indexOf("create table invoice_lines");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "invoice_id uuid not null references invoices(id)",
      "source_type text not null",
      "source_id uuid",
      "description text",
      "quantity integer not null",
      "unit_price jsonb not null",
      "amount jsonb not null",
      "created_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enables and forces RLS via the do-block pattern for invoices", () => {
    expect(migration).toContain("'invoices'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
  });

  it("enables RLS for invoice_lines", () => {
    expect(migration).toContain("'invoice_lines'");
  });

  it("indexes invoices by (organization_id, status) and (organization_id, company_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+invoices_org_status_idx\s+on\s+invoices\s*\(\s*organization_id\s*,\s*status\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+invoices_org_company_idx\s+on\s+invoices\s*\(\s*organization_id\s*,\s*company_id\s*\)/i
    );
  });

  it("indexes invoice_lines by (organization_id, invoice_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+invoice_lines_org_invoice_idx\s+on\s+invoice_lines\s*\(\s*organization_id\s*,\s*invoice_id\s*\)/i
    );
  });
});
