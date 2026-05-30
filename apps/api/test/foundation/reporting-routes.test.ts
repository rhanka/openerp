import { describe, expect, it } from "vitest";
import { buildReportingRoutes } from "../../src/http/routes/reporting";

describe("reporting route registry (DS 5.0 + DS 5.1 + DS 5.2)", () => {
  it("registers saved-views CRUD + report-definitions + report-runs + dashboards endpoints", () => {
    const paths = buildReportingRoutes().map((r) => `${r.method} ${r.path}`);
    // DS 5.0 saved-views
    expect(paths).toContain("GET /reporting/saved-views");
    expect(paths).toContain("POST /reporting/saved-views");
    expect(paths).toContain("GET /reporting/saved-views/:id");
    expect(paths).toContain("PATCH /reporting/saved-views/:id");
    expect(paths).toContain("DELETE /reporting/saved-views/:id");
    // DS 5.1 report-types
    expect(paths).toContain("GET /reporting/report-types");
    // DS 5.1 report-definitions
    expect(paths).toContain("GET /reporting/report-definitions");
    expect(paths).toContain("POST /reporting/report-definitions");
    expect(paths).toContain("GET /reporting/report-definitions/:id");
    expect(paths).toContain("PATCH /reporting/report-definitions/:id");
    expect(paths).toContain("DELETE /reporting/report-definitions/:id");
    expect(paths).toContain("POST /reporting/report-definitions/:id/run");
    // DS 5.1 report-runs
    expect(paths).toContain("GET /reporting/report-runs");
    expect(paths).toContain("GET /reporting/report-runs/:id");
    // DS 5.2 dashboards
    expect(paths).toContain("GET /reporting/dashboards");
    expect(paths).toContain("POST /reporting/dashboards");
    expect(paths).toContain("GET /reporting/dashboards/:id");
    expect(paths).toContain("PATCH /reporting/dashboards/:id");
    expect(paths).toContain("DELETE /reporting/dashboards/:id");
    expect(paths).toContain("GET /reporting/dashboards/:id/render");
    expect(paths).toContain("GET /reporting/dashboards/:id/widgets");
    expect(paths).toContain("POST /reporting/dashboards/:id/widgets");
    expect(paths).toContain("PATCH /reporting/dashboards/:id/widgets/:widgetId");
    expect(paths).toContain("DELETE /reporting/dashboards/:id/widgets/:widgetId");
  });

  it("flags mutating endpoints as audited (saved-views)", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/saved-views" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/saved-views/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/saved-views/:id" && r.method === "DELETE")?.audited).toBe(true);
  });

  it("flags GET endpoints as not audited (saved-views)", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/saved-views" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/saved-views/:id" && r.method === "GET")?.audited).toBe(false);
  });

  it("flags report-definitions mutating endpoints as audited (DS 5.1)", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/report-definitions" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/report-definitions/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/report-definitions/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/report-definitions/:id/run" && r.method === "POST")?.audited).toBe(true);
  });

  it("flags report-definitions GET + report-runs + report-types as not audited (DS 5.1)", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/report-types" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/report-definitions" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/report-definitions/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/report-runs" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/report-runs/:id" && r.method === "GET")?.audited).toBe(false);
  });

  it("flags dashboard mutating endpoints as audited (DS 5.2)", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/dashboards" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id/widgets" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id/widgets/:widgetId" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id/widgets/:widgetId" && r.method === "DELETE")?.audited).toBe(true);
  });

  it("flags dashboard GET + render + widgets list as not audited (DS 5.2)", () => {
    const routes = buildReportingRoutes();
    expect(routes.find((r) => r.path === "/reporting/dashboards" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id/render" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/reporting/dashboards/:id/widgets" && r.method === "GET")?.audited).toBe(false);
  });
});
