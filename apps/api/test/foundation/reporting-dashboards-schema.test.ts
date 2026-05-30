import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0030 (Reporting Demo Slice 5.2 — Dashboard + DashboardWidget,
// shared-entities-v1 Article 4.5). Tenant-scoped, deleted_at, RLS, indexes.
const migration = readFileSync(
  "src/db/migrations/0030_reporting_dashboards.sql",
  "utf8"
);

describe("reporting dashboards migration (DS 5.2)", () => {
  it("creates the dashboards table tenant-scoped", () => {
    expect(migration).toContain("create table dashboards");
    const start = migration.indexOf("create table dashboards");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Dashboard columns", () => {
    const start = migration.indexOf("create table dashboards");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "owner_user_id uuid references users(id)",
      "name text not null",
      "description text",
      "is_shared boolean not null default false",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("creates the dashboard_widgets table tenant-scoped", () => {
    expect(migration).toContain("create table dashboard_widgets");
    const start = migration.indexOf("create table dashboard_widgets");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
    expect(block).toContain("dashboard_id uuid not null references dashboards(id)");
    expect(block).toContain("report_definition_id uuid not null references report_definitions(id)");
  });

  it("enforces canonical DashboardWidget columns", () => {
    const start = migration.indexOf("create table dashboard_widgets");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "title text",
      "position integer not null default 0",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enables and forces RLS on dashboards via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'dashboards'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "dashboards enable RLS").toBe(true);

    const hasSelectPolicy =
      migration.includes("'dashboards'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(hasSelectPolicy, "dashboards select policy").toBe(true);
  });

  it("enables and forces RLS on dashboard_widgets via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'dashboard_widgets'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "dashboard_widgets enable RLS").toBe(true);
  });

  it("indexes dashboards by organization_id", () => {
    expect(migration).toMatch(
      /create\s+index\s+dashboards_org_idx\s+on\s+dashboards\s*\(\s*organization_id\s*\)/i
    );
  });

  it("indexes dashboard_widgets by (organization_id, dashboard_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+dashboard_widgets_org_dash_idx\s+on\s+dashboard_widgets\s*\(\s*organization_id\s*,\s*dashboard_id\s*\)/i
    );
  });
});
