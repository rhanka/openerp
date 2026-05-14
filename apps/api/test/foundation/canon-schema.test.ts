import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0002_canon_entities.sql", "utf8");

describe("canon entities migration (2026-05-14)", () => {
  it("creates all canon tables from shared-entities-v1.md", () => {
    for (const table of [
      "user_identities",
      "organization_members",
      "fx_rate_snapshots",
      "timeline_entries",
      "approval_requests",
      "idempotency_records"
    ]) {
      expect(migration).toContain(`create table ${table}`);
    }
  });

  it("scopes tenant-owned canon tables by organization_id", () => {
    for (const table of [
      "organization_members",
      "fx_rate_snapshots",
      "timeline_entries",
      "approval_requests",
      "idempotency_records"
    ]) {
      const start = migration.indexOf(`create table ${table}`);
      const end = migration.indexOf(");", start);
      expect(migration.slice(start, end)).toContain("organization_id uuid not null");
    }
  });

  it("leaves user_identities global (no organization_id) per PG-02", () => {
    const start = migration.indexOf("create table user_identities");
    const end = migration.indexOf(");", start);
    expect(migration.slice(start, end)).not.toContain("organization_id");
  });

  it("extends audit_events with agentic columns (PG-09)", () => {
    for (const column of [
      "source",
      "agent_id",
      "tool_call_id",
      "policy_decision_id",
      "delegation_id",
      "approval_request_id"
    ]) {
      expect(migration).toContain(`add column ${column}`);
    }
  });

  it("enforces approval_requests status whitelist and approver constraint", () => {
    expect(migration).toContain("status in ('pending', 'approved', 'rejected', 'escalated', 'expired')");
    expect(migration).toContain("approver_user_identity_id is not null or approver_role_id is not null");
  });

  it("keeps idempotency_records with composite primary key (org_id, key) and TTL index", () => {
    expect(migration).toContain("primary key (organization_id, key)");
    expect(migration).toContain("idempotency_records_expiry_idx on idempotency_records (expires_at)");
  });

  it("does not modify existing tables (canon migration is additive)", () => {
    expect(migration).not.toContain("drop table");
    expect(migration).not.toContain("drop column");
    // Only audit_events is altered (via add column), no drop_existing or rename
    expect(migration).not.toContain("alter table users");
    expect(migration).not.toContain("alter table organizations");
  });
});
