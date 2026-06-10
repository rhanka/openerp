/**
 * Tests for OPENERP_DISABLE_ADMIN_TICKS feature flag.
 *
 * When the flag is set to "true", the three HTTP admin-tick endpoints must
 * return 410 GONE with { code: "ADMIN_TICK_DEPRECATED" }.
 *
 * When the flag is absent (default), the endpoints proceed normally.
 *
 * AUTOMATION-RUNTIME sub-slice A0-6
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// ---------------------------------------------------------------------------
// Minimal Queryable — returns empty rows for all queries.
// Sufficient to let the reporting and billing /run handlers complete without
// hitting a real database (no due rows → result with zero processed items).
// ---------------------------------------------------------------------------
function makeEmptyDb(): Queryable {
  return {
    async query<T = unknown>(): Promise<{ rows: T[] }> {
      return { rows: [] };
    },
  };
}

const TENANT_HEADERS = {
  "content-type": "application/json",
  "x-organization-id": "org_test_001",
  "x-user-identity-id": "user_test_001",
};

// ---------------------------------------------------------------------------
// describe: flag enabled → 410 on all three endpoints
// ---------------------------------------------------------------------------
describe("OPENERP_DISABLE_ADMIN_TICKS=true → 410 GONE", () => {
  beforeEach(() => {
    process.env.OPENERP_DISABLE_ADMIN_TICKS = "true";
  });

  afterEach(() => {
    delete process.env.OPENERP_DISABLE_ADMIN_TICKS;
  });

  it("POST /reporting/scheduled-deliveries/run returns 410 with ADMIN_TICK_DEPRECATED", async () => {
    const app = buildApp({ db: makeEmptyDb(), resolveTenant: headerTenantResolver });

    const res = await app.request("/reporting/scheduled-deliveries/run", {
      method: "POST",
      headers: TENANT_HEADERS,
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(410);
    const data = await res.json() as { code: string };
    expect(data.code).toBe("ADMIN_TICK_DEPRECATED");
  });

  it("POST /billing/recurring-schedules/run returns 410 with ADMIN_TICK_DEPRECATED", async () => {
    const app = buildApp({ db: makeEmptyDb(), resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules/run", {
      method: "POST",
      headers: TENANT_HEADERS,
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(410);
    const data = await res.json() as { code: string };
    expect(data.code).toBe("ADMIN_TICK_DEPRECATED");
  });

  it("POST /webhook/_admin/tick returns 410 with ADMIN_TICK_DEPRECATED", async () => {
    const app = buildApp({ db: makeEmptyDb(), resolveTenant: headerTenantResolver });

    const res = await app.request("/webhook/_admin/tick", {
      method: "POST",
      headers: TENANT_HEADERS,
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(410);
    const data = await res.json() as { code: string };
    expect(data.code).toBe("ADMIN_TICK_DEPRECATED");
  });
});

// ---------------------------------------------------------------------------
// describe: flag absent → endpoints proceed normally (not 410)
// ---------------------------------------------------------------------------
describe("OPENERP_DISABLE_ADMIN_TICKS unset → endpoints operate normally", () => {
  beforeEach(() => {
    delete process.env.OPENERP_DISABLE_ADMIN_TICKS;
  });

  afterEach(() => {
    delete process.env.OPENERP_DISABLE_ADMIN_TICKS;
  });

  it("POST /reporting/scheduled-deliveries/run returns non-410 (2xx)", async () => {
    const app = buildApp({ db: makeEmptyDb(), resolveTenant: headerTenantResolver });

    const res = await app.request("/reporting/scheduled-deliveries/run", {
      method: "POST",
      headers: TENANT_HEADERS,
      body: JSON.stringify({}),
    });

    expect(res.status).not.toBe(410);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(400);
  });
});
