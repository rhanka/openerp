import type { JobHandle, JobPayload, JobQueue, PayloadSummary } from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// PgJobQueue — PG-04 implementation of the JobQueue contract.
// MVP backend uses a plain `jobs` table with SELECT FOR UPDATE SKIP LOCKED for
// the worker pull side (see apps/worker). pgmq extension can be swapped in later
// without changing this interface.

const JOB_COLUMNS = `
  id as "jobId",
  organization_id as "organizationId",
  job_type as "jobType",
  status,
  attempts,
  scheduled_at as "scheduledAt",
  started_at as "startedAt",
  completed_at as "completedAt"
`;

export function createPgJobQueue(db: Queryable, context: TenantContext): JobQueue {
  assertTenantContext(context);
  return {
    async enqueue(job: JobPayload) {
      if (job.organizationId !== context.organizationId) {
        throw new Error("PgJobQueue: job.organizationId must match tenant context");
      }
      const scheduledAt = job.scheduledAt ?? new Date().toISOString();
      // Idempotency: if the same (organization_id, idempotency_key) already exists,
      // return the existing handle without inserting a duplicate.
      if (job.idempotencyKey) {
        const existing = await db.query<JobHandle>(
          `select ${JOB_COLUMNS}
             from jobs
            where organization_id = $1 and idempotency_key = $2`,
          [job.organizationId, job.idempotencyKey]
        );
        if (existing.rows[0]) return existing.rows[0];
      }
      const inserted = await db.query<JobHandle>(
        `insert into jobs (
           organization_id, job_type, payload, status, scheduled_at, idempotency_key
         ) values ($1, $2, $3, 'queued', $4, $5)
         returning ${JOB_COLUMNS}`,
        [
          job.organizationId,
          job.jobType,
          job.payload,
          scheduledAt,
          job.idempotencyKey ?? null
        ]
      );
      return inserted.rows[0]!;
    },

    async get(jobId: string) {
      const result = await db.query<JobHandle>(
        `select ${JOB_COLUMNS}
           from jobs
          where id = $1 and organization_id = $2`,
        [jobId, context.organizationId]
      );
      return result.rows[0] ?? null;
    },

    async cancel(jobId: string) {
      const result = await db.query<JobHandle>(
        `update jobs
            set status = 'cancelled',
                completed_at = now()
          where id = $1
            and organization_id = $2
            and status = 'queued'
          returning ${JOB_COLUMNS}`,
        [jobId, context.organizationId]
      );
      return result.rows[0] ?? null;
    }
  };
}

// Worker-side helpers — used by apps/worker. Not part of the JobQueue contract.

export interface ClaimedJob {
  jobId: string;
  organizationId: string;
  jobType: string;
  payload: PayloadSummary;
  attempts: number;
  scheduledAt: string;
}

/** Atomic claim of the next ready job in a given tenant. Returns null when none. */
export async function claimNextJob(
  db: Queryable,
  context: TenantContext
): Promise<ClaimedJob | null> {
  assertTenantContext(context);
  const result = await db.query<ClaimedJob>(
    `update jobs
        set status = 'running',
            attempts = attempts + 1,
            started_at = now()
      where id = (
        select id from jobs
         where organization_id = $1
           and status = 'queued'
           and scheduled_at <= now()
         order by scheduled_at asc
         for update skip locked
         limit 1
      )
      returning
        id as "jobId",
        organization_id as "organizationId",
        job_type as "jobType",
        payload,
        attempts,
        scheduled_at as "scheduledAt"`,
    [context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function markJobSucceeded(
  db: Queryable,
  context: TenantContext,
  jobId: string
): Promise<JobHandle | null> {
  assertTenantContext(context);
  const result = await db.query<JobHandle>(
    `update jobs
        set status = 'succeeded', completed_at = now()
      where id = $1 and organization_id = $2 and status = 'running'
      returning ${JOB_COLUMNS}`,
    [jobId, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function markJobFailed(
  db: Queryable,
  context: TenantContext,
  jobId: string,
  errorMessage: string
): Promise<JobHandle | null> {
  assertTenantContext(context);
  const result = await db.query<JobHandle>(
    `update jobs
        set status = 'failed', completed_at = now(), last_error = $3
      where id = $1 and organization_id = $2 and status = 'running'
      returning ${JOB_COLUMNS}`,
    [jobId, context.organizationId, errorMessage]
  );
  return result.rows[0] ?? null;
}
