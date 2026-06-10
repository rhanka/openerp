/// <reference types="node" />
/**
 * Tests for apps/worker/src/main.ts — runOpenERPWorker + main() (A0-3).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runOpenERPWorker,
  type Queryable,
  type PoolHandle,
  type WorkerTicks,
  type WorkerIntervals,
  type WorkerOptions
} from "../src/main.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Instant sleep — never actually waits. */
const noopSleep = (): Promise<void> => Promise.resolve();

function makePool(): Queryable & PoolHandle {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined)
  };
}

function makeTicks(): WorkerTicks {
  return {
    scheduledDelivery: vi.fn().mockResolvedValue(undefined),
    recurringBilling: vi.fn().mockResolvedValue(undefined),
    webhookEgress: vi.fn().mockResolvedValue(undefined)
  };
}

const BASE_INTERVALS: WorkerIntervals = {
  scheduledDeliveryMs: 100,
  recurringBillingMs: 100,
  webhookEgressMs: 100
};

function makeOptions(overrides: Partial<WorkerOptions> = {}): WorkerOptions {
  const controller = new AbortController();
  const pool = makePool();
  const ticks = makeTicks();
  const listOrgs = vi.fn().mockResolvedValue(["org-1", "org-2"]);

  return {
    pool,
    listOrgs,
    ticks,
    intervals: BASE_INTERVALS,
    signal: controller.signal,
    sleep: noopSleep,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Test 1: each tick is called once per org after 1 cycle (abort before sleep)
// ---------------------------------------------------------------------------
describe("runOpenERPWorker", () => {
  it("calls each domain tick once per org in the first cycle", async () => {
    const controller = new AbortController();
    const pool = makePool();
    const ticks = makeTicks();
    const orgs = ["org-a", "org-b", "org-c"];
    const listOrgs = vi.fn().mockResolvedValue(orgs);

    // Abort immediately after the first cycle by making sleep abort.
    const sleep = (_ms: number, signal?: AbortSignal): Promise<void> => {
      controller.abort();
      return signal
        ? new Promise<void>((resolve) => {
            if (signal.aborted) { resolve(); return; }
            signal.addEventListener("abort", () => resolve(), { once: true });
          })
        : Promise.resolve();
    };

    await runOpenERPWorker({
      pool,
      listOrgs,
      ticks,
      intervals: BASE_INTERVALS,
      signal: controller.signal,
      sleep
    });

    // Each domain: 1 call per org × 3 orgs = 3 calls
    expect(ticks.scheduledDelivery).toHaveBeenCalledTimes(3);
    expect(ticks.recurringBilling).toHaveBeenCalledTimes(3);
    expect(ticks.webhookEgress).toHaveBeenCalledTimes(3);

    // Verify it was called with the right db and orgId for each org
    for (const org of orgs) {
      expect(ticks.scheduledDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ db: pool, organizationId: org })
      );
      expect(ticks.recurringBilling).toHaveBeenCalledWith(
        expect.objectContaining({ db: pool, organizationId: org })
      );
      expect(ticks.webhookEgress).toHaveBeenCalledWith(
        expect.objectContaining({ db: pool, organizationId: org })
      );
    }
  });

  // -------------------------------------------------------------------------
  // Test 2: abort signal cancels all loops; main resolves
  // -------------------------------------------------------------------------
  it("resolves when the abort signal fires before the first iteration", async () => {
    const controller = new AbortController();
    controller.abort(); // already aborted

    const pool = makePool();
    const ticks = makeTicks();
    const listOrgs = vi.fn().mockResolvedValue(["org-1"]);

    await expect(
      runOpenERPWorker({
        pool,
        listOrgs,
        ticks,
        intervals: BASE_INTERVALS,
        signal: controller.signal,
        sleep: noopSleep
      })
    ).resolves.toBeUndefined();

    // No ticks should have been called — signal was already aborted
    expect(ticks.scheduledDelivery).not.toHaveBeenCalled();
    expect(ticks.recurringBilling).not.toHaveBeenCalled();
    expect(ticks.webhookEgress).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 3: main() throws if OPENERP_DATABASE_URL is missing
  // -------------------------------------------------------------------------
  it("main() throws when OPENERP_DATABASE_URL is not set", async () => {
    const { main } = await import("../src/main.js");

    const original = process.env["OPENERP_DATABASE_URL"];
    delete process.env["OPENERP_DATABASE_URL"];

    try {
      await expect(main()).rejects.toThrow("OPENERP_DATABASE_URL");
    } finally {
      if (original !== undefined) {
        process.env["OPENERP_DATABASE_URL"] = original;
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 4: tenants are iterated serially within each tick (serial order)
  // -------------------------------------------------------------------------
  it("iterates tenants serially within each domain tick", async () => {
    const controller = new AbortController();
    const pool = makePool();
    const callOrder: string[] = [];

    let cycleCount = 0;
    const listOrgs = vi.fn().mockResolvedValue(["t1", "t2", "t3"]);

    const sleep = (_ms: number, signal?: AbortSignal): Promise<void> => {
      cycleCount += 1;
      if (cycleCount >= 1) {
        controller.abort();
      }
      return signal
        ? new Promise<void>((resolve) => {
            if (signal.aborted) { resolve(); return; }
            signal.addEventListener("abort", () => resolve(), { once: true });
          })
        : Promise.resolve();
    };

    const ticks: WorkerTicks = {
      scheduledDelivery: vi.fn().mockImplementation(async ({ organizationId }: { db: Queryable; organizationId: string; actorUserId: string }) => {
        callOrder.push(`sd:${organizationId}`);
      }),
      recurringBilling: vi.fn().mockResolvedValue(undefined),
      webhookEgress: vi.fn().mockResolvedValue(undefined)
    };

    await runOpenERPWorker({
      pool,
      listOrgs,
      ticks,
      intervals: BASE_INTERVALS,
      signal: controller.signal,
      sleep
    });

    // Tenants must appear in order for scheduled-delivery
    const sdCalls = callOrder.filter((c) => c.startsWith("sd:"));
    expect(sdCalls).toEqual(["sd:t1", "sd:t2", "sd:t3"]);
  });

  // -------------------------------------------------------------------------
  // Test 5: a failing tenant tick does NOT kill the loop
  // -------------------------------------------------------------------------
  it("continues after a tenant tick throws", async () => {
    const controller = new AbortController();
    const pool = makePool();

    let firstCycle = true;
    const listOrgs = vi.fn().mockResolvedValue(["org-ok", "org-fail", "org-ok2"]);

    const sleep = (_ms: number, signal?: AbortSignal): Promise<void> => {
      if (firstCycle) {
        firstCycle = false;
        controller.abort();
      }
      return signal
        ? new Promise<void>((resolve) => {
            if (signal.aborted) { resolve(); return; }
            signal.addEventListener("abort", () => resolve(), { once: true });
          })
        : Promise.resolve();
    };

    const ticks: WorkerTicks = {
      scheduledDelivery: vi.fn().mockImplementation(async ({ organizationId }: { db: Queryable; organizationId: string; actorUserId: string }) => {
        if (organizationId === "org-fail") {
          throw new Error("simulated tenant failure");
        }
      }),
      recurringBilling: vi.fn().mockResolvedValue(undefined),
      webhookEgress: vi.fn().mockResolvedValue(undefined)
    };

    // Should resolve, not reject
    await expect(
      runOpenERPWorker({
        pool,
        listOrgs,
        ticks,
        intervals: BASE_INTERVALS,
        signal: controller.signal,
        sleep,
        onError: () => {} // silence console
      })
    ).resolves.toBeUndefined();

    // org-ok and org-ok2 were still called despite org-fail throwing
    expect(ticks.scheduledDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-ok" })
    );
    expect(ticks.scheduledDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-ok2" })
    );
  });

  // -------------------------------------------------------------------------
  // Test 6: onError callback receives the error with the domain name
  // -------------------------------------------------------------------------
  it("forwards error to onError callback with domain name", async () => {
    const controller = new AbortController();
    const pool = makePool();
    const errors: Array<{ err: unknown; name: string }> = [];

    let cycleCount = 0;
    const listOrgs = vi.fn().mockResolvedValue(["org-1"]);

    const sleep = (_ms: number, signal?: AbortSignal): Promise<void> => {
      cycleCount += 1;
      if (cycleCount >= 3) {
        controller.abort();
      }
      return signal
        ? new Promise<void>((resolve) => {
            if (signal.aborted) { resolve(); return; }
            signal.addEventListener("abort", () => resolve(), { once: true });
          })
        : Promise.resolve();
    };

    const boom = new Error("domain-failure");
    const ticks: WorkerTicks = {
      scheduledDelivery: vi.fn().mockRejectedValue(boom),
      recurringBilling: vi.fn().mockResolvedValue(undefined),
      webhookEgress: vi.fn().mockResolvedValue(undefined)
    };

    await runOpenERPWorker({
      pool,
      listOrgs,
      ticks,
      intervals: BASE_INTERVALS,
      signal: controller.signal,
      sleep,
      onError: (err, name) => {
        errors.push({ err, name });
      }
    });

    // At least one error recorded with the correct domain name
    expect(errors.length).toBeGreaterThan(0);
    const firstError = errors[0];
    expect(firstError?.name).toBe("scheduled-delivery");
    expect(firstError?.err).toBe(boom);
  });
});
