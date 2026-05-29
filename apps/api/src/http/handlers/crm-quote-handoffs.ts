import type { Hono } from "hono";

import type { QuoteHandoffStatus } from "@sentropic/openerp-domain/crm";

import type { AppBindings } from "../app";
import {
  QuoteHandoffNotFoundError,
  QuoteHandoffTransitionError,
  getQuoteHandoffById,
  listQuoteHandoffs,
  acceptQuoteHandoff,
  rejectQuoteHandoff
} from "../../crm/quote-handoff-service";

const HANDOFF_STATUSES: readonly QuoteHandoffStatus[] = ["pending", "accepted", "rejected", "cancelled"];

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

function isHandoffStatus(value: string | undefined): value is QuoteHandoffStatus {
  return HANDOFF_STATUSES.includes(value as QuoteHandoffStatus);
}

export function mountCrmQuoteHandoffRoutes(app: Hono<AppBindings>): void {
  app.get("/crm/quote-handoffs", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const opportunityId = c.req.query("opportunityId") ?? undefined;
    const statusParam = c.req.query("status");
    const status = isHandoffStatus(statusParam) ? statusParam : undefined;
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const items = await listQuoteHandoffs(db, tenant, {
      ...(opportunityId !== undefined ? { opportunityId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {})
    });
    return c.json({ items });
  });

  app.get("/crm/quote-handoffs/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getQuoteHandoffById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.post("/crm/quote-handoffs/:id/accept", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await acceptQuoteHandoff(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof QuoteHandoffNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof QuoteHandoffTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.post("/crm/quote-handoffs/:id/reject", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await rejectQuoteHandoff(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof QuoteHandoffNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof QuoteHandoffTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });
}
