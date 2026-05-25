import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0017 (TimeEntry entity — Demo Slice 3.2 time-to-invoice module).
const migration = readFileSync("src/db/migrations/0017_project_time_entries.sql", "utf8");

describe("time_entries migration (DS 3.2)", () => {
  it("creates the time_entries table tenant-scoped", () => {
    expect(migration).toContain("create table time_entries");
    const start = migration.indexOf("create table time_entries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical TimeEntry columns from the spec", () => {
    const start = migration.indexOf("create table time_entries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "project_id uuid not null references projects(id)",
      "project_task_id uuid references project_tasks(id)",
      "user_id uuid not null references users(id)",
      "entry_date date not null",
      "minutes integer not null",
      "description text",
      "billable boolean not null default true",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("has a minutes > 0 check constraint", () => {
    expect(migration).toMatch(/check\s*\(\s*minutes\s*>\s*0\s*\)/i);
  });

  it("constrains status to the canonical whitelist", () => {
    expect(migration).toMatch(
      /check\s*\(\s*status\s+in\s*\(\s*'draft'\s*,\s*'submitted'\s*,\s*'approved'\s*,\s*'rejected'\s*\)/i
    );
  });

  it("enables and forces RLS via the do-block pattern", () => {
    const dynamicEnable =
      migration.includes("'time_entries'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(dynamicEnable, "time_entries enable RLS via do-block").toBe(true);

    const dynamicSelect =
      migration.includes("'time_entries'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(dynamicSelect, "time_entries select policy via do-block").toBe(true);
  });

  it("indexes time_entries by (organization_id, project_id), (organization_id, user_id, entry_date), (organization_id, status)", () => {
    expect(migration).toMatch(
      /create\s+index\s+time_entries_org_project_idx\s+on\s+time_entries\s*\(\s*organization_id\s*,\s*project_id\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+time_entries_org_user_date_idx\s+on\s+time_entries\s*\(\s*organization_id\s*,\s*user_id\s*,\s*entry_date\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+time_entries_org_status_idx\s+on\s+time_entries\s*\(\s*organization_id\s*,\s*status\s*\)/i
    );
  });
});
