import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0014 (DS 2.3 — soft-delete for CRM entities, crm-customer-timeline spec line ~144).
const migration = readFileSync("src/db/migrations/0014_crm_soft_delete.sql", "utf8");

describe("crm soft-delete migration (DS 2.3)", () => {
  it("adds deleted_at to companies", () => {
    expect(migration).toMatch(/alter\s+table\s+companies\s+add\s+column\s+deleted_at\s+timestamptz/i);
  });

  it("adds deleted_at to contacts", () => {
    expect(migration).toMatch(/alter\s+table\s+contacts\s+add\s+column\s+deleted_at\s+timestamptz/i);
  });

  it("adds deleted_at to opportunities", () => {
    expect(migration).toMatch(/alter\s+table\s+opportunities\s+add\s+column\s+deleted_at\s+timestamptz/i);
  });

  it("adds deleted_at to leads", () => {
    expect(migration).toMatch(/alter\s+table\s+leads\s+add\s+column\s+deleted_at\s+timestamptz/i);
  });

  it("deleted_at has no DEFAULT clause (nullable, no default)", () => {
    const alters = [
      ...migration.matchAll(/alter\s+table\s+\w+\s+add\s+column\s+deleted_at[^;]+;/gi)
    ];
    expect(alters.length).toBeGreaterThanOrEqual(4);
    for (const m of alters) {
      expect(m[0]).not.toMatch(/default/i);
    }
  });
});
