import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0016 (ProjectTask entity — Demo Slice 3.1 delivery module).
const migration = readFileSync("src/db/migrations/0016_project_tasks.sql", "utf8");

describe("project_tasks migration (DS 3.1)", () => {
  it("creates the project_tasks table tenant-scoped", () => {
    expect(migration).toContain("create table project_tasks");
    const start = migration.indexOf("create table project_tasks");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical ProjectTask columns from the spec", () => {
    const start = migration.indexOf("create table project_tasks");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "project_id uuid not null references projects(id)",
      "title text not null",
      "description text",
      "status text not null",
      "assignee_user_id uuid",
      "due_date date",
      "completed_at timestamptz",
      "parent_task_id uuid references project_tasks(id)",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains status to the canonical whitelist", () => {
    expect(migration).toMatch(
      /check\s*\(\s*status\s+in\s*\(\s*'todo'\s*,\s*'in_progress'\s*,\s*'blocked'\s*,\s*'done'\s*,\s*'cancelled'\s*\)/i
    );
  });

  it("has a nullable assignee_user_id FK to users and self-referential parent_task_id", () => {
    expect(migration).toMatch(/assignee_user_id\s+uuid\s+references\s+users\s*\(\s*id\s*\)/i);
    expect(migration).toMatch(/parent_task_id\s+uuid\s+references\s+project_tasks\s*\(\s*id\s*\)/i);
  });

  it("enables and forces RLS via the do-block pattern", () => {
    const dynamicEnable =
      migration.includes("'project_tasks'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(dynamicEnable, "project_tasks enable RLS via do-block").toBe(true);

    const dynamicSelect =
      migration.includes("'project_tasks'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(dynamicSelect, "project_tasks select policy via do-block").toBe(true);
  });

  it("indexes project_tasks by (organization_id, project_id) and (organization_id, status)", () => {
    expect(migration).toMatch(
      /create\s+index\s+project_tasks_org_project_idx\s+on\s+project_tasks\s*\(\s*organization_id\s*,\s*project_id\s*\)/i
    );
    expect(migration).toMatch(
      /create\s+index\s+project_tasks_org_status_idx\s+on\s+project_tasks\s*\(\s*organization_id\s*,\s*status\s*\)/i
    );
  });
});
