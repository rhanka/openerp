import { describe, expect, it } from "vitest";

import type { Invoice, Payment, BillingMoney, InvoiceStatus } from "@sentropic/openerp-domain/billing";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

function makeFakeDb(seedInvoices: (Invoice & { _deleted?: boolean })[] = []) {
  const invoices: (Invoice & { _deleted?: boolean })[] = [...seedInvoices];
  const payments: (Payment & { _deleted?: boolean })[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // insert payment
      if (t.includes("insert into payments")) {
        const [orgId, invoiceId, companyId, amount, paymentDate, method, reference] =
          values as [string, string, string | null, string, string, string, string | null];
        const row: Payment = {
          id: `pay_${payments.length + 1}`,
          organizationId: orgId,
          invoiceId,
          companyId,
          amount: JSON.parse(amount) as BillingMoney,
          paymentDate,
          method: method as Payment["method"],
          reference,
          createdAt: "2026-05-25T10:00:00.000Z",
          updatedAt: "2026-05-25T10:00:00.000Z"
        };
        payments.push(row);
        return { rows: [row as unknown as T] };
      }

      // find payment by id
      if (t.includes("from payments") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = payments.find(
          (p) => p.id === id && p.organizationId === organizationId && !p._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list payments
      if (t.includes("from payments") && t.includes("order by payment_date")) {
        const [organizationId, filterInvoiceId, filterCompanyId] = values as [string, string | null, string | null];
        const rows = payments.filter(
          (p) =>
            p.organizationId === organizationId &&
            !p._deleted &&
            (filterInvoiceId === null || p.invoiceId === filterInvoiceId) &&
            (filterCompanyId === null || p.companyId === filterCompanyId)
        );
        return { rows: rows as unknown as T[] };
      }

      // soft delete payment
      if (t.includes("update payments") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const pay = payments.find(
          (p) => p.id === id && p.organizationId === organizationId && !p._deleted
        );
        if (!pay) return { rows: [] };
        pay._deleted = true;
        return { rows: [{ id: pay.id } as unknown as T] };
      }

      // sum payments for invoice
      if (t.includes("sum(") && t.includes("from payments")) {
        const [invoiceId, organizationId] = values as [string, string];
        const total = payments
          .filter((p) => p.invoiceId === invoiceId && p.organizationId === organizationId && !p._deleted)
          .reduce((acc, p) => acc + p.amount.amountMinor, 0);
        return { rows: [{ total: String(total) } as unknown as T] };
      }

      // find invoice by id (for guard + reconcile)
      if (t.includes("from invoices") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = invoices.find(
          (inv) => inv.id === id && inv.organizationId === organizationId && !inv._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // update invoice status (reconcile)
      if (t.includes("update invoices") && t.includes("status = $3")) {
        const [id, organizationId, newStatus] = values as [string, string, string];
        const inv = invoices.find(
          (i) => i.id === id && i.organizationId === organizationId && !i._deleted
        );
        if (!inv) return { rows: [] };
        inv.status = newStatus as InvoiceStatus;
        return { rows: [inv as unknown as T] };
      }

      // audit and timeline — silent sink
      if (t.includes("into audit_events") || t.includes("into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, invoices, payments };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000bbb"
} as const;

function makeIssuedInvoice(id: string, orgId: string, totalMinor: number): Invoice {
  const money: BillingMoney = { amountMinor: totalMinor, currency: "CAD", scale: 2 };
  return {
    id,
    organizationId: orgId,
    companyId: "co-1",
    projectId: null,
    invoiceProposalId: null,
    invoiceNumber: "INV-000001",
    status: "issued",
    currency: "CAD",
    subtotal: money,
    taxTotal: { amountMinor: 0, currency: "CAD", scale: 2 },
    total: money,
    taxCategoryId: null,
    taxBreakdown: null,
    issueDate: "2026-05-01",
    dueDate: null,
    issuedAt: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}

const ORG_ID = "00000000-0000-0000-0000-000000000001";

describe("billing /billing/payments HTTP surface (DS 4.1)", () => {
  it("requires tenant headers — returns 401 when missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("GET /billing/payments returns items array", async () => {
    const invoice = makeIssuedInvoice("inv-h1", ORG_ID, 10000);
    const { db } = makeFakeDb([invoice]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: Payment[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("POST /billing/payments rejects missing invoiceId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "bank_transfer"
      })
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { errors: Record<string, string> };
    expect(body.errors.invoiceId).toBe("REQUIRED");
  });

  it("POST /billing/payments rejects amountMinor <= 0 with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        invoiceId: "inv-h1",
        amount: { amountMinor: 0, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "cash"
      })
    });
    expect(res.status).toBe(400);
  });

  it("POST /billing/payments rejects invalid method with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        invoiceId: "inv-h1",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "wire_transfer"
      })
    });
    expect(res.status).toBe(400);
  });

  it("POST /billing/payments returns 404 when invoice not found", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        invoiceId: "inv-missing",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "bank_transfer"
      })
    });
    expect(res.status).toBe(404);
  });

  it("POST /billing/payments returns 409 when invoice is not payable (draft)", async () => {
    const draftInvoice: Invoice = {
      ...makeIssuedInvoice("inv-draft", ORG_ID, 10000),
      status: "draft"
    };
    const { db } = makeFakeDb([draftInvoice]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        invoiceId: "inv-draft",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "cash"
      })
    });
    expect(res.status).toBe(409);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("INVOICE_NOT_PAYABLE");
  });

  it("POST /billing/payments returns 201 with created payment", async () => {
    const invoice = makeIssuedInvoice("inv-h2", ORG_ID, 10000);
    const { db } = makeFakeDb([invoice]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        invoiceId: "inv-h2",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "bank_transfer"
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Payment;
    expect(body.invoiceId).toBe("inv-h2");
    expect(body.amount.amountMinor).toBe(5000);
    expect(body.method).toBe("bank_transfer");
  });

  it("GET /billing/payments/:id returns 404 for missing payment", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments/no-such-payment", { headers: tenantHeaders });
    expect(res.status).toBe(404);
  });

  it("GET /billing/payments/:id returns payment when found", async () => {
    const invoice = makeIssuedInvoice("inv-h3", ORG_ID, 10000);
    const { db, payments } = makeFakeDb([invoice]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    // Record payment first
    const postRes = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        invoiceId: "inv-h3",
        amount: { amountMinor: 3000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "cheque"
      })
    });
    const created = await postRes.json() as Payment;

    const getRes = await app.request(`/billing/payments/${created.id}`, { headers: tenantHeaders });
    expect(getRes.status).toBe(200);
    const body = await getRes.json() as Payment;
    expect(body.id).toBe(created.id);
    expect(body.method).toBe("cheque");
  });

  it("DELETE /billing/payments/:id returns 204 and soft-deletes the payment", async () => {
    const invoice = makeIssuedInvoice("inv-h4", ORG_ID, 10000);
    const { db } = makeFakeDb([invoice]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const postRes = await app.request("/billing/payments", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({
        invoiceId: "inv-h4",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "card"
      })
    });
    const created = await postRes.json() as Payment;

    const delRes = await app.request(`/billing/payments/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(delRes.status).toBe(204);

    // Now GET should return 404
    const getRes = await app.request(`/billing/payments/${created.id}`, { headers: tenantHeaders });
    expect(getRes.status).toBe(404);
  });

  it("DELETE /billing/payments/:id returns 404 when payment not found", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/payments/no-such-pay", {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });
});
