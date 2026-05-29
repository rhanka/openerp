import type { Hono } from "hono";

import type { AppBindings } from "../app";
import type { RecurringBillingCadence, UpdateRecurringBillingScheduleInput } from "@sentropic/openerp-domain/billing";
import {
  RecurringScheduleNotFoundError,
  createRecurringBillingSchedule,
  deleteRecurringBillingSchedule,
  getRecurringBillingSchedule,
  listRecurringBillingSchedules,
  runDueRecurringBilling,
  updateRecurringBillingSchedule
} from "../../billing/recurring-schedule-service";

const ALLOWED_CADENCES: RecurringBillingCadence[] = ["weekly", "monthly", "quarterly", "annual"];

function parseCadence(value: unknown): RecurringBillingCadence | null {
  if (typeof value !== "string") return null;
  return ALLOWED_CADENCES.includes(value as RecurringBillingCadence)
    ? (value as RecurringBillingCadence)
    : null;
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

type RawBody = Record<string, unknown>;

export function mountBillingRecurringScheduleRoutes(app: Hono<AppBindings>): void {
  // GET /billing/recurring-schedules
  app.get("/billing/recurring-schedules", async (ctx) => {
    const db = ctx.get("db");
    const tenant = ctx.get("tenant");
    const limit = parseIntOrUndefined(ctx.req.query("limit"));
    const offset = parseIntOrUndefined(ctx.req.query("offset"));
    const companyId = ctx.req.query("companyId") ?? undefined;
    const activeParam = ctx.req.query("active");
    const active = activeParam === "true" ? true : activeParam === "false" ? false : undefined;

    const opts: Parameters<typeof listRecurringBillingSchedules>[2] = {};
    if (limit !== undefined) opts.limit = limit;
    if (offset !== undefined) opts.offset = offset;
    if (companyId !== undefined) opts.companyId = companyId;
    if (active !== undefined) opts.active = active;

    const items = await listRecurringBillingSchedules(db, tenant, opts);
    return ctx.json({ items });
  });

  // POST /billing/recurring-schedules
  app.post("/billing/recurring-schedules", async (ctx) => {
    const db = ctx.get("db");
    const tenant = ctx.get("tenant");
    let body: RawBody;
    try {
      body = await ctx.req.json<RawBody>();
    } catch {
      return ctx.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.companyId || typeof body.companyId !== "string" || !body.companyId.trim()) {
      return ctx.json({ code: "INVALID_INPUT", errors: { companyId: "REQUIRED" } }, 400);
    }
    const cadence = parseCadence(body.cadence);
    if (!cadence) {
      return ctx.json({ code: "INVALID_INPUT", errors: { cadence: "REQUIRED_VALID_CADENCE" } }, 400);
    }
    if (!body.amount || typeof body.amount !== "object") {
      return ctx.json({ code: "INVALID_INPUT", errors: { amount: "REQUIRED" } }, 400);
    }
    if (!body.nextRunAt || typeof body.nextRunAt !== "string") {
      return ctx.json({ code: "INVALID_INPUT", errors: { nextRunAt: "REQUIRED" } }, 400);
    }

    const amount = body.amount as { amountMinor: number; currency: string; scale: number };

    const input: Parameters<typeof createRecurringBillingSchedule>[2] = {
      companyId: body.companyId,
      cadence,
      amount,
      nextRunAt: body.nextRunAt
    };
    if (typeof body.description === "string") input.description = body.description;
    if (typeof body.currency === "string") input.currency = body.currency;
    if (typeof body.active === "boolean") input.active = body.active;

    const result = await createRecurringBillingSchedule(db, tenant, input);
    return ctx.json(result, 201);
  });

  // GET /billing/recurring-schedules/:id
  app.get("/billing/recurring-schedules/:id", async (ctx) => {
    const db = ctx.get("db");
    const tenant = ctx.get("tenant");
    const found = await getRecurringBillingSchedule(db, tenant, ctx.req.param("id"));
    if (!found) return ctx.json({ code: "NOT_FOUND" }, 404);
    return ctx.json(found);
  });

  // PATCH /billing/recurring-schedules/:id
  app.patch("/billing/recurring-schedules/:id", async (ctx) => {
    const db = ctx.get("db");
    const tenant = ctx.get("tenant");
    const id = ctx.req.param("id");
    let body: RawBody;
    try {
      body = await ctx.req.json<RawBody>();
    } catch {
      return ctx.json({ code: "INVALID_JSON" }, 400);
    }

    const patch: UpdateRecurringBillingScheduleInput = {};
    if ("description" in body) {
      patch.description = typeof body.description === "string" ? body.description : null;
    }
    if ("cadence" in body) {
      const parsedCadence = parseCadence(body.cadence);
      if (!parsedCadence) {
        return ctx.json({ code: "INVALID_INPUT", errors: { cadence: "INVALID_CADENCE" } }, 400);
      }
      patch.cadence = parsedCadence;
    }
    if ("amount" in body && body.amount && typeof body.amount === "object") {
      patch.amount = body.amount as { amountMinor: number; currency: string; scale: number };
    }
    if ("currency" in body && typeof body.currency === "string") patch.currency = body.currency;
    if ("nextRunAt" in body && typeof body.nextRunAt === "string") patch.nextRunAt = body.nextRunAt;
    if ("active" in body && typeof body.active === "boolean") patch.active = body.active;

    try {
      const updated = await updateRecurringBillingSchedule(db, tenant, id, patch);
      return ctx.json(updated);
    } catch (err) {
      if (err instanceof RecurringScheduleNotFoundError) return ctx.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // DELETE /billing/recurring-schedules/:id
  app.delete("/billing/recurring-schedules/:id", async (ctx) => {
    const db = ctx.get("db");
    const tenant = ctx.get("tenant");
    const id = ctx.req.param("id");
    try {
      await deleteRecurringBillingSchedule(db, tenant, id);
      return ctx.body(null, 204);
    } catch (err) {
      if (err instanceof RecurringScheduleNotFoundError) return ctx.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // POST /billing/recurring-schedules/run
  app.post("/billing/recurring-schedules/run", async (ctx) => {
    const db = ctx.get("db");
    const tenant = ctx.get("tenant");

    let asOfDate: string;
    try {
      const body = await ctx.req.json<{ asOfDate?: string }>();
      asOfDate = (body as { asOfDate?: string }).asOfDate ?? new Date().toISOString().slice(0, 10);
    } catch {
      asOfDate = new Date().toISOString().slice(0, 10);
    }

    const result = await runDueRecurringBilling(db, tenant, asOfDate);
    return ctx.json(result);
  });
}
