import type { Hono } from "hono";

import type { AppBindings } from "../app";
import type { InvoiceStatus } from "@sentropic/openerp-domain/billing";
import {
  InvoiceNotFoundError,
  InvoiceTransitionError,
  InvoiceProposalNotApprovedError,
  createInvoice,
  createInvoiceFromProposal,
  deleteInvoice,
  getInvoiceById,
  issueInvoice,
  listInvoices,
  markPaid,
  voidInvoice
} from "../../billing/invoice-service";

interface CreateInvoiceBody {
  companyId: string;
  projectId?: string | null;
  currency?: string;
  lines: Array<{
    description?: string | null;
    quantity: number;
    unitPrice: { amountMinor: number; currency: string; scale: number };
    amount: { amountMinor: number; currency: string; scale: number };
  }>;
}

interface FromProposalBody {
  invoiceProposalId: string;
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

function parseStatusFilter(value: string | undefined): InvoiceStatus | undefined {
  if (!value) return undefined;
  const allowed: InvoiceStatus[] = ["draft", "issued", "paid", "partially_paid", "void", "written_off"];
  return allowed.includes(value as InvoiceStatus) ? (value as InvoiceStatus) : undefined;
}

export function mountBillingInvoiceRoutes(app: Hono<AppBindings>): void {
  app.get("/billing/invoices", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const companyId = c.req.query("companyId") ?? undefined;
    const projectId = c.req.query("projectId") ?? undefined;
    const status = parseStatusFilter(c.req.query("status"));
    const items = await listInvoices(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(companyId !== undefined ? { companyId } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(status !== undefined ? { status } : {})
    });
    return c.json({ items });
  });

  app.post("/billing/invoices", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: CreateInvoiceBody;
    try {
      body = await c.req.json<CreateInvoiceBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.companyId || typeof body.companyId !== "string" || body.companyId.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { companyId: "REQUIRED" } }, 400);
    }
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return c.json({ code: "INVALID_INPUT", errors: { lines: "REQUIRED" } }, 400);
    }
    try {
      const result = await createInvoice(db, tenant, {
        companyId: body.companyId,
        projectId: body.projectId ?? null,
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        lines: body.lines.map((l) => ({
          description: l.description ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount
        }))
      });
      return c.json(result, 201);
    } catch (err) {
      throw err;
    }
  });

  app.post("/billing/invoices/from-proposal", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: FromProposalBody;
    try {
      body = await c.req.json<FromProposalBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.invoiceProposalId || typeof body.invoiceProposalId !== "string" || body.invoiceProposalId.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { invoiceProposalId: "REQUIRED" } }, 400);
    }
    try {
      const result = await createInvoiceFromProposal(db, tenant, body.invoiceProposalId);
      return c.json(result, 201);
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceProposalNotApprovedError) {
        return c.json({ code: "PROPOSAL_NOT_APPROVED", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.get("/billing/invoices/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getInvoiceById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.post("/billing/invoices/:id/issue", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await issueInvoice(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.post("/billing/invoices/:id/pay", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await markPaid(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.post("/billing/invoices/:id/void", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const updated = await voidInvoice(db, tenant, id);
      return c.json(updated);
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.delete("/billing/invoices/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteInvoice(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });
}
