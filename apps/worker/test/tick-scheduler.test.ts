import { describe, expect, it, vi } from "vitest";

import { runTickLoop } from "../src/tick-scheduler";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAbortedSignal(): AbortSignal {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
}

function noop(): Promise<void> {
  return Promise.resolve();
}

// A sleep that immediately aborts the provided controller on first call.
function makeAbortingSleep(controller: AbortController) {
  return async (_ms: number, signal?: AbortSignal): Promise<void> => {
    controller.abort();
    // Resolve the sleep promise without waiting; the loop will see aborted on
    // next check.
    void signal;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runTickLoop", () => {
  it("rejects when intervalMs is 0", async () => {
    const controller = new AbortController();
    await expect(
      runTickLoop({
        name: "x",
        intervalMs: 0,
        signal: controller.signal,
        runOnce: noop
      })
    ).rejects.toThrow("intervalMs must be > 0");
  });

  it("rejects when intervalMs is negative", async () => {
    const controller = new AbortController();
    await expect(
      runTickLoop({
        name: "x",
        intervalMs: -1,
        signal: controller.signal,
        runOnce: noop
      })
    ).rejects.toThrow("intervalMs must be > 0");
  });

  it("exits immediately without calling runOnce when signal is already aborted", async () => {
    const runOnce = vi.fn().mockResolvedValue(undefined);
    await runTickLoop({
      name: "already-aborted",
      intervalMs: 100,
      signal: makeAbortedSignal(),
      runOnce
    });
    expect(runOnce).not.toHaveBeenCalled();
  });

  it("calls runOnce exactly once before the aborting sleep resolves", async () => {
    const controller = new AbortController();
    const runOnce = vi.fn().mockResolvedValue(undefined);
    const sleep = makeAbortingSleep(controller);

    await runTickLoop({
      name: "once-then-abort",
      intervalMs: 100,
      signal: controller.signal,
      runOnce,
      sleep
    });

    expect(runOnce).toHaveBeenCalledOnce();
  });

  it("forwards runOnce errors to onError and continues the loop", async () => {
    const controller = new AbortController();
    const errors: Array<{ err: unknown; name: string }> = [];
    let callCount = 0;

    const runOnce = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error("transient");
      // Second call succeeds; let the loop sleep then abort
    });

    const sleep = vi.fn().mockImplementation(async (_ms: number, signal?: AbortSignal) => {
      if (callCount >= 2) controller.abort();
      void signal;
    });

    await runTickLoop({
      name: "error-forwarded",
      intervalMs: 50,
      signal: controller.signal,
      runOnce,
      sleep,
      onError: (err, name) => errors.push({ err, name })
    });

    expect(errors).toHaveLength(1);
    expect((errors[0]!.err as Error).message).toBe("transient");
    expect(errors[0]!.name).toBe("error-forwarded");
    expect(runOnce).toHaveBeenCalledTimes(2);
  });

  it("does not kill the loop when onError itself throws", async () => {
    const controller = new AbortController();
    let callCount = 0;

    const runOnce = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error("boom");
    });

    const sleep = vi.fn().mockImplementation(async () => {
      if (callCount >= 2) controller.abort();
    });

    // onError throws on first call
    const onError = vi.fn().mockImplementation(() => {
      throw new Error("handler exploded");
    });

    await runTickLoop({
      name: "bad-onerror",
      intervalMs: 50,
      signal: controller.signal,
      runOnce,
      sleep,
      onError
    });

    // Loop reached the second iteration despite onError throwing
    expect(runOnce).toHaveBeenCalledTimes(2);
  });

  it("passes intervalMs to the injected sleep", async () => {
    const controller = new AbortController();
    const sleep = vi.fn().mockImplementation(async () => {
      controller.abort();
    });

    await runTickLoop({
      name: "sleep-interval",
      intervalMs: 777,
      signal: controller.signal,
      runOnce: noop,
      sleep
    });

    expect(sleep).toHaveBeenCalledWith(777, controller.signal);
  });

  it("default sleep resolves early when signal is aborted before the interval elapses", async () => {
    const controller = new AbortController();
    let runOnceCount = 0;

    const runOnce = async (): Promise<void> => {
      runOnceCount++;
    };

    // Use real default sleep (200 ms), abort after 50 ms
    const started = Date.now();
    const abortTimer = setTimeout(() => controller.abort(), 50);

    await runTickLoop({
      name: "default-sleep-abort",
      intervalMs: 200,
      signal: controller.signal,
      runOnce
      // no sleep override — uses real defaultSleep
    });

    clearTimeout(abortTimer);
    const elapsed = Date.now() - started;

    // Should finish well under 200 ms
    expect(elapsed).toBeLessThan(180);
    // runOnce was called once before the sleep
    expect(runOnceCount).toBe(1);
  }, 5000);
});
