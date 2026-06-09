import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0034 (AUTH-39-A sub-slice A0-migrations — openerp_sessions).
// DB-backed sessions for the OIDC RP auth path, multi-tenant via organization_id.
const migration = readFileSync(
  "src/db/migrations/0034_openerp_sessions.sql",
  "utf8"
);

describe("openerp_sessions migration (AUTH-39-A A0)", () => {
  it("creates the openerp_sessions table", () => {
    expect(migration).toContain("create table openerp_sessions");
  });

  it("has user_identity_id FK with on delete cascade", () => {
    const start = migration.indexOf("create table openerp_sessions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain(
      "user_identity_id    uuid not null references user_identities(id) on delete cascade"
    );
  });

  it("has organization_id FK with on delete cascade", () => {
    const start = migration.indexOf("create table openerp_sessions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain(
      "organization_id     uuid not null references organizations(id) on delete cascade"
    );
  });

  it("enforces canonical openerp_sessions columns", () => {
    const start = migration.indexOf("create table openerp_sessions");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "id                  uuid primary key default gen_random_uuid()",
      "session_token_hash  text not null unique",
      "refresh_token_hash  text unique",
      "device_name         text",
      "ip_address          text",
      "user_agent          text",
      "mfa_verified        boolean not null default false",
      "expires_at          timestamptz not null",
      "created_at          timestamptz not null default now()",
      "last_activity_at    timestamptz not null default now()",
      "revoked_at          timestamptz",
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("creates index on user_identity_id", () => {
    expect(migration).toContain("create index openerp_sessions_user_idx");
    expect(migration).toContain("on openerp_sessions(user_identity_id)");
  });

  it("creates index on organization_id", () => {
    expect(migration).toContain("create index openerp_sessions_org_idx");
    expect(migration).toContain("on openerp_sessions(organization_id)");
  });

  it("creates index on expires_at", () => {
    expect(migration).toContain("create index openerp_sessions_expires_at_idx");
    expect(migration).toContain("on openerp_sessions(expires_at)");
  });

  it("does not enable RLS (sessions are identity-layer, not tenant-scoped data)", () => {
    expect(migration).not.toContain("enable row level security");
  });
});
