import type { CreatePaymentInput, Payment } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitBillingTimelineEntry } from "./billing-timeline";
import {
  insertPayment,
  findPaymentById,
  listPayments as listPaymentsRepo,
  softDeletePayment,
  sumPaymentsForInvoice
} from "./payments";
import { findInvoiceById, updateInvoiceStatus } from "./invoices";
import { InvoiceNotFoundError } from "./invoice-service";

// Service for Payment lifecycle.
// recordPayment: insert a payment and reconcile invoice status.
// deletePayment: soft-delete a payment and recompute invoice status.
// Illegal states return typed errors (409).

export class PaymentNotFoundError extends Error {
  readonly code = "PAYMENT_NOT_FOUND";
  constructor(id: string) {
    super(`Payment ${id} not found`);
  }
}

export class InvoiceNotPayableError extends Error {
  readonly code = "INVOICE_NOT_PAYABLE";
  constructor(id: string, status: string) {
    super(`Invoice ${id} is not in a payable state (current: '${status}')`);
  }
}

// ---------------------------------------------------------------------------
// Reconcile: recompute invoice status from sum of non-deleted payments.
// Emits invoice transition audit + timeline when status changes.
// ---------------------------------------------------------------------------

async function reconcileInvoiceStatus(
  db: Queryable,
  context: TenantContext,
  invoiceId: string
): Promise<void> {
  const invoice = await findInvoiceById(db, context, invoiceId);
  if (!invoice) return;

  // Only reconcile if invoice is in a reconcilable state
  const reconcilableStatuses = ["issued", "partially_paid", "paid"];
  if (!reconcilableStatuses.includes(invoice.status)) return;

  const totalPaid = await sumPaymentsForInvoice(db, context, invoiceId);
  const invoiceTotal = invoice.total.amountMinor;

  let newStatus: "issued" | "partially_paid" | "paid";
  if (totalPaid >= invoiceTotal) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partially_paid";
  } else {
    newStatus = "issued";
  }

  if (newStatus === invoice.status) return;

  await updateInvoiceStatus(db, context, invoiceId, newStatus);

  const eventVerb = newStatus === "paid" ? "paid" : newStatus === "partially_paid" ? "partially_paid" : "issued";
  const entryType = `billing.invoice.${eventVerb}`;

  await recordAuditEvent(db, context, {
    action: entryType,
    resourceType: "invoice",
    resourceId: invoiceId,
    beforeSummary: { status: invoice.status },
    afterSummary: { status: newStatus, reconciledAmountMinor: totalPaid }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: invoiceId,
    entryType,
    payloadSummary: {
      invoiceNumber: invoice.invoiceNumber,
      totalPaidMinor: totalPaid,
      invoiceTotalMinor: invoiceTotal
    }
  });
}

// ---------------------------------------------------------------------------
// recordPayment
// ---------------------------------------------------------------------------

export async function recordPayment(
  db: Queryable,
  context: TenantContext,
  input: CreatePaymentInput
): Promise<Payment> {
  assertTenantContext(context);

  const invoice = await findInvoiceById(db, context, input.invoiceId);
  if (!invoice) throw new InvoiceNotFoundError(input.invoiceId);

  const payableStatuses = ["issued", "partially_paid"];
  if (!payableStatuses.includes(invoice.status)) {
    throw new InvoiceNotPayableError(input.invoiceId, invoice.status);
  }

  const payment = await insertPayment(db, context, {
    invoiceId: input.invoiceId,
    companyId: invoice.companyId ?? null,
    amount: input.amount,
    paymentDate: input.paymentDate,
    method: input.method,
    reference: input.reference ?? null
  });

  await recordAuditEvent(db, context, {
    action: "billing.payment.created",
    resourceType: "payment",
    resourceId: payment.id,
    beforeSummary: null,
    afterSummary: {
      invoiceId: input.invoiceId,
      amountMinor: input.amount.amountMinor,
      currency: input.amount.currency,
      paymentDate: input.paymentDate,
      method: input.method
    }
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: input.invoiceId,
    entryType: "billing.payment.created",
    payloadSummary: {
      paymentId: payment.id,
      amountMinor: input.amount.amountMinor,
      currency: input.amount.currency,
      paymentDate: input.paymentDate,
      method: input.method
    }
  });

  await reconcileInvoiceStatus(db, context, input.invoiceId);

  return payment;
}

// ---------------------------------------------------------------------------
// deletePayment (soft-delete)
// ---------------------------------------------------------------------------

export async function deletePayment(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);

  const payment = await findPaymentById(db, context, id);
  if (!payment) throw new PaymentNotFoundError(id);

  const deleted = await softDeletePayment(db, context, id);
  if (!deleted) throw new PaymentNotFoundError(id);

  await recordAuditEvent(db, context, {
    action: "billing.payment.deleted",
    resourceType: "payment",
    resourceId: id,
    beforeSummary: {
      invoiceId: payment.invoiceId,
      amountMinor: payment.amount.amountMinor,
      currency: payment.amount.currency,
      paymentDate: payment.paymentDate
    },
    afterSummary: null
  });
  await emitBillingTimelineEntry(db, context, {
    resourceType: "invoice",
    resourceId: payment.invoiceId,
    entryType: "billing.payment.deleted",
    payloadSummary: {
      paymentId: id,
      amountMinor: payment.amount.amountMinor,
      currency: payment.amount.currency,
      paymentDate: payment.paymentDate
    }
  });

  await reconcileInvoiceStatus(db, context, payment.invoiceId);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getPaymentById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Payment | null> {
  return findPaymentById(db, context, id);
}

export async function listPayments(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    invoiceId?: string;
    companyId?: string;
  } = {}
): Promise<Payment[]> {
  return listPaymentsRepo(db, context, options);
}
