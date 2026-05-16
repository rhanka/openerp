import type { Hono } from "hono";

import {
  listAuditEvents,
  type ListAuditEventsFilters
} from "../../foundation/repositories";

import type { AppBindings } from "../app";

// GET /audit-events — tenant-scoped, append-only AuditEvent listing. Used by
// the admin/audit page and by compliance exports. Read-only; no mutation
// surface here (audit rows are written by domain services that produce them).

export function mountAuditEventsRoutes(app: Hono<AppBindings>): void {
  app.get("/audit-events", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const filters = parseFilters(c.req.query());
    if (!filters.ok) {
      return c.json({ code: "INVALID_INPUT", errors: filters.errors }, 400);
    }
    const rows = await listAuditEvents(db, tenant, filters.value);
    return c.json({ data: rows, count: rows.length });
  });
}

interface ParsedFilters {
  ok: true;
  value: ListAuditEventsFilters;
}
interface ParsedFiltersError {
  ok: false;
  errors: Record<string, string>;
}

function parseFilters(
  q: Record<string, string | undefined>
): ParsedFilters | ParsedFiltersError {
  const errors: Record<string, string> = {};
  const value: ListAuditEventsFilters = {};

  if (q.limit !== undefined) {
    const limit = Number(q.limit);
    if (!Number.isFinite(limit) || limit < 1) {
      errors.limit = "INVALID_LIMIT";
    } else {
      value.limit = limit;
    }
  }
  if (q.action) value.action = q.action;
  if (q.resourceType) value.resourceType = q.resourceType;
  if (q.actorUserId) value.actorUserId = q.actorUserId;
  if (q.fromCreatedAt) {
    if (!isIsoDate(q.fromCreatedAt)) errors.fromCreatedAt = "INVALID_DATE";
    else value.fromCreatedAt = q.fromCreatedAt;
  }
  if (q.toCreatedAt) {
    if (!isIsoDate(q.toCreatedAt)) errors.toCreatedAt = "INVALID_DATE";
    else value.toCreatedAt = q.toCreatedAt;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

function isIsoDate(value: string): boolean {
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && value.length >= 10;
}
