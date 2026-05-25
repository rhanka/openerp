import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0019 (Assignment entity — Demo Slice 3.3 resource allocation).
const migration = readFileSync("src/db/migrations/0019_project_assignments.sql", "utf8");

describe("assignments migration (DS 3.3)", () => {
  it("creates the assignments table tenant-scoped", () => {
    expect(migration).toContain("create table assignments");
    const start = migration.indexOf("create table assignments");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Assignment columns from the spec", () => {
    const start = migration.indexOf("create table assignments");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "project_id uuid not null references projects(id)",
      "user_id uuid not null references users(id)",
      "role_label text",
      "allocation_percent integer",
      "start_date date",
      "end_date date",
      "billable_rate_id uuid references rates(id)",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains allocation_percent to 0..100", () => {
    expect(migration).toMatch(/allocation_percent\s+integer\s+check\s*\(\s*allocation_percent\s+between\s+0\s+and\s+100\s*\)/i);
  });

  it("enables and forces RLS via the do-block pattern", () => {
    const dynamicEnable =
      migration.includes("'assignments'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(dynamicEnable, "assignments enable RLS via do-block").toBe(true);

    const dynamicSelect =
      migration.includes("'assignments'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(dynamicSelect, "assignments select policy via do-block").toBe(true);
  });

  it("indexes assignments by (organization_id, project_id) and (organization_id, user_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+assignments_org_project_idx\s+on\s+assignments\s*\(\s*organization_id\s*,\s*project_id\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+assignments_org_user_idx\s+on\s+assignments\s*\(\s*organization_id\s*,\s*user_id\s*\)/i
    );
  });
});
