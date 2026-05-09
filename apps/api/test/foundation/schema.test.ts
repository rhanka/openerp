import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0001_foundation.sql", "utf8");

describe("foundation migration", () => {
  it("creates all required foundation tables", () => {
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
      "domain_events"
    ]) {
      expect(migration).toContain(`create table ${table}`);
    }
  });

  it("stores organization_id on tenant-owned tables", () => {
    for (const table of [
      "users",
      "teams",
      "roles",
      "audit_events",
      "file_objects",
      "comments",
      "notifications",
      "domain_events"
    ]) {
      const start = migration.indexOf(`create table ${table}`);
      const end = migration.indexOf(");", start);
      expect(migration.slice(start, end)).toContain("organization_id uuid not null");
    }
  });

  it("keeps audit events append-only by omitting update endpoints and update triggers", () => {
    expect(migration).not.toContain("update audit_events");
    expect(migration).not.toContain("delete from audit_events");
  });
});
