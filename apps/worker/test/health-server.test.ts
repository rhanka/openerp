/// <reference types="node" />
/**
 * Tests for apps/worker/src/health-server.ts (AUTOMATION-RUNTIME A0-5).
 */

import { describe, it, expect, afterEach } from "vitest";
import { startHealthServer, type HealthServerHandle } from "../src/health-server.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function get(port: number, path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function getPort(handle: HealthServerHandle): number {
  const addr = handle.server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Unexpected server address: " + String(addr));
  }
  return addr.port;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("startHealthServer", () => {
  const handles: HealthServerHandle[] = [];

  afterEach(async () => {
    for (const h of handles.splice(0)) {
      await h.close();
    }
  });

  function start(opts: Omit<Parameters<typeof startHealthServer>[0], "port" | "signal"> & { signal?: AbortSignal }) {
    const controller = new AbortController();
    const handle = startHealthServer({
      port: 0,
      signal: opts.signal ?? controller.signal,
      ...opts,
    });
    handles.push(handle);
    return { handle, controller };
  }

  it("GET /healthz returns 200 + { ok: true }", async () => {
    const { handle } = start({});
    const port = getPort(handle);
    const { status, body } = await get(port, "/healthz");
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("GET /readyz returns 200 + { ready: true } when dbPing resolves true", async () => {
    const { handle } = start({
      dbPing: async () => true,
    });
    const port = getPort(handle);
    const { status, body } = await get(port, "/readyz");
    expect(status).toBe(200);
    expect(body).toEqual({ ready: true });
  });

  it("GET /readyz returns 503 + { ready: false } when dbPing resolves false", async () => {
    const { handle } = start({
      dbPing: async () => false,
    });
    const port = getPort(handle);
    const { status, body } = await get(port, "/readyz");
    expect(status).toBe(503);
    expect(body).toEqual({ ready: false });
  });

  it("GET /readyz returns 503 when dbPing throws", async () => {
    const { handle } = start({
      dbPing: async () => {
        throw new Error("db unreachable");
      },
    });
    const port = getPort(handle);
    const { status, body } = await get(port, "/readyz");
    expect(status).toBe(503);
    expect(body).toEqual({ ready: false });
  });

  it("GET /readyz returns 200 when no dbPing is provided", async () => {
    const { handle } = start({});
    const port = getPort(handle);
    const { status, body } = await get(port, "/readyz");
    expect(status).toBe(200);
    expect(body).toEqual({ ready: true });
  });

  it("GET /other-path returns 404", async () => {
    const { handle } = start({});
    const port = getPort(handle);
    const { status } = await get(port, "/unknown");
    expect(status).toBe(404);
  });

  it("server stops accepting connections after abort signal fires", async () => {
    const controller = new AbortController();
    const handle = startHealthServer({
      port: 0,
      signal: controller.signal,
    });
    handles.push(handle);
    const port = getPort(handle);

    // Verify it's up first
    const before = await get(port, "/healthz");
    expect(before.status).toBe(200);

    // Abort and wait for server to close
    controller.abort();
    await handle.close();

    // Now connections should fail
    await expect(fetch(`http://127.0.0.1:${port}/healthz`)).rejects.toThrow();
  });
});
