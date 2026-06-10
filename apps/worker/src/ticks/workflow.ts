// Per-tenant adapter for the workflow schedule run service (AUTOMATION-RUNTIME A0-4).
//
// Import strategy: the runDueScheduledWorkflows function is injected as a dep to avoid
// cross-package rootDir violations at tsc lint time. In production the caller
// passes the real function from @sentropic/openerp-api; in tests a vi.fn() mock.

import type { Queryable, WorkerTenantContext } from "./scheduled-delivery.js";

export type { Queryable, WorkerTenantContext };

export interface RunDueScheduledWorkflowsResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  asOf: Date;
}

export interface WorkflowTickContext {
  db: Queryable;
  organizationId: string;
  actorUserId: string;
  asOf?: Date;
  /** Injected service. Pass runDueScheduledWorkflows from @sentropic/openerp-api in production. */
  runDue: (
    db: Queryable,
    tenant: WorkerTenantContext,
    asOf?: Date
  ) => Promise<RunDueScheduledWorkflowsResult>;
}

async function applyScope(db: Queryable, organizationId: string): Promise<void> {
  await db.query("select set_config('app.current_organization_id', $1, true)", [organizationId]);
}

async function releaseScope(db: Queryable): Promise<void> {
  await db.query("select set_config('app.current_organization_id', '', false)", []);
}

/**
 * Per-tenant adapter for the workflow schedule run service.
 * Applies RLS scope, delegates to runDue, releases scope in finally.
 */
export async function tickWorkflow(
  ctx: WorkflowTickContext
): Promise<RunDueScheduledWorkflowsResult> {
  const tenant: WorkerTenantContext = {
    organizationId: ctx.organizationId,
    actorUserId: ctx.actorUserId
  };
  await applyScope(ctx.db, ctx.organizationId);
  try {
    return await ctx.runDue(ctx.db, tenant, ctx.asOf);
  } finally {
    await releaseScope(ctx.db);
  }
}
