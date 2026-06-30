/* eslint-disable no-console */
import process from "node:process";

import { createPgPool } from "../db/pg-client.js";
import { startServer } from "../server.js";
import { buildDevServerOptions } from "./dev-server-options.js";

// Cluster/production API entrypoint. Wires the pg pool to the Hono app and
// listens on 0.0.0.0:OPENERP_API_PORT (default 3000, matching the Deployment
// containerPort + Service). Tenant resolution uses the JWT-verifying resolver
// by default — header trust stays OFF unless OPENERP_TRUST_HEADERS=1.

async function main(): Promise<void> {
  const url = process.env.OPENERP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("OPENERP_DATABASE_URL is required");
    process.exit(2);
  }
  const pool = createPgPool({ connectionString: url });
  const handle = startServer({
    ...buildDevServerOptions(pool),
    port: Number(process.env.OPENERP_API_PORT ?? process.env.PORT ?? "3000"),
    hostname: "0.0.0.0"
  });
  console.log(`OpenERP API listening on http://${handle.hostname}:${handle.port}`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down…`);
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
