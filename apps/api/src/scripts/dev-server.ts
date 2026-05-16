/* eslint-disable no-console */
import process from "node:process";

import { createPgPool } from "../db/pg-client";
import { headerTenantResolver, startServer } from "../server";

// Dev API entrypoint. Wires the pg pool to the Hono app and listens on
// OPENERP_API_PORT (default 4000). The SvelteKit dev server hits this via
// OPENERP_API_URL (apps/web/.env). Passkey routes intentionally remain
// disabled here for now — the seeder bypasses passkey by injecting org/user
// IDs via headers, and a follow-up commit will wire passkey + session JWT.

async function main(): Promise<void> {
  const url = process.env.OPENERP_DATABASE_URL;
  if (!url) {
    console.error("OPENERP_DATABASE_URL is required");
    process.exit(2);
  }
  const pool = createPgPool({ connectionString: url });
  const handle = startServer({
    db: pool,
    resolveTenant: headerTenantResolver
  });
  console.log(`OpenERP API listening on http://${handle.hostname}:${handle.port}`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\nReceived ${signal}, shutting down…`);
    try {
      await handle.stop();
    } finally {
      await pool.end();
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
