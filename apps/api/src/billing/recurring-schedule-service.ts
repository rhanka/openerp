import type {
  BillingMoney,
  CreateRecurringBillingScheduleInput,
  RecurringBillingSchedule,
  UpdateRecurringBillingScheduleInput
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitBillingTimelineEntry } from "./billing-timeline";
import {
  findRecurringScheduleById,
  insertRecurringSchedule,
  listDueRecurringSchedules,
  listRecurringSchedules,
  markScheduleRan,
  softDeleteRecurringSchedule,
  updateRecurringSchedule
} from "./recurring-schedules";
import { insertInvoice, insertInvoiceLine, countInvoicesForOrg } from "./invoices";

export class RecurringScheduleNotFoundError extends Error {
  readonly code = "RECURRING_SCHEDULE_NOT_FOUND";
  constructor(id: string) {
    super(`RecurringBillingSchedule ${id} not found`);
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createRecurringBillingSchedule(
  db: Queryable,
  context: TenantContext,
  input: CreateRecurringBillingScheduleInput
): Promise<RecurringBillingSchedule> {
  assertTenantContext(context);

  const currency = input.currency ?? input.amount.currency ?? "CAD";

  const schedule = await insertRecurringSchedule(db, context, {
    companyId: input.companyId,
    description: input.description ?? null,
    cadence: input.cadence,
    amount: input.amount,
    currency,
    nextRunAt: input.nextRunAt,
    active: input.active ?? true
  });

  await recordAuditEvent(db, context, {
    action: "billing.recurring_schedule.created",
    resourceType: "recurring_schedule",
    resourceId: schedule.id,
    beforeSummary: null,
    afterSummary: {
      companyId: schedule.companyId,
      cadence: schedule.cadence,
      currency: schedule.currency,
      amountMinor: schedule.amount.amountMinor,
      nextRunAt: schedule.nextRunAt,
      active: schedule.active
    }
  });

  await emitBillingTimelineEntry(db, context, {
    resourceType: "recurring_schedule",
    resourceId: schedule.id,
    entryType: "billing.recurring_schedule.created",
    payloadSummary: {
      companyId: schedule.companyId,
      cadence: schedule.cadence,
      currency: schedule.currency,
      amountMinor: schedule.amount.amountMinor,
      nextRunAt: schedule.nextRunAt
    }
  });

  return schedule;
}

export async function updateRecurringBillingSchedule(
  db: Queryable,
  context: TenantContext,
  id: string,
  input: UpdateRecurringBillingScheduleInput
): Promise<RecurringBillingSchedule> {
  assertTenantContext(context);

  const before = await findRecurringScheduleById(db, context, id);
  if (!before) throw new RecurringScheduleNotFoundError(id);

  const patch: UpdateRecurringBillingScheduleInput = {};
  if ("description" in input) patch.description = input.description;
  if (input.cadence !== undefined) patch.cadence = input.cadence;
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.nextRunAt !== undefined) patch.nextRunAt = input.nextRunAt;
  if (input.active !== undefined) patch.active = input.active;

  const updated = await updateRecurringSchedule(db, context, id, patch);
  if (!updated) throw new RecurringScheduleNotFoundError(id);

  await recordAuditEvent(db, context, {
    action: "billing.recurring_schedule.updated",
    resourceType: "recurring_schedule",
    resourceId: id,
    beforeSummary: {
      cadence: before.cadence,
      amountMinor: before.amount.amountMinor,
      nextRunAt: before.nextRunAt,
      active: before.active
    },
    afterSummary: {
      cadence: updated.cadence,
      amountMinor: updated.amount.amountMinor,
      nextRunAt: updated.nextRunAt,
      active: updated.active
    }
  });

  await emitBillingTimelineEntry(db, context, {
    resourceType: "recurring_schedule",
    resourceId: id,
    entryType: "billing.recurring_schedule.updated",
    payloadSummary: {
      cadence: updated.cadence,
      amountMinor: updated.amount.amountMinor,
      nextRunAt: updated.nextRunAt,
      active: updated.active
    }
  });

  return updated;
}

export async function deleteRecurringBillingSchedule(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);

  const before = await findRecurringScheduleById(db, context, id);
  if (!before) throw new RecurringScheduleNotFoundError(id);

  const deleted = await softDeleteRecurringSchedule(db, context, id);
  if (!deleted) throw new RecurringScheduleNotFoundError(id);

  await recordAuditEvent(db, context, {
    action: "billing.recurring_schedule.deleted",
    resourceType: "recurring_schedule",
    resourceId: id,
    beforeSummary: {
      cadence: before.cadence,
      amountMinor: before.amount.amountMinor,
      nextRunAt: before.nextRunAt,
      active: before.active
    },
    afterSummary: null
  });

  await emitBillingTimelineEntry(db, context, {
    resourceType: "recurring_schedule",
    resourceId: id,
    entryType: "billing.recurring_schedule.deleted",
    payloadSummary: {
      cadence: before.cadence,
      amountMinor: before.amount.amountMinor
    }
  });
}

