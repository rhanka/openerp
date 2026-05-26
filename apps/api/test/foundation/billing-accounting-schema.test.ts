import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0024 (Accounts + JournalEntries + JournalEntryLines — Demo Slice 4.3).
const migration = readFileSync("src/db/migrations/0024_billing_accounting.sql", "utf8");

describe("billing accounting migration (DS 4.3)", () => {
  it("creates the accounts table tenant-scoped", () => {
    expect(migration).toContain("create table accounts");
    const start = migration.indexOf("create table accounts");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Account columns", () => {
    const start = migration.indexOf("create table accounts");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "code text not null",
      "name text not null",
      "type text not null",
      "active boolean not null default true",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains account type to the allowed values", () => {
    expect(migration).toMatch(
      /check\s*\(\s*type\s+in\s*\(\s*'asset'\s*,\s*'liability'\s*,\s*'equity'\s*,\s*'revenue'\s*,\s*'expense'\s*\)\s*\)/i
    );
  });

  it("enforces unique (organization_id, code) on accounts", () => {
    expect(migration).toContain("unique (organization_id, code)");
  });

  it("creates the journal_entries table tenant-scoped", () => {
    expect(migration).toContain("create table journal_entries");
    const start = migration.indexOf("create table journal_entries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical JournalEntry columns", () => {
    const start = migration.indexOf("create table journal_entries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "entry_date date not null",
      "reference text",
      "description text",
      "source_type text not null",
      "source_id uuid",
      "status text not null default 'draft'",
      "posted_at timestamptz",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains journal_entry status to the allowed values", () => {
    expect(migration).toMatch(
      /check\s*\(\s*status\s+in\s*\(\s*'draft'\s*,\s*'posted'\s*,\s*'void'\s*\)\s*\)/i
    );
  });

  it("constrains source_type to the allowed values", () => {
    expect(migration).toMatch(
      /check\s*\(\s*source_type\s+in\s*\(\s*'invoice'\s*,\s*'payment'\s*,\s*'manual'\s*\)\s*\)/i
    );
  });

  it("creates the journal_entry_lines table tenant-scoped", () => {
    expect(migration).toContain("create table journal_entry_lines");
    const start = migration.indexOf("create table journal_entry_lines");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical JournalEntryLine columns", () => {
    const start = migration.indexOf("create table journal_entry_lines");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "journal_entry_id uuid not null references journal_entries(id)",
      "account_id uuid not null references accounts(id)",
      "debit jsonb not null",
      "credit jsonb not null",
      "description text",
      "created_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enables and forces RLS for all three tables", () => {
    expect(migration).toContain("'accounts'");
    expect(migration).toContain("'journal_entries'");
    expect(migration).toContain("'journal_entry_lines'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
  });

  it("indexes journal_entries by (organization_id, status) and (organization_id, source_type, source_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+journal_entries_org_status_idx\s+on\s+journal_entries\s*\(\s*organization_id\s*,\s*status\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+journal_entries_org_source_idx\s+on\s+journal_entries\s*\(\s*organization_id\s*,\s*source_type\s*,\s*source_id\s*\)/i
    );
  });

  it("indexes journal_entry_lines by (organization_id, journal_entry_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+journal_entry_lines_org_entry_idx\s+on\s+journal_entry_lines\s*\(\s*organization_id\s*,\s*journal_entry_id\s*\)/i
    );
  });
});
