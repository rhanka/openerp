import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0028 (Reporting Demo Slice 5.0 — SavedView entity,
// shared-entities-v1 Article 4.5). Tenant-scoped, jsonb filters/columns,
// owner/shared, soft-delete, RLS, indexes.
const migration = readFileSync("src/db/migrations/0028_reporting_saved_views.sql", "utf8");

describe("reporting saved_views migration (Article 4.5)", () => {
  it("creates the saved_views table tenant-scoped", () => {
    expect(migration).toContain("create table saved_views");
    const start = migration.indexOf("create table saved_views");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical SavedView columns", () => {
    const start = migration.indexOf("create table saved_views");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "owner_user_id uuid references users(id)",
      "resource_type text not null",
      "name text not null",
      "filters jsonb not null default '{}'",
      "columns jsonb not null default '[]'",
      "sort_by text",
      "is_shared boolean not null default false",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enables and forces RLS on saved_views via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'saved_views'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "saved_views enable RLS").toBe(true);

    const hasSelectPolicy =
      migration.includes("'saved_views'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(hasSelectPolicy, "saved_views select policy").toBe(true);
  });

  it("indexes saved_views by (organization_id, resource_type) and (organization_id, owner_user_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+saved_views_org_resource_idx\s+on\s+saved_views\s*\(\s*organization_id\s*,\s*resource_type\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+saved_views_org_owner_idx\s+on\s+saved_views\s*\(\s*organization_id\s*,\s*owner_user_id\s*\)/i
    );
  });
});
