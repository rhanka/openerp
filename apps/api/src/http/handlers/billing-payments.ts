import type { Hono } from "hono";

import type { AppBindings } from "../app";
import type { PaymentMethod } from "@sentropic/openerp-domain/billing";
import {
  PaymentNotFoundError,
  InvoiceNotPayableError,
  recordPayment,
  deletePayment,
  getPaymentById,
  listPayments
} from "../../billing/payment-service";
import { InvoiceNotFoundError } from "../../billing/invoice-service";

const ALLOWED_METHODS: PaymentMethod[] = ["bank_transfer", "card", "cheque", "cash", "other"];

interface RecordPaymentBody {
  invoiceId: string;
  amount: { amountMinor: number; currency: string; scale: number };
  paymentDate: string;
  method: string;
  reference?: string | null;
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

export function mountBillingPaymentRoutes(app: Hono<AppBindings>): void {
  app.get("/billing/payments", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const invoiceId = c.req.query("invoiceId") ?? undefined;
    const companyId = c.req.query("companyId") ?? undefined;
    const items = await listPayments(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(invoiceId !== undefined ? { invoiceId } : {}),
      ...(companyId !== undefined ? { companyId } : {})
    });
    return c.json({ items });
  });

  app.post("/billing/payments", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: RecordPaymentBody;
    try {
      body = await c.req.json<RecordPaymentBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }

    if (!body?.invoiceId || typeof body.invoiceId !== "string" || body.invoiceId.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { invoiceId: "REQUIRED" } }, 400);
    }
    if (!body?.amount || typeof body.amount !== "object") {
      return c.json({ code: "INVALID_INPUT", errors: { amount: "REQUIRED" } }, 400);
    }
    if (!Number.isInteger(body.amount.amountMinor) || body.amount.amountMinor <= 0) {
      return c.json({ code: "INVALID_INPUT", errors: { "amount.amountMinor": "MUST_BE_POSITIVE_INTEGER" } }, 400);
    }
    if (!body?.paymentDate || typeof body.paymentDate !== "string" || body.paymentDate.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { paymentDate: "REQUIRED" } }, 400);
    }
    if (!body?.method || !ALLOWED_METHODS.includes(body.method as PaymentMethod)) {
      return c.json({
        code: "INVALID_INPUT",
        errors: { method: `MUST_BE_ONE_OF: ${ALLOWED_METHODS.join(",")}` }
      }, 400);
    }

    try {
      const payment = await recordPayment(db, tenant, {
        invoiceId: body.invoiceId,
        amount: {
          amountMinor: body.amount.amountMinor,
          currency: body.amount.currency,
          scale: body.amount.scale ?? 2
        },
        paymentDate: body.paymentDate,
        method: body.method as PaymentMethod,
        reference: body.reference ?? null
      });
      return c.json(payment, 201);
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof InvoiceNotPayableError) {
        return c.json({ code: "INVOICE_NOT_PAYABLE", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.get("/billing/payments/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getPaymentById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.delete("/billing/payments/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deletePayment(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof PaymentNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}
