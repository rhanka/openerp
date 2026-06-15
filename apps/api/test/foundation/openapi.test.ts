import { describe, expect, it } from "vitest";

import { buildApprovalRequestRoutes } from "../../src/http/routes/approval-requests";
import { buildBillingRoutes } from "../../src/http/routes/billing";
import { buildCrmRoutes } from "../../src/http/routes/crm";
import { buildFoundationRoutes } from "../../src/http/routes/foundation";
import { buildProjectRoutes } from "../../src/http/routes/project";
import { buildReportingRoutes } from "../../src/http/routes/reporting";
import { buildWebhookRoutes } from "../../src/http/routes/webhook";
import { buildWorkflowRoutes } from "../../src/http/routes/workflow";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import { buildOpenApiDocument } from "../../src/http/openapi";

// Minimal fake db that returns empty rows for any query (openapi.json is a static handler)
const fakeDb = {
  async query<T = unknown>(): Promise<{ rows: T[] }> {
    return { rows: [] };
  }
};

describe("buildOpenApiDocument()", () => {
  it("returns openapi version 3.1.0", () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe("3.1.0");
  });

  it("paths is non-empty", () => {
    const doc = buildOpenApiDocument();
    expect(Object.keys(doc.paths).length).toBeGreaterThan(0);
  });

  it("includes a sample path from each module", () => {
    const doc = buildOpenApiDocument();
    const paths = Object.keys(doc.paths);

    // crm
    expect(paths).toContain("/crm/companies");
    // reporting
    expect(paths).toContain("/reporting/report-definitions");
    // workflow
    expect(paths).toContain("/workflows");
    // webhook
    expect(paths).toContain("/webhook/endpoints");
    // auth (foundation registry)
    expect(paths).toContain("/auth/exchange-agent-token");
    // billing
    expect(paths).toContain("/billing/invoices");
    // project
    expect(paths).toContain("/project/projects");
    // approval-requests
    expect(paths).toContain("/approval-requests");
  });

  it("converts Hono :id params to OpenAPI {id} syntax", () => {
    const doc = buildOpenApiDocument();
    const paths = Object.keys(doc.paths);

    // Hono-style params must not appear
    expect(paths.some((p) => p.includes(":"))).toBe(false);

    // OpenAPI-style params must appear
    expect(paths).toContain("/crm/companies/{id}");
    expect(paths).toContain("/reporting/report-definitions/{id}");
    expect(paths).toContain("/webhook/endpoints/{id}");
    expect(paths).toContain("/workflows/{id}");
  });

  it("non-public operations carry the bearerAuth security requirement", () => {
    const doc = buildOpenApiDocument();

    // Spot-check a mix of methods and modules
    const checkPaths: Array<[string, "get" | "post" | "patch" | "delete"]> = [
      ["/crm/companies", "get"],
      ["/crm/companies", "post"],
      ["/reporting/report-definitions", "get"],
      ["/workflows", "post"],
      ["/billing/invoices", "get"],
      ["/auth/exchange-agent-token", "post"]
    ];

    for (const [path, method] of checkPaths) {
      const operation = doc.paths[path]?.[method];
      expect(operation, `operation ${method.toUpperCase()} ${path} should exist`).toBeDefined();
      expect(
        operation?.security,
        `${method.toUpperCase()} ${path} should carry bearerAuth`
      ).toEqual([{ bearerAuth: [] }]);
    }
  });

  it("has components.securitySchemes.bearerAuth as HTTP bearer JWT", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.securitySchemes.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    });
  });

  it("GET /openapi.json itself has empty security (public)", () => {
    const doc = buildOpenApiDocument();
    const operation = doc.paths["/openapi.json"]?.["get"];
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([]);
  });

  it("total path count matches the union of all registries + /openapi.json", () => {
    const doc = buildOpenApiDocument();

    // Collect every unique Hono path from all registries
    const allHonoPaths = new Set([
      ...buildFoundationRoutes().map((r) => r.path),
      ...buildApprovalRequestRoutes().map((r) => r.path),
      ...buildCrmRoutes().map((r) => r.path),
      ...buildProjectRoutes().map((r) => r.path),
      ...buildBillingRoutes().map((r) => r.path),
      ...buildReportingRoutes().map((r) => r.path),
      ...buildWorkflowRoutes().map((r) => r.path),
      ...buildWebhookRoutes().map((r) => r.path),
      "/openapi.json"
    ]);

    // Convert Hono paths to OpenAPI paths for counting
    const allOpenApiPaths = new Set(
      [...allHonoPaths].map((p) => p.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}"))
    );

    expect(Object.keys(doc.paths).length).toBe(allOpenApiPaths.size);
  });

  it("includes info.title and info.version", () => {
    const doc = buildOpenApiDocument();
    expect(doc.info.title).toBe("OpenERP API");
    expect(typeof doc.info.version).toBe("string");
    expect(doc.info.version.length).toBeGreaterThan(0);
  });

  it("includes module tags for all represented modules", () => {
    const doc = buildOpenApiDocument();
    const tagNames = doc.tags.map((t) => t.name);
    expect(tagNames).toContain("crm");
    expect(tagNames).toContain("reporting");
    expect(tagNames).toContain("workflow");
    expect(tagNames).toContain("webhook");
    expect(tagNames).toContain("billing");
    expect(tagNames).toContain("project");
  });

  it("POST and PATCH operations include a requestBody (schema or $ref)", () => {
    const doc = buildOpenApiDocument();

    const postCompanies = doc.paths["/crm/companies"]?.["post"];
    expect(postCompanies?.requestBody).toBeDefined();
    // OA-2: CRM routes now carry $ref schemas; billing routes still use object placeholder
    const postCompaniesSchema = postCompanies?.requestBody?.content?.["application/json"]?.schema;
    expect(postCompaniesSchema).toBeDefined();

    const patchCompany = doc.paths["/crm/companies/{id}"]?.["patch"];
    expect(patchCompany?.requestBody).toBeDefined();

    // Billing invoices still uses the placeholder (OA-3 not yet shipped)
    const postInvoices = doc.paths["/billing/invoices"]?.["post"];
    expect(postInvoices?.requestBody).toBeDefined();
    expect(postInvoices?.requestBody?.content?.["application/json"]?.schema).toEqual({
      type: "object"
    });
  });
});

describe("GET /openapi.json HTTP endpoint", () => {
  it("returns 200 with openapi 3.1.0 WITHOUT auth headers (public)", async () => {
    const app = buildApp({ db: fakeDb, resolveTenant: headerTenantResolver });

    // No auth headers at all
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { openapi: string };
    expect(body.openapi).toBe("3.1.0");
  });

  it("returns a non-empty paths object", async () => {
    const app = buildApp({ db: fakeDb, resolveTenant: headerTenantResolver });
    const res = await app.request("/openapi.json");
    const body = (await res.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(body.paths).length).toBeGreaterThan(0);
  });

  it("response contains no tenant-specific data fields", async () => {
    const app = buildApp({ db: fakeDb, resolveTenant: headerTenantResolver });
    const res = await app.request("/openapi.json");
    const text = await res.text();

    // The document is pure route metadata — no organizational or user identifiers
    expect(text).not.toMatch(/organization_id|organizationId|user_identity_id|actorUserId/);
  });
});
