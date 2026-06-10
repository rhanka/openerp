/**
 * runTickLoop — the generic tick primitive driving each domain loop in the
 * autonomous worker (A0-3 will wire reporting / billing / webhook / workflow
 * adapters on top).
 *
 * Contract:
 *   - Loops while signal.aborted === false.
 *   - Awaits runOnce(); if it throws, the error is forwarded to onError
 *     (defaults to console.error) and the loop CONTINUES — a single domain's
 *     transient failure must not kill the loop.
 *   - Sleeps for intervalMs between iterations using the injected sleep
 *     (default setTimeout).
 *   - Returns (resolves) when the signal aborts, after the current runOnce
 *     completes.
 */

export interface TickLoopOptions {
  /** Human label for logs and onError context (e.g. "scheduled-delivery"). */
  name: string;
  /** Interval between iterations (ms). Must be > 0. */
  intervalMs: number;
  /** Abort signal: when fired the loop completes after the in-flight runOnce. */
  signal: AbortSignal;
  /** The per-iteration work. Must throw on failure (logged + swallowed). */
  runOnce: () => Promise<void>;
  /** Override sleep for tests. Default = setTimeout. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Custom error sink. Default = console.error. */
  onError?: (err: unknown, name: string) => void;
}

const defaultSleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const handle = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(handle);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    signal?.addEventListener("abort", onAbort);
  });

const defaultOnError = (err: unknown, name: string): void => {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`[tick-scheduler:${name}] runOnce error: ${message}`);
};

export async function runTickLoop(opts: TickLoopOptions): Promise<void> {
  if (!Number.isFinite(opts.intervalMs) || opts.intervalMs <= 0) {
    throw new Error(`runTickLoop[${opts.name}]: intervalMs must be > 0`);
  }
  const sleep = opts.sleep ?? defaultSleep;
  const onError = opts.onError ?? defaultOnError;

  while (!opts.signal.aborted) {
    try {
      await opts.runOnce();
    } catch (err) {
      try {
        onError(err, opts.name);
      } catch {
        // never let the error handler kill the loop
      }
    }
    if (opts.signal.aborted) return;
    await sleep(opts.intervalMs, opts.signal);
  }
}
