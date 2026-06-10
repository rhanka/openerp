import type { WebhookEgressFailureKind } from "./webhook-egress-port";

// ---------------------------------------------------------------------------
// Backoff schedule (Q2 recommended default — confirmed):
//   Attempt 1 fails  -> retry after 30s
//   Attempt 2 fails  -> retry after 2m
//   Attempt 3 fails  -> retry after 10m
//   Attempt 4 fails  -> retry after 1h
//   Attempt 5 fails  -> retry after 6h
//   Attempt 6 fails  -> terminal (no more retries)
//
// 5 retries / 6 attempts total. Full jitter (0..N) added.
// ---------------------------------------------------------------------------

export const MAX_ATTEMPTS = 6;

const BASE_DELAYS_MS: ReadonlyArray<number> = [
  30_000,        // 30s
  120_000,       // 2m
  600_000,       // 10m
  3_600_000,     // 1h
  21_600_000,    // 6h
];

export interface RetryPolicyOptions {
  /** Override the RNG (deterministic tests). Returns a value in [0, 1). Default Math.random. */
  random?: () => number;
}

/**
 * Compute the wall-clock delay (ms) before the NEXT retry given the just-failed
 * `attemptIndex` (1-based: 1 = first attempt). Returns null when the attempt
 * count has exceeded MAX_ATTEMPTS (terminal — no more retries).
 *
 * Uses full jitter: actual delay = random([0, baseDelay]).
 */
export function nextRetryDelayMs(
  attemptIndex: number,
  options: RetryPolicyOptions = {}
): number | null {
  if (attemptIndex < 1) {
    throw new Error(`nextRetryDelayMs: attemptIndex must be >= 1 (got ${attemptIndex})`);
  }
  if (attemptIndex >= MAX_ATTEMPTS) return null;

  const baseIdx = attemptIndex - 1;
  const base = BASE_DELAYS_MS[baseIdx];
  if (base === undefined) return null;

  const random = options.random ?? Math.random;
  return Math.floor(random() * base);
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

export type FailureDisposition = "retryable" | "terminal";

/**
 * Classify a failure as retryable (network issue, 5xx, 429, DNS) or terminal
 * (4xx other than 429, SSRF policy rejection, non-https). Used by the delivery
 * service to decide whether to schedule next_retry_at or leave the row failed.
 *
 * NOTE: a 4xx that the client can't fix by retrying (e.g. 400, 401, 403, 404)
 * is terminal. 429 (rate limit) is retryable. 408 (timeout) is retryable.
 */
export function classifyFailure(args: {
  kind?: WebhookEgressFailureKind | null;
  httpStatus?: number | null;
}): FailureDisposition {
  const { kind, httpStatus } = args;

  // SSRF guard rejections are policy decisions, never retry.
  if (
    kind === "SSRF_PRIVATE_IP" ||
    kind === "SSRF_NON_HTTPS" ||
    kind === "REDIRECT_REFUSED"
  ) {
    return "terminal";
  }

  // Network / DNS / TLS / TIMEOUT are retryable (transient).
  if (
    kind === "NETWORK" ||
    kind === "TIMEOUT" ||
    kind === "TLS" ||
    kind === "SSRF_DNS_FAILED"
  ) {
    return "retryable";
  }

  // HTTP-status-based classification.
  if (typeof httpStatus === "number") {
    if (httpStatus >= 500 && httpStatus < 600) return "retryable";
    if (httpStatus === 408 || httpStatus === 425 || httpStatus === 429) return "retryable";
    if (httpStatus >= 400 && httpStatus < 500) return "terminal";
    // 2xx/3xx shouldn't reach here, but treat as terminal (no further attempts).
    return "terminal";
  }

  // Unknown — default conservatively to terminal.
  return "terminal";
}
