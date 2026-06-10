/**
 * Worker health HTTP server (AUTOMATION-RUNTIME A0-5).
 *
 * Exposes two endpoints:
 *   GET /healthz  — always 200 { ok: true }
 *   GET /readyz   — 200 { ready: true } if dbPing resolves true; 503 otherwise
 */

import { createServer, type Server } from "node:http";

export interface HealthServerOptions {
  port: number;
  /** Returns true if the DB is reachable. */
  dbPing?: () => Promise<boolean>;
  signal: AbortSignal;
}

export interface HealthServerHandle {
  server: Server;
  close: () => Promise<void>;
}

/**
 * Start a tiny HTTP server exposing /healthz (always 200) and /readyz
 * (200 only if dbPing resolves true). Closes gracefully when signal aborts.
 */
export function startHealthServer(opts: HealthServerOptions): HealthServerHandle {
  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";

    if (url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url === "/readyz") {
      let ready = true;
      if (opts.dbPing) {
        try {
          ready = await opts.dbPing();
        } catch {
          ready = false;
        }
      }
      res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ready }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(opts.port);

  opts.signal.addEventListener("abort", () => {
    server.close();
  });

  return {
    server,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
