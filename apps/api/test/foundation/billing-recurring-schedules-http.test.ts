import { describe, expect, it } from "vitest";

import type { BillingMoney, RecurringBillingSchedule } from "@sentropic/openerp-domain/billing";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// Minimal fake DB for recurring schedule HTTP tests.
function makeFakeDb() {
  const schedules: (RecurringBillingSchedule & { _deleted?: boolean })[] = [];
  const invoices: Array<{ id: string; organizationId: string; invoiceNumber: string; companyId: string; status: string; total: BillingMoney; currency: string; subtotal: BillingMoney; taxTotal: BillingMoney; lines: unknown[] }> = [];
  const invoiceLines: unknown[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // count invoices
      if (t.includes("count(*)") && t.includes("from invoices")) {
        return { rows: [{ count: String(invoices.length) } as unknown as T] };
      }

      // insert invoice
      if (t.includes("insert into invoices")) {
        const [orgId, companyId, , , invoiceNumber, status, currency, subtotalRaw, taxTotalRaw, totalRaw] =
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
          subtotal: JSON.parse(subtotalRaw) as BillingMoney,
          taxTotal: JSON.parse(taxTotalRaw) as BillingMoney,
          total: JSON.parse(totalRaw) as BillingMoney,
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
        const inv = invoices.find((i) => i.id === invoiceId);
        if (inv) (inv.lines as unknown[]).push(row);
        return { rows: [row as unknown as T] };
      }

      // insert recurring schedule
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
          (s) => s.organizationId === orgId && s.active && !s._deleted && s.nextRunAt <= asOfDate
        );
        return { rows: rows as unknown as T[] };
      }

      // list schedules
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

      // update recurring schedule (markScheduleRan)
      if (t.includes("update recurring_billing_schedules") && t.includes("last_invoice_id = $3")) {
        const [id, orgId, lastInvoiceId, lastRunAt, nextRunAt] = values as [string, string, string, string, string];
        const sch = schedules.find((s) => s.id === id && s.organizationId === orgId && !s._deleted);
        if (!sch) return { rows: [] };
        sch.lastInvoiceId = lastInvoiceId;
        sch.lastRunAt = lastRunAt;
        sch.nextRunAt = nextRunAt;
        return { rows: [sch as unknown as T] };
      }

      // update recurring schedule (general)
      if (t.includes("update recurring_billing_schedules") && t.includes("set")) {
        const [id, orgId] = values as [string, string];
        const sch = schedules.find((s) => s.id === id && s.organizationId === orgId && !s._deleted);
        if (!sch) return { rows: [] };
        return { rows: [sch as unknown as T] };
      }

      // audit_events
      if (t.includes("insert into audit_events")) {
        return { rows: [{ id: "ae_1" } as unknown as T] };
      }

      // timeline_entries
      if (t.includes("insert into timeline_entries")) {
        return { rows: [{ id: "te_1" } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, schedules, invoices };
}

const TENANT_HEADERS = {
  "x-organization-id": "org-1",
  "x-user-identity-id": "user-1"
};

const AMOUNT: BillingMoney = { amountMinor: 150000, currency: "CAD", scale: 2 };

describe("billing recurring-schedules HTTP (DS 4.4)", () => {
  it("POST /billing/recurring-schedules → 201 creates a schedule", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({
        companyId: "co-1",
        description: "Monthly retainer",
        cadence: "monthly",
        amount: AMOUNT,
        nextRunAt: "2026-06-01"
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json() as RecurringBillingSchedule;
    expect(body.id).toBeTruthy();
    expect(body.cadence).toBe("monthly");
    expect(body.nextRunAt).toBe("2026-06-01");
  });

  it("POST /billing/recurring-schedules → 400 on missing companyId", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ cadence: "monthly", amount: AMOUNT, nextRunAt: "2026-06-01" })
    });

    expect(res.status).toBe(400);
  });

  it("POST /billing/recurring-schedules → 400 on invalid cadence", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ companyId: "co-1", cadence: "biennial", amount: AMOUNT, nextRunAt: "2026-06-01" })
    });

    expect(res.status).toBe(400);
  });

  it("GET /billing/recurring-schedules → 200 returns items", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules", {
      method: "GET",
      headers: TENANT_HEADERS
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { items: RecurringBillingSchedule[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("GET /billing/recurring-schedules/:id → 200 returns the schedule", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    // Create first
    const createRes = await app.request("/billing/recurring-schedules", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ companyId: "co-1", cadence: "monthly", amount: AMOUNT, nextRunAt: "2026-06-01" })
    });
    const created = await createRes.json() as RecurringBillingSchedule;

    const res = await app.request(`/billing/recurring-schedules/${created.id}`, {
      method: "GET",
      headers: TENANT_HEADERS
    });

    expect(res.status).toBe(200);
    const body = await res.json() as RecurringBillingSchedule;
    expect(body.id).toBe(created.id);
  });

  it("GET /billing/recurring-schedules/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules/no-such-id", {
      method: "GET",
      headers: TENANT_HEADERS
    });

    expect(res.status).toBe(404);
  });

  it("PATCH /billing/recurring-schedules/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules/no-such-id", {
      method: "PATCH",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ active: false })
    });

    expect(res.status).toBe(404);
  });

  it("DELETE /billing/recurring-schedules/:id → 204 on success", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const createRes = await app.request("/billing/recurring-schedules", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ companyId: "co-1", cadence: "monthly", amount: AMOUNT, nextRunAt: "2026-06-01" })
    });
    const created = await createRes.json() as RecurringBillingSchedule;

    const res = await app.request(`/billing/recurring-schedules/${created.id}`, {
      method: "DELETE",
      headers: TENANT_HEADERS
    });

    expect(res.status).toBe(204);
  });

  it("DELETE /billing/recurring-schedules/:id → 404 for unknown id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules/no-such-id", {
      method: "DELETE",
      headers: TENANT_HEADERS
    });

    expect(res.status).toBe(404);
  });

  it("POST /billing/recurring-schedules/run → 200 with generated count", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    // Create a due schedule
    await app.request("/billing/recurring-schedules", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ companyId: "co-1", cadence: "monthly", amount: AMOUNT, nextRunAt: "2026-05-01" })
    });

    const res = await app.request("/billing/recurring-schedules/run", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({ asOfDate: "2026-05-28" })
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { generated: number; invoiceIds: string[] };
    expect(body.generated).toBe(1);
    expect(body.invoiceIds).toHaveLength(1);
  });

  it("POST /billing/recurring-schedules/run → 401 when no tenant headers", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/recurring-schedules/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ asOfDate: "2026-05-28" })
    });

    expect(res.status).toBe(401);
  });
});
