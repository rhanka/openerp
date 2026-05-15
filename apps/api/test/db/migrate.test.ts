import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import { runMigrations } from "../../src/db/migrate";

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeFakePool() {
  const log: Array<{ text: string; values: unknown[] }> = [];
  const applied = new Set<string>();

  const baseQuery = async (text: string, values: unknown[] = []) => {
    log.push({ text, values });
    if (/select id from _openerp_migrations/.test(text)) {
      return { rows: Array.from(applied).map((id) => ({ id })) };
    }
    if (/insert into _openerp_migrations/.test(text)) {
      const [id] = values as [string];
      applied.add(id);
      return { rows: [] };
    }
    return { rows: [] };
  };

  const pool = {
    async query<T = unknown>(text: string, values?: unknown[]) {
      const v = values ?? [];
      const out = await baseQuery(text, v);
      return { rows: out.rows as T[] };
    },
    async withClient<T>(fn: (q: Queryable & { raw: unknown }) => Promise<T>) {
      const queryable = {
        raw: null,
        async query<U = unknown>(text: string, values?: unknown[]) {
          const v = values ?? [];
          const out = await baseQuery(text, v);
          return { rows: out.rows as U[] };
        }
      };
      return fn(queryable);
    },
    async end() {}
  };
  return { pool, log, applied };
}

describe("runMigrations (Lot 0)", () => {
  it("creates the ledger and applies pending files in alphabetical order", async () => {
    const dir = mkdtempSync(join(tmpdir(), "openerp-mig-"));
    writeFileSync(join(dir, "0001_a.sql"), "select 1");
    writeFileSync(join(dir, "0002_b.sql"), "select 2");
    const { pool, applied } = makeFakePool();
    const result = await runMigrations(pool, { directory: dir });
    expect(result.applied).toEqual(["0001_a.sql", "0002_b.sql"]);
    expect(result.skipped).toEqual([]);
    expect(applied.has("0001_a.sql")).toBe(true);
    expect(applied.has("0002_b.sql")).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it("skips already-applied migrations on re-run", async () => {
    const dir = mkdtempSync(join(tmpdir(), "openerp-mig-"));
    writeFileSync(join(dir, "0001_a.sql"), "select 1");
    writeFileSync(join(dir, "0002_b.sql"), "select 2");
    const { pool } = makeFakePool();
    await runMigrations(pool, { directory: dir });
    const second = await runMigrations(pool, { directory: dir });
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(["0001_a.sql", "0002_b.sql"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("respects the limit option for partial runs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "openerp-mig-"));
    writeFileSync(join(dir, "0001_a.sql"), "select 1");
    writeFileSync(join(dir, "0002_b.sql"), "select 2");
    writeFileSync(join(dir, "0003_c.sql"), "select 3");
    const { pool } = makeFakePool();
    const result = await runMigrations(pool, { directory: dir, limit: 2 });
    expect(result.applied).toEqual(["0001_a.sql", "0002_b.sql"]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("wraps each migration in begin/commit", async () => {
    const dir = mkdtempSync(join(tmpdir(), "openerp-mig-"));
    writeFileSync(join(dir, "0001_a.sql"), "select 1");
    const { pool, log } = makeFakePool();
    await runMigrations(pool, { directory: dir });
    const stmts = log.map((entry) => entry.text.trim().toLowerCase());
    const beginIdx = stmts.findIndex((s) => s === "begin");
    const commitIdx = stmts.findIndex((s) => s === "commit");
    expect(beginIdx).toBeGreaterThanOrEqual(0);
    expect(commitIdx).toBeGreaterThan(beginIdx);
    rmSync(dir, { recursive: true, force: true });
  });
});
