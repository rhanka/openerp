import { describe, expect, it } from "vitest";

import type { Payment, BillingMoney } from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../../src/db/client";
import { suggestReconciliation } from "../../src/reconciliation/reconcile-service";
import type { ReconBankTransaction } from "../../src/reconciliation/match";

const TENANT: TenantContext = { organizationId: "org-1", actorUserId: "user-1" };

function money(amountMinor: number, currency = "CAD"): BillingMoney {
  return { amountMinor, currency, scale: 2 };
}

function makeFakeDb(payments: Payment[]): Queryable {
  return {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();
      if (t.includes("from payments") && t.includes("order by payment_date")) {
        const [organizationId] = values as [string];
        const rows = payments.filter((p) => p.organizationId === organizationId);
        return { rows: rows as unknown as T[] };
      }
      throw new Error(`unexpected query: ${t.slice(0, 40)}`);
    }
  };
}

function payment(partial: Partial<Payment> & { id: string; amount: BillingMoney; paymentDate: string }): Payment {
  return {
    organizationId: "org-1",
    invoiceId: "inv-1",
    companyId: null,
    method: "bank_transfer",
    reference: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...partial
  } as Payment;
}

describe("suggestReconciliation", () => {
  it("matches the tenant's payments against bank transactions (read-only)", async () => {
    const db = makeFakeDb([
      payment({ id: "pay-1", amount: money(12345), paymentDate: "2026-03-02", reference: "INV-001" }),
      payment({ id: "pay-2", amount: money(5000), paymentDate: "2026-03-12", reference: "INV-002" })
    ]);

    const bankTxns: ReconBankTransaction[] = [
      { id: "t1", postedAt: "2026-03-02", amountMinor: 12345, currency: "CAD", description: "VIREMENT INV-001" },
      { id: "t2", postedAt: "2026-03-11", amountMinor: 5000, currency: "CAD", description: "DEPOT" }
    ];

    const result = await suggestReconciliation(db, TENANT, bankTxns);

    expect(result.matched.map((m) => [m.transactionId, m.candidateId])).toEqual([
      ["t1", "pay-1"],
      ["t2", "pay-2"]
    ]);
    expect(result.unmatchedTransactions).toEqual([]);
    expect(result.unmatchedCandidates).toEqual([]);
  });

  it("leaves unmatched bank transactions when no payment fits", async () => {
    const db = makeFakeDb([payment({ id: "pay-1", amount: money(12345), paymentDate: "2026-03-02" })]);
    const result = await suggestReconciliation(db, TENANT, [
      { id: "t1", postedAt: "2026-03-02", amountMinor: 999, currency: "CAD", description: "FRAIS" }
    ]);
    expect(result.matched).toEqual([]);
    expect(result.unmatchedTransactions).toEqual(["t1"]);
    expect(result.unmatchedCandidates).toEqual(["pay-1"]);
  });

  it("requires a tenant context", async () => {
    const db = makeFakeDb([]);
    await expect(
      suggestReconciliation(db, { organizationId: "", actorUserId: "" }, [])
    ).rejects.toThrow(/Tenant context/);
  });
});
