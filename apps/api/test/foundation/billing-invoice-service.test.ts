import { describe, expect, it } from "vitest";

import type { Invoice, InvoiceLine, BillingMoney, InvoiceStatus } from "@sentropic/openerp-domain/billing";
import type { InvoiceProposal, InvoiceProposalLine } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import {
  InvoiceNotFoundError,
  InvoiceTransitionError,
  InvoiceProposalNotApprovedError,
  createInvoice,
  createInvoiceFromProposal,
  deleteInvoice,
  getInvoiceById,
  issueInvoice,
  listInvoices,
  markPaid,
  voidInvoice
} from "../../src/billing/invoice-service";

interface AuditRow {
  action: string;
  resourceType: string;
  resourceId: string;
}

interface TimelineRow {
  entryType: string;
}

function makeFakeDb(
  proposals: InvoiceProposal[] = [],
  proposalLines: InvoiceProposalLine[] = []
) {
  const invoices: (Invoice & { _deleted?: boolean })[] = [];
  const invoiceLines: InvoiceLine[] = [];
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
        const [orgId, companyId, projectId, invoiceProposalId, invoiceNumber, status, currency, subtotal, taxTotal, total, issueDate, dueDate] =
          values as [string, string, string | null, string | null, string, string, string, string, string, string, string | null, string | null];
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
          issueDate,
          dueDate,
          issuedAt: null,
          createdAt: "2026-05-25T10:00:00.000Z",
          updatedAt: "2026-05-25T10:00:00.000Z"
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
          createdAt: "2026-05-25T10:00:00.000Z"
        };
        invoiceLines.push(row);
        return { rows: [row as unknown as T] };
      }

      // find invoice by id
      if (t.includes("from invoices") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = invoices.find(
          (inv) => inv.id === id && inv.organizationId === organizationId && !inv._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list invoices
      if (t.includes("from invoices") && t.includes("order by created_at")) {
        const [organizationId] = values as [string];
        const rows = invoices.filter(
          (inv) => inv.organizationId === organizationId && !inv._deleted
        );
        return { rows: rows as unknown as T[] };
      }

      // update invoices status
      if (t.includes("update invoices") && t.includes("status = $3")) {
        const [id, organizationId, newStatus] = values as [string, string, string];
        const inv = invoices.find(
          (i) => i.id === id && i.organizationId === organizationId && !i._deleted
        );
        if (!inv) return { rows: [] };
        inv.status = newStatus as InvoiceStatus;
        // set issuedAt and issueDate if in the set clause
        if (t.includes("issued_at")) {
          const issuedAt = values[3] as string | null;
          inv.issuedAt = issuedAt;
        }
        if (t.includes("issue_date")) {
          const dateIdx = t.includes("issued_at") ? 4 : 3;
          const issueDate = values[dateIdx] as string | null;
          inv.issueDate = issueDate;
        }
        return { rows: [inv as unknown as T] };
      }

      // soft delete invoice
      if (t.includes("update invoices") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const inv = invoices.find(
          (i) => i.id === id && i.organizationId === organizationId && !i._deleted
        );
        if (!inv) return { rows: [] };
        inv._deleted = true;
        return { rows: [{ id: inv.id } as unknown as T] };
      }

      // list lines for invoice
      if (t.includes("from invoice_lines") && t.includes("where invoice_id = $1")) {
        const [invoiceId] = values as [string];
        const rows = invoiceLines.filter((l) => l.invoiceId === invoiceId);
        return { rows: rows as unknown as T[] };
      }

      // audit_events
      // columns: organization_id(0), actor_user_id(1), actor_type(2), action(3), resource_type(4), resource_id(5), ...
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        const resourceType = values[4] as string;
        const resourceId = values[5] as string;
        audits.push({ action, resourceType, resourceId });
        return { rows: [{ id: `ae_${audits.length}` } as unknown as T] };
      }

      // timeline_entries
      if (t.includes("insert into timeline_entries")) {
        // Look for entry_type in the values — it's the 5th value (index 4)
        const entryType = values[4] as string;
        timelines.push({ entryType });
        return { rows: [{ id: `te_${timelines.length}` } as unknown as T] };
      }

      // invoice_proposals (find by id)
      if (t.includes("from invoice_proposals") && t.includes("where id = $1")) {
        const [id] = values as [string];
        const found = proposals.find((p) => p.id === id);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // invoice_proposal_lines
      if (t.includes("from invoice_proposal_lines") && t.includes("where invoice_proposal_id = $1")) {
        const [proposalId] = values as [string];
        const rows = proposalLines.filter((l) => l.invoiceProposalId === proposalId);
        return { rows: rows as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db, invoices, invoiceLines, audits, timelines };
}

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };

describe("billing invoice service (DS 4.0) — unit", () => {
  it("createInvoice: computes subtotal + total from lines, sets draft status, generates invoice number", async () => {
    const { db } = makeFakeDb();
    const result = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 60,
          unitPrice: { amountMinor: 10000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 10000, currency: "CAD", scale: 2 }
        },
        {
          quantity: 30,
          unitPrice: { amountMinor: 10000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 5000, currency: "CAD", scale: 2 }
        }
      ]
    });

    expect(result.status).toBe("draft");
    expect(result.invoiceNumber).toBe("INV-000001");
    expect(result.subtotal.amountMinor).toBe(15000);
    expect(result.total.amountMinor).toBe(15000);
    expect(result.taxTotal.amountMinor).toBe(0);
    expect(result.lines).toHaveLength(2);
    expect(result.companyId).toBe("co-1");
  });

  it("createInvoice: emits billing.invoice.created audit + timeline", async () => {
    const { db, audits, timelines } = makeFakeDb();
    await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 5000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 5000, currency: "CAD", scale: 2 }
        }
      ]
    });
    expect(audits.some((a) => a.action === "billing.invoice.created")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.invoice.created")).toBe(true);
  });

  it("createInvoiceFromProposal: maps proposal lines, sets invoiceProposalId, total = proposal.total", async () => {
    const money: BillingMoney = { amountMinor: 15000, currency: "CAD", scale: 2 };
    const proposal: InvoiceProposal = {
      id: "prop-1",
      organizationId: "org-1",
      projectId: "proj-1",
      companyId: "co-1",
      status: "approved",
      periodStart: null,
      periodEnd: null,
      total: money,
      currency: "CAD",
      submittedAt: "2026-05-01T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    };
    const pLine: InvoiceProposalLine = {
      id: "pl-1",
      organizationId: "org-1",
      invoiceProposalId: "prop-1",
      sourceType: "time_entry",
      sourceId: "te-1",
      description: "Dev work",
      quantityMinutes: 90,
      unitRate: { amountMinor: 10000, currency: "CAD", scale: 2 },
      amount: { amountMinor: 15000, currency: "CAD", scale: 2 },
      createdAt: "2026-05-01T00:00:00.000Z"
    };

    const { db } = makeFakeDb([proposal], [pLine]);
    const result = await createInvoiceFromProposal(db, TENANT, "prop-1");

    expect(result.invoiceProposalId).toBe("prop-1");
    expect(result.total.amountMinor).toBe(15000);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]!.sourceType).toBe("invoice_proposal_line");
    expect(result.lines[0]!.sourceId).toBe("pl-1");
    expect(result.lines[0]!.quantity).toBe(90);
    expect(result.invoiceNumber).toBe("INV-000001");
  });

  it("createInvoiceFromProposal: rejects when proposal not approved", async () => {
    const proposal: InvoiceProposal = {
      id: "prop-2",
      organizationId: "org-1",
      projectId: "proj-1",
      companyId: "co-1",
      status: "submitted",
      periodStart: null,
      periodEnd: null,
      total: { amountMinor: 5000, currency: "CAD", scale: 2 },
      currency: "CAD",
      submittedAt: null,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    };
    const { db } = makeFakeDb([proposal]);
    await expect(createInvoiceFromProposal(db, TENANT, "prop-2")).rejects.toBeInstanceOf(
      InvoiceProposalNotApprovedError
    );
  });

  it("issueInvoice: transitions draft -> issued, emits billing.invoice.issued", async () => {
    const { db, audits, timelines } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 3000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 3000, currency: "CAD", scale: 2 }
        }
      ]
    });
    const issued = await issueInvoice(db, TENANT, inv.id);
    expect(issued.status).toBe("issued");
    expect(audits.some((a) => a.action === "billing.invoice.issued")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.invoice.issued")).toBe(true);
  });

  it("issueInvoice: rejects from non-draft (illegal transition)", async () => {
    const { db } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 1000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 1000, currency: "CAD", scale: 2 }
        }
      ]
    });
    await issueInvoice(db, TENANT, inv.id); // draft -> issued
    await expect(issueInvoice(db, TENANT, inv.id)).rejects.toBeInstanceOf(InvoiceTransitionError);
  });

  it("markPaid: transitions issued -> paid, emits billing.invoice.paid", async () => {
    const { db, audits } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 2000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 2000, currency: "CAD", scale: 2 }
        }
      ]
    });
    await issueInvoice(db, TENANT, inv.id);
    const paid = await markPaid(db, TENANT, inv.id);
    expect(paid.status).toBe("paid");
    expect(audits.some((a) => a.action === "billing.invoice.paid")).toBe(true);
  });

  it("markPaid: rejects from draft (illegal transition)", async () => {
    const { db } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 1000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 1000, currency: "CAD", scale: 2 }
        }
      ]
    });
    await expect(markPaid(db, TENANT, inv.id)).rejects.toBeInstanceOf(InvoiceTransitionError);
  });

  it("voidInvoice: transitions draft -> void, emits billing.invoice.void", async () => {
    const { db, audits } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 1000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 1000, currency: "CAD", scale: 2 }
        }
      ]
    });
    const voided = await voidInvoice(db, TENANT, inv.id);
    expect(voided.status).toBe("void");
    expect(audits.some((a) => a.action === "billing.invoice.void")).toBe(true);
  });

  it("voidInvoice: rejects from paid (illegal transition)", async () => {
    const { db } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 1000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 1000, currency: "CAD", scale: 2 }
        }
      ]
    });
    await issueInvoice(db, TENANT, inv.id);
    await markPaid(db, TENANT, inv.id);
    await expect(voidInvoice(db, TENANT, inv.id)).rejects.toBeInstanceOf(InvoiceTransitionError);
  });

  it("deleteInvoice: soft-deletes draft, emits billing.invoice.deleted", async () => {
    const { db, audits } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 1000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 1000, currency: "CAD", scale: 2 }
        }
      ]
    });
    await deleteInvoice(db, TENANT, inv.id);
    expect(audits.some((a) => a.action === "billing.invoice.deleted")).toBe(true);
    const found = await getInvoiceById(db, TENANT, inv.id);
    expect(found).toBeNull();
  });

  it("deleteInvoice: rejects when invoice is issued (not draft)", async () => {
    const { db } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 1000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 1000, currency: "CAD", scale: 2 }
        }
      ]
    });
    await issueInvoice(db, TENANT, inv.id);
    await expect(deleteInvoice(db, TENANT, inv.id)).rejects.toBeInstanceOf(InvoiceTransitionError);
  });

  it("getInvoiceById: returns invoice with lines", async () => {
    const { db } = makeFakeDb();
    const inv = await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 2,
          unitPrice: { amountMinor: 5000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 10000, currency: "CAD", scale: 2 }
        }
      ]
    });
    const found = await getInvoiceById(db, TENANT, inv.id);
    expect(found).not.toBeNull();
    expect(found!.lines).toHaveLength(1);
    expect(found!.total.amountMinor).toBe(10000);
  });

  it("getInvoiceById: returns null for unknown id", async () => {
    const { db } = makeFakeDb();
    const found = await getInvoiceById(db, TENANT, "unknown-id");
    expect(found).toBeNull();
  });

  it("listInvoices: returns existing invoices", async () => {
    const { db } = makeFakeDb();
    await createInvoice(db, TENANT, {
      companyId: "co-1",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 1000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 1000, currency: "CAD", scale: 2 }
        }
      ]
    });
    await createInvoice(db, TENANT, {
      companyId: "co-2",
      lines: [
        {
          quantity: 1,
          unitPrice: { amountMinor: 2000, currency: "CAD", scale: 2 },
          amount: { amountMinor: 2000, currency: "CAD", scale: 2 }
        }
      ]
    });
    const list = await listInvoices(db, TENANT);
    expect(list).toHaveLength(2);
  });

  it("InvoiceNotFoundError is thrown for not found on lifecycle transitions", async () => {
    const { db } = makeFakeDb();
    await expect(issueInvoice(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(markPaid(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(voidInvoice(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(InvoiceNotFoundError);
    await expect(deleteInvoice(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });
});
