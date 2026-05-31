import type { Hono } from "hono";

import type { AppBindings } from "../app";
import type { ScheduledDeliveryCadence, UpdateScheduledDeliveryInput } from "@sentropic/openerp-domain/reporting";
import {
  ScheduledDeliveryNotFoundError,
  ScheduledDeliveryTargetError,
  ScheduledDeliveryForbiddenError,
  createScheduledDelivery,
  updateScheduledDelivery,
  deleteScheduledDelivery,
  getScheduledDeliveryById,
  listScheduledDeliveries,
  runDueDeliveries,
  runDeliveryNow,
  getDeliveryRunById,
  listDeliveryRunsForDelivery
} from "../../reporting/scheduled-delivery-service";

const ALLOWED_CADENCES: ScheduledDeliveryCadence[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual"
];

function parseCadence(value: unknown): ScheduledDeliveryCadence | null {
  if (typeof value !== "string") return null;
  return ALLOWED_CADENCES.includes(value as ScheduledDeliveryCadence)
    ? (value as ScheduledDeliveryCadence)
    : null;
}

type RawBody = Record<string, unknown>;

export function mountReportingScheduledDeliveryRoutes(app: Hono<AppBindings>): void {
  // GET /reporting/scheduled-deliveries
  app.get("/reporting/scheduled-deliveries", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");

    const ownerUserIdParam = c.req.query("ownerUserId");
    const sharedParam = c.req.query("shared");
    const activeParam = c.req.query("active");

    const options: Parameters<typeof listScheduledDeliveries>[2] = {};
    if (ownerUserIdParam !== undefined) options.ownerUserId = ownerUserIdParam || null;
    if (sharedParam !== undefined) options.isShared = sharedParam === "true";
    if (activeParam !== undefined) options.active = activeParam === "true";

    const items = await listScheduledDeliveries(db, tenant, options);
    return c.json({ items });
  });

  // POST /reporting/scheduled-deliveries/run — MUST be before /:id routes
  app.post("/reporting/scheduled-deliveries/run", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");

    let asOfInstant: Date | undefined;
    try {
      const body = await c.req.json<{ asOfDate?: string }>();
      if (body?.asOfDate) asOfInstant = new Date(body.asOfDate);
    } catch {
      // body optional
    }

    const result = await runDueDeliveries(db, tenant, asOfInstant);
    return c.json(result);
  });

  // POST /reporting/scheduled-deliveries
  app.post("/reporting/scheduled-deliveries", async (c) => {
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
    if (!body.targetId || typeof body.targetId !== "string") {
      return c.json({ code: "INVALID_INPUT", errors: { targetId: "REQUIRED" } }, 400);
    }
    const cadence = parseCadence(body.cadence);
    if (!cadence) {
      return c.json({ code: "INVALID_INPUT", errors: { cadence: "REQUIRED_VALID_CADENCE" } }, 400);
    }

    try {
      const created = await createScheduledDelivery(db, tenant, {
        ownerUserId: typeof body.ownerUserId === "string" ? body.ownerUserId : (tenant.actorUserId),
        name: body.name,
        targetType: "report_definition",
        targetId: body.targetId as string,
        cadence,
        timezone: typeof body.timezone === "string" ? body.timezone : "UTC",
        recipientUserIds: Array.isArray(body.recipientUserIds) ? body.recipientUserIds as string[] : [tenant.actorUserId],
        isShared: typeof body.isShared === "boolean" ? body.isShared : false,
        active: typeof body.active === "boolean" ? body.active : true
      });
      return c.json(created, 201);
    } catch (err) {
      if (err instanceof ScheduledDeliveryTargetError) {
        return c.json({ code: "INVALID_TARGET", message: err.message }, 400);
      }
      throw err;
    }
  });

  // GET /reporting/scheduled-deliveries/:id
  app.get("/reporting/scheduled-deliveries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getScheduledDeliveryById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  // PATCH /reporting/scheduled-deliveries/:id
  app.patch("/reporting/scheduled-deliveries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: RawBody;
    try {
      body = await c.req.json<RawBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }

    const patch: UpdateScheduledDeliveryInput = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (body.cadence !== undefined) {
      const cadence = parseCadence(body.cadence);
      if (!cadence) return c.json({ code: "INVALID_INPUT", errors: { cadence: "INVALID_CADENCE" } }, 400);
      patch.cadence = cadence;
    }
    if (typeof body.timezone === "string") patch.timezone = body.timezone;
    if (Array.isArray(body.recipientUserIds)) patch.recipientUserIds = body.recipientUserIds as string[];
    if (typeof body.isShared === "boolean") patch.isShared = body.isShared;
    if (typeof body.active === "boolean") patch.active = body.active;

    try {
      const updated = await updateScheduledDelivery(db, tenant, id, patch);
      return c.json(updated);
    } catch (err) {
      if (err instanceof ScheduledDeliveryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof ScheduledDeliveryForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // DELETE /reporting/scheduled-deliveries/:id
  app.delete("/reporting/scheduled-deliveries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteScheduledDelivery(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof ScheduledDeliveryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof ScheduledDeliveryForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // POST /reporting/scheduled-deliveries/:id/run
  app.post("/reporting/scheduled-deliveries/:id/run", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const deliveryRun = await runDeliveryNow(db, tenant, id);
      return c.json(deliveryRun);
    } catch (err) {
      if (err instanceof ScheduledDeliveryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // GET /reporting/scheduled-deliveries/:id/runs
  app.get("/reporting/scheduled-deliveries/:id/runs", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");

    const delivery = await getScheduledDeliveryById(db, tenant, id);
    if (!delivery) return c.json({ code: "NOT_FOUND" }, 404);

    const items = await listDeliveryRunsForDelivery(db, tenant, id);
    return c.json({ items });
  });

  // GET /reporting/delivery-runs/:id
  app.get("/reporting/delivery-runs/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getDeliveryRunById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });
}
