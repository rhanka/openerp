import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0015 (Project entity — Demo Slice 3.0 delivery module).
const migration = readFileSync("src/db/migrations/0015_project_projects.sql", "utf8");

describe("project migration (DS 3.0)", () => {
  it("creates the projects table tenant-scoped", () => {
    expect(migration).toContain("create table projects");
    const start = migration.indexOf("create table projects");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical Project columns from the spec", () => {
    const start = migration.indexOf("create table projects");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "name text not null",
      "description text",
      "status text not null",
      "code text",
      "company_id uuid",
      "owner_user_id uuid",
      "start_date date",
      "end_date date",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains status to the canonical whitelist", () => {
    expect(migration).toMatch(
      /check\s*\(\s*status\s+in\s*\(\s*'draft'\s*,\s*'active'\s*,\s*'on_hold'\s*,\s*'completed'\s*,\s*'cancelled'\s*\)/i
    );
  });

  it("has a nullable company_id FK to companies and owner_user_id FK to users", () => {
    expect(migration).toMatch(/company_id\s+uuid\s+references\s+companies\s*\(\s*id\s*\)/i);
    expect(migration).toMatch(/owner_user_id\s+uuid\s+references\s+users\s*\(\s*id\s*\)/i);
  });

  it("enables and forces RLS via the do-block pattern", () => {
    const dynamicEnable =
      migration.includes("'projects'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(dynamicEnable, "projects enable RLS via do-block").toBe(true);

    const dynamicSelect =
      migration.includes("'projects'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(dynamicSelect, "projects select policy via do-block").toBe(true);
  });

  it("indexes projects by organization_id and status", () => {
    expect(migration).toMatch(
      /create\s+index\s+projects_org_status_idx\s+on\s+projects\s*\(\s*organization_id\s*,\s*status\s*\)/i
    );
  });
});
