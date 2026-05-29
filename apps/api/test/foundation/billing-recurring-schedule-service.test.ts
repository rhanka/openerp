import { describe, expect, it } from "vitest";

import type { BillingMoney, RecurringBillingSchedule } from "@sentropic/openerp-domain/billing";
import type { Queryable } from "../../src/db/client";
import {
  RecurringScheduleNotFoundError,
  createRecurringBillingSchedule,
  deleteRecurringBillingSchedule,
  getRecurringBillingSchedule,
  runDueRecurringBilling,
  updateRecurringBillingSchedule
} from "../../src/billing/recurring-schedule-service";

// ---------------------------------------------------------------------------
// Fake DB
// ---------------------------------------------------------------------------

interface AuditRow { action: string; resourceType: string; resourceId: string }
interface TimelineRow { entryType: string }

function makeFakeDb() {
  const schedules: (RecurringBillingSchedule & { _deleted?: boolean })[] = [];
  const invoices: Array<{ id: string; organizationId: string; invoiceNumber: string; companyId: string; status: string; total: BillingMoney; lines: unknown[] }> = [];
  const invoiceLines: unknown[] = [];
  const audits: AuditRow[] = [];
  const timelines: TimelineRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // count invoices
      if (t.includes("count(*)") && t.includes("from invoices")) {
        return { rows: [{ count: String(invoices.length) } as unknown as T] };
      }

      // insert invoice
      if (t.includes("insert into invoices")) {
        const [orgId, companyId, , , invoiceNumber, status, currency, , , total] =
          values as [string, string, unknown, unknown, string, string, string, string, string, string];
        const row = {
          id: `inv_${invoices.length + 1}`,
          organizationId: orgId,
          companyId,
          projectId: null,
          invoiceProposalId: null,
          invoiceNumber,
          status,
          currency,
          subtotal: JSON.parse(values[7] as string) as BillingMoney,
          taxTotal: JSON.parse(values[8] as string) as BillingMoney,
          total: JSON.parse(total) as BillingMoney,
          taxCategoryId: null,
          taxBreakdown: null,
          issueDate: null,
          dueDate: null,
          issuedAt: null,
          createdAt: "2026-05-28T10:00:00.000Z",
          updatedAt: "2026-05-28T10:00:00.000Z",
          lines: []
        };
        invoices.push(row);
        return { rows: [row as unknown as T] };
      }

      // insert invoice_lines
      if (t.includes("insert into invoice_lines")) {
        const [orgId, invoiceId, sourceType, sourceId, description, quantity, unitPrice, amount] =
          values as [string, string, string, string | null, string | null, number, string, string];
        const row = {
          id: `il_${invoiceLines.length + 1}`,
          organizationId: orgId,
          invoiceId,
          sourceType,
          sourceId,
          description,
          quantity,
          unitPrice: JSON.parse(unitPrice) as BillingMoney,
          amount: JSON.parse(amount) as BillingMoney,
          createdAt: "2026-05-28T10:00:00.000Z"
        };
        invoiceLines.push(row);
        // Update the invoice's lines array
        const inv = invoices.find((i) => i.id === invoiceId);
        if (inv) (inv.lines as unknown[]).push(row);
        return { rows: [row as unknown as T] };
      }

      // insert recurring_billing_schedules
      if (t.includes("insert into recurring_billing_schedules")) {
        const [orgId, companyId, description, cadence, amount, currency, nextRunAt, active] =
          values as [string, string, string | null, string, string, string, string, boolean];
        const row: RecurringBillingSchedule = {
          id: `sch_${schedules.length + 1}`,
          organizationId: orgId,
          companyId,
          description,
          cadence: cadence as RecurringBillingSchedule["cadence"],
          amount: JSON.parse(amount) as BillingMoney,
          currency,
          nextRunAt,
          active,
          lastInvoiceId: null,
          lastRunAt: null,
          createdAt: "2026-05-28T10:00:00.000Z",
          updatedAt: "2026-05-28T10:00:00.000Z"
        };
        schedules.push(row);
        return { rows: [row as unknown as T] };
      }

      // find schedule by id
      if (t.includes("from recurring_billing_schedules") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = schedules.find((s) => s.id === id && s.organizationId === orgId && !s._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list due schedules
      if (t.includes("from recurring_billing_schedules") && t.includes("active = true") && t.includes("next_run_at <=")) {
        const [orgId, asOfDate] = values as [string, string];
        const rows = schedules.filter(
          (s) =>
            s.organizationId === orgId &&
            s.active &&
            !s._deleted &&
            s.nextRunAt <= asOfDate
        );
        return { rows: rows as unknown as T[] };
      }

      // list schedules (general)
      if (t.includes("from recurring_billing_schedules") && t.includes("order by next_run_at asc")) {
        const [orgId] = values as [string];
        const rows = schedules.filter((s) => s.organizationId === orgId && !s._deleted);
        return { rows: rows as unknown as T[] };
      }

      // soft-delete schedule (check before general update)
      if (t.includes("update recurring_billing_schedules") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const sch = schedules.find((s) => s.id === id && s.organizationId === orgId && !s._deleted);
        if (!sch) return { rows: [] };
        sch._deleted = true;
        return { rows: [{ id: sch.id } as unknown as T] };
      }

      // update recurring_billing_schedules (markScheduleRan path)
      if (t.includes("update recurring_billing_schedules") && t.includes("last_invoice_id = $3")) {
        const [id, orgId, lastInvoiceId, lastRunAt, nextRunAt] = values as [string, string, string, string, string];
        const sch = schedules.find((s) => s.id === id && s.organizationId === orgId && !s._deleted);
        if (!sch) return { rows: [] };
        sch.lastInvoiceId = lastInvoiceId;
        sch.lastRunAt = lastRunAt;
        sch.nextRunAt = nextRunAt;
        return { rows: [sch as unknown as T] };
      }

      // update recurring_billing_schedules (general updateRecurringSchedule path)
      if (t.includes("update recurring_billing_schedules") && t.includes("set")) {
        const [id, orgId] = values as [string, string];
        const sch = schedules.find((s) => s.id === id && s.organizationId === orgId && !s._deleted);
        if (!sch) return { rows: [] };
        // Apply updates from set clause (simplified)
        if (t.includes("active =")) {
          const activeIdx = values.indexOf(false) !== -1
            ? values.findIndex((v) => typeof v === "boolean")
            : values.findIndex((v) => v === true && typeof v === "boolean");
          if (activeIdx > 1) sch.active = values[activeIdx] as boolean;
        }
        if (t.includes("next_run_at =")) {
          const nrIdx = values.findIndex((v, i) => i > 1 && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v as string));
          if (nrIdx > 1) sch.nextRunAt = values[nrIdx] as string;
        }
        return { rows: [sch as unknown as T] };
      }

      // audit_events
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        const resourceType = values[4] as string;
        const resourceId = values[5] as string;
        audits.push({ action, resourceType, resourceId });
        return { rows: [{ id: `ae_${audits.length}` } as unknown as T] };
      }

      // timeline_entries
      if (t.includes("insert into timeline_entries")) {
        const entryType = values[4] as string;
        timelines.push({ entryType });
        return { rows: [{ id: `te_${timelines.length}` } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, schedules, invoices, audits, timelines };
}

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };
const AMOUNT: BillingMoney = { amountMinor: 150000, currency: "CAD", scale: 2 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecurringBillingSchedule service (DS 4.4) — unit", () => {
  it("createRecurringBillingSchedule: inserts schedule, emits billing.recurring_schedule.created audit + timeline", async () => {
    const { db, schedules, audits, timelines } = makeFakeDb();

    const result = await createRecurringBillingSchedule(db, TENANT, {
      companyId: "co-1",
      description: "Monthly retainer",
      cadence: "monthly",
      amount: AMOUNT,
      nextRunAt: "2026-06-01",
      active: true
    });

    expect(result.id).toBeTruthy();
    expect(result.cadence).toBe("monthly");
    expect(result.nextRunAt).toBe("2026-06-01");
    expect(result.active).toBe(true);
    expect(result.lastInvoiceId).toBeNull();
    expect(schedules.length).toBe(1);

    expect(audits.some((a) => a.action === "billing.recurring_schedule.created")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.recurring_schedule.created")).toBe(true);
  });

  it("updateRecurringBillingSchedule: throws RecurringScheduleNotFoundError for unknown id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateRecurringBillingSchedule(db, TENANT, "no-such-id", { active: false })
    ).rejects.toBeInstanceOf(RecurringScheduleNotFoundError);
  });

  it("deleteRecurringBillingSchedule: soft-deletes and emits billing.recurring_schedule.deleted", async () => {
    const { db, audits, timelines } = makeFakeDb();
    const sch = await createRecurringBillingSchedule(db, TENANT, {
      companyId: "co-1",
      cadence: "monthly",
      amount: AMOUNT,
      nextRunAt: "2026-06-01"
    });

    await deleteRecurringBillingSchedule(db, TENANT, sch.id);

    const found = await getRecurringBillingSchedule(db, TENANT, sch.id);
    expect(found).toBeNull();
    expect(audits.some((a) => a.action === "billing.recurring_schedule.deleted")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.recurring_schedule.deleted")).toBe(true);
  });

  it("deleteRecurringBillingSchedule: throws RecurringScheduleNotFoundError for unknown id", async () => {
    const { db } = makeFakeDb();
    await expect(
      deleteRecurringBillingSchedule(db, TENANT, "no-such-id")
    ).rejects.toBeInstanceOf(RecurringScheduleNotFoundError);
  });

  it("runDueRecurringBilling: generates one invoice for a due schedule, advances next_run_at, sets last_invoice_id", async () => {
    const { db, schedules, invoices, audits, timelines } = makeFakeDb();

    const sch = await createRecurringBillingSchedule(db, TENANT, {
      companyId: "co-1",
      description: "Monthly retainer",
      cadence: "monthly",
      amount: AMOUNT,
      nextRunAt: "2026-05-01"
    });

    const result = await runDueRecurringBilling(db, TENANT, "2026-05-28");

    expect(result.generated).toBe(1);
    expect(result.invoiceIds).toHaveLength(1);
    expect(invoices.length).toBe(1);

    const inv = invoices[0]!;
    expect(inv.status).toBe("draft");
    expect(inv.total.amountMinor).toBe(AMOUNT.amountMinor);

    // Schedule advanced ~1 month
    const updated = schedules[0]!;
    expect(updated.lastInvoiceId).toBe(inv.id);
    expect(updated.lastRunAt).toBeTruthy();
    expect(updated.nextRunAt).toBe("2026-06-01");

    // Audit + timeline for both invoice and schedule
    expect(audits.some((a) => a.action === "billing.invoice.created")).toBe(true);
    expect(audits.some((a) => a.action === "billing.recurring_schedule.scheduled")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.invoice.created")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.recurring_schedule.scheduled")).toBe(true);
  });

  it("runDueRecurringBilling: does not touch a schedule whose next_run_at is in the future", async () => {
    const { db, invoices } = makeFakeDb();

    await createRecurringBillingSchedule(db, TENANT, {
      companyId: "co-1",
      cadence: "monthly",
      amount: AMOUNT,
      nextRunAt: "2026-06-30"
    });

    const result = await runDueRecurringBilling(db, TENANT, "2026-05-28");

    expect(result.generated).toBe(0);
    expect(invoices.length).toBe(0);
  });

  it("runDueRecurringBilling: advances next_run_at correctly for all cadences", async () => {
    const cases: Array<{ cadence: RecurringBillingSchedule["cadence"]; from: string; expected: string }> = [
      { cadence: "weekly",    from: "2026-05-28", expected: "2026-06-04" },
      { cadence: "monthly",   from: "2026-05-01", expected: "2026-06-01" },
      { cadence: "quarterly", from: "2026-04-01", expected: "2026-07-01" },
      { cadence: "annual",    from: "2026-01-01", expected: "2027-01-01" }
    ];

    for (const { cadence, from, expected } of cases) {
      const { db, schedules } = makeFakeDb();
      await createRecurringBillingSchedule(db, TENANT, {
        companyId: "co-1",
        cadence,
        amount: AMOUNT,
        nextRunAt: from
      });
      await runDueRecurringBilling(db, TENANT, "2026-12-31");
      expect(schedules[0]!.nextRunAt, `cadence ${cadence}`).toBe(expected);
    }
  });

  it("runDueRecurringBilling: generates 1 invoice per due schedule, untouched future schedule stays clean", async () => {
    const { db, invoices, schedules } = makeFakeDb();

    // Due schedule
    await createRecurringBillingSchedule(db, TENANT, {
      companyId: "co-1",
      cadence: "weekly",
      amount: AMOUNT,
      nextRunAt: "2026-05-01"
    });

    // Future schedule
    await createRecurringBillingSchedule(db, TENANT, {
      companyId: "co-1",
      cadence: "monthly",
      amount: { amountMinor: 20000, currency: "CAD", scale: 2 },
      nextRunAt: "2026-06-30"
    });

    const result = await runDueRecurringBilling(db, TENANT, "2026-05-28");

    expect(result.generated).toBe(1);
    expect(invoices.length).toBe(1);

    // Future schedule untouched
    expect(schedules[1]!.lastInvoiceId).toBeNull();
    expect(schedules[1]!.nextRunAt).toBe("2026-06-30");
  });
});
