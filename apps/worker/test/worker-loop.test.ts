import { describe, expect, it } from "vitest";

import { runWorkerLoop } from "../src/worker-loop";
import type { ClaimedJob, JobHandle, TenantContext } from "../src/worker-types";

const tenant: TenantContext = { organizationId: "org_1", actorUserId: "user_1" };

function makeClaimedJob(overrides: Partial<ClaimedJob> = {}): ClaimedJob {
  return {
    jobId: "job_1",
    organizationId: tenant.organizationId,
    jobType: "billing.invoice.issue",
    payload: { invoiceId: "invoice_1" },
    attempts: 1,
    scheduledAt: "2026-05-14T22:00:00.000Z",
    ...overrides
  };
}

function makeHandle(overrides: Partial<JobHandle> = {}): JobHandle {
  return {
    jobId: "job_1",
    organizationId: tenant.organizationId,
    jobType: "billing.invoice.issue",
    status: "succeeded",
    attempts: 1,
    scheduledAt: "2026-05-14T22:00:00.000Z",
    startedAt: "2026-05-14T22:00:01.000Z",
    completedAt: "2026-05-14T22:00:02.000Z",
    ...overrides
  };
}

describe("runWorkerLoop", () => {
  it("dispatches a claimed job to its handler and marks it succeeded", async () => {
    const calls: string[] = [];
    let claimedOnce = false;
    const controller = new AbortController();
    const stats = await runWorkerLoop({
      tenant,
      handlers: {
        "billing.invoice.issue": async ({ job }) => {
          calls.push(`handle ${job.jobId}`);
          controller.abort();
        }
      },
      async claim() {
        if (claimedOnce) return null;
        claimedOnce = true;
        return makeClaimedJob();
      },
      async markSucceeded(_tenant, jobId) {
        calls.push(`succeeded ${jobId}`);
        return makeHandle({ jobId, status: "succeeded" });
      },
      async markFailed() {
        return null;
      },
      sleep: async () => {},
      signal: controller.signal,
      idlePollMs: 0
    });
    expect(stats).toEqual({ processed: 1, succeeded: 1, failed: 0, unknown: 0 });
    expect(calls).toEqual(["handle job_1", "succeeded job_1"]);
  });

  it("marks the job failed if the handler throws", async () => {
    const failures: string[] = [];
    let claimedOnce = false;
    const controller = new AbortController();
    await runWorkerLoop({
      tenant,
      handlers: {
        "billing.invoice.issue": async () => {
          throw new Error("boom");
        }
      },
      async claim() {
        if (claimedOnce) return null;
        claimedOnce = true;
        return makeClaimedJob();
      },
      async markSucceeded() {
        return null;
      },
      async markFailed(_tenant, jobId, errorMessage) {
        failures.push(`${jobId}: ${errorMessage}`);
        controller.abort();
        return makeHandle({ jobId, status: "failed" });
      },
      sleep: async () => {},
      signal: controller.signal,
      idlePollMs: 0
    });
    expect(failures).toEqual(["job_1: boom"]);
  });

  it("marks the job failed when job_type has no handler", async () => {
    let claimedOnce = false;
    const failures: string[] = [];
    const controller = new AbortController();
    await runWorkerLoop({
      tenant,
      handlers: {},
      async claim() {
        if (claimedOnce) return null;
        claimedOnce = true;
        return makeClaimedJob({ jobType: "unknown.job" });
      },
      async markSucceeded() { return null; },
      async markFailed(_tenant, jobId, msg) {
        failures.push(`${jobId}: ${msg}`);
        controller.abort();
        return makeHandle({ jobId, status: "failed", jobType: "unknown.job" });
      },
      sleep: async () => {},
      signal: controller.signal,
      idlePollMs: 0
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("unknown job_type 'unknown.job'");
  });

  it("idles when claim returns no job and stops on signal abort", async () => {
    const controller = new AbortController();
    let claimCount = 0;
    let sleepCount = 0;
    const stats = await runWorkerLoop({
      tenant,
      handlers: {},
      async claim() {
        claimCount++;
        if (claimCount >= 3) controller.abort();
        return null;
      },
      async markSucceeded() { return null; },
      async markFailed() { return null; },
      sleep: async () => { sleepCount++; },
      signal: controller.signal,
      idlePollMs: 0
    });
    expect(stats.processed).toBe(0);
    expect(sleepCount).toBeGreaterThanOrEqual(1);
  });
});
