import { describe, expect, it } from "vitest";

import { mapPlaidAccount, mapPlaidTransaction } from "../src/providers/plaid-sandbox.js";
import fixture from "./fixtures/plaid-payload.json" with { type: "json" };

describe("mapPlaidAccount", () => {
  it("maps a depository/checking account", () => {
    const account = mapPlaidAccount(fixture.accounts[0], fixture.institution);
    expect(account).toEqual({
      id: "acc-001",
      providerRef: "acc-001",
      name: "Compte cheques Desjardins",
      type: "checking",
      currency: "CAD",
      balance: 1523.47,
      institution: "Desjardins",
    });
  });

  it("maps a credit account, keeping a negative balance as-is", () => {
    const account = mapPlaidAccount(fixture.accounts[1], fixture.institution);
    expect(account.type).toBe("credit");
    expect(account.balance).toBe(-230.1);
  });
});

describe("mapPlaidTransaction — FDX sign convention", () => {
  it("inverts a Plaid debit (positive) to a normalized debit (negative)", () => {
    const txn = mapPlaidTransaction(fixture.transactions[0]);
    expect(txn.amount).toBe(-45.99);
    expect(txn.id).toBe("txn-001");
    expect(txn.providerRef).toBe("txn-001");
    expect(txn.accountId).toBe("acc-001");
    expect(txn.description).toBe("Epicerie Metro");
    expect(txn.merchant).toBe("Metro");
    expect(txn.category).toBe("FOOD_AND_DRINK");
    expect(txn.status).toBe("posted");
  });

  it("inverts a Plaid credit (negative) to a normalized credit (positive)", () => {
    const txn = mapPlaidTransaction(fixture.transactions[1]);
    expect(txn.amount).toBe(1500);
  });

  it("omits merchant/category when Plaid does not provide them", () => {
    const txn = mapPlaidTransaction(fixture.transactions[1]);
    expect(txn.merchant).toBeUndefined();
    expect(txn.category).toBeUndefined();
    expect("merchant" in txn).toBe(false);
  });

  it("maps pending: true to status 'pending'", () => {
    const txn = mapPlaidTransaction(fixture.transactions[2]);
    expect(txn.status).toBe("pending");
  });

  it("falls back to currency CAD when iso_currency_code is absent", () => {
    const txn = mapPlaidTransaction({ ...fixture.transactions[0], iso_currency_code: null });
    expect(txn.currency).toBe("CAD");
  });
});
