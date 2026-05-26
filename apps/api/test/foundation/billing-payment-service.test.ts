import { describe, expect, it } from "vitest";

import type { Invoice, Payment, BillingMoney, InvoiceStatus } from "@sentropic/openerp-domain/billing";
import type { Queryable } from "../../src/db/client";
import {
  PaymentNotFoundError,
  InvoiceNotPayableError,
  recordPayment,
  deletePayment,
  getPaymentById,
  listPayments
} from "../../src/billing/payment-service";
import { InvoiceNotFoundError } from "../../src/billing/invoice-service";

interface AuditRow {
  action: string;
  resourceType: string;
}

interface TimelineRow {
  entryType: string;
}

function makeFakeDb(seedInvoices: (Invoice & { _deleted?: boolean })[] = []) {
  const invoices: (Invoice & { _deleted?: boolean })[] = [...seedInvoices];
  const payments: (Payment & { _deleted?: boolean })[] = [];
  const audits: AuditRow[] = [];
  const timelines: TimelineRow[] = [];

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

      // audit_events
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        const resourceType = values[4] as string;
        audits.push({ action, resourceType });
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

  return { db, invoices, payments, audits, timelines };
}

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };

function makeIssuedInvoice(id: string, totalMinor: number): Invoice {
  const money: BillingMoney = { amountMinor: totalMinor, currency: "CAD", scale: 2 };
  return {
    id,
    organizationId: "org-1",
    companyId: "co-1",
    projectId: null,
    invoiceProposalId: null,
    invoiceNumber: "INV-000001",
    status: "issued",
    currency: "CAD",
    subtotal: money,
    taxTotal: { amountMinor: 0, currency: "CAD", scale: 2 },
    total: money,
    issueDate: "2026-05-01",
    dueDate: null,
    issuedAt: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}

describe("billing payment service (DS 4.1) — unit", () => {
  it("recordPayment: partial payment sets invoice to partially_paid and emits events", async () => {
    const invoice = makeIssuedInvoice("inv-1", 10000);
    const { db, invoices, audits, timelines } = makeFakeDb([invoice]);

    const payment = await recordPayment(db, TENANT, {
      invoiceId: "inv-1",
      amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
      paymentDate: "2026-05-02",
      method: "bank_transfer"
    });

    expect(payment.invoiceId).toBe("inv-1");
    expect(payment.amount.amountMinor).toBe(5000);

    // Invoice should be partially_paid
    const inv = invoices.find((i) => i.id === "inv-1");
    expect(inv?.status).toBe("partially_paid");

    // Audit: billing.payment.created + billing.invoice.partially_paid
    expect(audits.some((a) => a.action === "billing.payment.created")).toBe(true);
    expect(audits.some((a) => a.action === "billing.invoice.partially_paid")).toBe(true);

    // Timeline: billing.payment.created on invoice resource + billing.invoice.partially_paid
    expect(timelines.some((t) => t.entryType === "billing.payment.created")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.invoice.partially_paid")).toBe(true);
  });

  it("recordPayment: full payment sets invoice to paid and emits billing.invoice.paid", async () => {
    const invoice = makeIssuedInvoice("inv-2", 10000);
    const { db, invoices, audits, timelines } = makeFakeDb([invoice]);

    await recordPayment(db, TENANT, {
      invoiceId: "inv-2",
      amount: { amountMinor: 10000, currency: "CAD", scale: 2 },
      paymentDate: "2026-05-02",
      method: "card"
    });

    const inv = invoices.find((i) => i.id === "inv-2");
    expect(inv?.status).toBe("paid");
    expect(audits.some((a) => a.action === "billing.invoice.paid")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.invoice.paid")).toBe(true);
  });

  it("recordPayment: over-payment sets invoice to paid", async () => {
    const invoice = makeIssuedInvoice("inv-3", 10000);
    const { db, invoices } = makeFakeDb([invoice]);

    await recordPayment(db, TENANT, {
      invoiceId: "inv-3",
      amount: { amountMinor: 12000, currency: "CAD", scale: 2 },
      paymentDate: "2026-05-02",
      method: "cash"
    });

    const inv = invoices.find((i) => i.id === "inv-3");
    expect(inv?.status).toBe("paid");
  });

  it("recordPayment: recording against a draft invoice throws InvoiceNotPayableError (409)", async () => {
    const invoice: Invoice = {
      ...makeIssuedInvoice("inv-4", 10000),
      status: "draft"
    };
    const { db } = makeFakeDb([invoice]);

    await expect(
      recordPayment(db, TENANT, {
        invoiceId: "inv-4",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "cash"
      })
    ).rejects.toBeInstanceOf(InvoiceNotPayableError);
  });

  it("recordPayment: recording against a void invoice throws InvoiceNotPayableError", async () => {
    const invoice: Invoice = {
      ...makeIssuedInvoice("inv-5", 10000),
      status: "void"
    };
    const { db } = makeFakeDb([invoice]);

    await expect(
      recordPayment(db, TENANT, {
        invoiceId: "inv-5",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "cheque"
      })
    ).rejects.toBeInstanceOf(InvoiceNotPayableError);
  });

  it("recordPayment: recording against a missing invoice throws InvoiceNotFoundError", async () => {
    const { db } = makeFakeDb([]);

    await expect(
      recordPayment(db, TENANT, {
        invoiceId: "inv-missing",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "bank_transfer"
      })
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });

  it("deletePayment: soft-deletes a payment and recomputes invoice status (paid -> partially_paid)", async () => {
    // Start with a paid invoice (100% paid via 2 payments)
    const invoice: Invoice = {
      ...makeIssuedInvoice("inv-6", 10000),
      status: "paid"
    };
    const { db, invoices, payments, audits, timelines } = makeFakeDb([invoice]);

    // Manually inject 2 payments that sum to 10000
    const pay1: Payment & { _deleted?: boolean } = {
      id: "pay_1",
      organizationId: "org-1",
      invoiceId: "inv-6",
      companyId: "co-1",
      amount: { amountMinor: 6000, currency: "CAD", scale: 2 },
      paymentDate: "2026-05-02",
      method: "bank_transfer",
      reference: null,
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z"
    };
    const pay2: Payment & { _deleted?: boolean } = {
      id: "pay_2",
      organizationId: "org-1",
      invoiceId: "inv-6",
      companyId: "co-1",
      amount: { amountMinor: 4000, currency: "CAD", scale: 2 },
      paymentDate: "2026-05-03",
      method: "card",
      reference: null,
      createdAt: "2026-05-03T10:00:00.000Z",
      updatedAt: "2026-05-03T10:00:00.000Z"
    };
    payments.push(pay1, pay2);

    // Delete one payment — invoice should fall back to partially_paid
    await deletePayment(db, TENANT, "pay_2");

    const inv = invoices.find((i) => i.id === "inv-6");
    expect(inv?.status).toBe("partially_paid");
    expect(audits.some((a) => a.action === "billing.payment.deleted")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.payment.deleted")).toBe(true);
  });

  it("deletePayment: throws PaymentNotFoundError when payment does not exist", async () => {
    const { db } = makeFakeDb([]);
    await expect(deletePayment(db, TENANT, "pay-missing")).rejects.toBeInstanceOf(PaymentNotFoundError);
  });

  it("getPaymentById: returns null when payment not found", async () => {
    const { db } = makeFakeDb([]);
    const result = await getPaymentById(db, TENANT, "pay-missing");
    expect(result).toBeNull();
  });

  it("listPayments: filters by invoiceId", async () => {
    const invoice = makeIssuedInvoice("inv-7", 20000);
    const { db, payments } = makeFakeDb([invoice]);

    payments.push(
      {
        id: "pay_A",
        organizationId: "org-1",
        invoiceId: "inv-7",
        companyId: "co-1",
        amount: { amountMinor: 5000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "cash",
        reference: null,
        createdAt: "2026-05-02T10:00:00.000Z",
        updatedAt: "2026-05-02T10:00:00.000Z"
      },
      {
        id: "pay_B",
        organizationId: "org-1",
        invoiceId: "inv-other",
        companyId: "co-1",
        amount: { amountMinor: 3000, currency: "CAD", scale: 2 },
        paymentDate: "2026-05-02",
        method: "card",
        reference: null,
        createdAt: "2026-05-02T10:00:00.000Z",
        updatedAt: "2026-05-02T10:00:00.000Z"
      }
    );

    const results = await listPayments(db, TENANT, { invoiceId: "inv-7" });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("pay_A");
  });
});
