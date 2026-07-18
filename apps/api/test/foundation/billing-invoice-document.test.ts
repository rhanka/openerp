import { describe, expect, it } from "vitest";

import type {
  BillingMoney,
  Invoice,
  InvoiceLine,
  TaxBreakdownLine
} from "@sentropic/openerp-domain/billing";

import { buildInvoiceDocumentModel } from "../../src/billing/invoice-document";

function money(amountMinor: number, currency = "CAD", scale = 2): BillingMoney {
  return { amountMinor, currency, scale };
}

function baseInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv_1",
    organizationId: "org_1",
    companyId: "company_1",
    projectId: null,
    invoiceProposalId: null,
    invoiceNumber: "INV-000001",
    status: "draft",
    currency: "CAD",
    subtotal: money(10000),
    taxTotal: money(0),
    total: money(10000),
    taxCategoryId: null,
    taxBreakdown: null,
    issueDate: null,
    dueDate: null,
    issuedAt: null,
    notes: null,
    poNumber: null,
    paymentTermsDays: null,
    issuerSnapshot: null,
    customerSnapshot: null,
    createdAt: "2026-05-25T10:00:00.000Z",
    updatedAt: "2026-05-25T10:00:00.000Z",
    ...overrides
  };
}

function baseLine(overrides: Partial<InvoiceLine> = {}): InvoiceLine {
  return {
    id: "il_1",
    organizationId: "org_1",
    invoiceId: "inv_1",
    sourceType: "manual",
    sourceId: null,
    description: "Consulting — May",
    quantity: 2,
    unitPrice: money(5000),
    amount: money(10000),
    createdAt: "2026-05-25T10:00:00.000Z",
    ...overrides
  };
}

describe("buildInvoiceDocumentModel", () => {
  it("populates issuer + customer blocks from an issued invoice's frozen snapshots", () => {
    const invoice = baseInvoice({
      status: "issued",
      issueDate: "2026-06-01",
      dueDate: "2026-07-01",
      issuedAt: "2026-06-01T09:00:00.000Z",
      issuerSnapshot: {
        legalName: "Sentropic Inc.",
        gstRegistrationNumber: "123456789RT0001",
        qstRegistrationNumber: "1234567890TQ0001",
        issuerAddress: { line1: "1 Rue Principale", city: "Montréal", country: "CA" }
      },
      customerSnapshot: {
        legalName: "Client Legal Co.",
        displayName: "Client Co.",
        billingAddress: { line1: "2 Avenue du Parc", city: "Québec", country: "CA" },
        email: "billing@client.example"
      }
    });

    const model = buildInvoiceDocumentModel(invoice, []);

    expect(model.issuer).toEqual({
      legalName: "Sentropic Inc.",
      gstRegistrationNumber: "123456789RT0001",
      qstRegistrationNumber: "1234567890TQ0001",
      issuerAddress: { line1: "1 Rue Principale", city: "Montréal", country: "CA" }
    });
    expect(model.customer).toEqual({
      legalName: "Client Legal Co.",
      displayName: "Client Co.",
      billingAddress: { line1: "2 Avenue du Parc", city: "Québec", country: "CA" },
      email: "billing@client.example"
    });
    expect(model.meta.status).toBe("issued");
  });

  it("returns issuer/customer null for a draft with no snapshots, without crashing", () => {
    const invoice = baseInvoice();

    const model = buildInvoiceDocumentModel(invoice, []);

    expect(model.issuer).toBeNull();
    expect(model.customer).toBeNull();
    expect(model.meta.status).toBe("draft");
  });

  it("maps InvoiceLine[] to document lines with money passthrough", () => {
    const invoice = baseInvoice();
    const lines = [
      baseLine({ id: "il_1", description: "Consulting — May", quantity: 2, unitPrice: money(5000), amount: money(10000), sourceType: "manual" }),
      baseLine({ id: "il_2", description: null, quantity: 1, unitPrice: money(2500), amount: money(2500), sourceType: "time_entry" })
    ];

    const model = buildInvoiceDocumentModel(invoice, lines);

    expect(model.lines).toEqual([
      { description: "Consulting — May", quantity: 2, unitPrice: money(5000), amount: money(10000), sourceType: "manual" },
      { description: null, quantity: 1, unitPrice: money(2500), amount: money(2500), sourceType: "time_entry" }
    ]);
  });

  it("passes tax breakdown lines through unchanged, including a milli-percent 9.975% rate", () => {
    const taxBreakdown: TaxBreakdownLine[] = [
      { jurisdiction: "CA-QC-GST", label: "GST", rateBps: 5000, amount: money(500) },
      { jurisdiction: "CA-QC-QST", label: "QST", rateBps: 9975, amount: money(998) }
    ];
    const invoice = baseInvoice({
      taxCategoryId: "tc_1",
      taxBreakdown,
      taxTotal: money(1498),
      total: money(11498)
    });

    const model = buildInvoiceDocumentModel(invoice, []);

    expect(model.taxLines).toEqual([
      { jurisdiction: "CA-QC-GST", label: "GST", rateBps: 5000, amount: money(500) },
      { jurisdiction: "CA-QC-QST", label: "QST", rateBps: 9975, amount: money(998) }
    ]);
    // Lock the milli-percent contract at the boundary: 9975 means 9.975%, not 99.75%.
    expect(model.taxLines[1]?.rateBps).toBe(9975);
  });

  it("returns an empty taxLines array when taxBreakdown is null", () => {
    const model = buildInvoiceDocumentModel(baseInvoice({ taxBreakdown: null }), []);
    expect(model.taxLines).toEqual([]);
  });

  it("passes subtotal/taxTotal/total through as BillingMoney", () => {
    const invoice = baseInvoice({
      subtotal: money(10000),
      taxTotal: money(1498),
      total: money(11498)
    });

    const model = buildInvoiceDocumentModel(invoice, []);

    expect(model.totals).toEqual({
      subtotal: money(10000),
      taxTotal: money(1498),
      total: money(11498)
    });
  });

  it("carries notes, poNumber and paymentTermsDays through to meta/notes", () => {
    const invoice = baseInvoice({
      notes: "Thank you for your business.",
      poNumber: "PO-4471",
      paymentTermsDays: 30
    });

    const model = buildInvoiceDocumentModel(invoice, []);

    expect(model.notes).toBe("Thank you for your business.");
    expect(model.meta.poNumber).toBe("PO-4471");
    expect(model.meta.paymentTermsDays).toBe(30);
  });

  it("exposes a stable i18n label-key map, not translated strings", () => {
    const model = buildInvoiceDocumentModel(baseInvoice(), []);

    expect(model.labels.invoiceNumber).toBe("billing.invoices.field.invoiceNumber");
    expect(model.labels.total).toBe("billing.invoices.field.total");
    expect(model.labels.taxJurisdiction).toBe("billing.invoices.taxes.jurisdiction");
    // Every label value must be a dotted key, never a human-readable label.
    for (const value of Object.values(model.labels)) {
      expect(value).toMatch(/^billing\.invoices\./);
    }
  });
});
