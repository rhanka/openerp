import type { Hono } from "hono";

import type { AppBindings } from "../app";
import { listTimelineEntriesForResource } from "../../foundation/timeline-entries";

// GET /project/timeline?resourceType=project&resourceId=...
// Read-only projection of the canon TimelineEntry table scoped to project
// resource types. Mirrors the crm-timeline handler independently.
const PROJECT_RESOURCE_TYPES = new Set(["project"]);

export function mountProjectTimelineRoutes(app: Hono<AppBindings>): void {
  app.get("/project/timeline", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const resourceType = c.req.query("resourceType");
    const resourceId = c.req.query("resourceId");
    if (!resourceType || !resourceId) {
      return c.json({ code: "RESOURCE_REQUIRED" }, 400);
    }
    if (!PROJECT_RESOURCE_TYPES.has(resourceType)) {
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
