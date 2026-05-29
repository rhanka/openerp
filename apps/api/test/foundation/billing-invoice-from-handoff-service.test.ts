import { describe, expect, it } from "vitest";

import type { Invoice, InvoiceLine, BillingMoney, InvoiceStatus } from "@sentropic/openerp-domain/billing";
import type { QuoteHandoff, Opportunity } from "@sentropic/openerp-domain/crm";
import type { Queryable } from "../../src/db/client";
import {
  QuoteHandoffNotFoundError,
  QuoteHandoffInvalidStatusError,
  createInvoiceFromQuoteHandoff
} from "../../src/billing/invoice-service";

interface AuditRow {
  action: string;
}

function makeFakeDb(
  handoffs: QuoteHandoff[] = [],
  opportunities: Opportunity[] = []
) {
  const invoices: Invoice[] = [];
  const invoiceLines: InvoiceLine[] = [];
  const audits: AuditRow[] = [];
  const internalHandoffs = handoffs.map((h) => ({ ...h }));

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // count invoices
      if (t.includes("count(*)") && t.includes("from invoices")) {
        return { rows: [{ count: String(invoices.length) } as unknown as T] };
      }

      // insert invoice
      if (t.includes("insert into invoices")) {
        const [orgId, companyId, projectId, invoiceProposalId, invoiceNumber, status, currency, subtotal, taxTotal, total] =
          values as [string, string, string | null, string | null, string, string, string, string, string, string];
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
          taxCategoryId: null,
          taxBreakdown: null,
          issueDate: null,
          dueDate: null,
          issuedAt: null,
          createdAt: "2026-05-28T10:00:00.000Z",
          updatedAt: "2026-05-28T10:00:00.000Z"
        };
        invoices.push(row);
        return { rows: [row as unknown as T] };
      }

      // insert invoice_lines
      if (t.includes("insert into invoice_lines")) {
        const [orgId, invoiceId, sourceType, sourceId, description, quantity, unitPrice, amount] =
          values as [string, string, string, string | null, string | null, number, string, string];
        const row: InvoiceLine = {
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
        return { rows: [row as unknown as T] };
      }

      // find quote_handoff by id
      if (t.includes("from quote_handoffs") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = internalHandoffs.find((h) => h.id === id && h.organizationId === orgId && !h.deletedAt);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // update quote_handoff status
      if (t.includes("update quote_handoffs") && t.includes("status = $3")) {
        const [id, orgId, newStatus] = values as [string, string, string];
        const h = internalHandoffs.find((x) => x.id === id && x.organizationId === orgId && !x.deletedAt);
        if (!h) return { rows: [] };
        h.status = newStatus as QuoteHandoff["status"];
        if (t.includes("accepted_at")) {
          h.acceptedAt = values[3] as string;
        }
        return { rows: [h as unknown as T] };
      }

      // find opportunity by id (used by createInvoiceFromQuoteHandoff)
      if (t.includes("from opportunities") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = opportunities.find((o) => o.id === id && o.organizationId === orgId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // audit_events
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        audits.push({ action });
        return { rows: [] };
      }

      // timeline_entries
      if (t.includes("insert into timeline_entries")) {
        return { rows: [{ id: "te_1" } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, invoices, invoiceLines, audits, internalHandoffs };
}

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };

const makeOpportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "opp-1",
  organizationId: "org-1",
  companyId: "co-1",
  primaryContactId: null,
  name: "Annual SaaS licence",
  stageId: "stage-1",
  status: "won",
  ownerUserId: null,
  teamId: null,
  expectedValue: { amountMinor: 1200000, currency: "CAD", scale: 2 },
  currency: "CAD",
  expectedCloseDate: null,
  probabilityBand: null,
  serviceSummary: null,
  lossReason: null,
  createdAt: "2026-05-28T10:00:00.000Z",
  updatedAt: "2026-05-28T10:00:00.000Z",
  ...overrides
});

const makeHandoff = (overrides: Partial<QuoteHandoff> = {}): QuoteHandoff => ({
  id: "qh-1",
  organizationId: "org-1",
  opportunityId: "opp-1",
  targetType: "invoice",
  status: "pending",
  requestedByUserId: "user-1",
  acceptedAt: null,
  deletedAt: null,
  createdAt: "2026-05-28T10:00:00.000Z",
  updatedAt: "2026-05-28T10:00:00.000Z",
  ...overrides
});

describe("billing createInvoiceFromQuoteHandoff (DS 2.7) — unit", () => {
  it("creates single-line draft invoice from opportunity expectedValue, sets handoff accepted", async () => {
    const handoff = makeHandoff();
    const opp = makeOpportunity();
    const { db, audits, internalHandoffs } = makeFakeDb([handoff], [opp]);

    const result = await createInvoiceFromQuoteHandoff(db, TENANT, "qh-1");

    expect(result.status).toBe("draft");
    expect(result.companyId).toBe("co-1");
    expect(result.total.amountMinor).toBe(1200000);
    expect(result.subtotal.amountMinor).toBe(1200000);
    expect(result.taxTotal.amountMinor).toBe(0);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.sourceType).toBe("quote_handoff");
    expect(result.lines[0]!.sourceId).toBe("qh-1");
    expect(result.lines[0]!.description).toBe("Annual SaaS licence");
    expect(result.lines[0]!.quantity).toBe(1);
    expect(result.lines[0]!.amount.amountMinor).toBe(1200000);

    // Handoff should be accepted now
    const updatedHandoff = internalHandoffs.find((h) => h.id === "qh-1");
    expect(updatedHandoff!.status).toBe("accepted");
    expect(updatedHandoff!.acceptedAt).toBeTruthy();

    // Audit events
    expect(audits.some((a) => a.action === "billing.invoice.created")).toBe(true);
    expect(audits.some((a) => a.action === "crm.quote_handoff.accepted")).toBe(true);
  });

  it("accepts already-accepted handoff without double-accepting", async () => {
    const handoff = makeHandoff({ status: "accepted", acceptedAt: "2026-05-28T09:00:00.000Z" });
    const opp = makeOpportunity();
    const { db, audits } = makeFakeDb([handoff], [opp]);

    const result = await createInvoiceFromQuoteHandoff(db, TENANT, "qh-1");
    expect(result.status).toBe("draft");
    // accepted audit should NOT be emitted again since already accepted
    expect(audits.filter((a) => a.action === "crm.quote_handoff.accepted")).toHaveLength(0);
  });

  it("rejects when handoff not found", async () => {
    const { db } = makeFakeDb([], []);
    await expect(createInvoiceFromQuoteHandoff(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(
      QuoteHandoffNotFoundError
    );
  });

  it("rejects when handoff is rejected (invalid status)", async () => {
    const handoff = makeHandoff({ status: "rejected" });
    const opp = makeOpportunity();
    const { db } = makeFakeDb([handoff], [opp]);
    await expect(createInvoiceFromQuoteHandoff(db, TENANT, "qh-1")).rejects.toBeInstanceOf(
      QuoteHandoffInvalidStatusError
    );
  });

  it("rejects when handoff is cancelled (invalid status)", async () => {
    const handoff = makeHandoff({ status: "cancelled" });
    const opp = makeOpportunity();
    const { db } = makeFakeDb([handoff], [opp]);
    await expect(createInvoiceFromQuoteHandoff(db, TENANT, "qh-1")).rejects.toBeInstanceOf(
      QuoteHandoffInvalidStatusError
    );
  });

  it("uses zero amount when opportunity has no expectedValue", async () => {
    const handoff = makeHandoff();
    const opp = makeOpportunity({ expectedValue: null, currency: "USD" });
    const { db } = makeFakeDb([handoff], [opp]);

    const result = await createInvoiceFromQuoteHandoff(db, TENANT, "qh-1");
    expect(result.total.amountMinor).toBe(0);
    expect(result.currency).toBe("USD");
  });
});
