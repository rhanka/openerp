import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0032 (Workflow Demo Slice 5.4 — WorkflowDefinition + WorkflowRun).
// Tenant-scoped, deleted_at, idempotency index, RLS.
const migration = readFileSync(
  "src/db/migrations/0032_workflow_definitions_runs.sql",
  "utf8"
);

describe("workflow_definitions migration (DS 5.4)", () => {
  it("creates the workflow_definitions table tenant-scoped", () => {
    expect(migration).toContain("create table workflow_definitions");
    const start = migration.indexOf("create table workflow_definitions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical WorkflowDefinition columns", () => {
    const start = migration.indexOf("create table workflow_definitions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "owner_user_id uuid references users(id)",
      "name text not null",
      "description text",
      "trigger_type text not null",
      "trigger_config jsonb not null default '{}'",
      "action_type text not null",
      "action_config jsonb not null default '{}'",
      "is_active boolean not null default true",
      "is_shared boolean not null default false",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("creates the workflow_runs table tenant-scoped", () => {
    expect(migration).toContain("create table workflow_runs");
    const start = migration.indexOf("create table workflow_runs");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
    expect(block).toContain("workflow_definition_id uuid not null references workflow_definitions(id)");
  });

  it("enforces canonical WorkflowRun columns", () => {
    const start = migration.indexOf("create table workflow_runs");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "trigger_audit_event_id uuid",
      "trigger_event_type text not null",
      "trigger_resource_type text",
      "trigger_resource_id uuid",
      "triggered_by text not null check (triggered_by in ('event', 'manual'))",
      "status text not null check (status in ('completed', 'failed', 'skipped'))",
      "created_resource_type text",
      "created_resource_id uuid",
      "action_result jsonb not null default '{}'",
      "error_detail text",
      "started_at timestamptz",
      "completed_at timestamptz",
      "created_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("creates idempotency unique index on (workflow_definition_id, trigger_audit_event_id)", () => {
    expect(migration).toContain("create unique index workflow_runs_idempotency_idx");
    expect(migration).toContain("on workflow_runs (workflow_definition_id, trigger_audit_event_id)");
    expect(migration).toContain("where trigger_audit_event_id is not null");
  });

  it("creates indexes for efficient querying", () => {
    expect(migration).toContain("create index workflow_definitions_org_trigger_active_idx");
    expect(migration).toContain("create index workflow_runs_org_def_idx");
  });

  it("enables RLS on workflow_definitions", () => {
    expect(migration).toContain("alter table %I enable row level security");
    expect(migration).toContain("workflow_definitions");
  });

  it("enables RLS on workflow_runs", () => {
    expect(migration).toContain("workflow_runs");
  });

  it("has tenant select + modify policies for both tables", () => {
    const selectCount = (migration.match(/create policy.*_tenant_select/g) ?? []).length;
    const modifyCount = (migration.match(/create policy.*_tenant_modify/g) ?? []).length;
    expect(selectCount).toBeGreaterThanOrEqual(2);
    expect(modifyCount).toBeGreaterThanOrEqual(2);
  });
});
