import type {
  BillingMoney,
  CreateInvoiceInput,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  InvoiceWithLines
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitBillingTimelineEntry } from "./billing-timeline";
import {
  countInvoicesForOrg,
  findInvoiceById,
  insertInvoice,
  insertInvoiceLine,
  issueInvoiceWithSnapshots,
  listInvoices as listInvoicesRepo,
  listLinesForInvoice,
  softDeleteInvoice,
  updateInvoiceStatus
} from "./invoices";
import { findInvoiceProposalById, listLinesForProposal } from "../project/invoice-proposals";
import { findQuoteHandoffById, updateQuoteHandoffStatus } from "../crm/quote-handoffs";
import { findOpportunityById } from "../crm/opportunities";
import { emitCrmTimelineEntry } from "../crm/crm-timeline";

// Service for Invoice lifecycle. Handles:
//   - createInvoice: manual creation with line computation
//   - createInvoiceFromProposal: convert an approved InvoiceProposal
//   - issue: draft → issued
//   - markPaid: issued|partially_paid → paid
//   - voidInvoice: draft|issued → void
//   - deleteInvoice: soft-delete draft only
// Illegal transitions return InvoiceTransitionError (maps to 409).

export class InvoiceNotFoundError extends Error {
  readonly code = "INVOICE_NOT_FOUND";
  constructor(id: string) {
    super(`Invoice ${id} not found`);
  }
}

