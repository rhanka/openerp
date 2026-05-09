import { describe, expect, it } from "vitest";

import { buildFoundationWorkerHandlers, shouldRetryWorkerRun } from "../src/handlers/foundation";

describe("foundation worker handlers", () => {
  it("registers async handlers for foundation side effects", () => {
    expect(buildFoundationWorkerHandlers().map((handler) => handler.eventType)).toEqual([
      "notification.sent",
      "audit.exported",
      "system.update_preflight_requested"
    ]);
  });

  it("retries only retryable worker states", () => {
    expect(shouldRetryWorkerRun("failed_retryable")).toBe(true);
    expect(shouldRetryWorkerRun("failed_final")).toBe(false);
  });
});
