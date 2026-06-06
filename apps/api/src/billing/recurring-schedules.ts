import type {
  BillingMoney,
  RecurringBillingCadence,
  RecurringBillingSchedule
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

/** Minimal interface required by claimAndProcessNextDueSchedule.
 *  PgPoolHandle satisfies this; test fakes may optionally implement it. */
export interface QueryablePool extends Queryable {
  withClient<T>(fn: (client: Queryable) => Promise<T>): Promise<T>;
}

// Repository for RecurringBillingSchedule entities.
// Supports soft-delete via deleted_at.

const SCHEDULE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  company_id as "companyId",
  description,
  cadence,
  amount,
  currency,
  to_char(next_run_at, 'YYYY-MM-DD') as "nextRunAt",
  active,
  last_invoice_id as "lastInvoiceId",
  last_run_at as "lastRunAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertRecurringSchedule(
  db: Queryable,
  context: TenantContext,
  input: {
    companyId: string;
    description: string | null;
    cadence: RecurringBillingCadence;
    amount: BillingMoney;
    currency: string;
    nextRunAt: string;
    active: boolean;
  }
): Promise<RecurringBillingSchedule> {
  assertTenantContext(context);
  const result = await db.query<RecurringBillingSchedule>(
    `insert into recurring_billing_schedules (
       organization_id, company_id, description, cadence, amount, currency,
       next_run_at, active
     ) values ($1, $2, $3, $4, $5::jsonb, $6, $7::date, $8)
     returning ${SCHEDULE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.companyId,
      input.description ?? null,
      input.cadence,
      JSON.stringify(input.amount),
      input.currency,
      input.nextRunAt,
      input.active
    ]
  );
  return result.rows[0]!;
}

export async function findRecurringScheduleById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<RecurringBillingSchedule | null> {
  assertTenantContext(context);
  const result = await db.query<RecurringBillingSchedule>(
    `select ${SCHEDULE_RETURN_COLUMNS}
       from recurring_billing_schedules
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listRecurringSchedules(
  db: Queryable,
  context: TenantContext,
  options: { active?: boolean; companyId?: string; limit?: number; offset?: number } = {}
): Promise<RecurringBillingSchedule[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterActive = options.active ?? null;
  const filterCompanyId = options.companyId ?? null;
  const result = await db.query<RecurringBillingSchedule>(
    `select ${SCHEDULE_RETURN_COLUMNS}
       from recurring_billing_schedules
      where organization_id = $1
        and deleted_at is null
        and ($2::boolean is null or active = $2)
        and ($3::uuid is null or company_id = $3)
      order by next_run_at asc, created_at asc
      limit $4 offset $5`,
    [context.organizationId, filterActive, filterCompanyId, limit, offset]
  );
  return result.rows;
}

/** Returns active, non-deleted schedules whose next_run_at <= asOfDate. */
export async function listDueRecurringSchedules(
  db: Queryable,
  context: TenantContext,
  asOfDate: string
): Promise<RecurringBillingSchedule[]> {
  assertTenantContext(context);
  const result = await db.query<RecurringBillingSchedule>(
    `select ${SCHEDULE_RETURN_COLUMNS}
       from recurring_billing_schedules
      where organization_id = $1
        and deleted_at is null
        and active = true
        and next_run_at <= $2::date
      order by next_run_at asc, created_at asc`,
    [context.organizationId, asOfDate]
  );
  return result.rows;
}

/**
 * Atomically claim ONE due, active, non-deleted schedule for the tenant using
 * SELECT ... FOR UPDATE SKIP LOCKED, execute the callback inside the same
 * transaction (so the lock is held throughout), advance next_run_at, and commit.
 *
 * Returns true if a schedule was claimed and processed; false when none are due.
 * On callback error the transaction is rolled back and the error is re-thrown.
 *
 * Concurrent callers will each see a different row (SKIP LOCKED) so the same
 * schedule can never be processed twice in parallel.
 */
export async function claimAndProcessNextDueSchedule(
  pool: QueryablePool,
  context: TenantContext,
  asOfDate: string,
  callback: (
    schedule: RecurringBillingSchedule,
    db: Queryable
  ) => Promise<{ lastInvoiceId: string; lastRunAt: string; nextRunAt: string }>
): Promise<boolean> {
  assertTenantContext(context);

  return pool.withClient(async (client) => {
    await client.query("begin");
    try {
      // Set tenant RLS scope for this transaction (is_local = true keeps it transaction-scoped).
      await client.query(
        "select set_config('app.current_organization_id', $1, true)",
        [context.organizationId]
      );

      // Claim one due row with a row-level lock; concurrent callers skip locked rows.
      const claimResult = await client.query<RecurringBillingSchedule>(
        `select ${SCHEDULE_RETURN_COLUMNS}
           from recurring_billing_schedules
          where organization_id = $1
            and deleted_at is null
            and active = true
            and next_run_at <= $2::date
          order by next_run_at asc, created_at asc
          for update skip locked
          limit 1`,
        [context.organizationId, asOfDate]
      );

      const schedule = claimResult.rows[0] ?? null;
      if (!schedule) {
        await client.query("commit");
        return false;
      }

      // Invoke the caller's work (invoice generation, audit emit, etc.).
      const advance = await callback(schedule, client);

      // Advance the schedule inside the same transaction.
      await client.query(
        `update recurring_billing_schedules
            set last_invoice_id = $3,
                last_run_at = $4,
                next_run_at = $5::date,
                updated_at = now()
          where id = $1 and organization_id = $2 and deleted_at is null`,
        [
          schedule.id,
          context.organizationId,
          advance.lastInvoiceId,
          advance.lastRunAt,
          advance.nextRunAt
        ]
      );

      await client.query("commit");
      return true;
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  });
}

export async function updateRecurringSchedule(
  db: Queryable,
  context: TenantContext,
  id: string,
  input: {
    description?: string | null;
    cadence?: RecurringBillingCadence;
    amount?: BillingMoney;
    currency?: string;
    nextRunAt?: string;
    active?: boolean;
  }
): Promise<RecurringBillingSchedule | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];

  if (input.description !== undefined) {
    sets.push(`description = $${values.length + 1}`);
    values.push(input.description);
  }
  if (input.cadence !== undefined) {
    sets.push(`cadence = $${values.length + 1}`);
    values.push(input.cadence);
  }
  if (input.amount !== undefined) {
    sets.push(`amount = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(input.amount));
  }
  if (input.currency !== undefined) {
    sets.push(`currency = $${values.length + 1}`);
    values.push(input.currency);
  }
  if (input.nextRunAt !== undefined) {
    sets.push(`next_run_at = $${values.length + 1}::date`);
    values.push(input.nextRunAt);
  }
  if (input.active !== undefined) {
    sets.push(`active = $${values.length + 1}`);
    values.push(input.active);
  }

  const result = await db.query<RecurringBillingSchedule>(
    `update recurring_billing_schedules
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${SCHEDULE_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

/** Mark a schedule as ran: update last_invoice_id, last_run_at, next_run_at. */
export async function markScheduleRan(
  db: Queryable,
  context: TenantContext,
  id: string,
  input: {
    lastInvoiceId: string;
    lastRunAt: string;
    nextRunAt: string;
  }
): Promise<RecurringBillingSchedule | null> {
  assertTenantContext(context);
  const result = await db.query<RecurringBillingSchedule>(
    `update recurring_billing_schedules
        set last_invoice_id = $3,
            last_run_at = $4,
            next_run_at = $5::date,
            updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${SCHEDULE_RETURN_COLUMNS}`,
    [id, context.organizationId, input.lastInvoiceId, input.lastRunAt, input.nextRunAt]
  );
  return result.rows[0] ?? null;
}

export async function softDeleteRecurringSchedule(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update recurring_billing_schedules
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
