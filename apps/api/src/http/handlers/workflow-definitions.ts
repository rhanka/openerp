import type { Hono } from "hono";

import type { AppBindings } from "../app";
import type { UpdateWorkflowDefinitionInput } from "@sentropic/openerp-domain/workflow";
import {
  WorkflowNotFoundError,
  WorkflowForbiddenError,
  UnknownWorkflowTriggerError,
  UnknownWorkflowActionError,
  InvalidWorkflowConfigError,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  deleteWorkflowDefinition,
  getWorkflowDefinitionById,
  listWorkflowDefinitions,
  runWorkflowNow,
  listWorkflowRuns
} from "../../workflow/workflow-service";
import { getCatalogMetadata } from "../../workflow/workflow-catalog";

type RawBody = Record<string, unknown>;

export function mountWorkflowRoutes(app: Hono<AppBindings>): void {
  // GET /workflows/catalog — MUST be before /:id routes
  app.get("/workflows/catalog", (c) => {
    return c.json(getCatalogMetadata());
  });

  // GET /workflows
  app.get("/workflows", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");

    const triggerTypeParam = c.req.query("triggerType");
    const ownerUserIdParam = c.req.query("ownerUserId");
    const sharedParam = c.req.query("shared");
    const activeParam = c.req.query("active");

    const options: Parameters<typeof listWorkflowDefinitions>[2] = {};
    if (triggerTypeParam !== undefined) options.triggerType = triggerTypeParam;
    if (ownerUserIdParam !== undefined) options.ownerUserId = ownerUserIdParam || null;
    if (sharedParam !== undefined) options.isShared = sharedParam === "true";
    if (activeParam !== undefined) options.isActive = activeParam === "true";

    const items = await listWorkflowDefinitions(db, tenant, options);
    return c.json({ items });
  });

  // POST /workflows
  app.post("/workflows", async (c) => {
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
    if (!body.triggerType || typeof body.triggerType !== "string") {
      return c.json({ code: "INVALID_INPUT", errors: { triggerType: "REQUIRED" } }, 400);
    }
    if (!body.actionType || typeof body.actionType !== "string") {
      return c.json({ code: "INVALID_INPUT", errors: { actionType: "REQUIRED" } }, 400);
    }
    if (!body.actionConfig || typeof body.actionConfig !== "object" || Array.isArray(body.actionConfig)) {
      return c.json({ code: "INVALID_INPUT", errors: { actionConfig: "REQUIRED_OBJECT" } }, 400);
    }

    try {
      const created = await createWorkflowDefinition(db, tenant, {
        ownerUserId: typeof body.ownerUserId === "string" ? body.ownerUserId : tenant.actorUserId,
        name: body.name,
        description: typeof body.description === "string" ? body.description : null,
        triggerType: body.triggerType,
        triggerConfig: (body.triggerConfig && typeof body.triggerConfig === "object" && !Array.isArray(body.triggerConfig))
          ? body.triggerConfig as Record<string, unknown>
          : {},
        actionType: body.actionType,
        actionConfig: body.actionConfig as Record<string, unknown>,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
        isShared: typeof body.isShared === "boolean" ? body.isShared : false
      });
      return c.json(created, 201);
    } catch (err) {
      if (err instanceof UnknownWorkflowTriggerError) {
        return c.json({ code: "UNKNOWN_TRIGGER", message: err.message }, 400);
      }
      if (err instanceof UnknownWorkflowActionError) {
        return c.json({ code: "UNKNOWN_ACTION", message: err.message }, 400);
      }
      if (err instanceof InvalidWorkflowConfigError) {
        return c.json({ code: "INVALID_CONFIG", message: err.message }, 400);
      }
      throw err;
    }
  });

  // GET /workflows/:id
  app.get("/workflows/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getWorkflowDefinitionById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  // PATCH /workflows/:id
  app.patch("/workflows/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: RawBody;
    try {
      body = await c.req.json<RawBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }

    const patch: UpdateWorkflowDefinitionInput = {};
    if (typeof body.name === "string") patch.name = body.name;
    if (body.description !== undefined) patch.description = typeof body.description === "string" ? body.description : null;
    if (body.triggerConfig && typeof body.triggerConfig === "object" && !Array.isArray(body.triggerConfig)) {
      patch.triggerConfig = body.triggerConfig as Record<string, unknown>;
    }
    if (body.actionConfig && typeof body.actionConfig === "object" && !Array.isArray(body.actionConfig)) {
      patch.actionConfig = body.actionConfig as Record<string, unknown>;
    }
    if (typeof body.isActive === "boolean") patch.isActive = body.isActive;
    if (typeof body.isShared === "boolean") patch.isShared = body.isShared;

    try {
      const updated = await updateWorkflowDefinition(db, tenant, id, patch);
      return c.json(updated);
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof WorkflowForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      if (err instanceof InvalidWorkflowConfigError) return c.json({ code: "INVALID_CONFIG", message: err.message }, 400);
      throw err;
    }
  });

  // DELETE /workflows/:id
  app.delete("/workflows/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteWorkflowDefinition(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof WorkflowForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // POST /workflows/:id/run — manual run
  app.post("/workflows/:id/run", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const run = await runWorkflowNow(db, tenant, id);
      return c.json(run);
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // GET /workflows/:id/runs — run history
  app.get("/workflows/:id/runs", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const items = await listWorkflowRuns(db, tenant, id);
      return c.json({ items });
    } catch (err) {
      if (err instanceof WorkflowNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}
