import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "../../src/http/openapi";
import { ENTITY_SCHEMAS } from "../../src/http/openapi-entity-schemas";

// OA-1: infrastructure tests — verifies plumbing, not entity content.

describe("components.schemas infrastructure (OA-1)", () => {
  it("components.schemas is an object (empty until OA-2..OA-5)", () => {
    const doc = buildOpenApiDocument();
    expect(typeof doc.components.schemas).toBe("object");
    expect(doc.components.schemas).not.toBeNull();
  });

  it("ENTITY_SCHEMAS includes CRM entities (OA-2)", () => {
    expect(Object.keys(ENTITY_SCHEMAS).length).toBeGreaterThan(0);
    expect(ENTITY_SCHEMAS).toHaveProperty("Company");
    expect(ENTITY_SCHEMAS).toHaveProperty("Contact");
    expect(ENTITY_SCHEMAS).toHaveProperty("Lead");
    expect(ENTITY_SCHEMAS).toHaveProperty("Opportunity");
  });

  it("components.securitySchemes is still present alongside schemas", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.securitySchemes.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    });
  });

  // Placeholder contract tests — kept alive on billing routes (no schema wired yet).

  it("POST route without requestSchema emits {type:'object'} placeholder", () => {
    const doc = buildOpenApiDocument();
    const postInvoices = doc.paths["/billing/invoices"]?.["post"];
    expect(postInvoices?.requestBody).toBeDefined();
    const schema = postInvoices?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ type: "object" });
  });

  it("PATCH route without requestSchema emits {type:'object'} placeholder", () => {
    const doc = buildOpenApiDocument();
    const patchTaxCategory = doc.paths["/billing/tax-categories/{id}"]?.["patch"];
    expect(patchTaxCategory?.requestBody).toBeDefined();
    const schema = patchTaxCategory?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ type: "object" });
  });

  it("GET route without responseSchema emits {type:'object'} placeholder in 200 content", () => {
    const doc = buildOpenApiDocument();
    const getInvoices = doc.paths["/billing/invoices"]?.["get"];
    expect(getInvoices).toBeDefined();
    const schema = getInvoices?.responses?.["200"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ type: "object" });
  });

  it("POST route without responseSchema emits {type:'object'} placeholder in 201 content", () => {
    const doc = buildOpenApiDocument();
    const postInvoices = doc.paths["/billing/invoices"]?.["post"];
    expect(postInvoices).toBeDefined();
    const schema = postInvoices?.responses?.["201"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ type: "object" });
  });

  it("CRM POST route with requestSchema uses $ref in requestBody (OA-2)", () => {
    const doc = buildOpenApiDocument();
    const postCompanies = doc.paths["/crm/companies"]?.["post"];
    const schema = postCompanies?.requestBody?.content?.["application/json"]?.schema;
    // requestSchema now set → $ref present
    expect(schema).toHaveProperty("$ref");
    expect(schema?.$ref).toBe("#/components/schemas/CreateCompanyInput");
  });
});
