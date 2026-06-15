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
  }
};
