import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0012 (Demo Slice 2.5 — PipelineStage + Opportunity per Article 4.2).
const migration = readFileSync("src/db/migrations/0012_crm_pipeline.sql", "utf8");

describe("crm pipeline migration (Article 4.2)", () => {
  it("creates pipeline_stages and opportunities, tenant-scoped", () => {
    for (const table of ["pipeline_stages", "opportunities"]) {
      expect(migration).toContain(`create table ${table}`);
      const start = migration.indexOf(`create table ${table}`);
      const end = migration.indexOf(");", start);
      const block = migration.slice(start, end);
      expect(block, `${table} tenant-scoped`).toContain(
        "organization_id uuid not null references organizations(id)"
      );
    }
  });

  it("declares canonical PipelineStage columns + ordering", () => {
    const start = migration.indexOf("create table pipeline_stages");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "name text not null",
      "order_index integer not null",
      "is_initial boolean not null",
      "is_won boolean not null",
      "is_lost boolean not null",
      "active boolean not null",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
    expect(migration).toMatch(/unique\s*\(\s*organization_id\s*,\s*name\s*\)/i);
    expect(migration).toMatch(/unique\s*\(\s*organization_id\s*,\s*order_index\s*\)/i);
  });

  it("declares canonical Opportunity columns with FK to companies / pipeline_stages / contacts", () => {
    const start = migration.indexOf("create table opportunities");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("company_id uuid not null references companies(id)");
    expect(block).toContain("stage_id uuid not null references pipeline_stages(id)");
    expect(block).toContain("primary_contact_id uuid references contacts(id)");
    expect(block).toContain("name text not null");
    expect(block).toContain("status text not null");
    expect(block).toContain("expected_value jsonb");
    expect(block).toContain("expected_close_date date");
    expect(block).toContain("loss_reason text");
  });

  it("constrains opportunity status whitelist", () => {
    expect(migration).toMatch(
      /check\s*\(\s*status\s+in\s*\(\s*'open'\s*,\s*'won'\s*,\s*'lost'\s*,\s*'archived'\s*\)/i
    );
  });

  it("enables and forces RLS on both tables (literal or do-block format())", () => {
    for (const table of ["pipeline_stages", "opportunities"]) {
      const literalEnable = migration.includes(`alter table ${table} enable row level security`);
      const dynamicEnable =
        migration.includes(`'${table}'`) &&
        /'alter table %I enable row level security'/i.test(migration);
      expect(literalEnable || dynamicEnable, `${table} enable RLS`).toBe(true);
      const literalSelect = migration.includes(`create policy ${table}_tenant_select on ${table}`);
      const dynamicSelect =
        migration.includes(`'${table}'`) &&
        /create policy %I_tenant_select on %I/i.test(migration);
      expect(literalSelect || dynamicSelect, `${table} select policy`).toBe(true);
    }
  });

  it("indexes opportunities by company and stage", () => {
    expect(migration).toMatch(/create\s+index\s+opportunities_org_company_idx/i);
    expect(migration).toMatch(/create\s+index\s+opportunities_org_stage_idx/i);
  });
});
