import type { Hono } from "hono";

import type { AppBindings } from "../app";
import {
  PipelineStageNotFoundError,
  createPipelineStage,
  getPipelineStageById,
  listPipelineStages,
  updatePipelineStage
} from "../../crm/pipeline-stage-service";

interface CreateBody {
  name: string;
  orderIndex: number;
  isInitial?: boolean;
  isWon?: boolean;
  isLost?: boolean;
}

interface UpdateBody {
  name?: string;
  orderIndex?: number;
  isInitial?: boolean;
  isWon?: boolean;
  isLost?: boolean;
  active?: boolean;
}

export function mountCrmPipelineRoutes(app: Hono<AppBindings>): void {
  app.get("/crm/pipeline-stages", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const activeOnly = c.req.query("activeOnly") === "true";
    const items = await listPipelineStages(db, tenant, { activeOnly });
    return c.json({ items });
  });

  app.post("/crm/pipeline-stages", async (c) => {
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
    const created = await createPipelineStage(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/crm/pipeline-stages/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getPipelineStageById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/crm/pipeline-stages/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: UpdateBody;
    try {
      body = await c.req.json<UpdateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    const validation = validateUpdate(body);
    if (!validation.ok) {
      return c.json({ code: "INVALID_INPUT", errors: validation.errors }, 400);
    }
    try {
      const updated = await updatePipelineStage(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof PipelineStageNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
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
  if (typeof body?.orderIndex !== "number" || !Number.isInteger(body.orderIndex) || body.orderIndex < 0) {
    errors.orderIndex = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    errors.name = "INVALID";
  }
  if (body?.orderIndex !== undefined && (typeof body.orderIndex !== "number" || !Number.isInteger(body.orderIndex) || body.orderIndex < 0)) {
    errors.orderIndex = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
