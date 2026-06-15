// Entity JSON Schemas for OpenAPI 3.1 components.schemas.
//
// Populated incrementally by OPENAPI-4-B sub-slices:
//   OA-2: CRM (Company, Contact, Lead, Opportunity, PipelineStage, QuoteHandoff)
//   OA-3: Billing (Invoice, InvoiceLine, RecurringSchedule, Tax, Account)
//   OA-4: Reporting + Workflow + Webhook
//   OA-5: Foundation + Project
//
// All schemas derived from packages/domain TypeScript interfaces by hand
// (no codegen library to avoid new deps; tests verify ref consistency).

export type EntitySchema = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  $ref?: string;
};

/** Map of entity name → JSON Schema. */
export const ENTITY_SCHEMAS: Record<string, EntitySchema> = {
  // ── Helper sub-schemas ───────────────────────────────────────────────────

  AddressPayload: {
    type: "object",
    description: "Structured postal address stored as jsonb on company rows.",
    properties: {
      line1: { type: "string" },
      line2: { type: "string" },
      city: { type: "string" },
      provinceState: { type: "string" },
      postalCode: { type: "string" },
      country: { type: "string" }
    },
    required: [],
    additionalProperties: false
  },

  MoneySnapshot: {
    type: "object",
    description: "Immutable money value snapshot stored as jsonb on opportunity rows.",
    properties: {
      amountMinor: { type: "integer" },
      currency: { type: "string" },
      scale: { type: "integer" }
    },
    required: ["amountMinor", "currency", "scale"],
    additionalProperties: false
  },

  // ── Company ──────────────────────────────────────────────────────────────

  Company: {
    type: "object",
    description: "CRM company entity — a customer, prospect, or partner organisation.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      displayName: { type: "string" },
      legalName: { type: ["string", "null"] },
      status: { type: "string", enum: ["active", "archived"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      language: { type: ["string", "null"] },
      taxRegion: { type: ["string", "null"] },
      billingAddress: {
        oneOf: [{ $ref: "#/components/schemas/AddressPayload" }, { type: "null" }]
      },
      shippingAddress: {
        oneOf: [{ $ref: "#/components/schemas/AddressPayload" }, { type: "null" }]
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: ["id", "organizationId", "displayName", "status", "createdAt", "updatedAt"],
    additionalProperties: false
  },

  CreateCompanyInput: {
    type: "object",
    description: "Payload for creating a new CRM company.",
    properties: {
      displayName: { type: "string" },
      legalName: { type: ["string", "null"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      language: { type: ["string", "null"] },
      taxRegion: { type: ["string", "null"] },
      billingAddress: {
        oneOf: [{ $ref: "#/components/schemas/AddressPayload" }, { type: "null" }]
      },
      shippingAddress: {
        oneOf: [{ $ref: "#/components/schemas/AddressPayload" }, { type: "null" }]
      }
    },
    required: ["displayName"],
    additionalProperties: false
  },

  UpdateCompanyInput: {
    type: "object",
    description: "Partial update payload for an existing CRM company.",
    properties: {
      displayName: { type: "string" },
      legalName: { type: ["string", "null"] },
      status: { type: "string", enum: ["active", "archived"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      website: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      language: { type: ["string", "null"] },
      taxRegion: { type: ["string", "null"] },
      billingAddress: {
        oneOf: [{ $ref: "#/components/schemas/AddressPayload" }, { type: "null" }]
      },
      shippingAddress: {
        oneOf: [{ $ref: "#/components/schemas/AddressPayload" }, { type: "null" }]
      }
    },
    required: [],
    additionalProperties: false
  },

  // ── Contact ──────────────────────────────────────────────────────────────

  Contact: {
    type: "object",
    description: "CRM contact entity — an individual person linked to a company.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      companyId: { type: ["string", "null"] },
      displayName: { type: "string" },
      firstName: { type: ["string", "null"] },
      lastName: { type: ["string", "null"] },
      title: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      language: { type: ["string", "null"] },
      status: { type: "string", enum: ["active", "inactive"] },
      ownerUserId: { type: ["string", "null"] },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: ["id", "organizationId", "displayName", "status", "createdAt", "updatedAt"],
    additionalProperties: false
  },

  CreateContactInput: {
    type: "object",
    description: "Payload for creating a new CRM contact.",
    properties: {
      companyId: { type: ["string", "null"] },
      displayName: { type: "string" },
      firstName: { type: ["string", "null"] },
      lastName: { type: ["string", "null"] },
      title: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      language: { type: ["string", "null"] },
      ownerUserId: { type: ["string", "null"] }
    },
    required: ["displayName"],
    additionalProperties: false
  },

  UpdateContactInput: {
    type: "object",
    description: "Partial update payload for an existing CRM contact.",
    properties: {
      companyId: { type: ["string", "null"] },
      displayName: { type: "string" },
      firstName: { type: ["string", "null"] },
      lastName: { type: ["string", "null"] },
      title: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      language: { type: ["string", "null"] },
      status: { type: "string", enum: ["active", "inactive"] },
      ownerUserId: { type: ["string", "null"] }
    },
    required: [],
    additionalProperties: false
  },

  // ── PipelineStage ────────────────────────────────────────────────────────

  PipelineStage: {
    type: "object",
    description: "Tenant-configurable CRM pipeline stage with funnel transition markers.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      name: { type: "string" },
      orderIndex: { type: "integer" },
      isInitial: { type: "boolean" },
      isWon: { type: "boolean" },
      isLost: { type: "boolean" },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "name",
      "orderIndex",
      "isInitial",
      "isWon",
      "isLost",
      "active",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  CreatePipelineStageInput: {
    type: "object",
    description: "Payload for creating a new CRM pipeline stage.",
    properties: {
      name: { type: "string" },
      orderIndex: { type: "integer" },
      isInitial: { type: "boolean" },
      isWon: { type: "boolean" },
      isLost: { type: "boolean" }
    },
    required: ["name", "orderIndex"],
    additionalProperties: false
  },

  UpdatePipelineStageInput: {
    type: "object",
    description: "Partial update payload for an existing CRM pipeline stage.",
    properties: {
      name: { type: "string" },
      orderIndex: { type: "integer" },
      isInitial: { type: "boolean" },
      isWon: { type: "boolean" },
      isLost: { type: "boolean" },
      active: { type: "boolean" }
    },
    required: [],
    additionalProperties: false
  },

  // ── Opportunity ──────────────────────────────────────────────────────────

  Opportunity: {
    type: "object",
    description: "CRM opportunity entity — a qualified sales deal tracked through pipeline stages.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      companyId: { type: "string" },
      primaryContactId: { type: ["string", "null"] },
      name: { type: "string" },
      stageId: { type: "string" },
      status: { type: "string", enum: ["open", "won", "lost", "archived"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      expectedValue: {
        oneOf: [{ $ref: "#/components/schemas/MoneySnapshot" }, { type: "null" }]
      },
      currency: { type: ["string", "null"] },
      expectedCloseDate: { type: ["string", "null"] },
      probabilityBand: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
      serviceSummary: { type: ["string", "null"] },
      lossReason: { type: ["string", "null"] },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "companyId",
      "name",
      "stageId",
      "status",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  CreateOpportunityInput: {
    type: "object",
    description: "Payload for creating a new CRM opportunity.",
    properties: {
      companyId: { type: "string" },
      primaryContactId: { type: ["string", "null"] },
      name: { type: "string" },
      stageId: { type: "string" },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      expectedValue: {
        oneOf: [{ $ref: "#/components/schemas/MoneySnapshot" }, { type: "null" }]
      },
      currency: { type: ["string", "null"] },
      expectedCloseDate: { type: ["string", "null"] },
      probabilityBand: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
      serviceSummary: { type: ["string", "null"] }
    },
    required: ["companyId", "name", "stageId"],
    additionalProperties: false
  },

  UpdateOpportunityInput: {
    type: "object",
    description: "Partial update payload for an existing CRM opportunity.",
    properties: {
      primaryContactId: { type: ["string", "null"] },
      name: { type: "string" },
      stageId: { type: "string" },
      status: { type: "string", enum: ["open", "won", "lost", "archived"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      expectedValue: {
        oneOf: [{ $ref: "#/components/schemas/MoneySnapshot" }, { type: "null" }]
      },
      currency: { type: ["string", "null"] },
      expectedCloseDate: { type: ["string", "null"] },
      probabilityBand: { type: ["string", "null"], enum: ["low", "medium", "high", null] },
      serviceSummary: { type: ["string", "null"] },
      lossReason: { type: ["string", "null"] }
    },
    required: [],
    additionalProperties: false
  },

  // ── Lead ─────────────────────────────────────────────────────────────────

  Lead: {
    type: "object",
    description: "CRM lead entity — an unqualified prospect captured before full qualification.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      source: { type: ["string", "null"] },
      displayName: { type: "string" },
      companyName: { type: ["string", "null"] },
      contactName: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      status: { type: "string", enum: ["new", "working", "converted", "disqualified"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      convertedAt: { type: ["string", "null"], format: "date-time" },
      convertedCompanyId: { type: ["string", "null"] },
      convertedContactId: { type: ["string", "null"] },
      convertedOpportunityId: { type: ["string", "null"] },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: ["id", "organizationId", "displayName", "status", "createdAt", "updatedAt"],
    additionalProperties: false
  },

  CreateLeadInput: {
    type: "object",
    description: "Payload for creating a new CRM lead.",
    properties: {
      displayName: { type: "string" },
      source: { type: ["string", "null"] },
      companyName: { type: ["string", "null"] },
      contactName: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] }
    },
    required: ["displayName"],
    additionalProperties: false
  },

  UpdateLeadInput: {
    type: "object",
    description: "Partial update payload for an existing CRM lead.",
    properties: {
      source: { type: ["string", "null"] },
      displayName: { type: "string" },
      companyName: { type: ["string", "null"] },
      contactName: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      status: { type: "string", enum: ["new", "working", "disqualified"] },
      ownerUserId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] }
    },
    required: [],
    additionalProperties: false
  },

  ConvertLeadResult: {
    type: "object",
    description: "Composite result of the lead-conversion transaction: lead + company + contact + opportunity.",
    properties: {
      lead: { $ref: "#/components/schemas/Lead" },
      company: { $ref: "#/components/schemas/Company" },
      contact: {
        oneOf: [{ $ref: "#/components/schemas/Contact" }, { type: "null" }]
      },
      opportunity: { $ref: "#/components/schemas/Opportunity" }
    },
    required: ["lead", "company", "opportunity"],
    additionalProperties: false
  },

  // ── QuoteHandoff ─────────────────────────────────────────────────────────

  QuoteHandoff: {
    type: "object",
    description: "CRM quote handoff event — bridges a won opportunity to a billing document.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      opportunityId: { type: "string" },
      targetType: { type: "string", enum: ["invoice", "project", "subscription"] },
      status: { type: "string", enum: ["pending", "accepted", "rejected", "cancelled"] },
      requestedByUserId: { type: ["string", "null"] },
      acceptedAt: { type: ["string", "null"], format: "date-time" },
      deletedAt: { type: ["string", "null"], format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "opportunityId",
      "targetType",
      "status",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  CreateQuoteHandoffInput: {
    type: "object",
    description: "Payload for creating a new CRM quote handoff.",
    properties: {
      opportunityId: { type: "string" },
      targetType: { type: "string", enum: ["invoice", "project", "subscription"] },
      requestedByUserId: { type: ["string", "null"] }
    },
    required: ["opportunityId", "targetType"],
    additionalProperties: false
  },

  // ── Billing helper sub-schemas ────────────────────────────────────────────

  BillingMoney: {
    type: "object",
    description: "Immutable money value used across billing entities (invoice, payment, schedule).",
    properties: {
      amountMinor: { type: "integer" },
      currency: { type: "string" },
      scale: { type: "integer" }
    },
    required: ["amountMinor", "currency", "scale"],
    additionalProperties: false
  },

  TaxBreakdownLine: {
    type: "object",
    description: "One line of the per-invoice tax breakdown stored as jsonb.",
    properties: {
      jurisdiction: { type: "string" },
      label: { type: "string" },
      rateBps: { type: "integer" },
      amount: { $ref: "#/components/schemas/BillingMoney" }
    },
    required: ["jurisdiction", "label", "rateBps", "amount"],
    additionalProperties: false
  },

  // ── TaxCategory ───────────────────────────────────────────────────────────

  TaxCategory: {
    type: "object",
    description: "Tenant-configurable tax category grouping tax rate versions by type.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      name: { type: "string" },
      code: { type: "string" },
      description: { type: ["string", "null"] },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: ["id", "organizationId", "name", "code", "active", "createdAt", "updatedAt"],
    additionalProperties: false
  },

  CreateTaxCategoryInput: {
    type: "object",
    description: "Payload for creating a new tax category.",
    properties: {
      name: { type: "string" },
      code: { type: "string" },
      description: { type: ["string", "null"] },
      active: { type: "boolean" }
    },
    required: ["name", "code"],
    additionalProperties: false
  },

  UpdateTaxCategoryInput: {
    type: "object",
    description: "Partial update payload for an existing tax category.",
    properties: {
      name: { type: "string" },
      code: { type: "string" },
      description: { type: ["string", "null"] },
      active: { type: "boolean" }
    },
    required: [],
    additionalProperties: false
  },

  // ── TaxRateVersion ────────────────────────────────────────────────────────

  TaxRateVersion: {
    type: "object",
    description: "Versioned tax rate entry for a given jurisdiction and category.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      taxCategoryId: { type: "string" },
      jurisdiction: { type: "string" },
      label: { type: "string" },
      rateBps: { type: "integer" },
      compound: { type: "boolean" },
      effectiveFrom: { type: "string", format: "date-time" },
      effectiveTo: { type: ["string", "null"], format: "date-time" },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "taxCategoryId",
      "jurisdiction",
      "label",
      "rateBps",
      "compound",
      "effectiveFrom",
      "active",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  CreateTaxRateVersionInput: {
    type: "object",
    description: "Payload for creating a new tax rate version.",
    properties: {
      taxCategoryId: { type: "string" },
      jurisdiction: { type: "string" },
      label: { type: "string" },
      rateBps: { type: "integer" },
      compound: { type: "boolean" },
      effectiveFrom: { type: "string", format: "date-time" },
      effectiveTo: { type: ["string", "null"], format: "date-time" },
      active: { type: "boolean" }
    },
    required: ["taxCategoryId", "jurisdiction", "label", "rateBps", "effectiveFrom"],
    additionalProperties: false
  },

  UpdateTaxRateVersionInput: {
    type: "object",
    description: "Partial update payload for an existing tax rate version.",
    properties: {
      jurisdiction: { type: "string" },
      label: { type: "string" },
      rateBps: { type: "integer" },
      compound: { type: "boolean" },
      effectiveFrom: { type: "string", format: "date-time" },
      effectiveTo: { type: ["string", "null"], format: "date-time" },
      active: { type: "boolean" }
    },
    required: [],
    additionalProperties: false
  },

  // ── Invoice ───────────────────────────────────────────────────────────────

  Invoice: {
    type: "object",
    description: "Billing invoice — the final revenue document issued to a company.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      companyId: { type: "string" },
      projectId: { type: ["string", "null"] },
      invoiceProposalId: { type: ["string", "null"] },
      invoiceNumber: { type: "string" },
      status: {
        type: "string",
        enum: ["draft", "issued", "paid", "partially_paid", "void", "written_off"]
      },
      currency: { type: "string" },
      subtotal: { $ref: "#/components/schemas/BillingMoney" },
      taxTotal: { $ref: "#/components/schemas/BillingMoney" },
      total: { $ref: "#/components/schemas/BillingMoney" },
      taxCategoryId: { type: ["string", "null"] },
      taxBreakdown: {
        oneOf: [
          { type: "array", items: { $ref: "#/components/schemas/TaxBreakdownLine" } },
          { type: "null" }
        ]
      },
      issueDate: { type: ["string", "null"] },
      dueDate: { type: ["string", "null"] },
      issuedAt: { type: ["string", "null"], format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "companyId",
      "invoiceNumber",
      "status",
      "currency",
      "subtotal",
      "taxTotal",
      "total",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  InvoiceLine: {
    type: "object",
    description: "One line item on a billing invoice.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      invoiceId: { type: "string" },
      sourceType: { type: "string" },
      sourceId: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      quantity: { type: "number" },
      unitPrice: { $ref: "#/components/schemas/BillingMoney" },
      amount: { $ref: "#/components/schemas/BillingMoney" },
      createdAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "invoiceId",
      "sourceType",
      "quantity",
      "unitPrice",
      "amount",
      "createdAt"
    ],
    additionalProperties: false
  },

  InvoiceWithLines: {
    description: "Invoice with its associated line items.",
    allOf: [
      { $ref: "#/components/schemas/Invoice" },
      {
        type: "object",
        properties: {
          lines: { type: "array", items: { $ref: "#/components/schemas/InvoiceLine" } }
        },
        required: ["lines"],
        additionalProperties: false
      }
    ]
  },

  CreateInvoiceLineInput: {
    type: "object",
    description: "Line item payload embedded in CreateInvoiceInput.",
    properties: {
      description: { type: ["string", "null"] },
      quantity: { type: "number" },
      unitPrice: { $ref: "#/components/schemas/BillingMoney" },
      amount: { $ref: "#/components/schemas/BillingMoney" }
    },
    required: ["quantity", "unitPrice", "amount"],
    additionalProperties: false
  },

  CreateInvoiceInput: {
    type: "object",
    description: "Payload for creating a new billing invoice.",
    properties: {
      companyId: { type: "string" },
      projectId: { type: ["string", "null"] },
      currency: { type: "string" },
      taxCategoryId: { type: ["string", "null"] },
      lines: {
        type: "array",
        items: { $ref: "#/components/schemas/CreateInvoiceLineInput" }
      }
    },
    required: ["companyId", "lines"],
    additionalProperties: false
  },

  ConvertProposalInput: {
    type: "object",
    description: "Payload for converting an invoice proposal into a billing invoice.",
    properties: {
      invoiceProposalId: { type: "string" }
    },
    required: ["invoiceProposalId"],
    additionalProperties: false
  },

  // ── Payment ───────────────────────────────────────────────────────────────

  Payment: {
    type: "object",
    description: "Payment recorded against a billing invoice.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      invoiceId: { type: "string" },
      companyId: { type: ["string", "null"] },
      amount: { $ref: "#/components/schemas/BillingMoney" },
      paymentDate: { type: "string" },
      method: {
        type: "string",
        enum: ["bank_transfer", "card", "cheque", "cash", "other"]
      },
      reference: { type: ["string", "null"] },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "invoiceId",
      "amount",
      "paymentDate",
      "method",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  CreatePaymentInput: {
    type: "object",
    description: "Payload for recording a new payment against an invoice.",
    properties: {
      invoiceId: { type: "string" },
      amount: { $ref: "#/components/schemas/BillingMoney" },
      paymentDate: { type: "string" },
      method: {
        type: "string",
        enum: ["bank_transfer", "card", "cheque", "cash", "other"]
      },
      reference: { type: ["string", "null"] }
    },
    required: ["invoiceId", "amount", "paymentDate", "method"],
    additionalProperties: false
  },

  // ── Account ───────────────────────────────────────────────────────────────

  Account: {
    type: "object",
    description: "Chart-of-accounts entry for double-entry bookkeeping.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      code: { type: "string" },
      name: { type: "string" },
      type: {
        type: "string",
        enum: ["asset", "liability", "equity", "revenue", "expense"]
      },
      active: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: ["id", "organizationId", "code", "name", "type", "active", "createdAt", "updatedAt"],
    additionalProperties: false
  },

  CreateAccountInput: {
    type: "object",
    description: "Payload for creating a new chart-of-accounts entry.",
    properties: {
      code: { type: "string" },
      name: { type: "string" },
      type: {
        type: "string",
        enum: ["asset", "liability", "equity", "revenue", "expense"]
      },
      active: { type: "boolean" }
    },
    required: ["code", "name", "type"],
    additionalProperties: false
  },

  UpdateAccountInput: {
    type: "object",
    description: "Partial update payload for an existing chart-of-accounts entry.",
    properties: {
      name: { type: "string" },
      type: {
        type: "string",
        enum: ["asset", "liability", "equity", "revenue", "expense"]
      },
      active: { type: "boolean" }
    },
    required: [],
    additionalProperties: false
  },

  // ── JournalEntry ──────────────────────────────────────────────────────────

  JournalEntry: {
    type: "object",
    description: "Double-entry journal entry header.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      entryDate: { type: "string" },
      reference: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      sourceType: {
        type: "string",
        enum: ["invoice", "payment", "manual"]
      },
      sourceId: { type: ["string", "null"] },
      status: {
        type: "string",
        enum: ["draft", "posted", "void"]
      },
      postedAt: { type: ["string", "null"], format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "entryDate",
      "sourceType",
      "status",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  JournalEntryLine: {
    type: "object",
    description: "One debit or credit line of a double-entry journal entry.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      journalEntryId: { type: "string" },
      accountId: { type: "string" },
      debit: { $ref: "#/components/schemas/BillingMoney" },
      credit: { $ref: "#/components/schemas/BillingMoney" },
      description: { type: ["string", "null"] },
      createdAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "journalEntryId",
      "accountId",
      "debit",
      "credit",
      "createdAt"
    ],
    additionalProperties: false
  },

  JournalEntryWithLines: {
    description: "Journal entry with its associated debit/credit lines.",
    allOf: [
      { $ref: "#/components/schemas/JournalEntry" },
      {
        type: "object",
        properties: {
          lines: { type: "array", items: { $ref: "#/components/schemas/JournalEntryLine" } }
        },
        required: ["lines"],
        additionalProperties: false
      }
    ]
  },

  CreateJournalEntryLineInput: {
    type: "object",
    description: "Line item payload embedded in CreateJournalEntryInput.",
    properties: {
      accountId: { type: "string" },
      debit: { $ref: "#/components/schemas/BillingMoney" },
      credit: { $ref: "#/components/schemas/BillingMoney" },
      description: { type: ["string", "null"] }
    },
    required: ["accountId", "debit", "credit"],
    additionalProperties: false
  },

  CreateJournalEntryInput: {
    type: "object",
    description: "Payload for creating a new double-entry journal entry.",
    properties: {
      entryDate: { type: "string" },
      reference: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      sourceType: {
        type: "string",
        enum: ["invoice", "payment", "manual"]
      },
      sourceId: { type: ["string", "null"] },
      lines: {
        type: "array",
        items: { $ref: "#/components/schemas/CreateJournalEntryLineInput" }
      }
    },
    required: ["entryDate", "lines"],
    additionalProperties: false
  },

  // ── RecurringBillingSchedule ──────────────────────────────────────────────

  RecurringBillingSchedule: {
    type: "object",
    description: "Recurring billing schedule that generates invoices on a cadence.",
    properties: {
      id: { type: "string" },
      organizationId: { type: "string" },
      companyId: { type: "string" },
      description: { type: ["string", "null"] },
      cadence: {
        type: "string",
        enum: ["weekly", "monthly", "quarterly", "annual"]
      },
      amount: { $ref: "#/components/schemas/BillingMoney" },
      currency: { type: "string" },
      nextRunAt: { type: "string", format: "date-time" },
      active: { type: "boolean" },
      lastInvoiceId: { type: ["string", "null"] },
      lastRunAt: { type: ["string", "null"], format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    },
    required: [
      "id",
      "organizationId",
      "companyId",
      "cadence",
      "amount",
      "currency",
      "nextRunAt",
      "active",
      "createdAt",
      "updatedAt"
    ],
    additionalProperties: false
  },

  CreateRecurringBillingScheduleInput: {
    type: "object",
    description: "Payload for creating a new recurring billing schedule.",
    properties: {
      companyId: { type: "string" },
      description: { type: ["string", "null"] },
      cadence: {
        type: "string",
        enum: ["weekly", "monthly", "quarterly", "annual"]
      },
      amount: { $ref: "#/components/schemas/BillingMoney" },
      currency: { type: "string" },
      nextRunAt: { type: "string", format: "date-time" },
      active: { type: "boolean" }
    },
    required: ["companyId", "cadence", "amount", "nextRunAt"],
    additionalProperties: false
  },

  UpdateRecurringBillingScheduleInput: {
    type: "object",
    description: "Partial update payload for an existing recurring billing schedule.",
    properties: {
      description: { type: ["string", "null"] },
      cadence: {
        type: "string",
        enum: ["weekly", "monthly", "quarterly", "annual"]
      },
      amount: {
        oneOf: [{ $ref: "#/components/schemas/BillingMoney" }, { type: "null" }]
      },
      currency: { type: "string" },
      nextRunAt: { type: "string", format: "date-time" },
      active: { type: "boolean" }
    },
    required: [],
    additionalProperties: false
  }
};
