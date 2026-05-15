import { describe, expect, it } from "vitest";

import type { JobHandle, JobPayload, PayloadSummary } from "@sentropic/openerp-domain";

import type { Queryable } from "../../src/db/client";
import {
  type ClaimedJob,
  claimNextJob,
  createPgJobQueue,
  markJobFailed,
  markJobSucceeded
} from "../../src/foundation/job-queue";

interface StoredJob extends JobHandle {
  payload: PayloadSummary;
  idempotencyKey: string | null;
  lastError: string | null;
}

function makeFakeDb() {
  const rows: StoredJob[] = [];

  function toHandle(row: StoredJob): JobHandle {
    return {
      jobId: row.jobId,
      organizationId: row.organizationId,
      jobType: row.jobType,
      status: row.status,
      attempts: row.attempts,
      scheduledAt: row.scheduledAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt
    };
  }

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("select") && t.includes("from jobs")
          && t.includes("where organization_id = $1 and idempotency_key = $2")) {
        const [organizationId, idempotencyKey] = values as [string, string];
        const existing = rows.find((r) =>
          r.organizationId === organizationId && r.idempotencyKey === idempotencyKey);
        return { rows: existing ? [toHandle(existing) as unknown as T] : [] };
      }

      if (t.includes("insert into jobs")) {
        const [organizationId, jobType, payload, scheduledAt, idempotencyKey] = values as [
          string, string, PayloadSummary, string, string | null
        ];
        const row: StoredJob = {
          jobId: `job_${rows.length + 1}`,
          organizationId,
          jobType,
          payload,
          status: "queued",
          attempts: 0,
          scheduledAt,
          startedAt: null,
          completedAt: null,
          idempotencyKey,
          lastError: null
        };
        rows.push(row);
        return { rows: [toHandle(row) as unknown as T] };
      }

      if (t.includes("from jobs") && t.includes("where id = $1 and organization_id = $2")
          && !t.includes("update")) {
        const [jobId, organizationId] = values as [string, string];
        const found = rows.find((r) => r.jobId === jobId && r.organizationId === organizationId);
        return { rows: found ? [toHandle(found) as unknown as T] : [] };
      }

      if (t.includes("update jobs") && t.includes("set status = 'cancelled'")) {
        const [jobId, organizationId] = values as [string, string];
        const idx = rows.findIndex((r) =>
          r.jobId === jobId && r.organizationId === organizationId && r.status === "queued");
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, status: "cancelled", completedAt: "2026-05-14T22:00:00.000Z" };
        return { rows: [toHandle(rows[idx]!) as unknown as T] };
      }

      if (t.includes("update jobs") && t.includes("set status = 'running'")) {
        const [organizationId] = values as [string];
        const idx = rows.findIndex((r) =>
          r.organizationId === organizationId
          && r.status === "queued");
        if (idx === -1) return { rows: [] };
        rows[idx] = {
          ...rows[idx]!,
          status: "running",
          attempts: rows[idx]!.attempts + 1,
          startedAt: "2026-05-14T22:00:00.000Z"
        };
        const claimed: ClaimedJob = {
          jobId: rows[idx]!.jobId,
          organizationId: rows[idx]!.organizationId,
          jobType: rows[idx]!.jobType,
          payload: rows[idx]!.payload,
          attempts: rows[idx]!.attempts,
          scheduledAt: rows[idx]!.scheduledAt
        };
        return { rows: [claimed as unknown as T] };
      }

      if (t.includes("update jobs") && t.includes("set status = 'succeeded'")) {
        const [jobId, organizationId] = values as [string, string];
        const idx = rows.findIndex((r) =>
          r.jobId === jobId && r.organizationId === organizationId && r.status === "running");
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, status: "succeeded", completedAt: "2026-05-14T22:01:00.000Z" };
        return { rows: [toHandle(rows[idx]!) as unknown as T] };
      }

      if (t.includes("update jobs") && t.includes("set status = 'failed'")) {
        const [jobId, organizationId, error] = values as [string, string, string];
        const idx = rows.findIndex((r) =>
          r.jobId === jobId && r.organizationId === organizationId && r.status === "running");
        if (idx === -1) return { rows: [] };
        rows[idx] = {
          ...rows[idx]!,
          status: "failed",
          completedAt: "2026-05-14T22:01:00.000Z",
          lastError: error
        };
        return { rows: [toHandle(rows[idx]!) as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, rows };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

const baseJob: JobPayload = {
  organizationId: context.organizationId,
  jobType: "billing.invoice.issue",
  payload: { invoiceId: "invoice_1" }
};

describe("PgJobQueue (PG-04)", () => {
  it("enqueues a queued job with the right shape", async () => {
    const { db } = makeFakeDb();
    const queue = createPgJobQueue(db, context);
    const handle = await queue.enqueue(baseJob);
    expect(handle.status).toBe("queued");
    expect(handle.attempts).toBe(0);
    expect(handle.jobType).toBe("billing.invoice.issue");
  });

  it("returns the existing handle when idempotencyKey matches a prior enqueue", async () => {
    const { db } = makeFakeDb();
    const queue = createPgJobQueue(db, context);
    const first = await queue.enqueue({ ...baseJob, idempotencyKey: "invoice_1:issue" });
    const second = await queue.enqueue({ ...baseJob, idempotencyKey: "invoice_1:issue" });
    expect(second.jobId).toBe(first.jobId);
  });

  it("refuses to enqueue a job whose organizationId differs from context", async () => {
    const { db } = makeFakeDb();
    const queue = createPgJobQueue(db, context);
    await expect(
      queue.enqueue({ ...baseJob, organizationId: "org_2" })
    ).rejects.toThrow(/must match tenant context/);
  });

  it("gets and cancels a queued job", async () => {
    const { db } = makeFakeDb();
    const queue = createPgJobQueue(db, context);
    const created = await queue.enqueue(baseJob);
    expect((await queue.get(created.jobId))?.status).toBe("queued");
    const cancelled = await queue.cancel(created.jobId);
    expect(cancelled?.status).toBe("cancelled");
  });

  it("claims and marks succeeded via worker helpers", async () => {
    const { db } = makeFakeDb();
    const queue = createPgJobQueue(db, context);
    const created = await queue.enqueue(baseJob);
    const claimed = await claimNextJob(db, context);
    expect(claimed?.jobId).toBe(created.jobId);
    expect(claimed?.attempts).toBe(1);
    const finished = await markJobSucceeded(db, context, created.jobId);
    expect(finished?.status).toBe("succeeded");
  });

  it("marks a running job failed with the error message", async () => {
    const { db } = makeFakeDb();
    const queue = createPgJobQueue(db, context);
    const created = await queue.enqueue(baseJob);
    await claimNextJob(db, context);
    const failed = await markJobFailed(db, context, created.jobId, "boom");
    expect(failed?.status).toBe("failed");
  });
});
