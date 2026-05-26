import { describe, expect, it } from "vitest";

import type {
  Invoice,
  InvoiceStatus,
  BillingMoney,
  TaxCategory,
  TaxRateVersion,
  TaxBreakdownLine
} from "@sentropic/openerp-domain/billing";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// ---------------------------------------------------------------------------
// Shared minimal fake DB
// ---------------------------------------------------------------------------

function makeFakeTaxDb() {
  const categories: Array<TaxCategory & { _deleted?: boolean }> = [];
  const rateVersions: Array<TaxRateVersion & { _deleted?: boolean }> = [];
  const invoices: Array<Invoice & { _deleted?: boolean }> = [];
  const audits: Array<{ action: string }> = [];
  const timelines: Array<{ entryType: string }> = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // TaxCategory
      if (t.includes("insert into tax_categories")) {
        const [orgId, name, code, description, active] = values as [string, string, string, string | null, boolean];
        const row: TaxCategory = {
          id: `cat_${categories.length + 1}`,
          organizationId: orgId,
          name,
          code,
          description,
          active,
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z"
        };
        categories.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from tax_categories") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = categories.find((c) => c.id === id && c.organizationId === orgId && !c._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from tax_categories") && t.includes("order by name")) {
        const [orgId] = values as [string];
        return { rows: categories.filter((c) => c.organizationId === orgId && !c._deleted) as unknown as T[] };
      }

      if (t.includes("update tax_categories") && !t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const cat = categories.find((c) => c.id === id && c.organizationId === orgId && !c._deleted);
        if (!cat) return { rows: [] };
        return { rows: [cat as unknown as T] };
      }

      if (t.includes("update tax_categories") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const cat = categories.find((c) => c.id === id && c.organizationId === orgId && !c._deleted);
        if (!cat) return { rows: [] };
        cat._deleted = true;
        return { rows: [{ id: cat.id } as unknown as T] };
      }

      // TaxRateVersion
      if (t.includes("insert into tax_rate_versions")) {
        const [orgId, taxCategoryId, jurisdiction, label, rateBps, compound, effectiveFrom, effectiveTo, active] =
          values as [string, string, string, string, number, boolean, string, string | null, boolean];
        const row: TaxRateVersion = {
          id: `rv_${rateVersions.length + 1}`,
          organizationId: orgId,
          taxCategoryId,
          jurisdiction,
          label,
          rateBps,
          compound,
          effectiveFrom,
          effectiveTo,
          active,
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z"
        };
        rateVersions.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from tax_rate_versions") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = rateVersions.find((r) => r.id === id && r.organizationId === orgId && !r._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from tax_rate_versions") && t.includes("order by effective_from")) {
        const [orgId, taxCategoryId] = values as [string, string | null];
        const rows = rateVersions.filter(
          (r) =>
            r.organizationId === orgId &&
            (taxCategoryId === null || r.taxCategoryId === taxCategoryId) &&
            !r._deleted
        );
        return { rows: rows as unknown as T[] };
      }

      if (t.includes("update tax_rate_versions") && !t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const rv = rateVersions.find((r) => r.id === id && r.organizationId === orgId && !r._deleted);
        if (!rv) return { rows: [] };
        return { rows: [rv as unknown as T] };
      }

      if (t.includes("update tax_rate_versions") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const rv = rateVersions.find((r) => r.id === id && r.organizationId === orgId && !r._deleted);
        if (!rv) return { rows: [] };
        rv._deleted = true;
        return { rows: [{ id: rv.id } as unknown as T] };
      }

      // Invoice
      if (t.includes("from invoices") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = invoices.find((inv) => inv.id === id && inv.organizationId === orgId && !inv._deleted);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("update invoices") && t.includes("tax_total = $3")) {
        const [id, orgId, taxTotalJson, totalJson, taxBreakdownJson] =
          values as [string, string, string, string, string];
        const inv = invoices.find((i) => i.id === id && i.organizationId === orgId && !i._deleted);
        if (!inv) return { rows: [] };
        inv.taxTotal = JSON.parse(taxTotalJson) as BillingMoney;
        inv.total = JSON.parse(totalJson) as BillingMoney;
        inv.taxBreakdown = JSON.parse(taxBreakdownJson) as TaxBreakdownLine[];
        return { rows: [inv as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        audits.push({ action });
        return { rows: [{ id: `ae_${audits.length}` } as unknown as T] };
      }

      if (t.includes("insert into timeline_entries")) {
        const entryType = values[4] as string;
        timelines.push({ entryType });
        return { rows: [{ id: `te_${timelines.length}` } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, categories, rateVersions, invoices, audits, timelines };
}

function buildTestApp(db: Queryable) {
  return buildApp({
    db,
    resolveTenant: (req) => headerTenantResolver(req)
  });
}

const HEADERS = {
  "x-organization-id": "org-1",
  "x-user-identity-id": "user-1",
  "content-type": "application/json"
};

// ---------------------------------------------------------------------------
// TaxCategory HTTP tests
// ---------------------------------------------------------------------------

describe("billing tax categories HTTP (DS 4.2)", () => {
  it("GET /billing/tax-categories returns 401 without tenant headers", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories");
    expect(res.status).toBe(401);
  });

  it("GET /billing/tax-categories returns empty list", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories", { headers: HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: TaxCategory[] };
    expect(body.items).toEqual([]);
  });

  it("POST /billing/tax-categories creates a category (201)", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ name: "Standard", code: "STD" })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as TaxCategory;
    expect(body.name).toBe("Standard");
    expect(body.code).toBe("STD");
    expect(body.active).toBe(true);
  });

  it("POST /billing/tax-categories returns 400 when name missing", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ code: "STD" })
    });
    expect(res.status).toBe(400);
  });

  it("POST /billing/tax-categories returns 400 when code missing", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ name: "Standard" })
    });
    expect(res.status).toBe(400);
  });

  it("GET /billing/tax-categories/:id returns 404 for unknown", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories/no-such-id", { headers: HEADERS });
    expect(res.status).toBe(404);
  });

  it("PATCH /billing/tax-categories/:id returns 404 for unknown", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories/no-such-id", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ name: "X" })
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /billing/tax-categories/:id returns 404 for unknown", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-categories/no-such-id", {
      method: "DELETE",
      headers: HEADERS
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// TaxRateVersion HTTP tests
// ---------------------------------------------------------------------------

describe("billing tax rate versions HTTP (DS 4.2)", () => {
  it("GET /billing/tax-rate-versions returns empty list", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-rate-versions", { headers: HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: TaxRateVersion[] };
    expect(body.items).toEqual([]);
  });

  it("POST /billing/tax-rate-versions creates a rate version (201)", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-rate-versions", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        taxCategoryId: "cat-1",
        jurisdiction: "CA-GST",
        label: "Federal GST",
        rateBps: 5000,
        compound: false,
        effectiveFrom: "2013-01-01"
      })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as TaxRateVersion;
    expect(body.jurisdiction).toBe("CA-GST");
    expect(body.rateBps).toBe(5000);
    expect(body.compound).toBe(false);
  });

  it("POST /billing/tax-rate-versions returns 400 when taxCategoryId missing", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-rate-versions", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ jurisdiction: "CA-GST", label: "GST", rateBps: 5000, effectiveFrom: "2020-01-01" })
    });
    expect(res.status).toBe(400);
  });

  it("POST /billing/tax-rate-versions returns 400 when rateBps missing", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-rate-versions", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ taxCategoryId: "cat-1", jurisdiction: "CA-GST", label: "GST", effectiveFrom: "2020-01-01" })
    });
    expect(res.status).toBe(400);
  });

  it("GET /billing/tax-rate-versions/:id returns 404 for unknown", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-rate-versions/no-such-id", { headers: HEADERS });
    expect(res.status).toBe(404);
  });

  it("DELETE /billing/tax-rate-versions/:id returns 404 for unknown", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/tax-rate-versions/no-such-id", {
      method: "DELETE",
      headers: HEADERS
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// compute-taxes HTTP test
// ---------------------------------------------------------------------------

describe("billing compute-taxes HTTP (DS 4.2)", () => {
  it("POST /billing/invoices/:id/compute-taxes returns 404 for unknown invoice", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/invoices/no-such-id/compute-taxes", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(404);
  });

  it("POST /billing/invoices/:id/compute-taxes returns 200 with tax breakdown", async () => {
    const { db, invoices } = makeFakeTaxDb();

    // Seed an invoice with a tax category
    const invoice: Invoice = {
      id: "inv-tax-test",
      organizationId: "org-1",
      companyId: "co-1",
      projectId: null,
      invoiceProposalId: null,
      invoiceNumber: "INV-000001",
      status: "draft",
      currency: "CAD",
      subtotal: { amountMinor: 10000, currency: "CAD", scale: 2 },
      taxTotal: { amountMinor: 0, currency: "CAD", scale: 2 },
      total: { amountMinor: 10000, currency: "CAD", scale: 2 },
      taxCategoryId: "cat-std",
      taxBreakdown: null,
      issueDate: "2026-05-25",
      dueDate: null,
      issuedAt: null,
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z"
    };
    invoices.push(invoice);

    const app = buildTestApp(db);

    // First create the rate versions via the API
    await app.request("/billing/tax-rate-versions", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        taxCategoryId: "cat-std",
        jurisdiction: "CA-GST",
        label: "Federal GST",
        rateBps: 5000,
        compound: false,
        effectiveFrom: "2013-01-01"
      })
    });
    await app.request("/billing/tax-rate-versions", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        taxCategoryId: "cat-std",
        jurisdiction: "CA-QC-QST",
        label: "Quebec QST",
        rateBps: 9975,
        compound: false,
        effectiveFrom: "2013-01-01"
      })
    });

    const res = await app.request("/billing/invoices/inv-tax-test/compute-taxes", {
      method: "POST",
      headers: HEADERS
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Invoice;
    expect(body.taxTotal.amountMinor).toBe(1498);
    expect(body.total.amountMinor).toBe(11498);
    expect(body.taxBreakdown).toHaveLength(2);
  });

  it("POST /billing/invoices/:id/compute-taxes returns 401 without tenant headers", async () => {
    const { db } = makeFakeTaxDb();
    const app = buildTestApp(db);
    const res = await app.request("/billing/invoices/inv-1/compute-taxes", { method: "POST" });
    expect(res.status).toBe(401);
  });
});
