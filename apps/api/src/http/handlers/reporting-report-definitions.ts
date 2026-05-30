import type { Hono } from "hono";

import type { AppBindings } from "../app";
import { getCatalogMetadata } from "../../reporting/report-registry";
import {
  ForbiddenError,
  InvalidReportParamsError,
  ReportDefinitionNotFoundError,
  ReportRunFailedError,
  UnknownReportTypeError,
  createReportDefinition,
  deleteReportDefinition,
  getReportDefinitionById,
  getReportRunById,
  listReportDefinitions,
  listReportRuns,
  runReportDefinition,
  updateReportDefinition
} from "../../reporting/report-definition-service";

interface CreateBody {
  ownerUserId?: string | null;
  reportType: string;
  name: string;
  parameters?: Record<string, unknown>;
  isShared?: boolean;
}

interface UpdateBody {
  name?: string;
  parameters?: Record<string, unknown>;
  isShared?: boolean;
}

export function mountReportingReportDefinitionRoutes(app: Hono<AppBindings>): void {
  // GET /reporting/report-types — catalog metadata for the UI picker
  app.get("/reporting/report-types", async (c) => {
    const catalog = getCatalogMetadata();
    return c.json({ items: catalog });
  });

  // GET /reporting/report-definitions
  app.get("/reporting/report-definitions", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const reportTypeParam = c.req.query("reportType") || undefined;
    const ownerUserIdParam = c.req.query("ownerUserId");
    const sharedParam = c.req.query("shared");

    const options: {
      reportType?: string;
      ownerUserId?: string | null;
      isShared?: boolean;
    } = {};
    if (reportTypeParam !== undefined) options.reportType = reportTypeParam;
    if (ownerUserIdParam !== undefined) options.ownerUserId = ownerUserIdParam || null;
    if (sharedParam !== undefined) options.isShared = sharedParam === "true";

    const items = await listReportDefinitions(db, tenant, options);
    return c.json({ items });
  });

  // POST /reporting/report-definitions
  app.post("/reporting/report-definitions", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: CreateBody;
    try {
      body = await c.req.json<CreateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    const validation = validateCreateBody(body);
    if (!validation.ok) {
      return c.json({ code: "INVALID_INPUT", errors: validation.errors }, 400);
    }
    try {
      const created = await createReportDefinition(db, tenant, body);
      return c.json(created, 201);
    } catch (err) {
      if (err instanceof UnknownReportTypeError) {
        return c.json({ code: "UNKNOWN_REPORT_TYPE", message: err.message }, 400);
      }
      if (err instanceof InvalidReportParamsError) {
        return c.json({ code: "INVALID_REPORT_PARAMS", message: err.message }, 400);
      }
      throw err;
    }
  });

  // GET /reporting/report-definitions/:id
  app.get("/reporting/report-definitions/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getReportDefinitionById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  // PATCH /reporting/report-definitions/:id
  app.patch("/reporting/report-definitions/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: UpdateBody;
    try {
      body = await c.req.json<UpdateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const updated = await updateReportDefinition(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof ReportDefinitionNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof ForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      if (err instanceof InvalidReportParamsError) {
        return c.json({ code: "INVALID_REPORT_PARAMS", message: err.message }, 400);
      }
      throw err;
    }
  });

  // DELETE /reporting/report-definitions/:id
  app.delete("/reporting/report-definitions/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteReportDefinition(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof ReportDefinitionNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof ForbiddenError) return c.json({ code: "FORBIDDEN" }, 403);
      throw err;
    }
  });

  // POST /reporting/report-definitions/:id/run
  app.post("/reporting/report-definitions/:id/run", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const run = await runReportDefinition(db, tenant, id);
      return c.json(run);
    } catch (err) {
      if (err instanceof ReportDefinitionNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof UnknownReportTypeError) {
        return c.json({ code: "UNKNOWN_REPORT_TYPE", message: err.message }, 400);
      }
      if (err instanceof InvalidReportParamsError) {
        return c.json({ code: "INVALID_REPORT_PARAMS", message: err.message }, 422);
      }
      if (err instanceof ReportRunFailedError) {
        return c.json({ code: "REPORT_RUN_FAILED", runId: err.runId, message: err.message }, 422);
      }
      throw err;
    }
  });

  // GET /reporting/report-runs
  app.get("/reporting/report-runs", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const reportDefinitionIdParam = c.req.query("reportDefinitionId");
    const options: { reportDefinitionId?: string } = {};
    if (reportDefinitionIdParam) options.reportDefinitionId = reportDefinitionIdParam;
    const items = await listReportRuns(db, tenant, options);
    return c.json({ items });
  });

  // GET /reporting/report-runs/:id
  app.get("/reporting/report-runs/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getReportRunById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });
}

interface Validation {
  ok: boolean;
  errors: Record<string, string>;
}

function validateCreateBody(body: CreateBody): Validation {
  const errors: Record<string, string> = {};
  if (!body?.name || typeof body.name !== "string" || body.name.trim() === "") {
    errors.name = "REQUIRED";
  }
  if (!body?.reportType || typeof body.reportType !== "string" || body.reportType.trim() === "") {
    errors.reportType = "REQUIRED";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
