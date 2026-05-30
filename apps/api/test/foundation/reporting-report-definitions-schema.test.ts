import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0029 (Reporting Demo Slice 5.1 — ReportDefinition + ReportRun,
// shared-entities-v1 Article 4.5 Archetype A). Tenant-scoped, jsonb params/results,
// deleted_at, RLS, indexes.
const migration = readFileSync(
  "src/db/migrations/0029_reporting_report_definitions.sql",
  "utf8"
);

describe("reporting report_definitions migration (DS 5.1)", () => {
  it("creates the report_definitions table tenant-scoped", () => {
    expect(migration).toContain("create table report_definitions");
    const start = migration.indexOf("create table report_definitions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical ReportDefinition columns", () => {
    const start = migration.indexOf("create table report_definitions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "owner_user_id uuid references users(id)",
      "report_type text not null",
      "name text not null",
      "parameters jsonb not null default '{}'",
      "is_shared boolean not null default false",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("creates the report_runs table tenant-scoped", () => {
    expect(migration).toContain("create table report_runs");
    const start = migration.indexOf("create table report_runs");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
    expect(block).toContain("report_definition_id uuid not null references report_definitions(id)");
  });

  it("enforces canonical ReportRun columns", () => {
    const start = migration.indexOf("create table report_runs");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "triggered_by_user_id uuid references users(id)",
      "status text not null check (status in ('completed', 'failed'))",
      "parameters_snapshot jsonb not null default '{}'",
      "result_columns jsonb not null default '[]'",
      "result_rows jsonb not null default '[]'",
      "row_count integer not null default 0",
      "error_detail text",
      "started_at timestamptz",
      "completed_at timestamptz",
      "created_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enables and forces RLS on report_definitions via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'report_definitions'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "report_definitions enable RLS").toBe(true);

    const hasSelectPolicy =
      migration.includes("'report_definitions'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(hasSelectPolicy, "report_definitions select policy").toBe(true);
  });

  it("enables and forces RLS on report_runs via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'report_runs'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "report_runs enable RLS").toBe(true);
  });

  it("indexes report_definitions by (organization_id, report_type)", () => {
    expect(migration).toMatch(
      /create\s+index\s+report_definitions_org_type_idx\s+on\s+report_definitions\s*\(\s*organization_id\s*,\s*report_type\s*\)/i
    );
  });

  it("indexes report_runs by (organization_id, report_definition_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+report_runs_org_def_idx\s+on\s+report_runs\s*\(\s*organization_id\s*,\s*report_definition_id\s*\)/i
    );
  });
});
