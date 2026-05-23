import type { Hono } from "hono";

import type {
  MoneySnapshot,
  OpportunityStatus
} from "@sentropic/openerp-domain/crm";

import type { AppBindings } from "../app";
import {
  LossReasonRequiredError,
  OpportunityNotFoundError,
  createOpportunity,
  getOpportunityById,
  listOpportunities,
  updateOpportunity
} from "../../crm/opportunity-service";

const OPPORTUNITY_STATUSES: readonly OpportunityStatus[] = ["open", "won", "lost", "archived"];
const PROBABILITY_BANDS = ["low", "medium", "high"] as const;

interface CreateBody {
  companyId: string;
  primaryContactId?: string | null;
  name: string;
  stageId: string;
  ownerUserId?: string | null;
  teamId?: string | null;
  expectedValue?: MoneySnapshot | null;
  currency?: string | null;
  expectedCloseDate?: string | null;
  probabilityBand?: (typeof PROBABILITY_BANDS)[number] | null;
  serviceSummary?: string | null;
}

interface UpdateBody extends Partial<CreateBody> {
  status?: OpportunityStatus;
  lossReason?: string | null;
}

export function mountCrmOpportunityRoutes(app: Hono<AppBindings>): void {
  app.get("/crm/opportunities", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const statusParam = c.req.query("status");
    const status = isOpportunityStatus(statusParam) ? statusParam : undefined;
    const companyId = c.req.query("companyId") ?? undefined;
    const stageId = c.req.query("stageId") ?? undefined;
    const items = await listOpportunities(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(companyId !== undefined ? { companyId } : {}),
      ...(stageId !== undefined ? { stageId } : {})
    });
    return c.json({ items });
  });

  app.post("/crm/opportunities", async (c) => {
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
    const created = await createOpportunity(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/crm/opportunities/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getOpportunityById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/crm/opportunities/:id", async (c) => {
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
      const updated = await updateOpportunity(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof OpportunityNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof LossReasonRequiredError) {
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
  if (!body?.companyId) errors.companyId = "REQUIRED";
  if (!body?.stageId) errors.stageId = "REQUIRED";
  if (!body?.name || typeof body.name !== "string" || body.name.trim() === "") {
    errors.name = "REQUIRED";
  }
  if (body?.probabilityBand != null && !PROBABILITY_BANDS.includes(body.probabilityBand)) {
    errors.probabilityBand = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    errors.name = "INVALID";
  }
  if (body?.status !== undefined && !OPPORTUNITY_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  if (body?.probabilityBand !== undefined && body.probabilityBand !== null && !PROBABILITY_BANDS.includes(body.probabilityBand)) {
    errors.probabilityBand = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function isOpportunityStatus(value: string | undefined): value is OpportunityStatus {
  return value === "open" || value === "won" || value === "lost" || value === "archived";
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}
