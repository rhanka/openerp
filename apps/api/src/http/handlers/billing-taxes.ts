import type { Hono } from "hono";

import type { AppBindings } from "../app";
import {
  TaxCategoryNotFoundError,
  TaxRateVersionNotFoundError,
  InvoiceNotFoundForTaxError,
  createTaxCategory,
  getTaxCategoryById,
  getTaxCategories,
  updateTaxCategoryById,
  deleteTaxCategoryById,
  createTaxRateVersion,
  getTaxRateVersionById,
  getTaxRateVersions,
  updateTaxRateVersionById,
  deleteTaxRateVersionById,
  computeInvoiceTaxes
} from "../../billing/tax-service";

// ---------------------------------------------------------------------------
// TaxCategory routes
// ---------------------------------------------------------------------------

export function mountBillingTaxRoutes(app: Hono<AppBindings>): void {
  // GET /billing/tax-categories
  app.get("/billing/tax-categories", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const activeOnly = c.req.query("activeOnly") === "true";
    const items = await getTaxCategories(db, tenant, { activeOnly });
    return c.json({ items });
  });

  // POST /billing/tax-categories
  app.post("/billing/tax-categories", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: { name?: string; code?: string; description?: string | null; active?: boolean };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.name || typeof body.name !== "string" || body.name.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { name: "REQUIRED" } }, 400);
    }
    if (!body?.code || typeof body.code !== "string" || body.code.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { code: "REQUIRED" } }, 400);
    }
    const result = await createTaxCategory(db, tenant, {
      name: body.name,
      code: body.code,
      description: body.description ?? null,
      active: body.active ?? true
    });
    return c.json(result, 201);
  });

  // GET /billing/tax-categories/:id
  app.get("/billing/tax-categories/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getTaxCategoryById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  // PATCH /billing/tax-categories/:id
  app.patch("/billing/tax-categories/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: { name?: string; code?: string; description?: string | null; active?: boolean };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const updated = await updateTaxCategoryById(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof TaxCategoryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // DELETE /billing/tax-categories/:id
  app.delete("/billing/tax-categories/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteTaxCategoryById(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof TaxCategoryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // ---------------------------------------------------------------------------
  // TaxRateVersion routes
  // ---------------------------------------------------------------------------

  // GET /billing/tax-rate-versions
  app.get("/billing/tax-rate-versions", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const taxCategoryIdRaw = c.req.query("taxCategoryId");
    const activeOnly = c.req.query("activeOnly") === "true";
    const asOfDateRaw = c.req.query("asOfDate");
    const query: { taxCategoryId?: string; activeOnly?: boolean; asOfDate?: string } = { activeOnly };
    if (taxCategoryIdRaw !== undefined) query.taxCategoryId = taxCategoryIdRaw;
    if (asOfDateRaw !== undefined) query.asOfDate = asOfDateRaw;
    const items = await getTaxRateVersions(db, tenant, query);
    return c.json({ items });
  });

  // POST /billing/tax-rate-versions
  app.post("/billing/tax-rate-versions", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: {
      taxCategoryId?: string;
      jurisdiction?: string;
      label?: string;
      rateBps?: number;
      compound?: boolean;
      effectiveFrom?: string;
      effectiveTo?: string | null;
      active?: boolean;
    };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.taxCategoryId || typeof body.taxCategoryId !== "string" || body.taxCategoryId.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { taxCategoryId: "REQUIRED" } }, 400);
    }
    if (!body?.jurisdiction || typeof body.jurisdiction !== "string" || body.jurisdiction.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { jurisdiction: "REQUIRED" } }, 400);
    }
    if (!body?.label || typeof body.label !== "string" || body.label.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { label: "REQUIRED" } }, 400);
    }
    if (body?.rateBps === undefined || typeof body.rateBps !== "number" || body.rateBps < 0) {
      return c.json({ code: "INVALID_INPUT", errors: { rateBps: "REQUIRED_NONNEG" } }, 400);
    }
    if (!body?.effectiveFrom || typeof body.effectiveFrom !== "string" || body.effectiveFrom.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { effectiveFrom: "REQUIRED" } }, 400);
    }
    const result = await createTaxRateVersion(db, tenant, {
      taxCategoryId: body.taxCategoryId,
      jurisdiction: body.jurisdiction,
      label: body.label,
      rateBps: body.rateBps,
      compound: body.compound ?? false,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo ?? null,
      active: body.active ?? true
    });
    return c.json(result, 201);
  });

  // GET /billing/tax-rate-versions/:id
  app.get("/billing/tax-rate-versions/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getTaxRateVersionById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  // PATCH /billing/tax-rate-versions/:id
  app.patch("/billing/tax-rate-versions/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: {
      jurisdiction?: string;
      label?: string;
      rateBps?: number;
      compound?: boolean;
      effectiveFrom?: string;
      effectiveTo?: string | null;
      active?: boolean;
    };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const updated = await updateTaxRateVersionById(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof TaxRateVersionNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // DELETE /billing/tax-rate-versions/:id
  app.delete("/billing/tax-rate-versions/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteTaxRateVersionById(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof TaxRateVersionNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // ---------------------------------------------------------------------------
  // Invoice compute-taxes action
  // ---------------------------------------------------------------------------

  // POST /billing/invoices/:id/compute-taxes
  app.post("/billing/invoices/:id/compute-taxes", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let asOfDate: string | undefined;
    try {
      const body = await c.req.json<{ asOfDate?: string }>();
      asOfDate = body?.asOfDate ?? undefined;
    } catch {
      // body is optional for compute-taxes
      asOfDate = undefined;
    }
    try {
      const updated = await computeInvoiceTaxes(db, tenant, id, asOfDate);
      return c.json(updated);
    } catch (err) {
      if (err instanceof InvoiceNotFoundForTaxError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}
