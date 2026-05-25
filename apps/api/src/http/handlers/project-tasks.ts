import type { Hono } from "hono";

import type { ProjectTaskStatus } from "@sentropic/openerp-domain/project";

import type { AppBindings } from "../app";
import {
  ProjectTaskNotFoundError,
  createProjectTask,
  deleteProjectTask,
  getProjectTaskById,
  listProjectTasks,
  updateProjectTask
} from "../../project/project-task-service";

const TASK_STATUSES: readonly ProjectTaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled"
];

interface CreateBody {
  projectId: string;
  title: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  assigneeUserId?: string | null;
  dueDate?: string | null;
  parentTaskId?: string | null;
}

interface UpdateBody {
  title?: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  assigneeUserId?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  parentTaskId?: string | null;
}

export function mountProjectTaskRoutes(app: Hono<AppBindings>): void {
  app.get("/project/tasks", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const projectId = c.req.query("projectId") ?? undefined;
    const statusParam = c.req.query("status");
    const status = isTaskStatus(statusParam) ? statusParam : undefined;
    const items = await listProjectTasks(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(status !== undefined ? { status } : {})
    });
    return c.json({ items });
  });

  app.post("/project/tasks", async (c) => {
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
    const created = await createProjectTask(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/project/tasks/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getProjectTaskById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/project/tasks/:id", async (c) => {
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
      const updated = await updateProjectTask(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof ProjectTaskNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/project/tasks/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteProjectTask(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof ProjectTaskNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
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
  if (!body?.projectId || typeof body.projectId !== "string" || body.projectId.trim() === "") {
    errors.projectId = "REQUIRED";
  }
  if (!body?.title || typeof body.title !== "string" || body.title.trim() === "") {
    errors.title = "REQUIRED";
  }
  if (body?.status !== undefined && !TASK_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.title !== undefined && (typeof body.title !== "string" || body.title.trim() === "")) {
    errors.title = "INVALID";
  }
  if (body?.status !== undefined && !TASK_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function isTaskStatus(value: string | undefined): value is ProjectTaskStatus {
  return TASK_STATUSES.includes(value as ProjectTaskStatus);
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}
