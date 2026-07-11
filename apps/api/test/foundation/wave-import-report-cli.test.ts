import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SCRIPT = "src/scripts/wave-import-report.ts";
let workDir: string;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "wave-cli-"));
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function runCli(args: string[]): { status: number; stdout: string } {
  try {
    const stdout = execFileSync("npx", ["tsx", SCRIPT, ...args], { encoding: "utf8" });
    return { status: 0, stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: Buffer | string };
    return { status: err.status ?? 1, stdout: String(err.stdout ?? "") };
  }
}

describe("wave-import-report CLI", () => {
  it("prints an aggregate-only report for a valid CSV", () => {
    const csvPath = join(workDir, "clean.csv");
    writeFileSync(csvPath, [
      "Date,Account,Description,Amount",
      "2026-05-01,Chequing,Invoice payment,100.00",
      "2026-05-02,Chequing,Bank fee,-2.50"
    ].join("\n"));

    const { status, stdout } = runCli([csvPath]);
    const report = JSON.parse(stdout);

    expect(status).toBe(0);
    expect(report.rowCount).toBe(2);
    expect(report.accountTotals).toEqual([
      { accountName: "Chequing", currency: "CAD", transactionCount: 2, amountMinor: 9750 }
    ]);
    // Aggregate-only: raw descriptions never leak into the output.
    expect(stdout).not.toContain("Invoice payment");
  });

  it("exits 3 when diagnostics are present", () => {
    const csvPath = join(workDir, "unknown.csv");
    writeFileSync(csvPath, "Foo,Bar\nA,B\n");

    const { status, stdout } = runCli([csvPath]);
    const report = JSON.parse(stdout);

    expect(status).toBe(3);
    expect(report.diagnostics.length).toBeGreaterThan(0);
  });

  it("exits 2 without a path argument", () => {
    const { status } = runCli([]);
    expect(status).toBe(2);
  });
});
