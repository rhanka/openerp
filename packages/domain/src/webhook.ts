// Webhook entities — WebhookEndpoint + WebhookDelivery (shared-entities-v1 Article 4.5).
// A WebhookEndpoint registers an HTTPS target for a set of subscribed audit event
// types. When a subscribed event fires, a WebhookDelivery is recorded
// (status pending_egress) with an HMAC-SHA256 signature — RECORD-ONLY in v1.

// ---------------------------------------------------------------------------
// Public DTO — signing secret is intentionally absent.
// ---------------------------------------------------------------------------

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  ownerUserId: string | null;
  name: string;
  targetUrl: string;
  eventTypes: string[];
  isActive: boolean;
  isShared: boolean;
  consecutiveFailures: number;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned ONCE (POST create + POST rotate-secret). Never included in GET/list. */
export type CreateWebhookEndpointResult = WebhookEndpoint & { signingSecret: string };

export interface CreateWebhookEndpointInput {
  ownerUserId?: string | null;
  name: string;
  targetUrl: string;
  eventTypes: string[];
  isActive?: boolean;
  isShared?: boolean;
}

export interface UpdateWebhookEndpointInput {
  name?: string;
  targetUrl?: string;
  eventTypes?: string[];
  isActive?: boolean;
  isShared?: boolean;
}

// ---------------------------------------------------------------------------
// WebhookDelivery
// ---------------------------------------------------------------------------

export type WebhookDeliveryStatus = "pending_egress" | "succeeded" | "failed";

export interface WebhookDelivery {
  id: string;
  organizationId: string;
  webhookEndpointId: string;
  eventType: string;
  triggerAuditEventId: string | null;
  payload: Record<string, unknown>;
  signature: string;
  status: WebhookDeliveryStatus;
  httpStatus: number | null;
  attemptCount: number;
  nextRetryAt: string | null;
  errorDetail: string | null;
  signedAt: string;
  deliveredAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Domain events — ONLY endpoint mutations are audited. Deliveries are NOT
// audited (would create recursion and noise).
// ---------------------------------------------------------------------------

export const WEBHOOK_DOMAIN_EVENTS = [
  "webhook.webhook_endpoint.created",
  "webhook.webhook_endpoint.updated",
  "webhook.webhook_endpoint.deleted"
] as const;

// ---------------------------------------------------------------------------
// Curated list of subscribable audit event types.
// Mirrors the workflow trigger set (Article 4.5 curated catalog).
// ---------------------------------------------------------------------------

export interface WebhookEventTypeEntry {
  eventType: string;
  labelKey: string;
}

export const WEBHOOK_EVENT_TYPES: WebhookEventTypeEntry[] = [
  { eventType: "crm.opportunity.won", labelKey: "webhook.eventType.crm_opportunity_won.label" },
  { eventType: "crm.lead.converted", labelKey: "webhook.eventType.crm_lead_converted.label" },
  { eventType: "billing.invoice.issued", labelKey: "webhook.eventType.billing_invoice_issued.label" },
  { eventType: "project.task.completed", labelKey: "webhook.eventType.project_task_completed.label" }
];

export const WEBHOOK_EVENT_TYPE_SET: Set<string> = new Set(
  WEBHOOK_EVENT_TYPES.map((e) => e.eventType)
);
