import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0003_rls_policies.sql", "utf8");

describe("RLS policies migration (PG-03, Lot 1)", () => {
  it("defines the helper function app_current_organization_id", () => {
    expect(migration).toContain("create or replace function app_current_organization_id()");
    expect(migration).toContain("current_setting('app.current_organization_id', true)");
  });

  it("protects every tenant-owned table from foundation + canon entities", () => {
    for (const table of [
      "organizations",
      "tenant_settings",
      "users",
      "teams",
      "roles",
      "permission_grants",
      "audit_events",
      "file_objects",
      "comments",
      "notifications",
      "domain_events",
      "organization_members",
      "fx_rate_snapshots",
      "timeline_entries",
      "approval_requests",
      "idempotency_records"
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
  });

  it("excludes the global user_identities table from RLS", () => {
    expect(migration).not.toContain("'user_identities'");
  });

  it("enables RLS and registers SELECT + ALL policies", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("for select using (%I = app_current_organization_id())");
    expect(migration).toContain(
      "for all using (%I = app_current_organization_id()) with check (%I = app_current_organization_id())"
    );
  });

  it("uses id (not organization_id) when the table is organizations itself", () => {
    expect(migration).toContain("scope_column := 'id'");
    expect(migration).toContain("scope_column := 'organization_id'");
  });
});
