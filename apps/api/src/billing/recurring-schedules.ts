import type {
  BillingMoney,
  RecurringBillingCadence,
  RecurringBillingSchedule
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

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
