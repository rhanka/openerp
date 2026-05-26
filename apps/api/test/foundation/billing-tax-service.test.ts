import { describe, expect, it } from "vitest";

import type {
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  BillingMoney,
  TaxCategory,
  TaxRateVersion,
  TaxBreakdownLine
} from "@sentropic/openerp-domain/billing";

import type { Queryable } from "../../src/db/client";
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
} from "../../src/billing/tax-service";

// ---------------------------------------------------------------------------
// Fake database factory
// ---------------------------------------------------------------------------

function makeFakeDb(seedInvoices: Array<Invoice & { _deleted?: boolean }> = []) {
  const categories: Array<TaxCategory & { _deleted?: boolean }> = [];
  const rateVersions: Array<TaxRateVersion & { _deleted?: boolean }> = [];
  const invoices: Array<Invoice & { _deleted?: boolean }> = [...seedInvoices];
  const audits: Array<{ action: string }> = [];
  const timelines: Array<{ entryType: string }> = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // --- TaxCategory ---

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
        const rows = categories.filter((c) => c.organizationId === orgId && !c._deleted);
        return { rows: rows as unknown as T[] };
      }

      if (t.includes("update tax_categories") && !t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const cat = categories.find((c) => c.id === id && c.organizationId === orgId && !c._deleted);
        if (!cat) return { rows: [] };
        // Apply patches from remaining values
        for (let i = 2; i < values.length; i++) {
          const val = values[i];
          // Simple: we apply whatever value is there to the corresponding field
          if (text.includes("name = $")) {
            const nameIdx = text.indexOf("name = $");
            const paramNum = parseInt(text.slice(nameIdx + 8));
            if (i + 1 === paramNum) cat.name = val as string;
          }
          if (text.includes("code = $")) {
            const codeIdx = text.indexOf("code = $");
            const paramNum = parseInt(text.slice(codeIdx + 8));
            if (i + 1 === paramNum) cat.code = val as string;
          }
          if (text.includes("active = $")) {
            const activeIdx = text.indexOf("active = $");
            const paramNum = parseInt(text.slice(activeIdx + 10));
            if (i + 1 === paramNum) cat.active = val as boolean;
          }
          if (text.includes("description = $")) {
            const descIdx = text.indexOf("description = $");
            const paramNum = parseInt(text.slice(descIdx + 15));
            if (i + 1 === paramNum) cat.description = val as string | null;
          }
        }
        return { rows: [cat as unknown as T] };
      }

      if (t.includes("update tax_categories") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const cat = categories.find((c) => c.id === id && c.organizationId === orgId && !c._deleted);
        if (!cat) return { rows: [] };
        cat._deleted = true;
        return { rows: [{ id: cat.id } as unknown as T] };
      }

      // --- TaxRateVersion ---

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
        // Apply patches
        if (text.includes("rate_bps")) {
          const val = values.find((v) => typeof v === "number" && v !== parseInt(id));
          if (val !== undefined) rv.rateBps = val as number;
        }
        if (text.includes("jurisdiction")) {
          const val = values.find((v) => typeof v === "string" && v !== id && v !== orgId);
          if (val !== undefined) rv.jurisdiction = val as string;
        }
        return { rows: [rv as unknown as T] };
      }

      if (t.includes("update tax_rate_versions") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const rv = rateVersions.find((r) => r.id === id && r.organizationId === orgId && !r._deleted);
        if (!rv) return { rows: [] };
        rv._deleted = true;
        return { rows: [{ id: rv.id } as unknown as T] };
      }

      // --- Invoice ---

      if (t.includes("from invoices") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = invoices.find(
          (inv) => inv.id === id && inv.organizationId === orgId && !inv._deleted
        );
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

      // --- Audit events ---
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        audits.push({ action });
        return { rows: [{ id: `ae_${audits.length}` } as unknown as T] };
      }

      // --- Timeline entries ---
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

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };

// ---------------------------------------------------------------------------
// TaxCategory CRUD tests
// ---------------------------------------------------------------------------

