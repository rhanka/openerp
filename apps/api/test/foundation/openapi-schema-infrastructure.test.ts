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

  it("ENTITY_SCHEMAS includes Billing entities (OA-3)", () => {
    expect(ENTITY_SCHEMAS).toHaveProperty("Invoice");
    expect(ENTITY_SCHEMAS).toHaveProperty("Payment");
    expect(ENTITY_SCHEMAS).toHaveProperty("Account");
    expect(ENTITY_SCHEMAS).toHaveProperty("JournalEntry");
    expect(ENTITY_SCHEMAS).toHaveProperty("RecurringBillingSchedule");
  });

  it("components.securitySchemes is still present alongside schemas", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.securitySchemes.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    });
  });

  // Placeholder contract tests — kept alive on reporting routes (OA-4 not yet shipped).

  it("POST route without requestSchema emits {type:'object'} placeholder", () => {
    const doc = buildOpenApiDocument();
    const postSavedViews = doc.paths["/reporting/saved-views"]?.["post"];
    expect(postSavedViews?.requestBody).toBeDefined();
    const schema = postSavedViews?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ type: "object" });
  });

  it("PATCH route without requestSchema emits {type:'object'} placeholder", () => {
    const doc = buildOpenApiDocument();
    const patchSavedView = doc.paths["/reporting/saved-views/{id}"]?.["patch"];
    expect(patchSavedView?.requestBody).toBeDefined();
    const schema = patchSavedView?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ type: "object" });
  });

  it("GET route without responseSchema emits {type:'object'} placeholder in 200 content", () => {
    const doc = buildOpenApiDocument();
    const getSavedViews = doc.paths["/reporting/saved-views"]?.["get"];
    expect(getSavedViews).toBeDefined();
    const schema = getSavedViews?.responses?.["200"]?.content?.["application/json"]?.schema;
    expect(schema).toEqual({ type: "object" });
  });

  it("POST route without responseSchema emits {type:'object'} placeholder in 201 content", () => {
    const doc = buildOpenApiDocument();
    const postSavedViews = doc.paths["/reporting/saved-views"]?.["post"];
    expect(postSavedViews).toBeDefined();
    const schema = postSavedViews?.responses?.["201"]?.content?.["application/json"]?.schema;
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
