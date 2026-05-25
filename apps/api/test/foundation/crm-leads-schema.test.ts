import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0013 (DS 2.4 — Lead entity + conversion path, Article 4.2).
const migration = readFileSync("src/db/migrations/0013_crm_leads.sql", "utf8");

describe("crm leads migration (Article 4.2)", () => {
  it("creates the leads table tenant-scoped", () => {
    expect(migration).toContain("create table leads");
    const start = migration.indexOf("create table leads");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("declares the canonical Lead columns + conversion targets", () => {
    const start = migration.indexOf("create table leads");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "display_name text not null",
      "source text",
      "company_name text",
      "contact_name text",
      "email text",
      "phone text",
      "description text",
      "status text not null",
      "owner_user_id uuid",
      "team_id uuid",
      "converted_at timestamptz",
      "converted_company_id uuid references companies(id)",
      "converted_contact_id uuid references contacts(id)",
      "converted_opportunity_id uuid references opportunities(id)",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains lead status to new|working|converted|disqualified", () => {
    expect(migration).toMatch(
      /check\s*\(\s*status\s+in\s*\(\s*'new'\s*,\s*'working'\s*,\s*'converted'\s*,\s*'disqualified'\s*\)/i
    );
  });

  it("enables and forces RLS on leads", () => {
    const literalEnable = migration.includes("alter table leads enable row level security");
    const dynamicEnable =
      migration.includes("'leads'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(literalEnable || dynamicEnable, "leads enable RLS").toBe(true);

    const literalSelect = migration.includes("create policy leads_tenant_select on leads");
    const dynamicSelect =
      migration.includes("'leads'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(literalSelect || dynamicSelect, "leads select policy").toBe(true);
  });

  it("indexes leads by organization and status for the funnel list", () => {
    expect(migration).toMatch(/create\s+index\s+leads_org_status_idx\s+on\s+leads\s*\(\s*organization_id\s*,\s*status\s*\)/i);
  });
});
