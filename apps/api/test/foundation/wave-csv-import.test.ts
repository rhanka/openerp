import { describe, expect, it } from "vitest";
import { parseMoneyMinor, parseWaveCsv, stageWaveTransactionsCsv } from "../../src/finance-import/wave-csv";

describe("Wave CSV import staging", () => {
  it("parses quoted CSV rows and computes stable source hashes", () => {
    const csv = [
      "Date,Account,Description,Amount",
      "2026-01-02,Chequing,\"Client payment, invoice INV-001\",123.45",
      "2026-01-03,Chequing,\"Bank fee\",-4.95"
    ].join("\n");

    const parsed = parseWaveCsv(csv);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
    const firstRow = parsed.rows[0];
    const firstRowAgain = parseWaveCsv(csv).rows[0];
    expect(firstRow).toBeDefined();
    expect(firstRowAgain).toBeDefined();
    expect(firstRow?.raw.Description).toBe("Client payment, invoice INV-001");
    expect(firstRow?.sourceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(firstRow?.sourceHash).toBe(firstRowAgain?.sourceHash);
  });

  it("stages transactions into nullable normalized fields without committing business data", () => {
    const csv = [
      "Date,Account,Description,Amount",
      "2026-02-01,Wave Cash,Consulting revenue,1000.00",
      "2026-02-02,Wave Cash,Software subscription,(12.34)"
    ].join("\n");

    const staged = stageWaveTransactionsCsv(csv);

    expect(staged.diagnostics).toEqual([]);
    expect(staged.rows).toMatchObject([
      { lineNumber: 2, date: "2026-02-01", accountName: "Wave Cash", description: "Consulting revenue", amountMinor: 100000, currency: "CAD" },
      { lineNumber: 3, date: "2026-02-02", accountName: "Wave Cash", description: "Software subscription", amountMinor: -1234, currency: "CAD" }
    ]);
  });

  it("supports debit and credit column exports", () => {
    const csv = [
      "Transaction Date,Account Name,Memo,Debit,Credit",
      "2026-03-01,Chequing,Payment,,250.00",
      "2026-03-02,Chequing,Fee,5.00,"
    ].join("\n");

    const staged = stageWaveTransactionsCsv(csv);

    expect(staged.diagnostics).toEqual([]);
    expect(staged.rows.map((row) => row.amountMinor)).toEqual([25000, -500]);
  });

  it("keeps diagnostics explicit for unknown export shapes", () => {
    const staged = stageWaveTransactionsCsv("Foo,Bar\nA,B\n");

    expect(staged.rows).toHaveLength(1);
    expect(staged.diagnostics).toEqual(expect.arrayContaining([
      "missing-date-column",
      "missing-account-column",
      "missing-description-column",
      "missing-amount-column",
      "line-2:amount-unparsed"
    ]));
  });
});

describe("parseMoneyMinor", () => {
  it("accepts common Canadian export formats", () => {
    expect(parseMoneyMinor("1,234.56")).toBe(123456);
    expect(parseMoneyMinor("1 234,56 CAD")).toBe(123456);
    expect(parseMoneyMinor("($7.89)")).toBe(-789);
  });
});
