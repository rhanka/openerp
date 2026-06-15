import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "../../src/http/openapi";
import { ENTITY_SCHEMAS } from "../../src/http/openapi-entity-schemas";

// OA-2: CRM entity JSON Schema assertions — verifies presence and shape of all
// CRM schemas added to ENTITY_SCHEMAS and wired into the OpenAPI document.

describe("CRM entity schemas (OA-2)", () => {
  // ── Helper sub-schemas ───────────────────────────────────────────────────

  describe("AddressPayload", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.AddressPayload).toBeDefined();
    });

    it("has all six address properties", () => {
      const props = ENTITY_SCHEMAS.AddressPayload.properties!;
      expect(props).toHaveProperty("line1");
      expect(props).toHaveProperty("line2");
      expect(props).toHaveProperty("city");
      expect(props).toHaveProperty("provinceState");
      expect(props).toHaveProperty("postalCode");
      expect(props).toHaveProperty("country");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.AddressPayload.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.AddressPayload).toBeDefined();
      expect(doc.components.schemas.AddressPayload).toEqual(ENTITY_SCHEMAS.AddressPayload);
    });
  });

  describe("MoneySnapshot", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.MoneySnapshot).toBeDefined();
    });

    it("has required amountMinor, currency, scale", () => {
      expect(ENTITY_SCHEMAS.MoneySnapshot.required).toContain("amountMinor");
      expect(ENTITY_SCHEMAS.MoneySnapshot.required).toContain("currency");
      expect(ENTITY_SCHEMAS.MoneySnapshot.required).toContain("scale");
    });

    it("amountMinor and scale are integer typed", () => {
      const props = ENTITY_SCHEMAS.MoneySnapshot.properties!;
      expect((props.amountMinor as { type: string }).type).toBe("integer");
      expect((props.scale as { type: string }).type).toBe("integer");
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.MoneySnapshot).toEqual(ENTITY_SCHEMAS.MoneySnapshot);
    });
  });

  // ── Company ──────────────────────────────────────────────────────────────

  describe("Company", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.Company).toBeDefined();
    });

    it("has property id", () => {
      expect(ENTITY_SCHEMAS.Company.properties).toHaveProperty("id");
    });

    it("has property displayName", () => {
      expect(ENTITY_SCHEMAS.Company.properties).toHaveProperty("displayName");
    });

    it("required includes id, organizationId, displayName, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Company.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("displayName");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("billingAddress property is present", () => {
      expect(ENTITY_SCHEMAS.Company.properties).toHaveProperty("billingAddress");
    });

    it("additionalProperties is false", () => {
      expect(ENTITY_SCHEMAS.Company.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Company).toEqual(ENTITY_SCHEMAS.Company);
    });
  });

  describe("CreateCompanyInput", () => {
    it("exists in ENTITY_SCHEMAS with required displayName", () => {
      expect(ENTITY_SCHEMAS.CreateCompanyInput).toBeDefined();
      expect(ENTITY_SCHEMAS.CreateCompanyInput.required).toContain("displayName");
    });
  });

  describe("UpdateCompanyInput", () => {
    it("exists in ENTITY_SCHEMAS with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateCompanyInput).toBeDefined();
      expect(ENTITY_SCHEMAS.UpdateCompanyInput.required).toHaveLength(0);
    });
  });

  // ── Contact ──────────────────────────────────────────────────────────────

  describe("Contact", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.Contact).toBeDefined();
    });

    it("required includes id, organizationId, displayName, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Contact.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("displayName");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum is active | inactive", () => {
      const statusProp = ENTITY_SCHEMAS.Contact.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(statusProp.enum).toEqual(["active", "inactive"]);
    });

    it("additionalProperties is false", () => {
      expect(ENTITY_SCHEMAS.Contact.additionalProperties).toBe(false);
    });
  });

  // ── PipelineStage ────────────────────────────────────────────────────────

  describe("PipelineStage", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.PipelineStage).toBeDefined();
    });

    it("required includes all non-optional fields", () => {
      const req = ENTITY_SCHEMAS.PipelineStage.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("orderIndex");
      expect(req).toContain("isInitial");
      expect(req).toContain("isWon");
      expect(req).toContain("isLost");
      expect(req).toContain("active");
    });

    it("orderIndex is integer typed", () => {
      const prop = ENTITY_SCHEMAS.PipelineStage.properties!.orderIndex as { type: string };
      expect(prop.type).toBe("integer");
    });
  });

  // ── Opportunity ──────────────────────────────────────────────────────────

  describe("Opportunity", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.Opportunity).toBeDefined();
    });

    it("required includes id, organizationId, companyId, name, stageId, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Opportunity.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("companyId");
      expect(req).toContain("name");
      expect(req).toContain("stageId");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum is open | won | lost | archived", () => {
      const prop = ENTITY_SCHEMAS.Opportunity.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["open", "won", "lost", "archived"]);
    });

    it("expectedValue property is present", () => {
      expect(ENTITY_SCHEMAS.Opportunity.properties).toHaveProperty("expectedValue");
    });

    it("additionalProperties is false", () => {
      expect(ENTITY_SCHEMAS.Opportunity.additionalProperties).toBe(false);
    });
  });

  // ── Lead ─────────────────────────────────────────────────────────────────

  describe("Lead", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.Lead).toBeDefined();
    });

    it("required includes id, organizationId, displayName, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Lead.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("displayName");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum is new | working | converted | disqualified", () => {
      const prop = ENTITY_SCHEMAS.Lead.properties!.status as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["new", "working", "converted", "disqualified"]);
    });

    it("convertedAt is nullable", () => {
      const prop = ENTITY_SCHEMAS.Lead.properties!.convertedAt as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });
  });

  describe("ConvertLeadResult", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.ConvertLeadResult).toBeDefined();
    });

    it("required includes lead, company, opportunity", () => {
      const req = ENTITY_SCHEMAS.ConvertLeadResult.required!;
      expect(req).toContain("lead");
      expect(req).toContain("company");
      expect(req).toContain("opportunity");
    });

    it("lead property is a $ref to Lead", () => {
      const prop = ENTITY_SCHEMAS.ConvertLeadResult.properties!.lead as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/Lead");
    });
  });

  // ── QuoteHandoff ─────────────────────────────────────────────────────────

  describe("QuoteHandoff", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.QuoteHandoff).toBeDefined();
    });

    it("required includes id, organizationId, opportunityId, targetType, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.QuoteHandoff.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("opportunityId");
      expect(req).toContain("targetType");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("targetType enum is invoice | project | subscription", () => {
      const prop = ENTITY_SCHEMAS.QuoteHandoff.properties!.targetType as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["invoice", "project", "subscription"]);
    });

    it("status enum is pending | accepted | rejected | cancelled", () => {
      const prop = ENTITY_SCHEMAS.QuoteHandoff.properties!.status as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["pending", "accepted", "rejected", "cancelled"]);
    });
  });

  // ── Route contract wiring ────────────────────────────────────────────────

  describe("Route contracts — $ref wiring in OpenAPI document", () => {
    it("POST /crm/companies requestBody schema is $ref to CreateCompanyInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/companies"]?.["post"]?.requestBody?.content?.["application/json"]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateCompanyInput" });
    });

    it("POST /crm/companies 201 response schema is $ref to Company", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/companies"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Company" });
    });

    it("GET /crm/companies 200 response schema is $ref to Company", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/companies"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Company" });
    });

    it("PATCH /crm/companies/{id} requestBody schema is $ref to UpdateCompanyInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/companies/{id}"]?.["patch"]?.requestBody?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/UpdateCompanyInput" });
    });

    it("POST /crm/leads requestBody schema is $ref to CreateLeadInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/leads"]?.["post"]?.requestBody?.content?.["application/json"]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateLeadInput" });
    });

    it("POST /crm/leads 201 response schema is $ref to Lead", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/leads"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Lead" });
    });

    it("POST /crm/leads/{id}/convert 201 response schema is $ref to ConvertLeadResult", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/leads/{id}/convert"]?.["post"]?.responses?.["201"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/ConvertLeadResult" });
    });

    it("POST /crm/opportunities requestBody schema is $ref to CreateOpportunityInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/opportunities"]?.["post"]?.requestBody?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateOpportunityInput" });
    });

    it("POST /crm/opportunities 201 response schema is $ref to Opportunity", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/opportunities"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Opportunity" });
    });

    it("GET /crm/quote-handoffs/{id} 200 response schema is $ref to QuoteHandoff", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/crm/quote-handoffs/{id}"]?.["get"]?.responses?.["200"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/QuoteHandoff" });
    });

    it("components.schemas.Company equals ENTITY_SCHEMAS.Company", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Company).toEqual(ENTITY_SCHEMAS.Company);
    });

    it("components.schemas.Lead equals ENTITY_SCHEMAS.Lead", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Lead).toEqual(ENTITY_SCHEMAS.Lead);
    });

    it("components.schemas.Opportunity equals ENTITY_SCHEMAS.Opportunity", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Opportunity).toEqual(ENTITY_SCHEMAS.Opportunity);
    });
  });
});
