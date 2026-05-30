import { describe, expect, it } from "vitest";
import type { Queryable } from "../../src/db/client";
import { REPORT_CATALOG, validateReportParams, getCatalogMetadata } from "../../src/reporting/report-registry";

function makeFakeDb(): { db: Queryable; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      calls.push({ text, values });
      return { rows: [] };
    }
  };
  return { db, calls };
}

const ORG_ID = "00000000-0000-0000-0000-000000000001";

describe("REPORT_CATALOG — column definitions", () => {
  it("crm.pipeline_funnel exposes correct columns", () => {
    const entry = REPORT_CATALOG["crm.pipeline_funnel"];
    expect(entry).toBeDefined();
    const keys = entry!.columns.map((c) => c.key);
    expect(keys).toContain("stage");
    expect(keys).toContain("open_count");
    expect(keys).toContain("pipeline_value_minor");
    expect(entry!.columns.find((c) => c.key === "pipeline_value_minor")?.dataType).toBe("money");
  });

  it("billing.outstanding_invoices exposes correct columns", () => {
    const entry = REPORT_CATALOG["billing.outstanding_invoices"];
    expect(entry).toBeDefined();
    const keys = entry!.columns.map((c) => c.key);
    expect(keys).toContain("invoice_number");
    expect(keys).toContain("total_minor");
    expect(keys).toContain("currency");
    expect(keys).toContain("due_date");
    expect(keys).toContain("status");
  });

  it("project.time_by_user exposes correct columns", () => {
    const entry = REPORT_CATALOG["project.time_by_user"];
    expect(entry).toBeDefined();
    const keys = entry!.columns.map((c) => c.key);
    expect(keys).toContain("user_id");
    expect(keys).toContain("billable");
    expect(keys).toContain("total_minutes");
  });

  it("billing.revenue_by_period exposes correct columns", () => {
    const entry = REPORT_CATALOG["billing.revenue_by_period"];
    expect(entry).toBeDefined();
    const keys = entry!.columns.map((c) => c.key);
    expect(keys).toContain("period");
    expect(keys).toContain("currency");
    expect(keys).toContain("revenue_minor");
  });
});

describe("REPORT_CATALOG — run() binds organizationId", () => {
  it("crm.pipeline_funnel passes organizationId as first param", async () => {
    const { db, calls } = makeFakeDb();
    await REPORT_CATALOG["crm.pipeline_funnel"]!.run(db, ORG_ID, {});
    expect(calls).toHaveLength(1);
    expect(calls[0]!.values[0]).toBe(ORG_ID);
  });

  it("billing.outstanding_invoices passes organizationId as first param (no companyId)", async () => {
    const { db, calls } = makeFakeDb();
    await REPORT_CATALOG["billing.outstanding_invoices"]!.run(db, ORG_ID, {});
    expect(calls).toHaveLength(1);
    expect(calls[0]!.values[0]).toBe(ORG_ID);
  });

  it("billing.outstanding_invoices passes organizationId + companyId when provided", async () => {
    const { db, calls } = makeFakeDb();
    const companyId = "00000000-0000-0000-0000-000000000002";
    await REPORT_CATALOG["billing.outstanding_invoices"]!.run(db, ORG_ID, { companyId });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.values[0]).toBe(ORG_ID);
    expect(calls[0]!.values[1]).toBe(companyId);
  });

  it("project.time_by_user passes organizationId + period params", async () => {
    const { db, calls } = makeFakeDb();
    await REPORT_CATALOG["project.time_by_user"]!.run(db, ORG_ID, {
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31"
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.values[0]).toBe(ORG_ID);
    expect(calls[0]!.values[1]).toBe("2026-01-01");
    expect(calls[0]!.values[2]).toBe("2026-03-31");
  });

  it("billing.revenue_by_period passes organizationId + period params", async () => {
    const { db, calls } = makeFakeDb();
    await REPORT_CATALOG["billing.revenue_by_period"]!.run(db, ORG_ID, {
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31"
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.values[0]).toBe(ORG_ID);
  });
});

describe("validateReportParams", () => {
  it("returns ok for valid crm.pipeline_funnel (no required params)", () => {
    expect(validateReportParams("crm.pipeline_funnel", {})).toEqual({ ok: true });
  });

  it("returns error for unknown report type", () => {
    const result = validateReportParams("unknown.report", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unknown report type/i);
  });

  it("returns error for missing required param (project.time_by_user periodStart)", () => {
    const result = validateReportParams("project.time_by_user", { periodEnd: "2026-03-31" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("periodStart");
  });

  it("returns error for missing required param (billing.revenue_by_period periodEnd)", () => {
    const result = validateReportParams("billing.revenue_by_period", { periodStart: "2026-01-01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("periodEnd");
  });

  it("accepts optional params when not provided", () => {
    const result = validateReportParams("billing.outstanding_invoices", {});
    expect(result.ok).toBe(true);
  });
});

describe("getCatalogMetadata", () => {
  it("returns metadata for all 4 report types", () => {
    const meta = getCatalogMetadata();
    expect(meta.length).toBe(4);
    const types = meta.map((m) => m.reportType);
    expect(types).toContain("crm.pipeline_funnel");
    expect(types).toContain("billing.outstanding_invoices");
    expect(types).toContain("project.time_by_user");
    expect(types).toContain("billing.revenue_by_period");
  });

  it("each entry has reportType, labelKey, params, and columns", () => {
    const meta = getCatalogMetadata();
    for (const m of meta) {
      expect(m.reportType).toBeTruthy();
      expect(m.labelKey).toBeTruthy();
      expect(Array.isArray(m.params)).toBe(true);
      expect(Array.isArray(m.columns)).toBe(true);
    }
  });
});
