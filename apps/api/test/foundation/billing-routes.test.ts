import { describe, expect, it } from "vitest";
import { buildBillingRoutes } from "../../src/http/routes/billing";

describe("billing route registry (DS 4.0 + DS 4.1 + DS 4.2 + DS 4.3 + DS 2.7 + DS 4.4)", () => {
  it("registers invoice CRUD + lifecycle + from-proposal + from-quote-handoff + payment + tax + accounting + recurring-schedules endpoints", () => {
    expect(buildBillingRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /billing/invoices",
      "POST /billing/invoices",
      "POST /billing/invoices/from-proposal",
      "POST /billing/invoices/from-quote-handoff",
      "GET /billing/invoices/:id",
      "POST /billing/invoices/:id/issue",
      "POST /billing/invoices/:id/pay",
      "POST /billing/invoices/:id/void",
      "POST /billing/invoices/:id/compute-taxes",
      "POST /billing/invoices/:id/post-to-journal",
      "DELETE /billing/invoices/:id",
      "GET /billing/payments",
      "POST /billing/payments",
      "GET /billing/payments/:id",
      "POST /billing/payments/:id/post-to-journal",
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
      "DELETE /billing/tax-rate-versions/:id",
      "GET /billing/accounts",
      "POST /billing/accounts",
      "GET /billing/accounts/:id",
      "PATCH /billing/accounts/:id",
      "DELETE /billing/accounts/:id",
      "GET /billing/journal-entries",
      "GET /billing/journal-entries/:id",
      "POST /billing/journal-entries",
      "POST /billing/journal-entries/:id/post",
      "POST /billing/journal-entries/:id/void",
      "DELETE /billing/journal-entries/:id",
      "GET /billing/recurring-schedules",
      "POST /billing/recurring-schedules",
      "GET /billing/recurring-schedules/:id",
      "PATCH /billing/recurring-schedules/:id",
      "DELETE /billing/recurring-schedules/:id",
      "POST /billing/recurring-schedules/run"
    ]);
  });

  it("flags invoice mutating endpoints as audited", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/invoices" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/from-proposal" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/from-quote-handoff" && r.method === "POST")?.audited).toBe(true);
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

  it("flags accounting CRUD mutating endpoints as audited (DS 4.3)", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/accounts" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/accounts/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/accounts/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/journal-entries" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/journal-entries/:id/post" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/journal-entries/:id/void" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/journal-entries/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/invoices/:id/post-to-journal" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/billing/payments/:id/post-to-journal" && r.method === "POST")?.audited).toBe(true);
  });

  it("flags accounting read endpoints as not audited (DS 4.3)", () => {
    const routes = buildBillingRoutes();
    expect(routes.find((r) => r.path === "/billing/accounts" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/accounts/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/journal-entries" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/billing/journal-entries/:id" && r.method === "GET")?.audited).toBe(false);
  });
});
