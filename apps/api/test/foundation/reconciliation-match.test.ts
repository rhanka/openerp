import { describe, expect, it } from "vitest";

import {
  matchTransactions,
  type ReconBankTransaction,
  type ReconCandidate
} from "../../src/reconciliation/match";

const txns: ReconBankTransaction[] = [
  { id: "t1", postedAt: "2026-03-02", amountMinor: 12345, currency: "CAD", description: "DEPOT VIREMENT ACME INV-001" },
  { id: "t2", postedAt: "2026-03-10", amountMinor: 5000, currency: "CAD", description: "PAIEMENT NORTHWIND" },
  { id: "t3", postedAt: "2026-03-15", amountMinor: -999, currency: "CAD", description: "FRAIS BANCAIRE" }
];

const candidates: ReconCandidate[] = [
  { id: "p1", kind: "payment", date: "2026-03-02", amountMinor: 12345, currency: "CAD", reference: "INV-001", label: "Acme" },
  { id: "p2", kind: "payment", date: "2026-03-12", amountMinor: 5000, currency: "CAD", reference: "INV-002", label: "Northwind" }
];

describe("matchTransactions", () => {
  it("matches on exact amount, boosted by date proximity and reference overlap", () => {
    const result = matchTransactions(txns, candidates);

    const m1 = result.matched.find((m) => m.transactionId === "t1");
    expect(m1?.candidateId).toBe("p1");
    expect(m1?.reasons).toEqual(expect.arrayContaining(["amount+currency exact", "same date", "reference/description overlap"]));
    expect(m1!.score).toBeGreaterThan(0.9);

    const m2 = result.matched.find((m) => m.transactionId === "t2");
    expect(m2?.candidateId).toBe("p2");

    expect(result.unmatchedTransactions).toEqual(["t3"]);
    expect(result.unmatchedCandidates).toEqual([]);
  });

  it("does not match across currencies or amounts", () => {
    const result = matchTransactions(
      [{ id: "t1", postedAt: "2026-03-02", amountMinor: 12345, currency: "USD", description: "x" }],
      [{ id: "p1", kind: "payment", date: "2026-03-02", amountMinor: 12345, currency: "CAD" }]
    );
    expect(result.matched).toEqual([]);
    expect(result.unmatchedTransactions).toEqual(["t1"]);
    expect(result.unmatchedCandidates).toEqual(["p1"]);
  });

  it("matches by magnitude regardless of sign convention", () => {
    const result = matchTransactions(
      [{ id: "t1", postedAt: "2026-03-02", amountMinor: -4200, currency: "CAD", description: "SUPPLIER" }],
      [{ id: "b1", kind: "invoice", date: "2026-03-02", amountMinor: 4200, currency: "CAD", label: "supplier" }]
    );
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.candidateId).toBe("b1");
  });

  it("assigns one-to-one and is stable under input reordering", () => {
    const dupCandidates: ReconCandidate[] = [
      { id: "c-b", kind: "payment", date: "2026-03-02", amountMinor: 12345, currency: "CAD" },
      { id: "c-a", kind: "payment", date: "2026-03-02", amountMinor: 12345, currency: "CAD" }
    ];
    const one = matchTransactions([txns[0]!], dupCandidates);
    const two = matchTransactions([txns[0]!], [...dupCandidates].reverse());
    expect(one.matched).toHaveLength(1);
    // Deterministic tie-break by candidateId → "c-a" wins in both orderings.
    expect(one.matched[0]?.candidateId).toBe("c-a");
    expect(two.matched[0]?.candidateId).toBe("c-a");
  });

  it("respects minScore: an amount-only match below threshold is dropped", () => {
    const result = matchTransactions(
      [{ id: "t1", postedAt: "2026-01-01", amountMinor: 7777, currency: "CAD", description: "opaque" }],
      [{ id: "p1", kind: "payment", date: "2026-12-31", amountMinor: 7777, currency: "CAD" }],
      { minScore: 0.7 }
    );
    // 0.6 base (no date proximity, no reference) < 0.7 → unmatched.
    expect(result.matched).toEqual([]);
  });
});
