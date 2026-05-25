import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0018 (Rate entity — Demo Slice 3.3 tariff primitive).
const migration = readFileSync("src/db/migrations/0018_project_rates.sql", "utf8");

describe("rates migration (DS 3.3)", () => {
  it("creates the rates table tenant-scoped", () => {
    expect(migration).toContain("create table rates");
    const start = migration.indexOf("create table rates");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Rate columns from the spec", () => {
    const start = migration.indexOf("create table rates");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "name text not null",
      "amount jsonb not null",
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

  it("enforces unique (organization_id, name) constraint", () => {
    expect(migration).toMatch(/constraint\s+rates_org_name_unique\s+unique\s*\(\s*organization_id\s*,\s*name\s*\)/i);
  });

  it("enables and forces RLS via the do-block pattern", () => {
    const dynamicEnable =
      migration.includes("'rates'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(dynamicEnable, "rates enable RLS via do-block").toBe(true);

    const dynamicSelect =
      migration.includes("'rates'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(dynamicSelect, "rates select policy via do-block").toBe(true);
  });

  it("indexes rates by (organization_id, active)", () => {
    expect(migration).toMatch(
      /create\s+index\s+rates_org_active_idx\s+on\s+rates\s*\(\s*organization_id\s*,\s*active\s*\)/i
    );
  });
});
