import type { Hono } from "hono";

import type { AppBindings } from "../app";
import {
  AssignmentNotFoundError,
  createAssignment,
  deleteAssignment,
  getAssignmentById,
  listAssignments,
  updateAssignment
} from "../../project/assignment-service";

interface CreateBody {
  projectId: string;
  userId: string;
  roleLabel?: string | null;
  allocationPercent?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  billableRateId?: string | null;
}

interface UpdateBody {
  roleLabel?: string | null;
  allocationPercent?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  billableRateId?: string | null;
}

interface Validation {
  ok: boolean;
  errors: Record<string, string>;
}

function validateCreate(body: CreateBody): Validation {
  const errors: Record<string, string> = {};
  if (!body?.projectId || typeof body.projectId !== "string" || body.projectId.trim() === "") {
    errors.projectId = "REQUIRED";
  }
  if (!body?.userId || typeof body.userId !== "string" || body.userId.trim() === "") {
    errors.userId = "REQUIRED";
  }
  if (
    body?.allocationPercent !== undefined &&
    body?.allocationPercent !== null &&
    (typeof body.allocationPercent !== "number" ||
      !Number.isInteger(body.allocationPercent) ||
      body.allocationPercent < 0 ||
      body.allocationPercent > 100)
  ) {
    errors.allocationPercent = "MUST_BE_INTEGER_0_TO_100";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (
    body?.allocationPercent !== undefined &&
    body?.allocationPercent !== null &&
    (typeof body.allocationPercent !== "number" ||
      !Number.isInteger(body.allocationPercent) ||
      body.allocationPercent < 0 ||
      body.allocationPercent > 100)
  ) {
    errors.allocationPercent = "MUST_BE_INTEGER_0_TO_100";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

export function mountAssignmentRoutes(app: Hono<AppBindings>): void {
  app.get("/project/assignments", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const projectId = c.req.query("projectId") ?? undefined;
    const userId = c.req.query("userId") ?? undefined;
    const items = await listAssignments(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(userId !== undefined ? { userId } : {})
    });
    return c.json({ items });
  });

  app.post("/project/assignments", async (c) => {
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
    const created = await createAssignment(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/project/assignments/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getAssignmentById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/project/assignments/:id", async (c) => {
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
      const updated = await updateAssignment(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof AssignmentNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/project/assignments/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteAssignment(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof AssignmentNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}