describe("tax-service: TaxCategory CRUD (DS 4.2)", () => {
  it("createTaxCategory: inserts and returns the category with audit + timeline", async () => {
    const { db, audits, timelines } = makeFakeDb();
    const cat = await createTaxCategory(db, TENANT, { name: "Standard rate", code: "STD" });
    expect(cat.name).toBe("Standard rate");
    expect(cat.code).toBe("STD");
    expect(cat.active).toBe(true);
    expect(audits.some((a) => a.action === "billing.tax_category.created")).toBe(true);
    expect(timelines.some((t) => t.entryType === "billing.tax_category.created")).toBe(true);
  });

  it("getTaxCategoryById: returns null for unknown id", async () => {
    const { db } = makeFakeDb();
    expect(await getTaxCategoryById(db, TENANT, "nonexistent")).toBeNull();
  });

  it("updateTaxCategoryById: throws for unknown id", async () => {
    const { db } = makeFakeDb();
    await expect(updateTaxCategoryById(db, TENANT, "missing", { name: "X" })).rejects.toBeInstanceOf(
      TaxCategoryNotFoundError
    );
  });

  it("deleteTaxCategoryById: throws for unknown id", async () => {
    const { db } = makeFakeDb();
    await expect(deleteTaxCategoryById(db, TENANT, "missing")).rejects.toBeInstanceOf(
      TaxCategoryNotFoundError
    );
  });
});

// ---------------------------------------------------------------------------
// TaxRateVersion CRUD tests
// ---------------------------------------------------------------------------

describe("tax-service: TaxRateVersion CRUD (DS 4.2)", () => {
  it("createTaxRateVersion: inserts version with correct fields + audit + timeline", async () => {
    const { db, audits } = makeFakeDb();
    await createTaxCategory(db, TENANT, { name: "Standard", code: "STD" });
    const rv = await createTaxRateVersion(db, TENANT, {
      taxCategoryId: "cat_1",
      jurisdiction: "CA-GST",
      label: "Federal GST",
      rateBps: 5000,
      compound: false,
      effectiveFrom: "2013-01-01"
    });
    expect(rv.jurisdiction).toBe("CA-GST");
    expect(rv.rateBps).toBe(5000);
    expect(rv.compound).toBe(false);
    expect(audits.some((a) => a.action === "billing.tax_rate_version.created")).toBe(true);
  });

  it("getTaxRateVersionById: returns null for unknown", async () => {
    const { db } = makeFakeDb();
    expect(await getTaxRateVersionById(db, TENANT, "nope")).toBeNull();
  });

  it("updateTaxRateVersionById: throws for unknown id", async () => {
    const { db } = makeFakeDb();
    await expect(updateTaxRateVersionById(db, TENANT, "missing", { rateBps: 100 })).rejects.toBeInstanceOf(
      TaxRateVersionNotFoundError
    );
  });

  it("deleteTaxRateVersionById: throws for unknown id", async () => {
    const { db } = makeFakeDb();
    await expect(deleteTaxRateVersionById(db, TENANT, "missing")).rejects.toBeInstanceOf(
      TaxRateVersionNotFoundError
    );
  });
});

// ---------------------------------------------------------------------------
// computeInvoiceTaxes — THE QUEBEC MATH ANCHOR
// ---------------------------------------------------------------------------

