// Entity JSON Schemas for OpenAPI 3.1 components.schemas.
//
// Populated incrementally by OPENAPI-4-B sub-slices:
//   OA-2: CRM (Company, Contact, Lead, Opportunity)
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
  // Populated by OA-2..OA-5.
};
