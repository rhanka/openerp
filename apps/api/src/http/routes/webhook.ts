import type { RouteContract } from "./foundation";

// Webhook route registry (DS 5.5 — WebhookEndpoint + WebhookDelivery, record-only).
export function buildWebhookRoutes(): RouteContract[] {
  return [
    // Event type catalog (must be before /:id routes)
    {
      method: "GET",
      path: "/webhook/event-types",
      audited: false,
      responseSchema: "WebhookEventTypeEntry"
    },
    // WebhookEndpoint CRUD
    {
      method: "GET",
      path: "/webhook/endpoints",
      audited: false,
      responseSchema: "WebhookEndpoint"
    },
    {
      method: "POST",
      path: "/webhook/endpoints",
      audited: true,
      requestSchema: "CreateWebhookEndpointInput",
      responseSchema: "CreateWebhookEndpointResult"
    },
    {
      method: "GET",
      path: "/webhook/endpoints/:id",
      audited: false,
      responseSchema: "WebhookEndpoint"
    },
    {
      method: "PATCH",
      path: "/webhook/endpoints/:id",
      audited: true,
      requestSchema: "UpdateWebhookEndpointInput",
      responseSchema: "WebhookEndpoint"
    },
    {
      method: "DELETE",
      path: "/webhook/endpoints/:id",
      audited: true,
      responseSchema: "WebhookEndpoint"
    },
    // Secret rotation
    {
      method: "POST",
      path: "/webhook/endpoints/:id/rotate-secret",
      audited: true,
      responseSchema: "CreateWebhookEndpointResult"
    },
    // Test delivery
    {
      method: "POST",
      path: "/webhook/endpoints/:id/test",
      audited: true,
      responseSchema: "WebhookDelivery"
    },
    // Delivery history per endpoint
    {
      method: "GET",
      path: "/webhook/endpoints/:id/deliveries",
      audited: false,
      responseSchema: "WebhookDelivery"
    },
    // Single delivery lookup
    {
      method: "GET",
      path: "/webhook/deliveries/:id",
      audited: false,
      responseSchema: "WebhookDelivery"
    }
  ];
}
