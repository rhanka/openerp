import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import { issueInvoiceWithSnapshots } from "../../src/billing/invoices";

const migration = readFileSync(
  "src/db/migrations/0039_billing_invoice_identity_snapshots.sql",
  "utf8"
);

describe("invoice identity snapshots migration (0039)", () => {
  it("adds nullable issuer and customer snapshots additively", () => {
    expect(migration).toContain("alter table invoices");
    expect(migration).toContain("add column issuer_snapshot jsonb");
    expect(migration).toContain("add column customer_snapshot jsonb");
    expect(migration).not.toMatch(/create\s+table\s+invoices/i);
    expect(migration).not.toMatch(/add\s+column[^;]+not\s+null/i);
  });
});

describe("invoice identity snapshot persistence", () => {
  it("captures both identities atomically and only for an untouched draft", async () => {
    let queryText = "";
    let queryValues: unknown[] = [];
    const db: Queryable = {
      async query<T>(text: string, values: unknown[] = []) {
        queryText = text;
        queryValues = values;
        return { rows: [] as T[] };
      }
    };

    await issueInvoiceWithSnapshots(
      db,
      { organizationId: "org-1", actorUserId: "user-1" },
      "inv-1"
    );

    expect(queryText).toContain("issuer_snapshot = jsonb_build_object");
    expect(queryText).toContain("customer_snapshot = jsonb_build_object");
    expect(queryText).toContain("organization.legal_name");
    expect(queryText).toContain("settings.gst_registration_number");
    expect(queryText).toContain("settings.qst_registration_number");
    expect(queryText).toContain("settings.issuer_address");
    expect(queryText).toContain("customer.billing_address");
    expect(queryText).toContain("invoice.status = 'draft'");
    expect(queryText).toContain("invoice.issuer_snapshot is null");
    expect(queryText).toContain("invoice.customer_snapshot is null");
    expect(queryText).not.toContain("customer.deleted_at");
    expect(queryValues).toEqual(["inv-1", "org-1", "issued"]);
  });
});
