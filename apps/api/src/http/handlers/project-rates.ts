import type { Hono } from "hono";

import type { AppBindings } from "../app";
import {
  RateNotFoundError,
  createRate,
  deleteRate,
  getRateById,
  listRates,
  updateRate
} from "../../project/rate-service";

interface RateMoney {
  amountMinor: number;
  currency: string;
  scale: number;
}

interface CreateBody {
  name: string;
  amount: RateMoney;
  effectiveFrom: string;
  effectiveTo?: string | null;
  active?: boolean;
}

interface UpdateBody {
  name?: string;
  amount?: RateMoney;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  active?: boolean;
}

interface Validation {
  ok: boolean;
  errors: Record<string, string>;
}

function validateMoney(amount: unknown): boolean {
  if (!amount || typeof amount !== "object") return false;
  const m = amount as Record<string, unknown>;
  if (typeof m.amountMinor !== "number" || !Number.isInteger(m.amountMinor) || m.amountMinor < 0) return false;
  if (typeof m.currency !== "string" || m.currency.length !== 3) return false;
  if (typeof m.scale !== "number" || !Number.isInteger(m.scale) || m.scale < 0) return false;
  return true;
}

function validateCreate(body: CreateBody): Validation {
  const errors: Record<string, string> = {};
  if (!body?.name || typeof body.name !== "string" || body.name.trim() === "") {
    errors.name = "REQUIRED";
  }
  if (!validateMoney(body?.amount)) {
    errors.amount = "INVALID_MONEY";
  }
  if (!body?.effectiveFrom || typeof body.effectiveFrom !== "string" || body.effectiveFrom.trim() === "") {
    errors.effectiveFrom = "REQUIRED";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
    errors.name = "INVALID";
  }
  if (body?.amount !== undefined && !validateMoney(body.amount)) {
    errors.amount = "INVALID_MONEY";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

export function mountRateRoutes(app: Hono<AppBindings>): void {
  app.get("/project/rates", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const activeOnlyParam = c.req.query("activeOnly");
    const activeOnly = activeOnlyParam === "true" ? true : false;
    const items = await listRates(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(activeOnly ? { activeOnly } : {})
    });
    return c.json({ items });
  });

  app.post("/project/rates", async (c) => {
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
    const created = await createRate(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/project/rates/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getRateById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/project/rates/:id", async (c) => {
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
      const updated = await updateRate(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof RateNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/project/rates/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteRate(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof RateNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}
