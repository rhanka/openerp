import type { Hono } from "hono";

import type { LeadStatus } from "@sentropic/openerp-domain/crm";

import type { AppBindings } from "../app";
import {
  LeadNotConvertibleError,
  LeadNotFoundError,
  NoInitialPipelineStageError,
  convertLead,
  createLead,
  getLeadById,
  listLeads,
  updateLead
} from "../../crm/lead-service";

const NON_CONVERTED_STATUSES: readonly Exclude<LeadStatus, "converted">[] = [
  "new",
  "working",
  "disqualified"
];

interface CreateBody {
  displayName: string;
  source?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  ownerUserId?: string | null;
  teamId?: string | null;
}

interface UpdateBody extends Partial<CreateBody> {
  status?: Exclude<LeadStatus, "converted">;
}

export function mountCrmLeadRoutes(app: Hono<AppBindings>): void {
  app.get("/crm/leads", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const statusParam = c.req.query("status");
    const status = isLeadStatus(statusParam) ? statusParam : undefined;
    const items = await listLeads(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(status !== undefined ? { status } : {})
    });
    return c.json({ items });
  });

  app.post("/crm/leads", async (c) => {
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
    const created = await createLead(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/crm/leads/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getLeadById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/crm/leads/:id", async (c) => {
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
      const updated = await updateLead(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof LeadNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.post("/crm/leads/:id/convert", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const outcome = await convertLead(db, tenant, id);
      return c.json(outcome, 201);
    } catch (err) {
      if (err instanceof LeadNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof LeadNotConvertibleError) {
        return c.json({ code: err.code }, 409);
      }
      if (err instanceof NoInitialPipelineStageError) {
        return c.json({ code: err.code }, 422);
      }
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
  if (!body?.displayName || typeof body.displayName !== "string" || body.displayName.trim() === "") {
    errors.displayName = "REQUIRED";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.displayName !== undefined && (typeof body.displayName !== "string" || body.displayName.trim() === "")) {
    errors.displayName = "INVALID";
  }
  if (body?.status !== undefined && !NON_CONVERTED_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function isLeadStatus(value: string | undefined): value is LeadStatus {
  return value === "new" || value === "working" || value === "converted" || value === "disqualified";
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}
