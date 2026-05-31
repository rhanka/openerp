import { describe, expect, it } from "vitest";
import { buildWebhookRoutes } from "../../src/http/routes/webhook";

describe("webhook route registry (DS 5.5)", () => {
  it("registers all webhook endpoint routes", () => {
    const paths = buildWebhookRoutes().map((r) => `${r.method} ${r.path}`);
    // Event types catalog
    expect(paths).toContain("GET /webhook/event-types");
    // Endpoint CRUD
    expect(paths).toContain("GET /webhook/endpoints");
    expect(paths).toContain("POST /webhook/endpoints");
    expect(paths).toContain("GET /webhook/endpoints/:id");
    expect(paths).toContain("PATCH /webhook/endpoints/:id");
    expect(paths).toContain("DELETE /webhook/endpoints/:id");
    // Secret rotation + test
    expect(paths).toContain("POST /webhook/endpoints/:id/rotate-secret");
    expect(paths).toContain("POST /webhook/endpoints/:id/test");
    // Delivery history
    expect(paths).toContain("GET /webhook/endpoints/:id/deliveries");
    expect(paths).toContain("GET /webhook/deliveries/:id");
  });

  it("flags mutating endpoint routes as audited", () => {
    const routes = buildWebhookRoutes();
    expect(routes.find((r) => r.path === "/webhook/endpoints" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/webhook/endpoints/:id" && r.method === "PATCH")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/webhook/endpoints/:id" && r.method === "DELETE")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/webhook/endpoints/:id/rotate-secret" && r.method === "POST")?.audited).toBe(true);
    expect(routes.find((r) => r.path === "/webhook/endpoints/:id/test" && r.method === "POST")?.audited).toBe(true);
  });

  it("flags read-only routes as not audited", () => {
    const routes = buildWebhookRoutes();
    expect(routes.find((r) => r.path === "/webhook/endpoints" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/webhook/endpoints/:id" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/webhook/event-types" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/webhook/endpoints/:id/deliveries" && r.method === "GET")?.audited).toBe(false);
    expect(routes.find((r) => r.path === "/webhook/deliveries/:id" && r.method === "GET")?.audited).toBe(false);
  });
});
