import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0011 (CRM Demo Slice 2.1 — Contact entity, Article 4.2).
// 1:N relationship with companies; company_id is nullable to allow lead-side
// orphan contacts before the company is materialized.
const migration = readFileSync("src/db/migrations/0011_crm_contacts.sql", "utf8");

describe("crm contacts migration (Article 4.2)", () => {
  it("creates the contacts table tenant-scoped with optional company FK", () => {
    expect(migration).toContain("create table contacts");
    const start = migration.indexOf("create table contacts");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
    expect(block).toMatch(/company_id\s+uuid\s+references\s+companies\(id\)/i);
  });

  it("declares the canonical Contact columns", () => {
    const start = migration.indexOf("create table contacts");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "display_name text not null",
      "first_name text",
      "last_name text",
      "title text",
      "email text",
      "phone text",
      "language text",
      "status text not null",
      "owner_user_id uuid",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains contact status to active|inactive", () => {
    expect(migration).toMatch(/check\s*\(\s*status\s+in\s*\(\s*'active'\s*,\s*'inactive'\s*\)/i);
  });

  it("enables and forces RLS on contacts via the existing tenant pattern", () => {
    const literalEnable = migration.includes("alter table contacts enable row level security");
    const dynamicEnable =
      migration.includes("'contacts'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(literalEnable || dynamicEnable, "contacts enable RLS").toBe(true);

    const literalSelect = migration.includes("create policy contacts_tenant_select on contacts");
    const dynamicSelect =
      migration.includes("'contacts'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(literalSelect || dynamicSelect, "contacts select policy").toBe(true);
  });

  it("indexes contacts by company for the company-scoped list endpoint", () => {
    expect(migration).toMatch(/create\s+index\s+contacts_org_company_idx\s+on\s+contacts\s*\(\s*organization_id\s*,\s*company_id\s*\)/i);
  });
});
