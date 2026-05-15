import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Queryable } from "./client";

// Minimal forward-only migration runner. Reads SQL files from a directory
// ordered by filename, applies each in its own transaction, and records the
// applied set in `_openerp_migrations`. Idempotent: re-running skips known
// migrations.
//
// The runner only needs `query()` + `withClient()` — it stays decoupled from
// the concrete PgPoolHandle so fake pools in unit tests (without a real
// `raw: PoolClient`) can still drive it.

export interface MigrationClient extends Queryable {
  raw?: unknown;
}

export interface MigrationPool extends Queryable {
  withClient<T>(fn: (client: MigrationClient) => Promise<T>): Promise<T>;
}

const MIGRATIONS_TABLE = "_openerp_migrations";

const MIGRATIONS_DDL = `
create table if not exists ${MIGRATIONS_TABLE} (
  id text primary key,
  applied_at timestamptz not null default now(),
  checksum text not null
)
`;

export interface MigrationRecord {
  id: string;
  appliedAt: string;
  checksum: string;
}

export interface RunMigrationsOptions {
  /** Directory with .sql files, ordered alphabetically. Defaults to apps/api/src/db/migrations relative to the api package. */
  directory?: string;
  /** Stop after applying this many migrations (useful for partial dry-runs). */
  limit?: number;
}

export async function runMigrations(
  pool: MigrationPool,
  options: RunMigrationsOptions = {}
): Promise<{ applied: string[]; skipped: string[] }> {
  const directory = options.directory
    ?? new URL("./migrations", import.meta.url).pathname;
  const files = readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  await pool.query(MIGRATIONS_DDL);
  const existing = await pool.query<{ id: string }>(
    `select id from ${MIGRATIONS_TABLE}`
  );
  const applied = new Set(existing.rows.map((r) => r.id));

  const result: { applied: string[]; skipped: string[] } = { applied: [], skipped: [] };
  let appliedThisRun = 0;

  for (const file of files) {
    if (applied.has(file)) {
      result.skipped.push(file);
      continue;
    }
    if (options.limit !== undefined && appliedThisRun >= options.limit) {
      break;
    }
    const sql = readFileSync(join(directory, file), "utf8");
    const checksum = await sha256(sql);
    await pool.withClient(async (client: MigrationClient) => {
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          `insert into ${MIGRATIONS_TABLE} (id, checksum) values ($1, $2)`,
          [file, checksum]
        );
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    });
    result.applied.push(file);
    appliedThisRun++;
  }

  return result;
}

async function sha256(input: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(input).digest("hex");
}
