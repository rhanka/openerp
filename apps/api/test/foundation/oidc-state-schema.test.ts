import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0035 (AUTH-39-A sub-slice A0-migrations — oidc_state).
// One-shot state store for in-flight OIDC authorization-code + PKCE flows.
// Pre-auth, no tenant scope.
const migration = readFileSync(
  "src/db/migrations/0035_oidc_state.sql",
  "utf8"
);

describe("oidc_state migration (AUTH-39-A A0)", () => {
  it("creates the oidc_state table", () => {
    expect(migration).toContain("create table oidc_state");
  });

  it("uses state text as primary key (no uuid — pre-auth token)", () => {
    const start = migration.indexOf("create table oidc_state");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("state            text primary key");
  });

  it("enforces canonical oidc_state columns", () => {
    const start = migration.indexOf("create table oidc_state");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "nonce            text not null",
      "code_verifier    text not null",
      "redirect_after   text",
      "created_at       timestamptz not null default now()",
      "expires_at       timestamptz not null",
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("creates index on expires_at for TTL sweeps", () => {
    expect(migration).toContain("create index oidc_state_expires_at_idx");
    expect(migration).toContain("on oidc_state(expires_at)");
  });

  it("has no organization_id (pre-auth, no tenant scope)", () => {
    expect(migration).not.toContain("organization_id");
  });

  it("has no RLS (pre-auth table, not tenant-scoped)", () => {
    expect(migration).not.toContain("row level security");
  });
});
