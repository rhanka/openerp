import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "src/db/migrations/0043_auth_pending_tenant_selections.sql",
  "utf8"
);

describe("auth pending tenant selections migration (Lot 2)", () => {
  it("stores only pre-tenant, expiring, single-use pending state", () => {
    expect(migration).toContain("create table auth_pending_tenant_selections");
    const start = migration.indexOf("create table auth_pending_tenant_selections");
    const end = migration.indexOf(");", start);
    const table = migration.slice(start, end);
    expect(table).toMatch(/organization_id\s+uuid\s+references\s+organizations/i);
    expect(table).toMatch(/user_identity_id\s+uuid\s+not null/i);
    expect(table).toMatch(/ceremony_id\s+text\s+not null/i);
    expect(table).toMatch(/token_hash\s+text\s+not null\s+unique/i);
    expect(table).toMatch(/expires_at\s+timestamptz\s+not null/i);
    expect(table).toMatch(/consumed_at\s+timestamptz/i);
  });

  it("keeps the pre-tenant table behind forced RLS and narrow auth functions", () => {
    expect(migration).toContain("'auth_pending_tenant_selections'");
    expect(migration).toContain("alter table %I enable row level security");
    expect(migration).toContain("alter table %I force row level security");
    expect(migration).toContain("organization_id = app_current_organization_id()");
    expect(migration).toContain("auth_pending_tenant_selection_create");
    expect(migration).toContain("auth_pending_tenant_selection_find_valid");
    expect(migration).toContain("auth_pending_tenant_selection_consume");
    expect(migration).toContain("and consumed_at is null");
    expect(migration).toContain("and expires_at > p_now");
    expect(migration).toContain("owner to openerp_auth_system");
    expect(migration).toContain("grant execute on function auth_pending_tenant_selection_consume");
  });
});
