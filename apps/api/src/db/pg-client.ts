import { Pool, type PoolClient, type PoolConfig } from "pg";

import type { Queryable } from "./client";

// pg-based Queryable adapter (Lot 0 closure). Wraps a pg.Pool — production
// path. Tests still use the in-memory fakes in apps/api/test/foundation/.

export interface PgClientConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | PoolConfig["ssl"];
  max?: number;
}

export interface PgPoolHandle extends Queryable {
  /** Run inside a single connection, useful when several statements must share
   *  the same session (e.g. `set_config('app.current_organization_id', ...)`). */
  withClient<T>(fn: (client: ClientQueryable) => Promise<T>): Promise<T>;
  /** Close the pool. Idempotent. */
  end(): Promise<void>;
}

export interface ClientQueryable extends Queryable {
  /** Lower-level access for transactions. */
  raw: PoolClient;
}

export function createPgPool(config: PgClientConfig = {}): PgPoolHandle {
  const pool = new Pool({
    connectionString: config.connectionString ?? process.env.OPENERP_DATABASE_URL,
    host: config.host ?? process.env.PGHOST,
    port: config.port ?? (process.env.PGPORT ? Number(process.env.PGPORT) : undefined),
    database: config.database ?? process.env.PGDATABASE,
    user: config.user ?? process.env.PGUSER,
    password: config.password ?? process.env.PGPASSWORD,
    ssl: config.ssl,
    max: config.max ?? 10
  });

  return {
    async query<T = unknown>(text: string, values: unknown[] = []) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[] };
    },
    async withClient<T>(fn: (client: ClientQueryable) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        const queryable: ClientQueryable = {
          raw: client,
          async query<U = unknown>(text: string, values: unknown[] = []) {
            const result = await client.query(text, values);
            return { rows: result.rows as U[] };
          }
        };
        return await fn(queryable);
      } finally {
        client.release();
      }
    },
    async end() {
      await pool.end();
    }
  };
}
