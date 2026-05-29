import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0027 (RecurringBillingSchedule — Demo Slice 4.4).
const migration = readFileSync("src/db/migrations/0027_billing_recurring_schedules.sql", "utf8");

describe("recurring_billing_schedules migration (DS 4.4)", () => {
  it("creates the recurring_billing_schedules table", () => {
    expect(migration).toContain("create table recurring_billing_schedules");
  });

  it("enforces tenant scope via organization_id FK", () => {
    const start = migration.indexOf("create table recurring_billing_schedules");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical columns from the spec", () => {
    const start = migration.indexOf("create table recurring_billing_schedules");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const col of [
      "company_id uuid not null references companies(id)",
      "description text",
      "cadence text not null",
      "amount jsonb not null",
      "currency text not null",
      "next_run_at date not null",
      "active boolean not null default true",
      "last_invoice_id uuid references invoices(id)",
      "last_run_at timestamptz",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${col}`).toContain(col);
    }
  });

  it("constrains cadence to the allowed values", () => {
    expect(migration).toMatch(
      /check\s*\(\s*cadence\s+in\s*\(\s*'weekly'\s*,\s*'monthly'\s*,\s*'quarterly'\s*,\s*'annual'\s*\)\s*\)/i
    );
  });

  it("creates a (organization_id, active, next_run_at) index", () => {
    expect(migration).toContain("recurring_billing_schedules_org_active_next_idx");
    expect(migration).toContain("on recurring_billing_schedules (organization_id, active, next_run_at)");
  });

  it("enables and forces RLS via the do-block pattern", () => {
    expect(migration).toContain("'recurring_billing_schedules'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
    expect(migration).toMatch(/'alter table %I force row level security'/i);
  });

  it("adds tenant-scoped select and modify policies", () => {
    expect(migration).toMatch(/create policy.*tenant_select/i);
    expect(migration).toMatch(/create policy.*tenant_modify/i);
  });
});
