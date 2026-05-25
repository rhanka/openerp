import type { Hono } from "hono";

import type { AppBindings } from "../app";
import {
  InvoiceProposalNotFoundError,
  InvoiceProposalTransitionError,
  approveInvoiceProposal,
  deleteInvoiceProposal,
  generateInvoiceProposal,
  getInvoiceProposalById,
  listInvoiceProposals,
  rejectInvoiceProposal,
  submitInvoiceProposal
} from "../../project/invoice-proposal-service";
import type { InvoiceProposalStatus } from "@sentropic/openerp-domain/project";

interface GenerateBody {
  projectId: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  currency?: string;
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

function parseStatusFilter(value: string | undefined): InvoiceProposalStatus | undefined {
  if (!value) return undefined;
  const allowed: InvoiceProposalStatus[] = ["draft", "submitted", "approved", "rejected"];
  return allowed.includes(value as InvoiceProposalStatus)
    ? (value as InvoiceProposalStatus)
    : undefined;
}

export function mountInvoiceProposalRoutes(app: Hono<AppBindings>): void {
  app.get("/project/invoice-proposals", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const projectId = c.req.query("projectId") ?? undefined;
    const status = parseStatusFilter(c.req.query("status"));
    const items = await listInvoiceProposals(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(status !== undefined ? { status } : {})
    });
    return c.json({ items });
  });

  app.post("/project/invoice-proposals/generate", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: GenerateBody;
    try {
      body = await c.req.json<GenerateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.projectId || typeof body.projectId !== "string" || body.projectId.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { projectId: "REQUIRED" } }, 400);
    }
    const result = await generateInvoiceProposal(db, tenant, {
      projectId: body.projectId,
      periodStart: body.periodStart ?? null,
      periodEnd: body.periodEnd ?? null,
      ...(body.currency !== undefined ? { currency: body.currency } : {})
    });
    return c.json(result, 201);
  });

  app.get("/project/invoice-proposals/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getInvoiceProposalById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.post("/project/invoice-proposals/:id/submit", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await submitInvoiceProposal(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof InvoiceProposalNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceProposalTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.post("/project/invoice-proposals/:id/approve", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await approveInvoiceProposal(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof InvoiceProposalNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceProposalTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.post("/project/invoice-proposals/:id/reject", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await rejectInvoiceProposal(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof InvoiceProposalNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceProposalTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.delete("/project/invoice-proposals/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteInvoiceProposal(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof InvoiceProposalNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}