describe("tax-service: computeInvoiceTaxes — Quebec math anchor (DS 4.2)", () => {
  /**
   * Anchor test:
   *   subtotal = $100.00 = 10000 minor (CAD, scale 2)
   *   GST  5.000% → rateBps = 5000  (milli-percent)  → round(10000 * 5000 / 100000) = round(500)   = 500
   *   QST  9.975% → rateBps = 9975  (milli-percent)  → round(10000 * 9975 / 100000) = round(997.5) = 998
   *   Both non-compound: QST applies on the pre-GST base (2013 Quebec rule, expressed via compound=false).
   *   tax_total = 500 + 998 = 1498
   *   total     = 10000 + 1498 = 11498
   */
  it("computes GST+QST correctly on $100.00 base (exact integers 500+998=1498, total=11498)", async () => {
    const seedInvoice: Invoice = {
      id: "inv-1",
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

    const { db } = makeFakeDb([seedInvoice]);
    // Manually seed the rate versions directly into the fake store for this test
    // by calling createTaxRateVersion (which inserts them).

    // Seed GST rate version (5.000% = 5000 milli-percent, non-compound).
    await createTaxRateVersion(db, TENANT, {
      taxCategoryId: "cat-std",
      jurisdiction: "CA-GST",
      label: "Federal GST",
      rateBps: 5000,
      compound: false,
      effectiveFrom: "2013-01-01"
    });

    // Seed QST rate version (9.975% = 9975 milli-percent, non-compound).
    // Per 2013 Quebec rule: QST applies on the pre-GST base (not compounded).
    await createTaxRateVersion(db, TENANT, {
      taxCategoryId: "cat-std",
      jurisdiction: "CA-QC-QST",
      label: "Quebec QST",
      rateBps: 9975,
      compound: false,
      effectiveFrom: "2013-01-01"
    });

    const result = await computeInvoiceTaxes(db, TENANT, "inv-1", "2026-05-25");

    // GST line
    const gstLine = result.taxBreakdown?.find((l) => l.jurisdiction === "CA-GST");
    expect(gstLine).toBeDefined();
    expect(gstLine!.amount.amountMinor).toBe(500);

    // QST line
    const qstLine = result.taxBreakdown?.find((l) => l.jurisdiction === "CA-QC-QST");
    expect(qstLine).toBeDefined();
    expect(qstLine!.amount.amountMinor).toBe(998);

    // Totals
    expect(result.taxTotal.amountMinor).toBe(1498);
    expect(result.total.amountMinor).toBe(11498);
  });

  it("computeInvoiceTaxes: throws InvoiceNotFoundForTaxError for missing invoice", async () => {
    const { db } = makeFakeDb();
    await expect(computeInvoiceTaxes(db, TENANT, "nope")).rejects.toBeInstanceOf(
      InvoiceNotFoundForTaxError
    );
  });

  it("computeInvoiceTaxes: returns invoice unchanged when no taxCategoryId", async () => {
    const seedInvoice: Invoice = {
      id: "inv-no-cat",
      organizationId: "org-1",
      companyId: "co-1",
      projectId: null,
      invoiceProposalId: null,
      invoiceNumber: "INV-000002",
      status: "draft",
      currency: "CAD",
      subtotal: { amountMinor: 5000, currency: "CAD", scale: 2 },
      taxTotal: { amountMinor: 0, currency: "CAD", scale: 2 },
      total: { amountMinor: 5000, currency: "CAD", scale: 2 },
      taxCategoryId: null,
      taxBreakdown: null,
      issueDate: null,
      dueDate: null,
      issuedAt: null,
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z"
    };
    const { db } = makeFakeDb([seedInvoice]);
    const result = await computeInvoiceTaxes(db, TENANT, "inv-no-cat");
    expect(result.taxTotal.amountMinor).toBe(0);
    expect(result.taxBreakdown).toBeNull();
  });

  it("compound rate applies on subtotal + prior taxes", async () => {
    // subtotal = 10000 ($100.00)
    // Rate A non-compound: 10%  → rateBps=10000 → round(10000*10000/100000)=round(1000)=1000
    // Rate B compound: 5%       → rateBps=5000  → base=10000+1000=11000 → round(11000*5000/100000)=round(550)=550
    // tax_total = 1000+550 = 1550, total = 11550
    const seedInvoice: Invoice = {
      id: "inv-compound",
      organizationId: "org-1",
      companyId: "co-1",
      projectId: null,
      invoiceProposalId: null,
      invoiceNumber: "INV-000003",
      status: "draft",
      currency: "CAD",
      subtotal: { amountMinor: 10000, currency: "CAD", scale: 2 },
      taxTotal: { amountMinor: 0, currency: "CAD", scale: 2 },
      total: { amountMinor: 10000, currency: "CAD", scale: 2 },
      taxCategoryId: "cat-compound",
      taxBreakdown: null,
      issueDate: "2026-05-25",
      dueDate: null,
      issuedAt: null,
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z"
    };
    const { db } = makeFakeDb([seedInvoice]);

    await createTaxRateVersion(db, TENANT, {
      taxCategoryId: "cat-compound",
      jurisdiction: "RATE-A",
      label: "Rate A 10%",
      rateBps: 10000,
      compound: false,
      effectiveFrom: "2020-01-01"
    });
    await createTaxRateVersion(db, TENANT, {
      taxCategoryId: "cat-compound",
      jurisdiction: "RATE-B",
      label: "Rate B 5% on total",
      rateBps: 5000,
      compound: true,
      effectiveFrom: "2020-01-01"
    });

    const result = await computeInvoiceTaxes(db, TENANT, "inv-compound");
    expect(result.taxTotal.amountMinor).toBe(1550);
    expect(result.total.amountMinor).toBe(11550);
  });
});
