import { stageWaveTransactionsCsv, type WaveTransactionStagingRow } from "./wave-csv";

export interface WaveAccountTotal {
  readonly accountName: string;
  readonly currency: string;
  readonly transactionCount: number;
  readonly amountMinor: number;
}

export interface WaveImportReport {
  readonly rowCount: number;
  readonly parsedAmountCount: number;
  readonly unparsedAmountCount: number;
  readonly duplicateSourceHashes: string[];
  readonly accountTotals: WaveAccountTotal[];
  readonly diagnostics: string[];
}

export function buildWaveTransactionsImportReport(content: string, currency = "CAD"): WaveImportReport {
  const staged = stageWaveTransactionsCsv(content, currency);
  return buildWaveImportReport(staged.rows, staged.diagnostics);
}

export function buildWaveImportReport(
  rows: readonly WaveTransactionStagingRow[],
  diagnostics: readonly string[] = []
): WaveImportReport {
  const hashCounts = new Map<string, number>();
  const accountTotals = new Map<string, { accountName: string; transactionCount: number; amountMinor: number; currency: string }>();
  let parsedAmountCount = 0;
  let unparsedAmountCount = 0;

  for (const row of rows) {
    hashCounts.set(row.sourceHash, (hashCounts.get(row.sourceHash) ?? 0) + 1);

    if (row.amountMinor === null) {
      unparsedAmountCount += 1;
      continue;
    }

    parsedAmountCount += 1;
    const accountName = row.accountName ?? "(unknown account)";
    const key = JSON.stringify([accountName, row.currency]);
    const current = accountTotals.get(key) ?? { accountName, transactionCount: 0, amountMinor: 0, currency: row.currency };
    accountTotals.set(key, {
      accountName,
      transactionCount: current.transactionCount + 1,
      amountMinor: current.amountMinor + row.amountMinor,
      currency: current.currency
    });
  }

  const duplicateSourceHashes = Array.from(hashCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([hash]) => hash)
    .sort();

  return {
    rowCount: rows.length,
    parsedAmountCount,
    unparsedAmountCount,
    duplicateSourceHashes,
    accountTotals: Array.from(accountTotals.values())
      .map((total) => ({
        accountName: total.accountName,
        currency: total.currency,
        transactionCount: total.transactionCount,
        amountMinor: total.amountMinor
      }))
      .sort((left, right) => left.accountName.localeCompare(right.accountName) || left.currency.localeCompare(right.currency)),
    diagnostics: [...diagnostics]
  };
}
