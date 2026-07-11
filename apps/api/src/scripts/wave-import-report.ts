/**
 * Wave transactions import report — local operator tool.
 *
 * Usage: tsx src/scripts/wave-import-report.ts <path-to-wave-transactions.csv> [currency]
 *
 * Reads a Wave "Export all transactions" CSV placed locally (e.g. tmp/wave-export/)
 * and prints an AGGREGATE-ONLY report as JSON: row counts, per-account/currency
 * totals, duplicate source hashes, and parse diagnostics. It never prints raw
 * transaction rows/descriptions so the output is safe to paste; the source CSV
 * itself must never be committed (real financial data).
 */
import { readFileSync } from "node:fs";

import { buildWaveTransactionsImportReport } from "../finance-import/wave-report.js";

function main(argv: readonly string[]): number {
  const filePath = argv[0];
  if (!filePath) {
    process.stderr.write("usage: wave-import-report <csv-path> [currency]\n");
    return 2;
  }

  const currency = argv[1] ?? "CAD";
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    process.stderr.write(`cannot read ${filePath}: ${(error as Error).message}\n`);
    return 1;
  }

  const report = buildWaveTransactionsImportReport(content, currency);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report.diagnostics.length > 0 ? 3 : 0;
}

process.exit(main(process.argv.slice(2)));
