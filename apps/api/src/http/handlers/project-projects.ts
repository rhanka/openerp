import type { Hono } from "hono";

import type { ProjectStatus } from "@sentropic/openerp-domain/project";

import type { AppBindings } from "../app";
import {
  ProjectNotFoundError,
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  updateProject
} from "../../project/project-service";

const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled"
];

interface CreateBody {
  name: string;
  description?: string | null;
  code?: string | null;
  companyId?: string | null;
  ownerUserId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface UpdateBody extends Partial<CreateBody> {
  status?: ProjectStatus;
}

export function mountProjectRoutes(app: Hono<AppBindings>): void {
  app.get("/project/projects", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const statusParam = c.req.query("status");
    const status = isProjectStatus(statusParam) ? statusParam : undefined;
    const items = await listProjects(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(status !== undefined ? { status } : {})
    });
    return c.json({ items });
  });

  app.post("/project/projects", async (c) => {
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
    const created = await createProject(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/project/projects/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getProjectById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/project/projects/:id", async (c) => {
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
      const updated = await updateProject(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof ProjectNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/project/projects/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteProject(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof ProjectNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
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
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    errors.name = "INVALID";
  }
  if (body?.status !== undefined && !PROJECT_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function isProjectStatus(value: string | undefined): value is ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus);
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}
