import { describe, expect, it } from "vitest";

import {
  toMinorUnits,
  toReconTransaction,
  toReconTransactions,
  type NormalizedBankTransactionInput
} from "../../src/reconciliation/normalize";

describe("toMinorUnits", () => {
  it("rounds major units to integer minor units", () => {
    expect(toMinorUnits(45.99)).toBe(4599);
    expect(toMinorUnits(-12.5)).toBe(-1250);
    expect(toMinorUnits(1500)).toBe(150000);
    expect(toMinorUnits(0)).toBe(0);
  });

  it("never returns negative zero", () => {
    expect(Object.is(toMinorUnits(-0), -0)).toBe(false);
  });

  it("honours a non-default scale", () => {
    expect(toMinorUnits(1.234, 3)).toBe(1234);
  });
});

describe("toReconTransaction", () => {
  it("maps FDX-normalized fields to reconciliation input", () => {
    const input: NormalizedBankTransactionInput = {
      id: "t1",
      postedAt: "2026-03-02T12:00:00.000Z",
      amount: -45.99,
      currency: "CAD",
      description: "EPICERIE METRO"
    };
    expect(toReconTransaction(input)).toEqual({
      id: "t1",
      postedAt: "2026-03-02T12:00:00.000Z",
      amountMinor: -4599,
      currency: "CAD",
      description: "EPICERIE METRO"
    });
  });

  it("maps a list preserving order", () => {
    const list: NormalizedBankTransactionInput[] = [
      { id: "a", postedAt: "2026-03-01", amount: 10, currency: "CAD", description: "x" },
      { id: "b", postedAt: "2026-03-02", amount: 20.05, currency: "CAD", description: "y" }
    ];
    expect(toReconTransactions(list).map((t) => [t.id, t.amountMinor])).toEqual([
      ["a", 1000],
      ["b", 2005]
    ]);
  });
});
