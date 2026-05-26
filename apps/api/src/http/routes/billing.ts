import type { RouteContract } from "./foundation";

// Billing route registry (Demo Slice 4.0 — Invoice + InvoiceLine).
export function buildBillingRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/billing/invoices", audited: false },
    { method: "POST", path: "/billing/invoices", audited: true },
    { method: "POST", path: "/billing/invoices/from-proposal", audited: true },
    { method: "GET", path: "/billing/invoices/:id", audited: false },
    { method: "POST", path: "/billing/invoices/:id/issue", audited: true },
    { method: "POST", path: "/billing/invoices/:id/pay", audited: true },
    { method: "POST", path: "/billing/invoices/:id/void", audited: true },
    { method: "DELETE", path: "/billing/invoices/:id", audited: true }
  ];
}
