import { describe, expect, it } from "vitest";

import type { Invoice, InvoiceWithLines, BillingMoney, InvoiceStatus } from "@sentropic/openerp-domain/billing";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// Fake DB that simulates invoices + invoice_lines, tenant-scoped by organization_id
// exactly like the live schema (see billing-invoices-http.test.ts for the fuller
// version this is trimmed from).
function makeFakeDb() {
  const invoices: Array<Invoice & { _deleted?: boolean }> = [];
  const invoiceLines: Array<InvoiceWithLines["lines"][number]> = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // count invoices (for invoice number generation)
      if (t.includes("count(*)") && t.includes("from invoices")) {
        return { rows: [{ count: String(invoices.length) } as unknown as T] };
      }

      // INSERT invoices
      if (t.includes("insert into invoices")) {
        const [orgId, companyId, projectId, invoiceProposalId, invoiceNumber, status, currency, subtotal, taxTotal, total, taxCategoryId, issueDate, dueDate] =
          values as [string, string, string | null, string | null, string, string, string, string, string, string, string | null, string | null, string | null];
        const row: Invoice = {
          id: `inv_${invoices.length + 1}`,
          organizationId: orgId,
          companyId,
          projectId,
          invoiceProposalId,
          invoiceNumber,
          status: status as InvoiceStatus,
          currency,
          subtotal: JSON.parse(subtotal) as BillingMoney,
          taxTotal: JSON.parse(taxTotal) as BillingMoney,
          total: JSON.parse(total) as BillingMoney,
          taxCategoryId,
          taxBreakdown: null,
          issueDate,
          dueDate,
          issuedAt: null,
          createdAt: "2026-05-25T10:00:00.000Z",
          updatedAt: "2026-05-25T10:00:00.000Z"
        };
        invoices.push(row);
        return { rows: [row as unknown as T] };
      }

      // INSERT invoice_lines
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
          createdAt: "2026-05-25T10:00:00.000Z"
        };
        invoiceLines.push(row);
        return { rows: [row as unknown as T] };
      }

      // SELECT invoices by id (findInvoiceById — tenant-scoped, excludes soft-deleted)
      if (t.includes("from invoices") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = invoices.find(
          (inv) => inv.id === id && inv.organizationId === organizationId && !inv._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // SELECT invoice_lines (listLinesForInvoice — tenant-scoped)
      if (t.includes("from invoice_lines") && t.includes("where invoice_id = $1")) {
        const [invoiceId, organizationId] = values as [string, string];
        const rows = invoiceLines.filter(
          (l) => l.invoiceId === invoiceId && l.organizationId === organizationId
        );
        return { rows: rows as unknown as T[] };
      }

      // audit and timeline — silent sink
      if (t.includes("into audit_events") || t.includes("into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db };
}

const orgAHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

const orgBHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000002",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000bbb"
} as const;

const sampleLine = {
  description: "Consulting — May",
  quantity: 2,
  unitPrice: { amountMinor: 5000, currency: "CAD", scale: 2 },
  amount: { amountMinor: 10000, currency: "CAD", scale: 2 }
};

async function createInvoice(app: ReturnType<typeof buildApp>, headers: Record<string, string>) {
  const res = await app.request("/billing/invoices", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
  });
  return (await res.json()) as InvoiceWithLines;
}

describe("GET /billing/invoices/:id/document (D5 read-only document view-model)", () => {
  it("returns 200 with the assembled document model for an existing invoice", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = await createInvoice(app, orgAHeaders);

    const res = await app.request(`/billing/invoices/${created.id}/document`, {
      headers: orgAHeaders
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      meta: { invoiceNumber: string; status: string };
      lines: unknown[];
      labels: Record<string, string>;
    };
    expect(body.meta.invoiceNumber).toBe(created.invoiceNumber);
    expect(body.meta.status).toBe("draft");
    expect(body.lines).toHaveLength(1);
    expect(body.labels).toBeDefined();
    expect(body.labels.invoiceNumber).toBe("billing.invoices.field.invoiceNumber");
  });

  it("returns 404 for a non-existent invoice id", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });

    const res = await app.request("/billing/invoices/no-such-id/document", {
      headers: orgAHeaders
    });
    expect(res.status).toBe(404);
    expect((await res.json()) as { code: string }).toEqual({ code: "NOT_FOUND" });
  });

  it("enforces tenant isolation — org B cannot read org A's invoice document (404, not leak)", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = await createInvoice(app, orgAHeaders);

    const res = await app.request(`/billing/invoices/${created.id}/document`, {
      headers: orgBHeaders
    });
    expect(res.status).toBe(404);
  });
});
