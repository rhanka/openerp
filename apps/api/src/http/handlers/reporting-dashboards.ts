import type { Hono } from "hono";

import type { AppBindings } from "../app";
import {
  DashboardForbiddenError,
  DashboardNotFoundError,
  DashboardWidgetNotFoundError,
  DashboardWidgetReportDefinitionError,
  addWidget,
  createDashboard,
  deleteDashboard,
  getDashboardById,
  listDashboards,
  listWidgets,
  removeWidget,
  renderDashboard,
  updateDashboard,
  updateWidget
} from "../../reporting/dashboard-service";

interface CreateDashboardBody {
  ownerUserId?: string | null;
  name: string;
  description?: string | null;
  isShared?: boolean;
}

interface UpdateDashboardBody {
  name?: string;
  description?: string | null;
  isShared?: boolean;
}

interface CreateWidgetBody {
  reportDefinitionId: string;
  title?: string | null;
  position?: number;
}

interface UpdateWidgetBody {
  title?: string | null;
  position?: number;
}

export function mountReportingDashboardRoutes(app: Hono<AppBindings>): void {
  // GET /reporting/dashboards
  app.get("/reporting/dashboards", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const ownerUserIdParam = c.req.query("ownerUserId");
    const sharedParam = c.req.query("shared");

    const options: {
      ownerUserId?: string | null;
      isShared?: boolean;
    } = {};
    if (ownerUserIdParam !== undefined) options.ownerUserId = ownerUserIdParam || null;
    if (sharedParam !== undefined) options.isShared = sharedParam === "true";

    const items = await listDashboards(db, tenant, options);
    return c.json({ items });
  });

  // POST /reporting/dashboards
  app.post("/reporting/dashboards", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: CreateDashboardBody;
    try {
      body = await c.req.json<CreateDashboardBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.name || typeof body.name !== "string" || body.name.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { name: "REQUIRED" } }, 400);
    }
    const created = await createDashboard(db, tenant, body);
    return c.json(created, 201);
  });

  // GET /reporting/dashboards/:id
  app.get("/reporting/dashboards/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getDashboardById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  // PATCH /reporting/dashboards/:id
  app.patch("/reporting/dashboards/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: UpdateDashboardBody;
    try {
      body = await c.req.json<UpdateDashboardBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const updated = await updateDashboard(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof DashboardNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof DashboardForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // DELETE /reporting/dashboards/:id
  app.delete("/reporting/dashboards/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteDashboard(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof DashboardNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof DashboardForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // GET /reporting/dashboards/:id/render
  app.get("/reporting/dashboards/:id/render", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const result = await renderDashboard(db, tenant, id);
      return c.json(result);
    } catch (err) {
      if (err instanceof DashboardNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // GET /reporting/dashboards/:id/widgets
  app.get("/reporting/dashboards/:id/widgets", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const items = await listWidgets(db, tenant, id);
      return c.json({ items });
    } catch (err) {
      if (err instanceof DashboardNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // POST /reporting/dashboards/:id/widgets
  app.post("/reporting/dashboards/:id/widgets", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const dashboardId = c.req.param("id");
    let body: CreateWidgetBody;
    try {
      body = await c.req.json<CreateWidgetBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.reportDefinitionId) {
      return c.json({ code: "INVALID_INPUT", errors: { reportDefinitionId: "REQUIRED" } }, 400);
    }
    try {
      const created = await addWidget(db, tenant, dashboardId, body);
      return c.json(created, 201);
    } catch (err) {
      if (err instanceof DashboardNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof DashboardForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      if (err instanceof DashboardWidgetReportDefinitionError) {
        return c.json({ code: "REPORT_DEFINITION_NOT_FOUND", message: err.message }, 400);
      }
      throw err;
    }
  });

  // PATCH /reporting/dashboards/:id/widgets/:widgetId
  app.patch("/reporting/dashboards/:id/widgets/:widgetId", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const dashboardId = c.req.param("id");
    const widgetId = c.req.param("widgetId");
    let body: UpdateWidgetBody;
    try {
      body = await c.req.json<UpdateWidgetBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const updated = await updateWidget(db, tenant, dashboardId, widgetId, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof DashboardNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof DashboardWidgetNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof DashboardForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // DELETE /reporting/dashboards/:id/widgets/:widgetId
  app.delete("/reporting/dashboards/:id/widgets/:widgetId", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const dashboardId = c.req.param("id");
    const widgetId = c.req.param("widgetId");
    try {
      await removeWidget(db, tenant, dashboardId, widgetId);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof DashboardNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof DashboardWidgetNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof DashboardForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });
}
