import { describe, expect, it } from "vitest";
import { buildCrmRoutes } from "../../src/http/routes/crm";

describe("crm route registry", () => {
  it("registers the company + contact MVP endpoints", () => {
    expect(buildCrmRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /crm/companies",
      "POST /crm/companies",
      "GET /crm/companies/:id",
      "PATCH /crm/companies/:id",
      "GET /crm/contacts",
      "POST /crm/contacts",
      "GET /crm/contacts/:id",
      "PATCH /crm/contacts/:id"
    ]);
  });

  it("flags mutating endpoints as audited (companies + contacts)", () => {
    const routes = buildCrmRoutes();
    expect(routes.find((r) => r.path === "/crm/companies" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/crm/companies/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/crm/companies" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/crm/contacts" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/crm/contacts/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/crm/contacts" && r.method === "GET")?.audited).toBe(false);
  });
});
