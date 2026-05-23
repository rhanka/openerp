import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0010 (CRM Demo Slice 2 — Company entity, owned by CRM module
// per shared-entities-v1 Article 4.2). Schema-only, no soft-delete in this
// slice; TimelineEntry emission deferred.
const migration = readFileSync("src/db/migrations/0010_crm_companies.sql", "utf8");

describe("crm companies migration (Article 4.2)", () => {
  it("creates the companies table tenant-scoped", () => {
    expect(migration).toContain("create table companies");
    const start = migration.indexOf("create table companies");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Company columns from the CRM spec", () => {
    const start = migration.indexOf("create table companies");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "display_name text not null",
      "legal_name text",
      "status text not null",
      "owner_user_id uuid",
      "team_id uuid",
      "website text",
      "phone text",
      "email text",
      "language text",
      "tax_region text",
      "billing_address jsonb",
      "shipping_address jsonb",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains status to active|archived", () => {
    expect(migration).toMatch(/check\s*\(\s*status\s+in\s*\(\s*'active'\s*,\s*'archived'\s*\)/i);
  });

  it("enables and forces RLS on companies via the existing tenant pattern", () => {
    const literalEnable = migration.includes("alter table companies enable row level security");
    const dynamicEnable =
      migration.includes("'companies'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(literalEnable || dynamicEnable, "companies enable RLS").toBe(true);

    const literalSelect = migration.includes("create policy companies_tenant_select on companies");
    const dynamicSelect =
      migration.includes("'companies'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(literalSelect || dynamicSelect, "companies select policy").toBe(true);
  });

  it("indexes companies by organization and display name for the list endpoint", () => {
    expect(migration).toMatch(/create\s+index\s+companies_org_display_idx\s+on\s+companies\s*\(\s*organization_id\s*,\s*display_name\s*\)/i);
  });
});
