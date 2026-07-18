import type {
  BillingMoney,
  Invoice,
  InvoiceCustomerSnapshot,
  InvoiceIssuerSnapshot,
  InvoiceLine,
  InvoiceStatus
} from "@sentropic/openerp-domain/billing";

// Pure invoice document view-model assembly (D5).
// Assembles a render-ready but LOCALE-AGNOSTIC structured object from an
// already-loaded Invoice + InvoiceLine[]: no DB, no I/O, no Date.now(), no
// translated strings, no locale-formatted money/dates. Money stays as
// BillingMoney {amountMinor, currency, scale}; label text is a stable i18n
// key resolved by the UI at render time (UX-gated, out of scope here).

/** Frozen issuer identity (D8) — null until the invoice is issued. */
export type InvoiceDocumentIssuer = InvoiceIssuerSnapshot;

/** Frozen customer identity (D8) — null until the invoice is issued. */
export type InvoiceDocumentCustomer = InvoiceCustomerSnapshot;

export interface InvoiceDocumentMeta {
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string | null;
  dueDate: string | null;
  paymentTermsDays: number | null;
  poNumber: string | null;
  currency: string;
}

export interface InvoiceDocumentLine {
  description: string | null;
  quantity: number;
  unitPrice: BillingMoney;
  amount: BillingMoney;
  sourceType: string;
}

/** One tax line, passed through from the stored taxBreakdown — not recomputed. */
export interface InvoiceDocumentTaxLine {
  jurisdiction: string;
  label: string;
  /** Milli-percent: 9975 = 9.975 %. See tax-service.ts computeInvoiceTaxes. */
  rateBps: number;
  amount: BillingMoney;
}

export interface InvoiceDocumentTotals {
  subtotal: BillingMoney;
  taxTotal: BillingMoney;
  total: BillingMoney;
}

/** i18n label KEYS for document headings/columns — the UI resolves these per locale. */
export interface InvoiceDocumentLabels {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paymentTermsDays: string;
  poNumber: string;
  currency: string;
  issuerLegalName: string;
  issuerGstRegistrationNumber: string;
  issuerQstRegistrationNumber: string;
  customerLegalName: string;
  customerDisplayName: string;
  customerEmail: string;
  lineDescription: string;
  lineQuantity: string;
  lineUnitPrice: string;
  lineAmount: string;
  taxJurisdiction: string;
  taxLabel: string;
  taxAmount: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  notes: string;
}

export interface InvoiceDocumentModel {
  issuer: InvoiceDocumentIssuer | null;
  customer: InvoiceDocumentCustomer | null;
  meta: InvoiceDocumentMeta;
  lines: InvoiceDocumentLine[];
  taxLines: InvoiceDocumentTaxLine[];
  totals: InvoiceDocumentTotals;
  notes: string | null;
  labels: InvoiceDocumentLabels;
}

// Reuses existing billing.invoices.* keys where the field already has one
// (field.*, lines.field.*, taxes.*); adds document.* keys for the frozen
// issuer/customer identity block and the P1 document fields that have no
// prior UI surface (poNumber, paymentTermsDays, subtotal, notes).
const DOCUMENT_LABELS: InvoiceDocumentLabels = {
  invoiceNumber: "billing.invoices.field.invoiceNumber",
  status: "billing.invoices.field.status",
  issueDate: "billing.invoices.field.issueDate",
  dueDate: "billing.invoices.field.dueDate",
  paymentTermsDays: "billing.invoices.field.paymentTermsDays",
  poNumber: "billing.invoices.field.poNumber",
  currency: "billing.invoices.field.currency",
  issuerLegalName: "billing.invoices.document.issuer.legalName",
  issuerGstRegistrationNumber: "billing.invoices.document.issuer.gstRegistrationNumber",
  issuerQstRegistrationNumber: "billing.invoices.document.issuer.qstRegistrationNumber",
  customerLegalName: "billing.invoices.document.customer.legalName",
  customerDisplayName: "billing.invoices.document.customer.displayName",
  customerEmail: "billing.invoices.document.customer.email",
  lineDescription: "billing.invoices.lines.field.description",
  lineQuantity: "billing.invoices.lines.field.quantity",
  lineUnitPrice: "billing.invoices.lines.field.unitPrice",
  lineAmount: "billing.invoices.lines.field.amount",
  taxJurisdiction: "billing.invoices.taxes.jurisdiction",
  taxLabel: "billing.invoices.taxes.label",
  taxAmount: "billing.invoices.taxes.amount",
  subtotal: "billing.invoices.field.subtotal",
  taxTotal: "billing.invoices.taxes.total",
  total: "billing.invoices.field.total",
  notes: "billing.invoices.field.notes"
};

/**
 * Assembles the invoice document view-model from an already-loaded Invoice and
 * its InvoiceLine[]. Pure — no DB, no I/O, no Date.now(); deterministic in its
 * arguments only.
 *
 * issuer/customer come strictly from the frozen snapshots taken at issue time
 * (issueInvoiceWithSnapshots, D8). A draft invoice has no snapshot yet, so both
 * blocks are null rather than derived — the UI reads null as "no frozen identity
 * to show" instead of quietly falling back to live, mutable tenant/company data.
 * taxLines pass the stored taxBreakdown through unchanged; this module does not
 * recompute tax (see tax-service.ts computeInvoiceTaxes for the milli-percent
 * rounding contract).
 */
export function buildInvoiceDocumentModel(
  invoice: Invoice,
  lines: InvoiceLine[]
): InvoiceDocumentModel {
  return {
    issuer: invoice.issuerSnapshot ?? null,
    customer: invoice.customerSnapshot ?? null,
    meta: {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentTermsDays: invoice.paymentTermsDays ?? null,
      poNumber: invoice.poNumber ?? null,
      currency: invoice.currency
    },
    lines: lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: line.amount,
      sourceType: line.sourceType
    })),
    taxLines: (invoice.taxBreakdown ?? []).map((tax) => ({
      jurisdiction: tax.jurisdiction,
      label: tax.label,
      rateBps: tax.rateBps,
      amount: tax.amount
    })),
    totals: {
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total
    },
    notes: invoice.notes ?? null,
    labels: DOCUMENT_LABELS
  };
}