export class InvoiceTransitionError extends Error {
  readonly code = "INVOICE_ILLEGAL_TRANSITION";
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition Invoice from '${currentStatus}' to '${targetStatus}'`);
  }
}

export class InvoiceProposalNotApprovedError extends Error {
  readonly code = "INVOICE_PROPOSAL_NOT_APPROVED";
  constructor(proposalId: string, status: string) {
    super(`InvoiceProposal ${proposalId} must be 'approved' to convert (current: '${status}')`);
  }
}

export class QuoteHandoffNotFoundError extends Error {
  readonly code = "QUOTE_HANDOFF_NOT_FOUND";
  constructor(id: string) {
    super(`QuoteHandoff ${id} not found`);
  }
}

export class QuoteHandoffInvalidStatusError extends Error {
  readonly code = "QUOTE_HANDOFF_INVALID_STATUS";
  constructor(id: string, status: string) {
    super(`QuoteHandoff ${id} has status '${status}'; must be 'pending' or 'accepted' to generate invoice`);
  }
}

// ---------------------------------------------------------------------------
// Internal: generate a tenant-unique invoice number
// Format: INV-000001 (padded to 6 digits, org-scoped)
// ---------------------------------------------------------------------------

async function generateInvoiceNumber(db: Queryable, context: TenantContext): Promise<string> {
  // Count ALL invoices for this org including deleted (for uniqueness).
  const count = await countInvoicesForOrg(db, context);
  const seq = count + 1;
  return `INV-${String(seq).padStart(6, "0")}`;
}

/**
 * Derives the invoice due date from net payment terms: due_date = issue_date + termsDays.
 * Returns null when no terms are set (due date stays unset). Pure — UTC date arithmetic only.
 */
export function deriveDueDate(issueDate: string, paymentTermsDays: number | null): string | null {
  if (paymentTermsDays === null || paymentTermsDays === undefined) return null;
  const base = new Date(`${issueDate.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + paymentTermsDays);
  return base.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Manual create
// ---------------------------------------------------------------------------

export async function createInvoice(
  db: Queryable,
  context: TenantContext,
  input: CreateInvoiceInput
): Promise<InvoiceWithLines> {
  assertTenantContext(context);

  const currency = input.currency ?? "CAD";
  const zero: BillingMoney = { amountMinor: 0, currency, scale: 2 };

  // Compute subtotal from lines
  let subtotalMinor = 0;
  const scale = input.lines[0]?.unitPrice.scale ?? 2;
  for (const l of input.lines) {
    subtotalMinor += l.amount.amountMinor;
  }

  const subtotal: BillingMoney = { amountMinor: subtotalMinor, currency, scale };
  const taxTotal: BillingMoney = zero; // taxes are a later slice
  const total: BillingMoney = { amountMinor: subtotalMinor, currency, scale };

  const invoiceNumber = await generateInvoiceNumber(db, context);

  const invoice = await insertInvoice(db, context, {
    companyId: input.companyId,
    projectId: input.projectId ?? null,
    invoiceProposalId: null,
    invoiceNumber,
    status: "draft",
    currency,
    subtotal,
    taxTotal,
    total,
    taxCategoryId: input.taxCategoryId ?? null,
    issueDate: null,
    dueDate: null,
    notes: input.notes ?? null,
    poNumber: input.poNumber ?? null,
    paymentTermsDays: input.paymentTermsDays ?? null
  });

  const persistedLines: InvoiceLine[] = [];
  for (const l of input.lines) {
    const line = await insertInvoiceLine(db, context, {
      invoiceId: invoice.id,
      sourceType: "manual",
      sourceId: null,
      description: l.description ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: l.amount
    });
    persistedLines.push(line);
  }

  await emitInvoiceAudit(db, context, {
    action: "billing.invoice.created",
    invoiceId: invoice.id,
    beforeSummary: null,
    afterSummary: {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      lineCount: persistedLines.length,
      totalMinor: total.amountMinor,
      currency
    }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: invoice.id,
    entryType: "billing.invoice.created",
    payloadSummary: {
      invoiceNumber: invoice.invoiceNumber,
      lineCount: persistedLines.length,
      totalMinor: total.amountMinor,
      currency
    }
  });

  return { ...invoice, lines: persistedLines };
}

// ---------------------------------------------------------------------------
// Convert from approved InvoiceProposal
// ---------------------------------------------------------------------------

export async function createInvoiceFromProposal(
  db: Queryable,
  context: TenantContext,
  invoiceProposalId: string
): Promise<InvoiceWithLines> {
  assertTenantContext(context);

  const proposal = await findInvoiceProposalById(db, context, invoiceProposalId);
  if (!proposal) {
    throw new InvoiceNotFoundError(invoiceProposalId);
  }
  if (proposal.status !== "approved") {
    throw new InvoiceProposalNotApprovedError(invoiceProposalId, proposal.status);
  }

  const proposalLines = await listLinesForProposal(db, context, invoiceProposalId);

  const currency = proposal.currency;
  const subtotal = proposal.total;
  const taxTotal: BillingMoney = { amountMinor: 0, currency, scale: proposal.total.scale };
  const total = proposal.total;

  const invoiceNumber = await generateInvoiceNumber(db, context);

  const invoice = await insertInvoice(db, context, {
    companyId: proposal.companyId ?? (() => { throw new Error("Proposal has no companyId"); })(),
    projectId: proposal.projectId,
    invoiceProposalId,
    invoiceNumber,
    status: "draft",
    currency,
    subtotal,
    taxTotal,
    total,
    issueDate: null,
    dueDate: null
  });

  const persistedLines: InvoiceLine[] = [];
  for (const pl of proposalLines) {
    const line = await insertInvoiceLine(db, context, {
      invoiceId: invoice.id,
      sourceType: "invoice_proposal_line",
      sourceId: pl.id,
      description: pl.description,
      quantity: pl.quantityMinutes,
      unitPrice: pl.unitRate,
      amount: pl.amount
    });
    persistedLines.push(line);
  }

  await emitInvoiceAudit(db, context, {
    action: "billing.invoice.created",
    invoiceId: invoice.id,
    beforeSummary: null,
    afterSummary: {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceProposalId,
      lineCount: persistedLines.length,
      totalMinor: total.amountMinor,
      currency
    }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: invoice.id,
    entryType: "billing.invoice.created",
    payloadSummary: {
      invoiceNumber: invoice.invoiceNumber,
      invoiceProposalId,
      lineCount: persistedLines.length,
      totalMinor: total.amountMinor,
      currency
    }
  });

  return { ...invoice, lines: persistedLines };
}

// ---------------------------------------------------------------------------
// Convert from accepted/pending QuoteHandoff (DS 2.7 CRM→Billing bridge)
// ---------------------------------------------------------------------------

export async function createInvoiceFromQuoteHandoff(
  db: Queryable,
  context: TenantContext,
  quoteHandoffId: string
): Promise<InvoiceWithLines> {
  assertTenantContext(context);

  const handoff = await findQuoteHandoffById(db, context, quoteHandoffId);
  if (!handoff) throw new QuoteHandoffNotFoundError(quoteHandoffId);
  if (handoff.status !== "pending" && handoff.status !== "accepted") {
    throw new QuoteHandoffInvalidStatusError(quoteHandoffId, handoff.status);
  }

  const opportunity = await findOpportunityById(db, context, handoff.opportunityId);
  if (!opportunity) {
    throw new QuoteHandoffNotFoundError(`opportunity ${handoff.opportunityId}`);
  }

  const currency = opportunity.expectedValue?.currency ?? opportunity.currency ?? "CAD";
  const scale = opportunity.expectedValue?.scale ?? 2;
  const amountMinor = opportunity.expectedValue?.amountMinor ?? 0;

  const money: BillingMoney = { amountMinor, currency, scale };
  const zero: BillingMoney = { amountMinor: 0, currency, scale };

  const invoiceNumber = await generateInvoiceNumber(db, context);

  const invoice = await insertInvoice(db, context, {
    companyId: opportunity.companyId,
    projectId: null,
    invoiceProposalId: null,
    invoiceNumber,
    status: "draft",
    currency,
    subtotal: money,
    taxTotal: zero,
    total: money,
    taxCategoryId: null,
    issueDate: null,
    dueDate: null
  });

  const line = await insertInvoiceLine(db, context, {
    invoiceId: invoice.id,
    sourceType: "quote_handoff",
    sourceId: quoteHandoffId,
    description: opportunity.name,
    quantity: 1,
    unitPrice: money,
    amount: money
  });

  // Mark the QuoteHandoff accepted (idempotent if already accepted).
  if (handoff.status === "pending") {
    const acceptedAt = new Date().toISOString();
    await updateQuoteHandoffStatus(db, context, quoteHandoffId, "accepted", { acceptedAt });
    // Emit CRM-side audit + timeline for the acceptance triggered from billing.
    await recordAuditEvent(db, context, {
      action: "crm.quote_handoff.accepted",
      resourceType: "quote_handoff",
      resourceId: quoteHandoffId,
      beforeSummary: { status: "pending" },
      afterSummary: { status: "accepted", acceptedAt, triggeredBy: "billing_invoice_creation" }
    });
    await emitCrmTimelineEntry(db, context, {
      resourceType: "opportunity",
      resourceId: handoff.opportunityId,
      entryType: "crm.quote_handoff.accepted",
      payloadSummary: { quoteHandoffId, acceptedAt, triggeredBy: "billing_invoice_creation" }
    });
  }

  await emitInvoiceAudit(db, context, {
    action: "billing.invoice.created",
    invoiceId: invoice.id,
    beforeSummary: null,
    afterSummary: {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      quoteHandoffId,
      opportunityId: opportunity.id,
      lineCount: 1,
      totalMinor: money.amountMinor,
      currency
    }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: invoice.id,
    entryType: "billing.invoice.created",
    payloadSummary: {
      invoiceNumber: invoice.invoiceNumber,
      quoteHandoffId,
      lineCount: 1,
      totalMinor: money.amountMinor,
      currency
    }
  });

  return { ...invoice, lines: [line] };
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export async function issueInvoice(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Invoice> {
  assertTenantContext(context);
  const before = await findInvoiceById(db, context, id);
  if (!before) throw new InvoiceNotFoundError(id);
  if (before.status !== "draft") {
    throw new InvoiceTransitionError(before.status, "issued");
  }
  const updated = await issueInvoiceWithSnapshots(db, context, id);
  if (!updated) {
    const current = await findInvoiceById(db, context, id);
    if (!current) throw new InvoiceNotFoundError(id);
    throw new InvoiceTransitionError(current.status, "issued");
  }
  const issuedAt = updated.issuedAt;
  await emitInvoiceAudit(db, context, {
    action: "billing.invoice.issued",
    invoiceId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "issued", issuedAt }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: id,
    entryType: "billing.invoice.issued",
    payloadSummary: { invoiceNumber: before.invoiceNumber }
  });
  return updated;
}

export async function markPaid(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Invoice> {
  assertTenantContext(context);
  const before = await findInvoiceById(db, context, id);
  if (!before) throw new InvoiceNotFoundError(id);
  const allowedFrom: InvoiceStatus[] = ["issued", "partially_paid"];
  if (!allowedFrom.includes(before.status)) {
    throw new InvoiceTransitionError(before.status, "paid");
  }
  const updated = await updateInvoiceStatus(db, context, id, "paid");
  if (!updated) throw new InvoiceNotFoundError(id);
  await emitInvoiceAudit(db, context, {
    action: "billing.invoice.paid",
    invoiceId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "paid" }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: id,
    entryType: "billing.invoice.paid",
    payloadSummary: { invoiceNumber: before.invoiceNumber }
  });
  return updated;
}

export async function voidInvoice(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Invoice> {
  assertTenantContext(context);
  const before = await findInvoiceById(db, context, id);
  if (!before) throw new InvoiceNotFoundError(id);
  const allowedFrom: InvoiceStatus[] = ["draft", "issued"];
  if (!allowedFrom.includes(before.status)) {
    throw new InvoiceTransitionError(before.status, "void");
  }
  const updated = await updateInvoiceStatus(db, context, id, "void");
  if (!updated) throw new InvoiceNotFoundError(id);
  await emitInvoiceAudit(db, context, {
    action: "billing.invoice.void",
    invoiceId: id,
    beforeSummary: { status: before.status },
    afterSummary: { status: "void" }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: id,
    entryType: "billing.invoice.void",
    payloadSummary: { invoiceNumber: before.invoiceNumber }
  });
  return updated;
}

export async function deleteInvoice(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findInvoiceById(db, context, id);
  if (!before) throw new InvoiceNotFoundError(id);
  if (before.status !== "draft") {
    throw new InvoiceTransitionError(before.status, "deleted");
  }
  const deleted = await softDeleteInvoice(db, context, id);
  if (!deleted) throw new InvoiceNotFoundError(id);
  await emitInvoiceAudit(db, context, {
    action: "billing.invoice.deleted",
    invoiceId: id,
    beforeSummary: { status: before.status, invoiceNumber: before.invoiceNumber },
    afterSummary: null
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: id,
    entryType: "billing.invoice.deleted",
    payloadSummary: { invoiceNumber: before.invoiceNumber }
  });
}

export async function getInvoiceById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<InvoiceWithLines | null> {
  const invoice = await findInvoiceById(db, context, id);
  if (!invoice) return null;
  const lines = await listLinesForInvoice(db, context, id);
  return { ...invoice, lines };
}

export async function listInvoices(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    companyId?: string;
    projectId?: string;
    status?: InvoiceStatus;
  } = {}
): Promise<Invoice[]> {
  return listInvoicesRepo(db, context, options);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface EmitInvoiceAuditInput {
  action: string;
  invoiceId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitInvoiceAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitInvoiceAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "invoice",
    resourceId: input.invoiceId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
