import { describe, expect, it } from "vitest";
import { buildBillingRoutes } from "../../src/http/routes/billing";

describe("billing route registry (DS 4.0 + DS 4.1 + DS 4.2)", () => {
  it("registers invoice CRUD + lifecycle + from-proposal + payment + tax endpoints", () => {
    expect(buildBillingRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /billing/invoices",
      "POST /billing/invoices",
      "POST /billing/invoices/from-proposal",
      "GET /billing/invoices/:id",
      "POST /billing/invoices/:id/issue",
      "POST /billing/invoices/:id/pay",
      "POST /billing/invoices/:id/void",
      "POST /billing/invoices/:id/compute-taxes",
      "DELETE /billing/invoices/:id",
      "GET /billing/payments",
      "POST /billing/payments",
      "GET /billing/payments/:id",
      "DELETE /billing/payments/:id",
      "GET /billing/tax-categories",
      "POST /billing/tax-categories",
      "GET /billing/tax-categories/:id",
      "PATCH /billing/tax-categories/:id",
      "DELETE /billing/tax-categories/:id",
      "GET /billing/tax-rate-versions",
      "POST /billing/tax-rate-versions",
      "GET /billing/tax-rate-versions/:id",
      "PATCH /billing/tax-rate-versions/:id",
      "DELETE /billing/tax-rate-versions/:id"
    ]);
  });

  it("flags invoice mutating endpoints as audited", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/invoices" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/from-proposal" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/issue" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/pay" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/void" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/compute-taxes" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id" && r.method === "DELETE")?.audited).toBe(true);
  });

  it("flags tax category + rate version mutating endpoints as audited (DS 4.2)", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/tax-categories" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/tax-categories/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/tax-categories/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/tax-rate-versions" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/tax-rate-versions/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/tax-rate-versions/:id" && r.method === "DELETE")?.audited).toBe(true);
  });

  it("flags tax read endpoints as not audited", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/tax-categories" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/tax-categories/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/tax-rate-versions" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/tax-rate-versions/:id" && r.method === "GET")?.audited).toBe(false);
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
