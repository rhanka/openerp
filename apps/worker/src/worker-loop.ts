// Worker runtime loop — polls the jobs table via claimNextJob, dispatches to
// a handler keyed by job_type, and finalises with markJobSucceeded/Failed.
//
// Lives in apps/worker. Imports the foundation queue helpers from @openerp/api
// (workspace dependency to add when the worker package gains its first runtime
// use; today the helpers are duplicated by interface to keep apps/worker
// self-contained).

import type { ClaimedJob, JobHandle, PayloadSummary, TenantContext } from "./worker-types";

export interface WorkerHandlerContext {
  tenant: TenantContext;
  job: ClaimedJob;
}

export type WorkerHandler = (ctx: WorkerHandlerContext) => Promise<void>;

export interface WorkerLoopOptions {
  /** Tenant scope the worker polls under (one loop per tenant in MVP). */
  tenant: TenantContext;
  /** Map job_type → handler. Unknown job_type marks the job failed. */
  handlers: Record<string, WorkerHandler>;
  /** Claim + dispatch + finalise primitives. Wired to PgJobQueue in production. */
  claim: (tenant: TenantContext) => Promise<ClaimedJob | null>;
  markSucceeded: (tenant: TenantContext, jobId: string) => Promise<JobHandle | null>;
  markFailed: (tenant: TenantContext, jobId: string, errorMessage: string) => Promise<JobHandle | null>;
  /** Poll interval between empty claims. Defaults to 1s. */
  idlePollMs?: number;
  /** Caller's AbortSignal — stop the loop cleanly. */
  signal?: AbortSignal;
  /** Optional sleep override for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export interface WorkerLoopStats {
  processed: number;
  succeeded: number;
  failed: number;
  unknown: number;
}

export async function runWorkerLoop(options: WorkerLoopOptions): Promise<WorkerLoopStats> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const idle = options.idlePollMs ?? 1000;
  const stats: WorkerLoopStats = { processed: 0, succeeded: 0, failed: 0, unknown: 0 };
  while (!options.signal?.aborted) {
    const claimed = await options.claim(options.tenant);
    if (!claimed) {
      if (options.signal?.aborted) break;
      await sleep(idle);
      continue;
    }
    stats.processed++;
    const handler = options.handlers[claimed.jobType];
    if (!handler) {
      stats.unknown++;
      await options.markFailed(options.tenant, claimed.jobId, `unknown job_type '${claimed.jobType}'`);
      continue;
    }
    try {
      await handler({ tenant: options.tenant, job: claimed });
      await options.markSucceeded(options.tenant, claimed.jobId);
      stats.succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "handler threw a non-Error";
      await options.markFailed(options.tenant, claimed.jobId, message);
      stats.failed++;
    }
  }
  return stats;
}
