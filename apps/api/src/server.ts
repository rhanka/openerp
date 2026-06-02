import { serve, type ServerType } from "@hono/node-server";

import type { Queryable } from "./db/client";
import { type BuildAppOptions, buildApp, headerTenantResolver } from "./http/app";
import { buildFoundationRoutes } from "./http/routes/foundation";

// Server bootstrap. Two surfaces:
//   - describeApi(): legacy declarative route metadata kept for the workspace
//     check scripts.
//   - startServer(): wires the Hono app via @hono/node-server.serve().
//
// The Postgres Queryable adapter is injected by the caller — see
// docs/superpowers/plans/2026-05-14-foundation-implementation.md lot 0 for the
// pg client work that supplies it. For tests, an in-memory fake Queryable is
// passed in directly (cf. test/foundation/app.test.ts).

export function describeApi() {
  return {
    name: "OpenERP API",
    routes: buildFoundationRoutes()
  };
}

export interface StartServerOptions extends BuildAppOptions {
  port?: number;
  hostname?: string;
}

export interface RunningServer {
  port: number;
  hostname: string;
  server: ServerType;
  stop: () => Promise<void>;
}

export function startServer(options: StartServerOptions): RunningServer {
  const app = buildApp(options);
  const port = options.port ?? Number(process.env.OPENERP_API_PORT ?? "4000");
  const hostname = options.hostname ?? "127.0.0.1";
  const server = serve({ fetch: app.fetch, port, hostname });
  return {
    port,
    hostname,
    server,
    async stop() {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  };
}

// Re-export the header resolver so callers can build the default tenant
// resolver from anywhere without reaching into ./http/app.
export { headerTenantResolver } from "./http/app";

// Re-export the JWT-verifying resolver so callers can wire production auth
// without reaching into ./http/tenant-resolvers.
export { createJwtTenantResolver } from "./http/tenant-resolvers";

export type { Queryable };