export async function getRecurringBillingSchedule(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<RecurringBillingSchedule | null> {
  return findRecurringScheduleById(db, context, id);
}

export async function listRecurringBillingSchedules(
  db: Queryable,
  context: TenantContext,
  options: { active?: boolean; companyId?: string; limit?: number; offset?: number } = {}
): Promise<RecurringBillingSchedule[]> {
  return listRecurringSchedules(db, context, options);
}

// ---------------------------------------------------------------------------
// Run service: generates draft invoices for due schedules
// ---------------------------------------------------------------------------

/**
 * Advance next_run_at by one cadence step from the given date.
 * Always advances from the schedule's current next_run_at, not from asOfDate,
 * so that the cadence stays aligned to the original start date.
 *
 * Note: one advance per run. If the advanced date is still <= asOfDate that is
 * acceptable for this slice — subsequent runs will catch it up.
 */
function advanceNextRunAt(
  currentNextRunAt: string,
  cadence: RecurringBillingSchedule["cadence"]
): string {
  const d = new Date(currentNextRunAt + "T00:00:00Z");
  switch (cadence) {
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "quarterly":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "annual":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

export interface RunDueRecurringBillingResult {
  generated: number;
  invoiceIds: string[];
}

/**
 * For each active schedule whose next_run_at <= asOfDate:
 *  1. Create a single-line draft Invoice via the standard invoice path.
 *  2. Advance next_run_at by one cadence step.
 *  3. Update last_invoice_id + last_run_at + next_run_at on the schedule.
 *  4. Emit billing.recurring_schedule.scheduled + billing.invoice.created (invoice
 *     creation emits billing.invoice.created automatically via createInvoice).
 *
 * Returns { generated, invoiceIds }.
 */
export async function runDueRecurringBilling(
  db: Queryable,
  context: TenantContext,
  asOfDate: string
): Promise<RunDueRecurringBillingResult> {
  assertTenantContext(context);

  const dueSchedules = await listDueRecurringSchedules(db, context, asOfDate);

  const invoiceIds: string[] = [];

  for (const schedule of dueSchedules) {
    const currency = schedule.currency;
    const amount: BillingMoney = schedule.amount;
    const zero: BillingMoney = { amountMinor: 0, currency, scale: amount.scale };
    const lineDescription = schedule.description ?? `Recurring billing (${schedule.cadence})`;

    // Generate invoice number (same pattern as invoice-service).
    const count = await countInvoicesForOrg(db, context);
    const invoiceNumber = `INV-${String(count + 1).padStart(6, "0")}`;

    const invoice = await insertInvoice(db, context, {
      companyId: schedule.companyId,
      projectId: null,
      invoiceProposalId: null,
      invoiceNumber,
      status: "draft",
      currency,
      subtotal: amount,
      taxTotal: zero,
      total: amount,
      taxCategoryId: null,
      issueDate: null,
      dueDate: null
    });

    const line = await insertInvoiceLine(db, context, {
      invoiceId: invoice.id,
      sourceType: "recurring_schedule",
      sourceId: schedule.id,
      description: lineDescription,
      quantity: 1,
      unitPrice: amount,
      amount
    });

    const invoiceWithLines = { ...invoice, lines: [line] };

    // Emit billing.invoice.created audit + timeline.
    await recordAuditEvent(db, context, {
      action: "billing.invoice.created",
      resourceType: "invoice",
      resourceId: invoice.id,
      beforeSummary: null,
      afterSummary: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        recurringScheduleId: schedule.id,
        lineCount: 1,
        totalMinor: amount.amountMinor,
        currency
      }
    });
    await emitBillingTimelineEntry(db, context, {
      resourceType: "invoice",
      resourceId: invoice.id,
      entryType: "billing.invoice.created",
      payloadSummary: {
        invoiceNumber: invoice.invoiceNumber,
        recurringScheduleId: schedule.id,
        lineCount: 1,
        totalMinor: amount.amountMinor,
        currency
      }
    });

    const nextRunAt = advanceNextRunAt(schedule.nextRunAt, schedule.cadence);
    const lastRunAt = new Date().toISOString();

    await markScheduleRan(db, context, schedule.id, {
      lastInvoiceId: invoiceWithLines.id,
      lastRunAt,
      nextRunAt
    });

    // Emit scheduled event for this run.
    await recordAuditEvent(db, context, {
      action: "billing.recurring_schedule.scheduled",
      resourceType: "recurring_schedule",
      resourceId: schedule.id,
      beforeSummary: { nextRunAt: schedule.nextRunAt, lastInvoiceId: schedule.lastInvoiceId },
      afterSummary: {
        invoiceId: invoiceWithLines.id,
        invoiceNumber: invoiceWithLines.invoiceNumber,
        nextRunAt,
        lastRunAt,
        amountMinor: schedule.amount.amountMinor,
        currency: schedule.currency
      }
    });

    await emitBillingTimelineEntry(db, context, {
      resourceType: "recurring_schedule",
      resourceId: schedule.id,
      entryType: "billing.recurring_schedule.scheduled",
      payloadSummary: {
        invoiceId: invoiceWithLines.id,
        invoiceNumber: invoiceWithLines.invoiceNumber,
        nextRunAt,
        amountMinor: schedule.amount.amountMinor,
        currency: schedule.currency
      }
    });

    invoiceIds.push(invoiceWithLines.id);
  }

  return { generated: invoiceIds.length, invoiceIds };
}
