import { describe, expect, it } from "vitest";
import { buildBillingRoutes } from "../../src/http/routes/billing";

describe("billing route registry (DS 4.0 + DS 4.1)", () => {
  it("registers invoice CRUD + lifecycle + from-proposal + payment endpoints", () => {
    expect(buildBillingRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /billing/invoices",
      "POST /billing/invoices",
      "POST /billing/invoices/from-proposal",
      "GET /billing/invoices/:id",
      "POST /billing/invoices/:id/issue",
      "POST /billing/invoices/:id/pay",
      "POST /billing/invoices/:id/void",
      "DELETE /billing/invoices/:id",
      "GET /billing/payments",
      "POST /billing/payments",
      "GET /billing/payments/:id",
      "DELETE /billing/payments/:id"
    ]);
  });

  it("flags invoice mutating endpoints as audited", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/invoices" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/from-proposal" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/issue" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/pay" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/void" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id" && r.method === "DELETE")?.audited).toBe(true);
  });

  it("flags payment mutating endpoints as audited (DS 4.1)", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/payments" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/payments/:id" && r.method === "DELETE")?.audited).toBe(true);
  });

  it("flags read endpoints as not audited", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/invoices" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/invoices/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/payments" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/payments/:id" && r.method === "GET")?.audited).toBe(false);
  });
});
