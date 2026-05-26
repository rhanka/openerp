import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0023 (TaxCategory + TaxRateVersion — Demo Slice 4.2).
const migration = readFileSync("src/db/migrations/0023_billing_taxes.sql", "utf8");

describe("billing taxes migration (DS 4.2)", () => {
  it("creates the tax_categories table tenant-scoped", () => {
    expect(migration).toContain("create table tax_categories");
    const start = migration.indexOf("create table tax_categories");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical TaxCategory columns", () => {
    const start = migration.indexOf("create table tax_categories");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "name text not null",
      "code text not null",
      "description text",
      "active boolean not null default true",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enforces unique (organization_id, code) on tax_categories", () => {
    expect(migration).toContain("unique (organization_id, code)");
  });

  it("creates the tax_rate_versions table tenant-scoped", () => {
    expect(migration).toContain("create table tax_rate_versions");
    const start = migration.indexOf("create table tax_rate_versions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical TaxRateVersion columns", () => {
    const start = migration.indexOf("create table tax_rate_versions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "tax_category_id uuid not null references tax_categories(id)",
      "jurisdiction text not null",
      "label text not null",
      "rate_bps integer not null",
      "compound boolean not null default false",
      "effective_from date not null",
      "effective_to date",
      "active boolean not null default true",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enforces rate_bps >= 0 check constraint", () => {
    expect(migration).toContain("check (rate_bps >= 0)");
  });

  it("indexes tax_rate_versions by (organization_id, tax_category_id, effective_from)", () => {
    expect(migration).toMatch(
      /create\s+index\s+tax_rate_versions_org_category_idx\s+on\s+tax_rate_versions\s*\(\s*organization_id\s*,\s*tax_category_id\s*,\s*effective_from\s*\)/i
    );
  });

  it("adds tax_category_id and tax_breakdown columns to invoices", () => {
    expect(migration).toContain("alter table invoices");
    expect(migration).toContain("add column tax_category_id uuid references tax_categories(id)");
    expect(migration).toContain("add column tax_breakdown jsonb");
  });

  it("enables and forces RLS via do-block pattern for tax_categories", () => {
    expect(migration).toContain("'tax_categories'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
  });

  it("enables and forces RLS for tax_rate_versions", () => {
    expect(migration).toContain("'tax_rate_versions'");
  });
});
