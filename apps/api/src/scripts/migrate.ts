/* eslint-disable no-console */
import process from "node:process";

import { runMigrations } from "../db/migrate";
import { createPgPool } from "../db/pg-client";

// Dev/CI migration runner. Reads OPENERP_DATABASE_URL, applies every SQL
// file under src/db/migrations/ in order, records the applied set in the
// _openerp_migrations ledger. Idempotent.
//
// Usage:
//   OPENERP_DATABASE_URL=postgresql://openerp:openerp@127.0.0.1:5433/openerp_dev \
//     npm run migrate -w @sentropic/openerp-api

async function main(): Promise<void> {
  const url = process.env.OPENERP_DATABASE_URL;
  if (!url) {
    console.error("OPENERP_DATABASE_URL is required");
    process.exit(2);
  }
  const pool = createPgPool({ connectionString: url });
  try {
    const result = await runMigrations(pool, {
      directory: new URL("../db/migrations", import.meta.url).pathname
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
