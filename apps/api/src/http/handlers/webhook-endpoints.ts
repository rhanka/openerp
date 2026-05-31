import type { Hono } from "hono";

import type { AppBindings } from "../app";
import type { UpdateWebhookEndpointInput } from "@sentropic/openerp-domain/webhook";
import { WEBHOOK_EVENT_TYPES } from "@sentropic/openerp-domain/webhook";
import {
  WebhookEndpointNotFoundError,
  WebhookForbiddenError,
  InvalidWebhookUrlError,
  UnknownWebhookEventTypeError,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookEndpointById,
  listWebhookEndpoints,
  rotateWebhookEndpointSecretService,
  recordTestDelivery,
  listDeliveriesForEndpoint,
  getWebhookDeliveryById
} from "../../webhook/webhook-service";

type RawBody = Record<string, unknown>;

export function mountWebhookRoutes(app: Hono<AppBindings>): void {
  // GET /webhook/event-types — curated catalog, no auth context needed beyond tenant
  app.get("/webhook/event-types", (c) => {
    return c.json({ items: WEBHOOK_EVENT_TYPES });
  });

  // GET /webhook/endpoints
  app.get("/webhook/endpoints", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");

    const ownerUserIdParam = c.req.query("ownerUserId");
    const sharedParam = c.req.query("shared");
    const activeParam = c.req.query("active");

    const options: Parameters<typeof listWebhookEndpoints>[2] = {};
    if (ownerUserIdParam !== undefined) options.ownerUserId = ownerUserIdParam || null;
    if (sharedParam !== undefined) options.isShared = sharedParam === "true";
    if (activeParam !== undefined) options.isActive = activeParam === "true";

    const items = await listWebhookEndpoints(db, tenant, options);
    return c.json({ items });
  });

  // POST /webhook/endpoints
  app.post("/webhook/endpoints", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: RawBody;
    try {
      body = await c.req.json<RawBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }

    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return c.json({ code: "INVALID_INPUT", errors: { name: "REQUIRED" } }, 400);
    }
    if (!body.targetUrl || typeof body.targetUrl !== "string") {
      return c.json({ code: "INVALID_INPUT", errors: { targetUrl: "REQUIRED" } }, 400);
    }
    if (!Array.isArray(body.eventTypes)) {
      return c.json({ code: "INVALID_INPUT", errors: { eventTypes: "REQUIRED_ARRAY" } }, 400);
    }

    try {
      const created = await createWebhookEndpoint(db, tenant, {
        ownerUserId: typeof body.ownerUserId === "string" ? body.ownerUserId : tenant.actorUserId,
        name: body.name,
        targetUrl: body.targetUrl,
        eventTypes: body.eventTypes as string[],
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
        isShared: typeof body.isShared === "boolean" ? body.isShared : false
      });
      // signingSecret is present ONCE here and only here.
      return c.json(created, 201);
    } catch (err) {
      if (err instanceof InvalidWebhookUrlError) {
        return c.json({ code: "INVALID_WEBHOOK_URL", message: err.message }, 400);
      }
      if (err instanceof UnknownWebhookEventTypeError) {
        return c.json({ code: "UNKNOWN_EVENT_TYPE", message: err.message }, 400);
      }
      throw err;
    }
  });

  // GET /webhook/endpoints/:id — NO secret
  app.get("/webhook/endpoints/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getWebhookEndpointById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  // PATCH /webhook/endpoints/:id — NO secret
  app.patch("/webhook/endpoints/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: RawBody;
    try {
      body = await c.req.json<RawBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }

    const patch: UpdateWebhookEndpointInput = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (typeof body.targetUrl === "string") patch.targetUrl = body.targetUrl;
    if (Array.isArray(body.eventTypes)) patch.eventTypes = body.eventTypes as string[];
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    if (typeof body.isShared === "boolean") patch.isShared = body.isShared;

    try {
      const updated = await updateWebhookEndpoint(db, tenant, id, patch);
      return c.json(updated);
    } catch (err) {
      if (err instanceof WebhookEndpointNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof WebhookForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      if (err instanceof InvalidWebhookUrlError) return c.json({ code: "INVALID_WEBHOOK_URL", message: err.message }, 400);
      if (err instanceof UnknownWebhookEventTypeError) return c.json({ code: "UNKNOWN_EVENT_TYPE", message: err.message }, 400);
      throw err;
    }
  });

  // DELETE /webhook/endpoints/:id
  app.delete("/webhook/endpoints/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteWebhookEndpoint(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof WebhookEndpointNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof WebhookForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // POST /webhook/endpoints/:id/rotate-secret — returns new secret ONCE
  app.post("/webhook/endpoints/:id/rotate-secret", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const newSecret = await rotateWebhookEndpointSecretService(db, tenant, id);
      return c.json({ signingSecret: newSecret });
    } catch (err) {
      if (err instanceof WebhookEndpointNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof WebhookForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // POST /webhook/endpoints/:id/test — records synthetic test delivery
  app.post("/webhook/endpoints/:id/test", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const delivery = await recordTestDelivery(db, tenant, id);
      return c.json(delivery);
    } catch (err) {
      if (err instanceof WebhookEndpointNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // GET /webhook/endpoints/:id/deliveries
  app.get("/webhook/endpoints/:id/deliveries", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const items = await listDeliveriesForEndpoint(db, tenant, id);
      return c.json({ items });
    } catch (err) {
      if (err instanceof WebhookEndpointNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // GET /webhook/deliveries/:id
  app.get("/webhook/deliveries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getWebhookDeliveryById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });
}
