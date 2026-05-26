import type { RouteContract } from "./foundation";

// Billing route registry (DS 4.0 — Invoice + InvoiceLine; DS 4.1 — Payment; DS 4.2 — Tax engine;
// DS 4.3 — Account + JournalEntry double-entry).
export function buildBillingRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/billing/invoices", audited: false },
    { method: "POST", path: "/billing/invoices", audited: true },
    { method: "POST", path: "/billing/invoices/from-proposal", audited: true },
    { method: "GET", path: "/billing/invoices/:id", audited: false },
    { method: "POST", path: "/billing/invoices/:id/issue", audited: true },
    { method: "POST", path: "/billing/invoices/:id/pay", audited: true },
    { method: "POST", path: "/billing/invoices/:id/void", audited: true },
    { method: "POST", path: "/billing/invoices/:id/compute-taxes", audited: true },
    { method: "POST", path: "/billing/invoices/:id/post-to-journal", audited: true },
    { method: "DELETE", path: "/billing/invoices/:id", audited: true },
    { method: "GET", path: "/billing/payments", audited: false },
    { method: "POST", path: "/billing/payments", audited: true },
    { method: "GET", path: "/billing/payments/:id", audited: false },
    { method: "POST", path: "/billing/payments/:id/post-to-journal", audited: true },
    { method: "DELETE", path: "/billing/payments/:id", audited: true },
    { method: "GET", path: "/billing/tax-categories", audited: false },
    { method: "POST", path: "/billing/tax-categories", audited: true },
    { method: "GET", path: "/billing/tax-categories/:id", audited: false },
    { method: "PATCH", path: "/billing/tax-categories/:id", audited: true },
    { method: "DELETE", path: "/billing/tax-categories/:id", audited: true },
    { method: "GET", path: "/billing/tax-rate-versions", audited: false },
    { method: "POST", path: "/billing/tax-rate-versions", audited: true },
    { method: "GET", path: "/billing/tax-rate-versions/:id", audited: false },
    { method: "PATCH", path: "/billing/tax-rate-versions/:id", audited: true },
    { method: "DELETE", path: "/billing/tax-rate-versions/:id", audited: true },
    { method: "GET", path: "/billing/accounts", audited: false },
    { method: "POST", path: "/billing/accounts", audited: true },
    { method: "GET", path: "/billing/accounts/:id", audited: false },
    { method: "PATCH", path: "/billing/accounts/:id", audited: true },
    { method: "DELETE", path: "/billing/accounts/:id", audited: true },
    { method: "GET", path: "/billing/journal-entries", audited: false },
    { method: "GET", path: "/billing/journal-entries/:id", audited: false },
    { method: "POST", path: "/billing/journal-entries", audited: true },
    { method: "POST", path: "/billing/journal-entries/:id/post", audited: true },
    { method: "POST", path: "/billing/journal-entries/:id/void", audited: true },
    { method: "DELETE", path: "/billing/journal-entries/:id", audited: true }
  ];
}
