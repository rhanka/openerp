import { describe, expect, it } from "vitest";
import { buildWaveTransactionsImportReport } from "../../src/finance-import/wave-report";

describe("Wave import report", () => {
  it("summarizes staged Wave transactions by account and currency", () => {
    const csv = [
      "Date,Account,Description,Amount",
      "2026-04-01,Chequing,Invoice payment,100.00",
      "2026-04-02,Chequing,Bank fee,-2.50",
      "2026-04-03,Savings,Interest,1.25"
    ].join("\n");

    const report = buildWaveTransactionsImportReport(csv);

    expect(report).toMatchObject({
      rowCount: 3,
      parsedAmountCount: 3,
      unparsedAmountCount: 0,
      duplicateSourceHashes: [],
      diagnostics: []
    });
    expect(report.accountTotals).toEqual([
      { accountName: "Chequing", currency: "CAD", transactionCount: 2, amountMinor: 9750 },
      { accountName: "Savings", currency: "CAD", transactionCount: 1, amountMinor: 125 }
    ]);
  });

  it("surfaces duplicate source hashes and unparsed amounts", () => {
    const csv = [
      "Date,Account,Description,Amount",
      "2026-04-01,Chequing,Invoice payment,100.00",
      "2026-04-01,Chequing,Invoice payment,100.00",
      "2026-04-02,Chequing,Bad amount,not-money"
    ].join("\n");

    const report = buildWaveTransactionsImportReport(csv);

    expect(report.rowCount).toBe(3);
    expect(report.parsedAmountCount).toBe(2);
    expect(report.unparsedAmountCount).toBe(1);
    expect(report.duplicateSourceHashes).toHaveLength(1);
    expect(report.diagnostics).toContain("line-4:amount-unparsed");
    expect(report.accountTotals).toEqual([
      { accountName: "Chequing", currency: "CAD", transactionCount: 2, amountMinor: 20000 }
    ]);
  });
});
