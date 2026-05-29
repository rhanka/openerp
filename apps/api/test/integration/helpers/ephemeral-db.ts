/**
 * Provisions a short-lived Postgres database for a single integration test
 * file, then drops it in teardown. This removes any risk of cross-file state
 * contamination when vitest runs multiple integration files against the same
 * server.
 *
 * Usage:
 *   const db = await createEphemeralDb("pgsmoke");
 *   // db.connectionString -> postgresql://…/openerp_it_pgsmoke
 *   await db.drop();   // call in afterAll
 *
 * CREATE DATABASE / DROP DATABASE cannot run inside a transaction; the client
 * used here is kept in autocommit mode (no explicit BEGIN issued).
 */

import { Client } from "pg";

export interface EphemeralDb {
  /** Full connection string pointing to the newly-created database. */
  connectionString: string;
  /** Terminate all sessions and drop the database. */
  drop(): Promise<void>;
}

/**
 * @param suffix  Short identifier unique per test file, e.g. "pgsmoke" or "seeddev".
 *                The created database is named `openerp_it_<suffix>`.
 */
export async function createEphemeralDb(suffix: string): Promise<EphemeralDb> {
  const baseUrl = process.env.OPENERP_INTEGRATION_DATABASE_URL!;

  // Parse the base connection string to build a maintenance-DB URL.
  const parsed = new URL(baseUrl);
  const maintenanceUrl = new URL(baseUrl);
  maintenanceUrl.pathname = "/postgres";

  const dbName = `openerp_it_${suffix}`;

  // Connect to the maintenance database (autocommit — no BEGIN).
  const admin = new Client({ connectionString: maintenanceUrl.toString() });
  await admin.connect();

  try {
    // Drop any leftover from a previous aborted run.
    await admin.query(
      `select pg_terminate_backend(pid)
         from pg_stat_activity
        where datname = $1 and pid <> pg_backend_pid()`,
      [dbName]
    );
    await admin.query(`drop database if exists "${dbName}"`);
    await admin.query(`create database "${dbName}"`);
  } finally {
    await admin.end();
  }

  // Build the connection string for the new database.
  const newUrl = new URL(baseUrl);
  newUrl.pathname = `/${dbName}`;
  const connectionString = newUrl.toString();

  return {
    connectionString,
    async drop() {
      const dropper = new Client({ connectionString: maintenanceUrl.toString() });
      await dropper.connect();
      try {
        await dropper.query(
          `select pg_terminate_backend(pid)
             from pg_stat_activity
            where datname = $1 and pid <> pg_backend_pid()`,
          [dbName]
        );
        await dropper.query(`drop database if exists "${dbName}"`);
      } finally {
        await dropper.end();
      }
    }
  };
}
