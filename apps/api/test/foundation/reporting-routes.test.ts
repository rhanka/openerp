import { describe, expect, it } from "vitest";
import { buildReportingRoutes } from "../../src/http/routes/reporting";

describe("reporting route registry (DS 5.0)", () => {
  it("registers saved-views CRUD endpoints", () => {
    expect(buildReportingRoutes().map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /reporting/saved-views",
      "POST /reporting/saved-views",
      "GET /reporting/saved-views/:id",
      "PATCH /reporting/saved-views/:id",
      "DELETE /reporting/saved-views/:id"
    ]);
  });

  it("flags mutating endpoints as audited", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/saved-views" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/saved-views/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/saved-views/:id" && r.method === "DELETE")?.audited).toBe(true);
  });

  it("flags GET endpoints as not audited", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/saved-views" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/saved-views/:id" && r.method === "GET")?.audited).toBe(false);
  });
});
