import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0031 (Reporting Demo Slice 5.3 — ScheduledDelivery + DeliveryRun,
// shared-entities-v1 Article 4.5). Tenant-scoped, deleted_at, RLS, indexes.
const migration = readFileSync(
  "src/db/migrations/0031_reporting_scheduled_deliveries.sql",
  "utf8"
);

describe("reporting scheduled_deliveries migration (DS 5.3)", () => {
  it("creates the scheduled_deliveries table tenant-scoped", () => {
    expect(migration).toContain("create table scheduled_deliveries");
    const start = migration.indexOf("create table scheduled_deliveries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical ScheduledDelivery columns", () => {
    const start = migration.indexOf("create table scheduled_deliveries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "owner_user_id uuid references users(id)",
      "name text not null",
      "target_type text not null",
      "target_id uuid not null",
      "cadence text not null",
      "timezone text not null default 'UTC'",
      "next_run_at timestamptz not null",
      "last_run_at timestamptz",
      "channel text not null default 'in_app'",
      "recipient_user_ids jsonb not null default '[]'",
      "is_shared boolean not null default false",
      "active boolean not null default true",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("checks target_type constraint to report_definition only", () => {
    expect(migration).toContain("check (target_type in ('report_definition'))");
  });

  it("checks cadence constraint", () => {
    expect(migration).toContain(
      "check (cadence in ('daily', 'weekly', 'monthly', 'quarterly', 'annual'))"
    );
  });

  it("checks channel constraint to in_app", () => {
    expect(migration).toContain("check (channel in ('in_app'))");
  });

  it("creates the delivery_runs table tenant-scoped", () => {
    expect(migration).toContain("create table delivery_runs");
    const start = migration.indexOf("create table delivery_runs");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
    expect(block).toContain(
      "scheduled_delivery_id uuid not null references scheduled_deliveries(id)"
    );
    expect(block).toContain("report_run_id uuid references report_runs(id)");
  });

  it("enforces canonical DeliveryRun columns", () => {
    const start = migration.indexOf("create table delivery_runs");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "triggered_by text not null",
      "status text not null",
      "error_detail text",
      "snapshot_summary jsonb not null default '{}'",
      "started_at timestamptz",
      "completed_at timestamptz",
      "created_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("enables and forces RLS on scheduled_deliveries via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'scheduled_deliveries'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "scheduled_deliveries enable RLS").toBe(true);

    const hasSelectPolicy =
      migration.includes("'scheduled_deliveries'") &&
      /create policy %I_tenant_select on %I/i.test(migration);
    expect(hasSelectPolicy, "scheduled_deliveries select policy").toBe(true);
  });

  it("enables and forces RLS on delivery_runs via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'delivery_runs'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "delivery_runs enable RLS").toBe(true);
  });

  it("indexes scheduled_deliveries by (organization_id, active, next_run_at) where deleted_at is null", () => {
    expect(migration).toMatch(
      /create\s+index\s+scheduled_deliveries_org_active_next_idx\s+on\s+scheduled_deliveries\s*\(.*organization_id.*active.*next_run_at.*\)/is
    );
    expect(migration).toContain("where deleted_at is null");
  });

  it("indexes delivery_runs by (organization_id, scheduled_delivery_id)", () => {
    expect(migration).toMatch(
      /create\s+index\s+delivery_runs_org_delivery_idx\s+on\s+delivery_runs\s*\(\s*organization_id\s*,\s*scheduled_delivery_id\s*\)/i
    );
  });
});
