// Per-tenant adapter for the recurring-billing run service (AUTOMATION-RUNTIME A0-2).
//
// Import strategy: the runDueRecurringBilling function is injected as a dep to avoid
// cross-package rootDir violations at tsc lint time. In production the caller
// passes the real function from @sentropic/openerp-api; in tests a vi.fn() mock.

import type { Queryable, WorkerTenantContext } from "./scheduled-delivery.js";

export type { Queryable, WorkerTenantContext };

export interface RunDueRecurringBillingResult {
  generated: number;
  invoiceIds: string[];
}

export interface RecurringBillingTickContext {
  db: Queryable;
  organizationId: string;
  actorUserId: string;
  /** ISO date string (YYYY-MM-DD). Defaults to today UTC. */
  asOfDate?: string;
  /** Injected service. Pass runDueRecurringBilling from @sentropic/openerp-api in production. */
  runDue: (db: Queryable, tenant: WorkerTenantContext, asOfDate: string) => Promise<RunDueRecurringBillingResult>;
}

async function applyScope(db: Queryable, organizationId: string): Promise<void> {
  await db.query("select set_config('app.current_organization_id', $1, true)", [organizationId]);
}

async function releaseScope(db: Queryable): Promise<void> {
  await db.query("select set_config('app.current_organization_id', '', false)", []);
}

/**
 * Per-tenant adapter for the recurring-billing run service.
 * Applies RLS scope, delegates to runDue, releases scope in finally.
 */
export async function tickRecurringBilling(
  ctx: RecurringBillingTickContext
): Promise<RunDueRecurringBillingResult> {
  const tenant: WorkerTenantContext = {
    organizationId: ctx.organizationId,
    actorUserId: ctx.actorUserId
  };
  const asOfDate = ctx.asOfDate ?? new Date().toISOString().slice(0, 10);
  await applyScope(ctx.db, ctx.organizationId);
  try {
    return await ctx.runDue(ctx.db, tenant, asOfDate);
  } finally {
    await releaseScope(ctx.db);
  }
}
