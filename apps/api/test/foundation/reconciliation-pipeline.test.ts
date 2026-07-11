import { describe, expect, it } from "vitest";

import type { Payment, BillingMoney } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../../src/db/client";
import { suggestReconciliation } from "../../src/reconciliation/reconcile-service";
import {
  toReconTransactions,
  type NormalizedBankTransactionInput
} from "../../src/reconciliation/normalize";

const TENANT: TenantContext = { organizationId: "org-1", actorUserId: "user-1" };

function money(amountMinor: number): BillingMoney {
  return { amountMinor, currency: "CAD", scale: 2 };
}

function makeFakeDb(payments: Payment[]): Queryable {
  return {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      if (text.includes("from payments") && text.includes("order by payment_date")) {
        const [organizationId] = values as [string];
        return { rows: payments.filter((p) => p.organizationId === organizationId) as unknown as T[] };
      }
      throw new Error("unexpected query");
    }
  };
}

function payment(id: string, amountMinor: number, paymentDate: string, reference: string | null): Payment {
  return {
    id,
    organizationId: "org-1",
    invoiceId: `inv-${id}`,
    companyId: null,
    amount: money(amountMinor),
    paymentDate,
    method: "bank_transfer",
    reference,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z"
  };
}

// End-to-end: bank-connector normalized transactions (major-unit amounts) → normalize →
// suggestReconciliation (which loads payments + matches). Proves the assembled C2 pipeline.
describe("reconciliation pipeline (normalize → suggest)", () => {
  it("matches deposits to payments and leaves fees/unknowns unmatched", async () => {
    const normalized: NormalizedBankTransactionInput[] = [
      { id: "bt-1", postedAt: "2026-03-02", amount: 123.45, currency: "CAD", description: "VIREMENT ACME INV-a" },
      { id: "bt-2", postedAt: "2026-03-11", amount: 50.0, currency: "CAD", description: "DEPOT NORTHWIND" },
      { id: "bt-3", postedAt: "2026-03-15", amount: -9.99, currency: "CAD", description: "FRAIS MENSUELS" }
    ];

    const db = makeFakeDb([
      payment("a", 12345, "2026-03-02", "INV-a"),
      payment("b", 5000, "2026-03-12", "INV-b")
    ]);

    const bankTxns = toReconTransactions(normalized);
    const result = await suggestReconciliation(db, TENANT, bankTxns);

    expect(result.matched.map((m) => [m.transactionId, m.candidateId])).toEqual([
      ["bt-1", "a"],
      ["bt-2", "b"]
    ]);
    // The bank fee has no counterpart payment → stays unmatched (surfaced for expense handling later).
    expect(result.unmatchedTransactions).toEqual(["bt-3"]);
    expect(result.unmatchedCandidates).toEqual([]);
  });
});
