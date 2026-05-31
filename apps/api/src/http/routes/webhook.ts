import type { RouteContract } from "./foundation";

// Webhook route registry (DS 5.5 — WebhookEndpoint + WebhookDelivery, record-only).
export function buildWebhookRoutes(): RouteContract[] {
  return [
    // Event type catalog (must be before /:id routes)
    { method: "GET", path: "/webhook/event-types", audited: false },
    // WebhookEndpoint CRUD
    { method: "GET", path: "/webhook/endpoints", audited: false },
    { method: "POST", path: "/webhook/endpoints", audited: true },
    { method: "GET", path: "/webhook/endpoints/:id", audited: false },
    { method: "PATCH", path: "/webhook/endpoints/:id", audited: true },
    { method: "DELETE", path: "/webhook/endpoints/:id", audited: true },
    // Secret rotation
    { method: "POST", path: "/webhook/endpoints/:id/rotate-secret", audited: true },
    // Test delivery
    { method: "POST", path: "/webhook/endpoints/:id/test", audited: true },
    // Delivery history per endpoint
    { method: "GET", path: "/webhook/endpoints/:id/deliveries", audited: false },
    // Single delivery lookup
    { method: "GET", path: "/webhook/deliveries/:id", audited: false }
  ];
}
