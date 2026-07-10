import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseOfx } from "../src/providers/ofx-upload.js";

const fixturePath = fileURLToPath(new URL("./fixtures/sample.ofx", import.meta.url));
const sampleOfx = readFileSync(fixturePath, "utf8");

describe("parseOfx", () => {
  it("parses all 5 <STMTTRN> blocks from the fixture", () => {
    const { transactions } = parseOfx(sampleOfx);
    expect(transactions).toHaveLength(5);
  });

  it("reads the account id and default currency from BANKACCTFROM/CURDEF", () => {
    const { accountId, currency } = parseOfx(sampleOfx);
    expect(accountId).toBe("123456789012");
    expect(currency).toBe("CAD");
  });

  it("keeps TRNAMT sign as-is (OFX convention already matches normalized: positive = credit)", () => {
    const { transactions } = parseOfx(sampleOfx);
    const byFitid = new Map(transactions.map((t) => [t.providerRef, t]));

    expect(byFitid.get("202606020001")?.amount).toBe(-45.99);
    expect(byFitid.get("202606050002")?.amount).toBe(1500);
    expect(byFitid.get("202606100003")?.amount).toBe(-89.12);
    expect(byFitid.get("202606150004")?.amount).toBe(-12.5);
    expect(byFitid.get("202606280005")?.amount).toBe(250);
  });

  it("counts 3 debits and 2 credits", () => {
    const { transactions } = parseOfx(sampleOfx);
    const debits = transactions.filter((t) => t.amount < 0);
    const credits = transactions.filter((t) => t.amount > 0);
    expect(debits).toHaveLength(3);
    expect(credits).toHaveLength(2);
  });

  it("maps FITID to id and providerRef, and NAME to description", () => {
    const { transactions } = parseOfx(sampleOfx);
    const first = transactions[0];
    expect(first).toMatchObject({
      id: "202606020001",
      providerRef: "202606020001",
      description: "EPICERIE METRO",
      accountId: "123456789012",
      status: "posted",
    });
  });

  it("converts DTPOSTED (YYYYMMDDHHMMSS) to an ISO 8601 timestamp", () => {
    const { transactions } = parseOfx(sampleOfx);
    expect(transactions[0]?.postedAt).toBe("2026-06-02T12:00:00.000Z");
  });

  it("falls back to MEMO when NAME is absent", () => {
    const withoutName = sampleOfx.replace("<NAME>EPICERIE METRO\n", "");
    const { transactions } = parseOfx(withoutName);
    expect(transactions[0]?.description).toBe("Achat carte debit");
  });

  it("throws a clean error when a required field is missing (never crashes silently)", () => {
    const broken = sampleOfx.replace("<FITID>202606020001\n", "");
    expect(() => parseOfx(broken)).toThrow(/FITID/);
  });
});
