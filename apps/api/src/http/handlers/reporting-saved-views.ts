import type { Hono } from "hono";

import type { AppBindings } from "../app";
import {
  SavedViewNotFoundError,
  createSavedView,
  deleteSavedView,
  getSavedViewById,
  listSavedViews,
  updateSavedView
} from "../../reporting/saved-view-service";

interface CreateBody {
  ownerUserId?: string | null;
  resourceType: string;
  name: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  sortBy?: string | null;
  isShared?: boolean;
}

interface UpdateBody {
  name?: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  sortBy?: string | null;
  isShared?: boolean;
}

export function mountReportingSavedViewRoutes(app: Hono<AppBindings>): void {
  app.get("/reporting/saved-views", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const resourceType = c.req.query("resourceType") || undefined;
    const ownerUserIdParam = c.req.query("ownerUserId");
    const sharedParam = c.req.query("shared");

    const options: {
      resourceType?: string;
      ownerUserId?: string | null;
      isShared?: boolean;
    } = {};
    if (resourceType !== undefined) options.resourceType = resourceType;
    if (ownerUserIdParam !== undefined) options.ownerUserId = ownerUserIdParam || null;
    if (sharedParam !== undefined) options.isShared = sharedParam === "true";

    const items = await listSavedViews(db, tenant, options);
    return c.json({ items });
  });

  app.post("/reporting/saved-views", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: CreateBody;
    try {
      body = await c.req.json<CreateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    const validation = validateCreate(body);
    if (!validation.ok) {
      return c.json({ code: "INVALID_INPUT", errors: validation.errors }, 400);
    }
    const created = await createSavedView(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/reporting/saved-views/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getSavedViewById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/reporting/saved-views/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: UpdateBody;
    try {
      body = await c.req.json<UpdateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const updated = await updateSavedView(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof SavedViewNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/reporting/saved-views/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteSavedView(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof SavedViewNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}

interface Validation {
  ok: boolean;
  errors: Record<string, string>;
}

function validateCreate(body: CreateBody): Validation {
  const errors: Record<string, string> = {};
  if (!body?.name || typeof body.name !== "string" || body.name.trim() === "") {
    errors.name = "REQUIRED";
  }
  if (!body?.resourceType || typeof body.resourceType !== "string" || body.resourceType.trim() === "") {
    errors.resourceType = "REQUIRED";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
