import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { deriveDueDate } from "../../src/billing/invoice-service";

const migration = readFileSync("src/db/migrations/0037_billing_invoice_document_fields.sql", "utf8");

describe("invoice document fields migration (0037)", () => {
  it("adds notes, po_number and payment_terms_days additively", () => {
    expect(migration).toContain("alter table invoices");
    expect(migration).toContain("add column notes text");
    expect(migration).toContain("add column po_number text");
    expect(migration).toContain("add column payment_terms_days integer");
  });

  it("guards payment_terms_days to be non-negative when present", () => {
    expect(migration).toMatch(/payment_terms_days is null or payment_terms_days >= 0/);
  });
});

describe("deriveDueDate", () => {
  it("returns issue_date + terms when terms are set", () => {
    expect(deriveDueDate("2026-03-01", 30)).toBe("2026-03-31");
    expect(deriveDueDate("2026-03-01T00:00:00.000Z", 0)).toBe("2026-03-01");
  });

  it("crosses month/year boundaries via UTC arithmetic", () => {
    expect(deriveDueDate("2026-12-20", 30)).toBe("2027-01-19");
  });

  it("returns null when no terms are set", () => {
    expect(deriveDueDate("2026-03-01", null)).toBeNull();
  });

  it("returns null for an unparseable issue date", () => {
    expect(deriveDueDate("not-a-date", 30)).toBeNull();
  });
});
