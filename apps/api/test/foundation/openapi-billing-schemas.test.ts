import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "../../src/http/openapi";
import { ENTITY_SCHEMAS } from "../../src/http/openapi-entity-schemas";

// OA-3: Billing entity JSON Schema assertions — verifies presence and shape of all
// billing schemas added to ENTITY_SCHEMAS and wired into the OpenAPI document.

describe("Billing entity schemas (OA-3)", () => {
  // ── Helper sub-schemas ───────────────────────────────────────────────────

  describe("BillingMoney", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.BillingMoney).toBeDefined();
    });

    it("has required amountMinor, currency, scale", () => {
      const req = ENTITY_SCHEMAS.BillingMoney.required!;
      expect(req).toContain("amountMinor");
      expect(req).toContain("currency");
      expect(req).toContain("scale");
    });

    it("amountMinor and scale are integer typed", () => {
      const props = ENTITY_SCHEMAS.BillingMoney.properties!;
      expect((props.amountMinor as { type: string }).type).toBe("integer");
      expect((props.scale as { type: string }).type).toBe("integer");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.BillingMoney.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.BillingMoney).toEqual(ENTITY_SCHEMAS.BillingMoney);
    });
  });

  describe("TaxBreakdownLine", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.TaxBreakdownLine).toBeDefined();
    });

    it("has required jurisdiction, label, rateBps, amount", () => {
      const req = ENTITY_SCHEMAS.TaxBreakdownLine.required!;
      expect(req).toContain("jurisdiction");
      expect(req).toContain("label");
      expect(req).toContain("rateBps");
      expect(req).toContain("amount");
    });

    it("amount property is a $ref to BillingMoney", () => {
      const prop = ENTITY_SCHEMAS.TaxBreakdownLine.properties!.amount as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/BillingMoney");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.TaxBreakdownLine.additionalProperties).toBe(false);
    });
  });

  // ── TaxCategory ──────────────────────────────────────────────────────────

  describe("TaxCategory", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.TaxCategory).toBeDefined();
    });

    it("required includes id, organizationId, name, code, active, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.TaxCategory.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("name");
      expect(req).toContain("code");
      expect(req).toContain("active");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("description is nullable", () => {
      const prop = ENTITY_SCHEMAS.TaxCategory.properties!.description as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.TaxCategory.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.TaxCategory).toEqual(ENTITY_SCHEMAS.TaxCategory);
    });
  });

  describe("CreateTaxCategoryInput", () => {
    it("exists in ENTITY_SCHEMAS with required name and code", () => {
      expect(ENTITY_SCHEMAS.CreateTaxCategoryInput).toBeDefined();
      const req = ENTITY_SCHEMAS.CreateTaxCategoryInput.required!;
      expect(req).toContain("name");
      expect(req).toContain("code");
    });
  });

  describe("UpdateTaxCategoryInput", () => {
    it("exists in ENTITY_SCHEMAS with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateTaxCategoryInput).toBeDefined();
      expect(ENTITY_SCHEMAS.UpdateTaxCategoryInput.required).toHaveLength(0);
    });
  });

  // ── TaxRateVersion ───────────────────────────────────────────────────────

  describe("TaxRateVersion", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.TaxRateVersion).toBeDefined();
    });

    it("required includes id, organizationId, taxCategoryId, jurisdiction, label, rateBps, compound, effectiveFrom, active, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.TaxRateVersion.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("taxCategoryId");
      expect(req).toContain("jurisdiction");
      expect(req).toContain("label");
      expect(req).toContain("rateBps");
      expect(req).toContain("compound");
      expect(req).toContain("effectiveFrom");
      expect(req).toContain("active");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("rateBps is integer typed", () => {
      const prop = ENTITY_SCHEMAS.TaxRateVersion.properties!.rateBps as { type: string };
      expect(prop.type).toBe("integer");
    });

    it("effectiveTo is nullable", () => {
      const prop = ENTITY_SCHEMAS.TaxRateVersion.properties!.effectiveTo as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.TaxRateVersion.additionalProperties).toBe(false);
    });
  });

  // ── Invoice ──────────────────────────────────────────────────────────────

  describe("Invoice", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.Invoice).toBeDefined();
    });

    it("required includes id, organizationId, companyId, invoiceNumber, status, currency, subtotal, taxTotal, total, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Invoice.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("companyId");
      expect(req).toContain("invoiceNumber");
      expect(req).toContain("status");
      expect(req).toContain("currency");
      expect(req).toContain("subtotal");
      expect(req).toContain("taxTotal");
      expect(req).toContain("total");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers all InvoiceStatus values", () => {
      const prop = ENTITY_SCHEMAS.Invoice.properties!.status as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["draft", "issued", "paid", "partially_paid", "void", "written_off"]);
    });

    it("subtotal is a $ref to BillingMoney", () => {
      const prop = ENTITY_SCHEMAS.Invoice.properties!.subtotal as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/BillingMoney");
    });

    it("taxBreakdown is nullable array", () => {
      const prop = ENTITY_SCHEMAS.Invoice.properties!.taxBreakdown as { oneOf: unknown[] };
      expect(prop.oneOf).toBeDefined();
      expect(prop.oneOf.length).toBe(2);
    });

    it("projectId is nullable", () => {
      const prop = ENTITY_SCHEMAS.Invoice.properties!.projectId as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Invoice.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Invoice).toEqual(ENTITY_SCHEMAS.Invoice);
    });
  });

  describe("InvoiceLine", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.InvoiceLine).toBeDefined();
    });

    it("required includes id, organizationId, invoiceId, sourceType, quantity, unitPrice, amount, createdAt", () => {
      const req = ENTITY_SCHEMAS.InvoiceLine.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("invoiceId");
      expect(req).toContain("sourceType");
      expect(req).toContain("quantity");
      expect(req).toContain("unitPrice");
      expect(req).toContain("amount");
      expect(req).toContain("createdAt");
    });

    it("unitPrice is a $ref to BillingMoney", () => {
      const prop = ENTITY_SCHEMAS.InvoiceLine.properties!.unitPrice as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/BillingMoney");
    });
  });

  describe("InvoiceWithLines", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.InvoiceWithLines).toBeDefined();
    });

    it("uses allOf with Invoice $ref and lines array", () => {
      const schema = ENTITY_SCHEMAS.InvoiceWithLines as { allOf: unknown[] };
      expect(schema.allOf).toBeDefined();
      expect(schema.allOf.length).toBe(2);
      const [base, extension] = schema.allOf as [
        { $ref: string },
        { type: string; properties: { lines: unknown }; required: string[] }
      ];
      expect(base.$ref).toBe("#/components/schemas/Invoice");
      expect(extension.properties.lines).toBeDefined();
      expect(extension.required).toContain("lines");
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.InvoiceWithLines).toEqual(ENTITY_SCHEMAS.InvoiceWithLines);
    });
  });

  describe("CreateInvoiceInput", () => {
    it("exists in ENTITY_SCHEMAS with required companyId and lines", () => {
      expect(ENTITY_SCHEMAS.CreateInvoiceInput).toBeDefined();
      const req = ENTITY_SCHEMAS.CreateInvoiceInput.required!;
      expect(req).toContain("companyId");
      expect(req).toContain("lines");
    });
  });

  describe("ConvertProposalInput", () => {
    it("exists in ENTITY_SCHEMAS with required invoiceProposalId", () => {
      expect(ENTITY_SCHEMAS.ConvertProposalInput).toBeDefined();
      expect(ENTITY_SCHEMAS.ConvertProposalInput.required).toContain("invoiceProposalId");
    });
  });

  // ── Payment ──────────────────────────────────────────────────────────────

  describe("Payment", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.Payment).toBeDefined();
    });

    it("required includes id, organizationId, invoiceId, amount, paymentDate, method, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Payment.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("invoiceId");
      expect(req).toContain("amount");
      expect(req).toContain("paymentDate");
      expect(req).toContain("method");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("method enum covers all PaymentMethod values", () => {
      const prop = ENTITY_SCHEMAS.Payment.properties!.method as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["bank_transfer", "card", "cheque", "cash", "other"]);
    });

    it("amount is a $ref to BillingMoney", () => {
      const prop = ENTITY_SCHEMAS.Payment.properties!.amount as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/BillingMoney");
    });

    it("companyId is nullable", () => {
      const prop = ENTITY_SCHEMAS.Payment.properties!.companyId as { type: unknown };
      const types = Array.isArray(prop.type) ? prop.type : [prop.type];
      expect(types).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Payment.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Payment).toEqual(ENTITY_SCHEMAS.Payment);
    });
  });

  describe("CreatePaymentInput", () => {
    it("exists in ENTITY_SCHEMAS with required invoiceId, amount, paymentDate, method", () => {
      expect(ENTITY_SCHEMAS.CreatePaymentInput).toBeDefined();
      const req = ENTITY_SCHEMAS.CreatePaymentInput.required!;
      expect(req).toContain("invoiceId");
      expect(req).toContain("amount");
      expect(req).toContain("paymentDate");
      expect(req).toContain("method");
    });
  });

  // ── Account ──────────────────────────────────────────────────────────────

  describe("Account", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.Account).toBeDefined();
    });

    it("required includes id, organizationId, code, name, type, active, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.Account.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("code");
      expect(req).toContain("name");
      expect(req).toContain("type");
      expect(req).toContain("active");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("type enum covers all AccountType values", () => {
      const prop = ENTITY_SCHEMAS.Account.properties!.type as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["asset", "liability", "equity", "revenue", "expense"]);
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.Account.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Account).toEqual(ENTITY_SCHEMAS.Account);
    });
  });

  describe("CreateAccountInput", () => {
    it("exists in ENTITY_SCHEMAS with required code, name, type", () => {
      expect(ENTITY_SCHEMAS.CreateAccountInput).toBeDefined();
      const req = ENTITY_SCHEMAS.CreateAccountInput.required!;
      expect(req).toContain("code");
      expect(req).toContain("name");
      expect(req).toContain("type");
    });
  });

  describe("UpdateAccountInput", () => {
    it("exists in ENTITY_SCHEMAS with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateAccountInput).toBeDefined();
      expect(ENTITY_SCHEMAS.UpdateAccountInput.required).toHaveLength(0);
    });
  });

  // ── JournalEntry ─────────────────────────────────────────────────────────

  describe("JournalEntry", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.JournalEntry).toBeDefined();
    });

    it("required includes id, organizationId, entryDate, sourceType, status, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.JournalEntry.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("entryDate");
      expect(req).toContain("sourceType");
      expect(req).toContain("status");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("status enum covers all JournalEntryStatus values", () => {
      const prop = ENTITY_SCHEMAS.JournalEntry.properties!.status as { type: string; enum: string[] };
      expect(prop.enum).toEqual(["draft", "posted", "void"]);
    });

    it("sourceType enum covers all JournalEntrySourceType values", () => {
      const prop = ENTITY_SCHEMAS.JournalEntry.properties!.sourceType as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["invoice", "payment", "manual"]);
    });

    it("reference and description are nullable", () => {
      const refProp = ENTITY_SCHEMAS.JournalEntry.properties!.reference as { type: unknown };
      const descProp = ENTITY_SCHEMAS.JournalEntry.properties!.description as { type: unknown };
      const refTypes = Array.isArray(refProp.type) ? refProp.type : [refProp.type];
      const descTypes = Array.isArray(descProp.type) ? descProp.type : [descProp.type];
      expect(refTypes).toContain("null");
      expect(descTypes).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.JournalEntry.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.JournalEntry).toEqual(ENTITY_SCHEMAS.JournalEntry);
    });
  });

  describe("JournalEntryLine", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.JournalEntryLine).toBeDefined();
    });

    it("required includes id, organizationId, journalEntryId, accountId, debit, credit, createdAt", () => {
      const req = ENTITY_SCHEMAS.JournalEntryLine.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("journalEntryId");
      expect(req).toContain("accountId");
      expect(req).toContain("debit");
      expect(req).toContain("credit");
      expect(req).toContain("createdAt");
    });

    it("debit and credit are $ref to BillingMoney", () => {
      const debitProp = ENTITY_SCHEMAS.JournalEntryLine.properties!.debit as { $ref: string };
      const creditProp = ENTITY_SCHEMAS.JournalEntryLine.properties!.credit as { $ref: string };
      expect(debitProp.$ref).toBe("#/components/schemas/BillingMoney");
      expect(creditProp.$ref).toBe("#/components/schemas/BillingMoney");
    });
  });

  describe("JournalEntryWithLines", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.JournalEntryWithLines).toBeDefined();
    });

    it("uses allOf with JournalEntry $ref and lines array", () => {
      const schema = ENTITY_SCHEMAS.JournalEntryWithLines as { allOf: unknown[] };
      expect(schema.allOf).toBeDefined();
      expect(schema.allOf.length).toBe(2);
      const [base, extension] = schema.allOf as [
        { $ref: string },
        { type: string; properties: { lines: unknown }; required: string[] }
      ];
      expect(base.$ref).toBe("#/components/schemas/JournalEntry");
      expect(extension.properties.lines).toBeDefined();
      expect(extension.required).toContain("lines");
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.JournalEntryWithLines).toEqual(
        ENTITY_SCHEMAS.JournalEntryWithLines
      );
    });
  });

  describe("CreateJournalEntryInput", () => {
    it("exists in ENTITY_SCHEMAS with required entryDate and lines", () => {
      expect(ENTITY_SCHEMAS.CreateJournalEntryInput).toBeDefined();
      const req = ENTITY_SCHEMAS.CreateJournalEntryInput.required!;
      expect(req).toContain("entryDate");
      expect(req).toContain("lines");
    });
  });

  // ── RecurringBillingSchedule ─────────────────────────────────────────────

  describe("RecurringBillingSchedule", () => {
    it("exists in ENTITY_SCHEMAS", () => {
      expect(ENTITY_SCHEMAS.RecurringBillingSchedule).toBeDefined();
    });

    it("required includes id, organizationId, companyId, cadence, amount, currency, nextRunAt, active, createdAt, updatedAt", () => {
      const req = ENTITY_SCHEMAS.RecurringBillingSchedule.required!;
      expect(req).toContain("id");
      expect(req).toContain("organizationId");
      expect(req).toContain("companyId");
      expect(req).toContain("cadence");
      expect(req).toContain("amount");
      expect(req).toContain("currency");
      expect(req).toContain("nextRunAt");
      expect(req).toContain("active");
      expect(req).toContain("createdAt");
      expect(req).toContain("updatedAt");
    });

    it("cadence enum covers all RecurringBillingCadence values", () => {
      const prop = ENTITY_SCHEMAS.RecurringBillingSchedule.properties!.cadence as {
        type: string;
        enum: string[];
      };
      expect(prop.enum).toEqual(["weekly", "monthly", "quarterly", "annual"]);
    });

    it("amount is a $ref to BillingMoney", () => {
      const prop = ENTITY_SCHEMAS.RecurringBillingSchedule.properties!.amount as { $ref: string };
      expect(prop.$ref).toBe("#/components/schemas/BillingMoney");
    });

    it("lastInvoiceId and lastRunAt are nullable", () => {
      const lastInvoiceProp = ENTITY_SCHEMAS.RecurringBillingSchedule.properties!
        .lastInvoiceId as { type: unknown };
      const lastRunProp = ENTITY_SCHEMAS.RecurringBillingSchedule.properties!.lastRunAt as {
        type: unknown;
      };
      const invoiceTypes = Array.isArray(lastInvoiceProp.type)
        ? lastInvoiceProp.type
        : [lastInvoiceProp.type];
      const runTypes = Array.isArray(lastRunProp.type) ? lastRunProp.type : [lastRunProp.type];
      expect(invoiceTypes).toContain("null");
      expect(runTypes).toContain("null");
    });

    it("has additionalProperties: false", () => {
      expect(ENTITY_SCHEMAS.RecurringBillingSchedule.additionalProperties).toBe(false);
    });

    it("appears in components.schemas", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.RecurringBillingSchedule).toEqual(
        ENTITY_SCHEMAS.RecurringBillingSchedule
      );
    });
  });

  describe("CreateRecurringBillingScheduleInput", () => {
    it("exists in ENTITY_SCHEMAS with required companyId, cadence, amount, nextRunAt", () => {
      expect(ENTITY_SCHEMAS.CreateRecurringBillingScheduleInput).toBeDefined();
      const req = ENTITY_SCHEMAS.CreateRecurringBillingScheduleInput.required!;
      expect(req).toContain("companyId");
      expect(req).toContain("cadence");
      expect(req).toContain("amount");
      expect(req).toContain("nextRunAt");
    });
  });

  describe("UpdateRecurringBillingScheduleInput", () => {
    it("exists in ENTITY_SCHEMAS with no required fields", () => {
      expect(ENTITY_SCHEMAS.UpdateRecurringBillingScheduleInput).toBeDefined();
      expect(ENTITY_SCHEMAS.UpdateRecurringBillingScheduleInput.required).toHaveLength(0);
    });
  });

  // ── Route contract wiring ────────────────────────────────────────────────

  describe("Route contracts — $ref wiring in OpenAPI document", () => {
    it("GET /billing/invoices 200 response schema is $ref to Invoice", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/invoices"]?.["get"]?.responses?.["200"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Invoice" });
    });

    it("POST /billing/invoices requestBody schema is $ref to CreateInvoiceInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/invoices"]?.["post"]?.requestBody?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateInvoiceInput" });
    });

    it("POST /billing/invoices 201 response schema is $ref to InvoiceWithLines", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/invoices"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/InvoiceWithLines" });
    });

    it("POST /billing/invoices/from-proposal requestBody schema is $ref to ConvertProposalInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/invoices/from-proposal"]?.["post"]?.requestBody?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/ConvertProposalInput" });
    });

    it("GET /billing/invoices/{id} 200 response schema is $ref to InvoiceWithLines", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/invoices/{id}"]?.["get"]?.responses?.["200"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/InvoiceWithLines" });
    });

    it("POST /billing/invoices/{id}/issue 201 response schema is $ref to Invoice", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/invoices/{id}/issue"]?.["post"]?.responses?.["201"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Invoice" });
    });

    it("POST /billing/payments requestBody schema is $ref to CreatePaymentInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/payments"]?.["post"]?.requestBody?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreatePaymentInput" });
    });

    it("POST /billing/payments 201 response schema is $ref to Payment", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/payments"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Payment" });
    });

    it("GET /billing/payments/{id} 200 response schema is $ref to Payment", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/payments/{id}"]?.["get"]?.responses?.["200"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Payment" });
    });

    it("POST /billing/tax-categories requestBody schema is $ref to CreateTaxCategoryInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/tax-categories"]?.["post"]?.requestBody?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateTaxCategoryInput" });
    });

    it("PATCH /billing/tax-categories/{id} requestBody schema is $ref to UpdateTaxCategoryInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/tax-categories/{id}"]?.["patch"]?.requestBody?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/UpdateTaxCategoryInput" });
    });

    it("POST /billing/accounts requestBody schema is $ref to CreateAccountInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/accounts"]?.["post"]?.requestBody?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateAccountInput" });
    });

    it("POST /billing/accounts 201 response schema is $ref to Account", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/accounts"]?.["post"]?.responses?.["201"]?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Account" });
    });

    it("GET /billing/accounts/{id} 200 response schema is $ref to Account", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/accounts/{id}"]?.["get"]?.responses?.["200"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/Account" });
    });

    it("POST /billing/journal-entries requestBody schema is $ref to CreateJournalEntryInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/journal-entries"]?.["post"]?.requestBody?.content?.["application/json"]
          ?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateJournalEntryInput" });
    });

    it("POST /billing/journal-entries 201 response schema is $ref to JournalEntryWithLines", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/journal-entries"]?.["post"]?.responses?.["201"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/JournalEntryWithLines" });
    });

    it("GET /billing/journal-entries/{id} 200 response schema is $ref to JournalEntryWithLines", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/journal-entries/{id}"]?.["get"]?.responses?.["200"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/JournalEntryWithLines" });
    });

    it("POST /billing/recurring-schedules requestBody schema is $ref to CreateRecurringBillingScheduleInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/recurring-schedules"]?.["post"]?.requestBody?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/CreateRecurringBillingScheduleInput" });
    });

    it("POST /billing/recurring-schedules 201 response schema is $ref to RecurringBillingSchedule", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/recurring-schedules"]?.["post"]?.responses?.["201"]?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/RecurringBillingSchedule" });
    });

    it("PATCH /billing/recurring-schedules/{id} requestBody schema is $ref to UpdateRecurringBillingScheduleInput", () => {
      const doc = buildOpenApiDocument();
      const schema =
        doc.paths["/billing/recurring-schedules/{id}"]?.["patch"]?.requestBody?.content?.[
          "application/json"
        ]?.schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/UpdateRecurringBillingScheduleInput" });
    });

    it("components.schemas.Invoice equals ENTITY_SCHEMAS.Invoice", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Invoice).toEqual(ENTITY_SCHEMAS.Invoice);
    });

    it("components.schemas.Payment equals ENTITY_SCHEMAS.Payment", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Payment).toEqual(ENTITY_SCHEMAS.Payment);
    });

    it("components.schemas.Account equals ENTITY_SCHEMAS.Account", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.Account).toEqual(ENTITY_SCHEMAS.Account);
    });

    it("components.schemas.JournalEntry equals ENTITY_SCHEMAS.JournalEntry", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.JournalEntry).toEqual(ENTITY_SCHEMAS.JournalEntry);
    });

    it("components.schemas.RecurringBillingSchedule equals ENTITY_SCHEMAS.RecurringBillingSchedule", () => {
      const doc = buildOpenApiDocument();
      expect(doc.components.schemas.RecurringBillingSchedule).toEqual(
        ENTITY_SCHEMAS.RecurringBillingSchedule
      );
    });
  });
});
