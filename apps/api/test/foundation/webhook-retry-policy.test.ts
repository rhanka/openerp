import { describe, it, expect } from "vitest";
import {
  nextRetryDelayMs,
  classifyFailure,
  MAX_ATTEMPTS,
} from "../../src/webhook/webhook-retry-policy";

// ---------------------------------------------------------------------------
// nextRetryDelayMs
// ---------------------------------------------------------------------------

describe("nextRetryDelayMs", () => {
  it("attempt 1 with random=0 returns 0", () => {
    const result = nextRetryDelayMs(1, { random: () => 0 });
    expect(result).toBe(0);
  });

  it("attempt 1 with random=0.999 returns < 30_000", () => {
    const result = nextRetryDelayMs(1, { random: () => 0.999 });
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(0);
    expect(result!).toBeLessThan(30_000);
  });

  it("attempt 2 with random=0 returns 0", () => {
    expect(nextRetryDelayMs(2, { random: () => 0 })).toBe(0);
  });

  it("attempt 2 with random=0.5 returns < 120_000", () => {
    const result = nextRetryDelayMs(2, { random: () => 0.5 });
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(0);
    expect(result!).toBeLessThan(120_000);
  });

  it("attempt 2 with random=0.999 returns < 120_000", () => {
    const result = nextRetryDelayMs(2, { random: () => 0.999 });
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(120_000);
  });

  it("attempt 3 with random=0.999 returns < 600_000", () => {
    const result = nextRetryDelayMs(3, { random: () => 0.999 });
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(600_000);
  });

  it("attempt 3 with random=0 returns 0", () => {
    expect(nextRetryDelayMs(3, { random: () => 0 })).toBe(0);
  });

  it("attempt 4 with random=0.999 returns < 3_600_000", () => {
    const result = nextRetryDelayMs(4, { random: () => 0.999 });
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(3_600_000);
  });

  it("attempt 4 with random=0 returns 0", () => {
    expect(nextRetryDelayMs(4, { random: () => 0 })).toBe(0);
  });

  it("attempt 5 with random=0.999 returns < 21_600_000", () => {
    const result = nextRetryDelayMs(5, { random: () => 0.999 });
    expect(result).not.toBeNull();
    expect(result!).toBeLessThan(21_600_000);
  });

  it("attempt 5 with random=0 returns 0", () => {
    expect(nextRetryDelayMs(5, { random: () => 0 })).toBe(0);
  });

  it("attempt 6 returns null (terminal — MAX_ATTEMPTS reached)", () => {
    expect(MAX_ATTEMPTS).toBe(6);
    expect(nextRetryDelayMs(6, { random: () => 0.5 })).toBeNull();
  });

  it("attempt 7 returns null", () => {
    expect(nextRetryDelayMs(7, { random: () => 0.5 })).toBeNull();
  });

  it("attempt 0 throws with message containing 'attemptIndex must be >= 1'", () => {
    expect(() => nextRetryDelayMs(0)).toThrow("attemptIndex must be >= 1");
  });

  it("attempt -1 throws with message containing 'attemptIndex must be >= 1'", () => {
    expect(() => nextRetryDelayMs(-1)).toThrow("attemptIndex must be >= 1");
  });

  it("default random (Math.random) returns a non-null number for attempt 1 (smoke)", () => {
    const result = nextRetryDelayMs(1);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// classifyFailure
// ---------------------------------------------------------------------------

describe("classifyFailure", () => {
  // SSRF / policy — terminal
  it("kind=SSRF_PRIVATE_IP -> terminal", () => {
    expect(classifyFailure({ kind: "SSRF_PRIVATE_IP" })).toBe("terminal");
  });

  it("kind=SSRF_NON_HTTPS -> terminal", () => {
    expect(classifyFailure({ kind: "SSRF_NON_HTTPS" })).toBe("terminal");
  });

  it("kind=REDIRECT_REFUSED -> terminal", () => {
    expect(classifyFailure({ kind: "REDIRECT_REFUSED" })).toBe("terminal");
  });

  // Transient network failures — retryable
  it("kind=NETWORK -> retryable", () => {
    expect(classifyFailure({ kind: "NETWORK" })).toBe("retryable");
  });

  it("kind=TIMEOUT -> retryable", () => {
    expect(classifyFailure({ kind: "TIMEOUT" })).toBe("retryable");
  });

  it("kind=TLS -> retryable", () => {
    expect(classifyFailure({ kind: "TLS" })).toBe("retryable");
  });

  it("kind=SSRF_DNS_FAILED -> retryable", () => {
    expect(classifyFailure({ kind: "SSRF_DNS_FAILED" })).toBe("retryable");
  });

  // 5xx — retryable
  it.each([500, 502, 503, 599])("httpStatus=%i -> retryable", (status: number) => {
    expect(classifyFailure({ httpStatus: status })).toBe("retryable");
  });

  // Special retryable 4xx
  it("httpStatus=408 -> retryable", () => {
    expect(classifyFailure({ httpStatus: 408 })).toBe("retryable");
  });

  it("httpStatus=425 -> retryable", () => {
    expect(classifyFailure({ httpStatus: 425 })).toBe("retryable");
  });

  it("httpStatus=429 -> retryable", () => {
    expect(classifyFailure({ httpStatus: 429 })).toBe("retryable");
  });

  // Terminal 4xx
  it.each([400, 401, 403, 404, 422])("httpStatus=%i -> terminal", (status: number) => {
    expect(classifyFailure({ httpStatus: status })).toBe("terminal");
  });

  // Defensive defaults
  it("httpStatus=null, kind=null -> terminal (defensive default)", () => {
    expect(classifyFailure({ kind: null, httpStatus: null })).toBe("terminal");
  });

  it("httpStatus=200 -> terminal (success should not reach here, covered defensively)", () => {
    expect(classifyFailure({ httpStatus: 200 })).toBe("terminal");
  });
});
