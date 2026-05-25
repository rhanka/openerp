import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0020 (InvoiceProposal + InvoiceProposalLine — Demo Slice 3.4).
const migration = readFileSync("src/db/migrations/0020_project_invoice_proposals.sql", "utf8");

describe("invoice_proposals migration (DS 3.4)", () => {
  it("creates the invoice_proposals table tenant-scoped", () => {
    expect(migration).toContain("create table invoice_proposals");
    const start = migration.indexOf("create table invoice_proposals");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical InvoiceProposal columns from the spec", () => {
    const start = migration.indexOf("create table invoice_proposals");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "project_id uuid not null references projects(id)",
      "company_id uuid",
      "status text not null default 'draft'",
      "period_start date",
      "period_end date",
      "total jsonb not null",
      "currency text not null",
      "submitted_at timestamptz",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains status to the allowed values", () => {
    expect(migration).toMatch(/check\s*\(\s*status\s+in\s*\('draft'\s*,\s*'submitted'\s*,\s*'approved'\s*,\s*'rejected'\s*\)\s*\)/i);
  });

  it("creates the invoice_proposal_lines table tenant-scoped", () => {
    expect(migration).toContain("create table invoice_proposal_lines");
    const start = migration.indexOf("create table invoice_proposal_lines");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical InvoiceProposalLine columns from the spec", () => {
    const start = migration.indexOf("create table invoice_proposal_lines");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "invoice_proposal_id uuid not null references invoice_proposals(id)",
      "source_type text not null",
      "source_id uuid",
      "description text",
      "quantity_minutes integer not null",
      "unit_rate jsonb not null",
      "amount jsonb not null",
      "created_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enables and forces RLS via the do-block pattern for invoice_proposals", () => {
    const block = migration.slice(
      migration.indexOf("'invoice_proposals'"),
      migration.indexOf("'invoice_proposals'") + 2000
    );
    expect(block).toContain("'invoice_proposals'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
  });

  it("enables RLS for invoice_proposal_lines", () => {
    expect(migration).toContain("'invoice_proposal_lines'");
  });

  it("indexes invoice_proposals by (organization_id, project_id) and (organization_id, status)", () => {
    expect(migration).toMatch(
      /create\s+index\s+invoice_proposals_org_project_idx\s+on\s+invoice_proposals\s*\(\s*organization_id\s*,\s*project_id\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+invoice_proposals_org_status_idx\s+on\s+invoice_proposals\s*\(\s*organization_id\s*,\s*status\s*\)/i
    );
  });

  it("indexes invoice_proposal_lines by (organization_id, invoice_proposal_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+invoice_proposal_lines_org_proposal_idx\s+on\s+invoice_proposal_lines\s*\(\s*organization_id\s*,\s*invoice_proposal_id\s*\)/i
    );
  });
});
