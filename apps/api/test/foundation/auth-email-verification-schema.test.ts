import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0042_auth_email_verification.sql", "utf8");

describe("auth email-verification migration", () => {
  it("adds independent user verification and hashed, expiring proof storage", () => {
    expect(migration).toContain("add column email_verified boolean not null default false");
    const start = migration.indexOf("create table auth_email_verifications");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "organization_id uuid references organizations(id)",
      "email text not null",
      "code_hash text not null",
      "verification_token text",
      "expires_at timestamptz not null",
      "used boolean not null default false",
      "used_at timestamptz",
      "created_at timestamptz not null default now()",
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
    expect(block).not.toContain("code text");
  });

  it("indexes verification lookup and expiry, with the repository RLS do-block", () => {
    expect(migration).toContain("auth_email_verifications_email_created_idx");
    expect(migration).toContain("auth_email_verifications_expires_at_idx");
    expect(migration).toContain("protected_table text := 'auth_email_verifications'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
    expect(migration).toMatch(/'alter table %I force row level security'/i);
    expect(migration).toContain("organization_id = app_current_organization_id()");
    expect(migration).not.toContain("organization_id is null or organization_id = app_current_organization_id()");
  });

  it("defines restricted system functions for pre-tenant audit and mail journal events", () => {
    expect(migration).toContain("alter column organization_id drop not null");
    expect(migration).toContain("create unique index email_sends_system_idempotency_key_idx");
    expect(migration).toContain("create role openerp_auth_system nologin bypassrls");
    for (const fn of [
      "auth_email_verification_create",
      "auth_email_verification_consume",
      "auth_system_email_enqueue",
      "auth_system_audit_record",
    ]) {
      expect(migration).toContain(`create or replace function ${fn}`);
    }
    expect(migration).toContain("revoke all on function auth_system_email_find(text) from public");
    expect(migration).toContain("grant execute on function auth_system_email_find(text) to openerp_app");
  });
});
