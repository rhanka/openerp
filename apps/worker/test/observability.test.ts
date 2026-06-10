/**
 * Tests for apps/worker/src/observability.ts (AUTOMATION-RUNTIME A0-5).
 */

import { describe, it, expect, vi } from "vitest";
import { withTickInstrumentation, type TickMetrics } from "../src/observability.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LogEvent = {
  domain: string;
  tenantId: string;
  metrics?: TickMetrics;
  error?: { message: string };
};

function makeArgs(organizationId = "org-1") {
  return { organizationId, db: {}, actorUserId: "system" } as {
    organizationId: string;
    db: unknown;
    actorUserId: string;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("withTickInstrumentation", () => {
  it("emits metrics on success path with correct counts", async () => {
    const events: LogEvent[] = [];
    const logger = vi.fn((e: LogEvent) => events.push(e));

    const fn = vi.fn().mockResolvedValue({
      processed: 5,
      succeeded: 4,
      failed: 1,
      asOf: new Date("2026-06-10T00:00:00.000Z"),
    });

    const wrapped = withTickInstrumentation(fn, {
      domain: "webhook-egress",
      logger,
    });

    const result = await wrapped(makeArgs("org-abc"));

    expect(result.processed).toBe(5);
    expect(logger).toHaveBeenCalledTimes(1);

    const event = events[0];
    expect(event).toBeDefined();
    expect(event!.domain).toBe("webhook-egress");
    expect(event!.tenantId).toBe("org-abc");
    expect(event!.metrics).toBeDefined();
    expect(event!.metrics!.processed).toBe(5);
    expect(event!.metrics!.succeeded).toBe(4);
    expect(event!.metrics!.failed).toBe(1);
    expect(event!.metrics!.asOf).toBe("2026-06-10T00:00:00.000Z");
    expect(event!.error).toBeUndefined();
  });

  it("logs an error event and rethrows when fn throws", async () => {
    const events: LogEvent[] = [];
    const logger = vi.fn((e: LogEvent) => events.push(e));

    const boom = new Error("simulated-failure");
    const fn = vi.fn().mockRejectedValue(boom);

    const wrapped = withTickInstrumentation(fn, {
      domain: "scheduled-delivery",
      logger,
    });

    await expect(wrapped(makeArgs("org-fail"))).rejects.toThrow("simulated-failure");

    expect(logger).toHaveBeenCalledTimes(1);
    const event = events[0];
    expect(event).toBeDefined();
    expect(event!.domain).toBe("scheduled-delivery");
    expect(event!.tenantId).toBe("org-fail");
    expect(event!.error).toBeDefined();
    expect(event!.error!.message).toBe("simulated-failure");
    expect(event!.metrics).toBeUndefined();
  });

  it("uses the injected clock for durationMs", async () => {
    const events: LogEvent[] = [];
    const logger = vi.fn((e: LogEvent) => events.push(e));

    let tick = 1000;
    const clock = vi.fn(() => {
      const t = tick;
      tick += 42;
      return t;
    });

    const fn = vi.fn().mockResolvedValue({
      processed: 1,
      succeeded: 1,
      failed: 0,
    });

    const wrapped = withTickInstrumentation(fn, {
      domain: "workflow",
      logger,
      clock,
    });

    await wrapped(makeArgs("org-t"));

    expect(events[0]!.metrics!.durationMs).toBe(42);
  });

  it("uses the default asOf when fn result has no asOf", async () => {
    const events: LogEvent[] = [];
    const logger = vi.fn((e: LogEvent) => events.push(e));

    const fn = vi.fn().mockResolvedValue({
      processed: 0,
      succeeded: 0,
      failed: 0,
      // no asOf
    });

    const wrapped = withTickInstrumentation(fn, {
      domain: "recurring-billing",
      logger,
    });

    const before = new Date().toISOString();
    await wrapped(makeArgs("org-z"));
    const after = new Date().toISOString();

    const asOf = events[0]!.metrics!.asOf;
    expect(asOf >= before).toBe(true);
    expect(asOf <= after).toBe(true);
  });
});
