import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0007: convert audit_events to a monthly-partitioned table,
// complete canon columns (PG-06 article 2.2), and enforce append-only.
const migration = readFileSync("src/db/migrations/0007_audit_events_partition.sql", "utf8");

describe("audit_events monthly partition migration (PG-06 article 2)", () => {
  it("renames the legacy table before recreating the partitioned audit_events", () => {
    expect(migration).toMatch(/alter\s+table\s+audit_events\s+rename\s+to\s+audit_events_legacy/i);
  });

  it("recreates audit_events partitioned by range on created_at", () => {
    expect(migration).toMatch(/create\s+table\s+audit_events\s*\([^;]*\)\s*partition\s+by\s+range\s*\(\s*created_at\s*\)/i);
  });

  it("declares the composite primary key (id, created_at) required for partitioning", () => {
    expect(migration).toMatch(/primary\s+key\s*\(\s*id\s*,\s*created_at\s*\)/i);
  });

  it("adds the canon columns missing from prior migrations", () => {
    for (const column of [
      "correlation_id uuid",
      "idempotency_record_id uuid",
      "agent_run_id uuid",
      "acting_principal text",
      "on_behalf_of text"
    ]) {
      expect(migration).toContain(column);
    }
  });

  it("creates an initial monthly partition at migration time", () => {
    // Either declared statically (create table audit_events_yYYYYmMM partition of ...)
    // or materialized at migration time via the helper (select app_ensure_audit_partition(...)).
    const staticPartition = /create\s+table\s+audit_events_y\d{4}m\d{2}\s+partition\s+of\s+audit_events/i;
    const lazyPartition = /select\s+app_ensure_audit_partition\s*\(/i;
    expect(staticPartition.test(migration) || lazyPartition.test(migration)).toBe(true);
  });

  it("creates a default partition so legacy rows can be backfilled before lazy partitions exist", () => {
    expect(migration).toMatch(/create\s+table\s+audit_events_default\s+partition\s+of\s+audit_events\s+default/i);
  });

  it("provides ensure_audit_partition(date) helper to lazily create monthly partitions", () => {
    expect(migration).toMatch(/create\s+(or\s+replace\s+)?function\s+app_ensure_audit_partition\s*\(/i);
  });

  it("backfills data from the legacy table before dropping it", () => {
    const insertIdx = migration.search(/insert\s+into\s+audit_events\s*\([^)]*\)\s*select/i);
    const dropIdx = migration.search(/drop\s+table\s+audit_events_legacy/i);
    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect(dropIdx).toBeGreaterThan(insertIdx);
  });

  it("enforces append-only via a trigger blocking UPDATE and DELETE", () => {
    expect(migration).toMatch(/create\s+(or\s+replace\s+)?function\s+audit_events_block_mutations/i);
    expect(migration).toMatch(/before\s+update\s+on\s+audit_events/i);
    expect(migration).toMatch(/before\s+delete\s+on\s+audit_events/i);
  });

  it("re-applies RLS on the recreated partitioned audit_events", () => {
    expect(migration).toMatch(/alter\s+table\s+audit_events\s+enable\s+row\s+level\s+security/i);
    expect(migration).toMatch(/alter\s+table\s+audit_events\s+force\s+row\s+level\s+security/i);
    expect(migration).toMatch(/create\s+policy\s+audit_events_tenant_select\s+on\s+audit_events/i);
    expect(migration).toMatch(/create\s+policy\s+audit_events_tenant_modify\s+on\s+audit_events/i);
  });
});
