import { describe, expect, it } from "vitest";
import { buildCrmRoutes } from "../../src/http/routes/crm";

describe("crm route registry", () => {
  it("registers company + contact + pipeline + opportunity MVP endpoints", () => {
    expect(buildCrmRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /crm/companies",
      "POST /crm/companies",
      "GET /crm/companies/:id",
      "PATCH /crm/companies/:id",
      "GET /crm/contacts",
      "POST /crm/contacts",
      "GET /crm/contacts/:id",
      "PATCH /crm/contacts/:id",
      "GET /crm/pipeline-stages",
      "POST /crm/pipeline-stages",
      "GET /crm/pipeline-stages/:id",
      "PATCH /crm/pipeline-stages/:id",
      "GET /crm/opportunities",
      "POST /crm/opportunities",
      "GET /crm/opportunities/:id",
      "PATCH /crm/opportunities/:id",
      "GET /crm/timeline"
    ]);
  });

  it("flags mutating endpoints as audited (companies + contacts + pipeline + opportunities)", () => {
    const routes = buildCrmRoutes();
    for (const path of [
      "/crm/companies",
      "/crm/contacts",
      "/crm/pipeline-stages",
      "/crm/opportunities"
    ]) {
      expect(routes.find((r) => r.path === path && r.method === "POST")?.audited).toBe(true);
      expect(routes.find((r) => r.path === `${path}/:id` && r.method === "PATCH")?.audited).toBe(true);
      expect(routes.find((r) => r.path === path && r.method === "GET")?.audited).toBe(false);
    }
  });
});
