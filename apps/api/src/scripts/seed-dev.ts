/* eslint-disable no-console */
import process from "node:process";

import { createPgPool } from "../db/pg-client";
import { runSeedDev } from "./seed-dev-lib";

// Dev seeder. Creates a deterministic Northwind Services tenant with one
// active admin user, a handful of audit_events, and a couple of approval
// requests so the web app can hit live data via OPENERP_DEV_ORG_ID /
// OPENERP_DEV_USER_ID. Idempotent: re-running drops and recreates the rows
// keyed by the org slug "northwind-services".
//
// Usage:
//   OPENERP_DATABASE_URL=postgresql://openerp:openerp@127.0.0.1:5433/openerp_dev \
//     npm run seed:dev -w @sentropic/openerp-api
//
// The script bootstraps as the connection user (typically the owner, which
// bypasses RLS for the setup phase). It does NOT touch the openerp_app role.

async function main(): Promise<void> {
  const url = process.env.OPENERP_DATABASE_URL;
  if (!url) {
    console.error("OPENERP_DATABASE_URL is required");
    process.exit(2);
  }
  const pool = createPgPool({ connectionString: url });
  try {
    const result = await runSeedDev(pool);
    console.log(JSON.stringify(result, null, 2));
    console.log("\nNext step (set in apps/web/.env):");
    console.log(`  OPENERP_DEV_ORG_ID=${result.organizationId}`);
    console.log(`  OPENERP_DEV_USER_ID=${result.userIdentityId}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
