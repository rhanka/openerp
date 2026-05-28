import type { Hono } from "hono";

import type { TimeEntryStatus } from "@sentropic/openerp-domain/project";

import type { AppBindings } from "../app";
import {
  TimeEntryNotFoundError,
  approveTimeEntry,
  createTimeEntry,
  deleteTimeEntry,
  getTimeEntryById,
  listTimeEntries,
  rejectTimeEntry,
  submitTimeEntry,
  updateTimeEntry
} from "../../project/time-entry-service";

const ENTRY_STATUSES: readonly TimeEntryStatus[] = [
  "draft",
  "submitted",
  "approved",
  "rejected"
];

interface CreateBody {
  projectId: string;
  userId: string;
  entryDate: string;
  minutes: number;
  projectTaskId?: string | null;
  description?: string | null;
  billable?: boolean;
  status?: TimeEntryStatus;
}

interface UpdateBody {
  projectTaskId?: string | null;
  entryDate?: string;
  minutes?: number;
  description?: string | null;
  billable?: boolean;
  status?: TimeEntryStatus;
}

export function mountTimeEntryRoutes(app: Hono<AppBindings>): void {
  app.get("/project/time-entries", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const projectId = c.req.query("projectId") ?? undefined;
    const projectTaskId = c.req.query("projectTaskId") ?? undefined;
    const userId = c.req.query("userId") ?? undefined;
    const statusParam = c.req.query("status");
    const status = isEntryStatus(statusParam) ? statusParam : undefined;
    const billableParam = c.req.query("billable");
    const billable =
      billableParam === "true" ? true : billableParam === "false" ? false : undefined;

    const items = await listTimeEntries(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(projectTaskId !== undefined ? { projectTaskId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(billable !== undefined ? { billable } : {})
    });
    return c.json({ items });
  });

  app.post("/project/time-entries", async (c) => {
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
    const created = await createTimeEntry(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/project/time-entries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getTimeEntryById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/project/time-entries/:id", async (c) => {
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
      const updated = await updateTimeEntry(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof TimeEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // DS 3.5: submit, approve, reject via Foundation ApprovalRequest
  app.post("/project/time-entries/:id/submit", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: { approverUserIdentityId?: string | null; approverRoleId?: string | null } = {};
    try {
      body = await c.req.json();
    } catch {
      // empty body is fine for submit
    }
    try {
      const submitOpts: { approverUserIdentityId?: string | null; approverRoleId?: string | null } = {};
      if (body.approverUserIdentityId !== undefined) submitOpts.approverUserIdentityId = body.approverUserIdentityId;
      if (body.approverRoleId !== undefined) submitOpts.approverRoleId = body.approverRoleId;
      const result = await submitTimeEntry(db, tenant, id, submitOpts);
      return c.json(result);
    } catch (err) {
      if (err instanceof TimeEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.post("/project/time-entries/:id/approve", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: { decisionReason?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      // empty body is fine
    }
    try {
      const approveOpts: { decisionReason?: string } = {};
      if (body.decisionReason !== undefined) approveOpts.decisionReason = body.decisionReason;
      const result = await approveTimeEntry(db, tenant, id, approveOpts);
      return c.json(result);
    } catch (err) {
      if (err instanceof TimeEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.post("/project/time-entries/:id/reject", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: { decisionReason?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      // empty body is fine
    }
    try {
      const rejectOpts: { decisionReason?: string } = {};
      if (body.decisionReason !== undefined) rejectOpts.decisionReason = body.decisionReason;
      const result = await rejectTimeEntry(db, tenant, id, rejectOpts);
      return c.json(result);
    } catch (err) {
      if (err instanceof TimeEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/project/time-entries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteTimeEntry(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof TimeEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
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
  if (!body?.userId || typeof body.userId !== "string" || body.userId.trim() === "") {
    errors.userId = "REQUIRED";
  }
  if (!body?.entryDate || typeof body.entryDate !== "string" || body.entryDate.trim() === "") {
    errors.entryDate = "REQUIRED";
  }
  if (
    body?.minutes === undefined ||
    body?.minutes === null ||
    typeof body.minutes !== "number" ||
    !Number.isInteger(body.minutes) ||
    body.minutes <= 0
  ) {
    errors.minutes = "REQUIRED_POSITIVE_INTEGER";
  }
  if (body?.status !== undefined && !ENTRY_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.status !== undefined && !ENTRY_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  if (
    body?.minutes !== undefined &&
    (typeof body.minutes !== "number" || !Number.isInteger(body.minutes) || body.minutes <= 0)
  ) {
    errors.minutes = "MUST_BE_POSITIVE_INTEGER";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function isEntryStatus(value: string | undefined): value is TimeEntryStatus {
  return ENTRY_STATUSES.includes(value as TimeEntryStatus);
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}
