import type { RouteContract } from "./foundation";

// Billing route registry (DS 4.0 — Invoice + InvoiceLine; DS 4.1 — Payment; DS 4.2 — Tax engine;
// DS 4.3 — Account + JournalEntry double-entry; DS 2.7 — from-quote-handoff CRM→Billing;
// DS 4.4 — RecurringBillingSchedule).
export function buildBillingRoutes(): RouteContract[] {
  return [
    // ── Invoices ─────────────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/billing/invoices",
      audited: false,
      responseSchema: "Invoice"
    },
    {
      method: "POST",
      path: "/billing/invoices",
      audited: true,
      requestSchema: "CreateInvoiceInput",
      responseSchema: "InvoiceWithLines"
    },
    {
      method: "POST",
      path: "/billing/invoices/from-proposal",
      audited: true,
      requestSchema: "ConvertProposalInput",
      responseSchema: "InvoiceWithLines"
    },
    {
      method: "POST",
      path: "/billing/invoices/from-quote-handoff",
      audited: true,
      responseSchema: "InvoiceWithLines"
    },
    {
      method: "GET",
      path: "/billing/invoices/:id",
      audited: false,
      responseSchema: "InvoiceWithLines"
    },
    {
      method: "POST",
      path: "/billing/invoices/:id/issue",
      audited: true,
      responseSchema: "Invoice"
    },
    {
      method: "POST",
      path: "/billing/invoices/:id/pay",
      audited: true,
      responseSchema: "Invoice"
    },
    {
      method: "POST",
      path: "/billing/invoices/:id/void",
      audited: true,
      responseSchema: "Invoice"
    },
    {
      method: "POST",
      path: "/billing/invoices/:id/compute-taxes",
      audited: true,
      responseSchema: "Invoice"
    },
    {
      method: "POST",
      path: "/billing/invoices/:id/post-to-journal",
      audited: true,
      responseSchema: "Invoice"
    },
    {
      method: "DELETE",
      path: "/billing/invoices/:id",
      audited: true,
      responseSchema: "Invoice"
    },
    // ── Payments ──────────────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/billing/payments",
      audited: false,
      responseSchema: "Payment"
    },
    {
      method: "POST",
      path: "/billing/payments",
      audited: true,
      requestSchema: "CreatePaymentInput",
      responseSchema: "Payment"
    },
    {
      method: "GET",
      path: "/billing/payments/:id",
      audited: false,
      responseSchema: "Payment"
    },
    {
      method: "POST",
      path: "/billing/payments/:id/post-to-journal",
      audited: true,
      responseSchema: "Payment"
    },
    {
      method: "DELETE",
      path: "/billing/payments/:id",
      audited: true,
      responseSchema: "Payment"
    },
    // ── Tax categories ────────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/billing/tax-categories",
      audited: false,
      responseSchema: "TaxCategory"
    },
    {
      method: "POST",
      path: "/billing/tax-categories",
      audited: true,
      requestSchema: "CreateTaxCategoryInput",
      responseSchema: "TaxCategory"
    },
    {
      method: "GET",
      path: "/billing/tax-categories/:id",
      audited: false,
      responseSchema: "TaxCategory"
    },
    {
      method: "PATCH",
      path: "/billing/tax-categories/:id",
      audited: true,
      requestSchema: "UpdateTaxCategoryInput",
      responseSchema: "TaxCategory"
    },
    {
      method: "DELETE",
      path: "/billing/tax-categories/:id",
      audited: true,
      responseSchema: "TaxCategory"
    },
    // ── Tax rate versions ─────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/billing/tax-rate-versions",
      audited: false,
      responseSchema: "TaxRateVersion"
    },
    {
      method: "POST",
      path: "/billing/tax-rate-versions",
      audited: true,
      requestSchema: "CreateTaxRateVersionInput",
      responseSchema: "TaxRateVersion"
    },
    {
      method: "GET",
      path: "/billing/tax-rate-versions/:id",
      audited: false,
      responseSchema: "TaxRateVersion"
    },
    {
      method: "PATCH",
      path: "/billing/tax-rate-versions/:id",
      audited: true,
      requestSchema: "UpdateTaxRateVersionInput",
      responseSchema: "TaxRateVersion"
    },
    {
      method: "DELETE",
      path: "/billing/tax-rate-versions/:id",
      audited: true,
      responseSchema: "TaxRateVersion"
    },
    // ── Accounts ──────────────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/billing/accounts",
      audited: false,
      responseSchema: "Account"
    },
    {
      method: "POST",
      path: "/billing/accounts",
      audited: true,
      requestSchema: "CreateAccountInput",
      responseSchema: "Account"
    },
    {
      method: "GET",
      path: "/billing/accounts/:id",
      audited: false,
      responseSchema: "Account"
    },
    {
      method: "PATCH",
      path: "/billing/accounts/:id",
      audited: true,
      requestSchema: "UpdateAccountInput",
      responseSchema: "Account"
    },
    {
      method: "DELETE",
      path: "/billing/accounts/:id",
      audited: true,
      responseSchema: "Account"
    },
    // ── Journal entries ───────────────────────────────────────────────────────
    {
      method: "GET",
      path: "/billing/journal-entries",
      audited: false,
      responseSchema: "JournalEntry"
    },
    {
      method: "GET",
      path: "/billing/journal-entries/:id",
      audited: false,
      responseSchema: "JournalEntryWithLines"
    },
    {
      method: "POST",
      path: "/billing/journal-entries",
      audited: true,
      requestSchema: "CreateJournalEntryInput",
      responseSchema: "JournalEntryWithLines"
    },
    {
      method: "POST",
      path: "/billing/journal-entries/:id/post",
      audited: true,
      responseSchema: "JournalEntry"
    },
    {
      method: "POST",
      path: "/billing/journal-entries/:id/void",
      audited: true,
      responseSchema: "JournalEntry"
    },
    {
      method: "DELETE",
      path: "/billing/journal-entries/:id",
      audited: true,
      responseSchema: "JournalEntry"
    },
    // ── Recurring schedules ───────────────────────────────────────────────────
    {
      method: "GET",
      path: "/billing/recurring-schedules",
      audited: false,
      responseSchema: "RecurringBillingSchedule"
    },
    {
      method: "POST",
      path: "/billing/recurring-schedules",
      audited: true,
      requestSchema: "CreateRecurringBillingScheduleInput",
      responseSchema: "RecurringBillingSchedule"
    },
    {
      method: "GET",
      path: "/billing/recurring-schedules/:id",
      audited: false,
      responseSchema: "RecurringBillingSchedule"
    },
    {
      method: "PATCH",
      path: "/billing/recurring-schedules/:id",
      audited: true,
      requestSchema: "UpdateRecurringBillingScheduleInput",
      responseSchema: "RecurringBillingSchedule"
    },
    {
      method: "DELETE",
      path: "/billing/recurring-schedules/:id",
      audited: true,
      responseSchema: "RecurringBillingSchedule"
    },
    // run is a tick trigger — no request/response schema
    { method: "POST", path: "/billing/recurring-schedules/run", audited: true }
  ];
}
