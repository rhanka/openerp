import type { Hono } from "hono";

import type { AppBindings } from "../app";
import { listTimelineEntriesForResource } from "../../foundation/timeline-entries";

// GET /crm/timeline?resourceType=company&resourceId=...
// Read-only projection of the canon TimelineEntry table scoped to the CRM
// resource types. Other modules can mount equivalent surfaces against the
// same foundation repository.
const CRM_RESOURCE_TYPES = new Set(["company", "contact", "opportunity", "lead"]);

export function mountCrmTimelineRoutes(app: Hono<AppBindings>): void {
  app.get("/crm/timeline", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const resourceType = c.req.query("resourceType");
    const resourceId = c.req.query("resourceId");
    if (!resourceType || !resourceId) {
      return c.json({ code: "RESOURCE_REQUIRED" }, 400);
    }
    if (!CRM_RESOURCE_TYPES.has(resourceType)) {
      return c.json({ code: "RESOURCE_TYPE_INVALID" }, 400);
    }
    const limitRaw = c.req.query("limit");
    const limit = limitRaw !== undefined && /^[0-9]+$/.test(limitRaw) ? Number(limitRaw) : undefined;
    const items = await listTimelineEntriesForResource(db, tenant, {
      resourceType,
      resourceId,
      ...(limit !== undefined ? { limit } : {})
    });
    return c.json({ items });
  });
}
