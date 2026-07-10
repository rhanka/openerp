import { createHash } from "node:crypto";

export interface WaveCsvRow {
  readonly lineNumber: number;
  readonly raw: Record<string, string>;
  readonly sourceHash: string;
}

export interface WaveTransactionsParseResult {
  readonly headers: string[];
  readonly rows: WaveCsvRow[];
  readonly diagnostics: string[];
}

export interface WaveTransactionStagingRow {
  readonly sourceHash: string;
  readonly lineNumber: number;
  readonly date: string | null;
  readonly accountName: string | null;
  readonly description: string | null;
  readonly amountMinor: number | null;
  readonly currency: string;
  readonly raw: Record<string, string>;
}

const DATE_HEADERS = ["date", "transaction date", "posted date"];
const ACCOUNT_HEADERS = ["account", "account name"];
const DESCRIPTION_HEADERS = ["description", "memo", "payee", "name"];
const AMOUNT_HEADERS = ["amount", "net amount", "total"];
const DEBIT_HEADERS = ["debit", "withdrawal", "withdrawals"];
const CREDIT_HEADERS = ["credit", "deposit", "deposits"];

export function parseWaveCsv(content: string): WaveTransactionsParseResult {
  const diagnostics: string[] = [];
  const records = parseCsvRecords(content.replace(/^﻿/, ""));

  if (records.length === 0) {
    return { headers: [], rows: [], diagnostics: ["empty-csv"] };
  }

  const headerRecord = records[0] ?? [];
  const headers = headerRecord.map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    return { headers: [], rows: [], diagnostics: ["missing-header"] };
  }

  const seenHeaders = new Set<string>();
  for (const header of headers) {
    const key = normalizeHeader(header);
    if (seenHeaders.has(key)) {
      diagnostics.push(`duplicate-header:${header}`);
    }
    seenHeaders.add(key);
  }

  const rows: WaveCsvRow[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const record = records[index] ?? [];
    if (record.every((value) => value.trim() === "")) {
      continue;
    }

    if (record.length !== headers.length) {
      diagnostics.push(`line-${index + 1}:column-count:${record.length}:expected:${headers.length}`);
    }

    const raw: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      raw[header] = record[columnIndex]?.trim() ?? "";
    });

    rows.push({
      lineNumber: index + 1,
      raw,
      sourceHash: sha256Canonical(raw)
    });
  }

  return { headers, rows, diagnostics };
}

export function stageWaveTransactionsCsv(content: string, currency = "CAD"): {
  readonly rows: WaveTransactionStagingRow[];
  readonly diagnostics: string[];
} {
  const parsed = parseWaveCsv(content);
  const diagnostics = [...parsed.diagnostics];
  const headers = parsed.headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));

  const findHeader = (candidates: string[]): string | null => {
    const match = headers.find((header) => candidates.includes(header.normalized));
    return match?.original ?? null;
  };

  const dateHeader = findHeader(DATE_HEADERS);
  const accountHeader = findHeader(ACCOUNT_HEADERS);
  const descriptionHeader = findHeader(DESCRIPTION_HEADERS);
  const amountHeader = findHeader(AMOUNT_HEADERS);
  const debitHeader = findHeader(DEBIT_HEADERS);
  const creditHeader = findHeader(CREDIT_HEADERS);

  if (!dateHeader) diagnostics.push("missing-date-column");
  if (!accountHeader) diagnostics.push("missing-account-column");
  if (!descriptionHeader) diagnostics.push("missing-description-column");
  if (!amountHeader && !debitHeader && !creditHeader) diagnostics.push("missing-amount-column");

  const rows = parsed.rows.map((row) => {
    const amountMinor = amountHeader
      ? parseMoneyMinor(row.raw[amountHeader])
      : combineDebitCredit(row.raw[debitHeader ?? ""], row.raw[creditHeader ?? ""]);

    if (amountMinor === null) {
      diagnostics.push(`line-${row.lineNumber}:amount-unparsed`);
    }

    return {
      sourceHash: row.sourceHash,
      lineNumber: row.lineNumber,
      date: valueOrNull(dateHeader ? row.raw[dateHeader] : null),
      accountName: valueOrNull(accountHeader ? row.raw[accountHeader] : null),
      description: valueOrNull(descriptionHeader ? row.raw[descriptionHeader] : null),
      amountMinor,
      currency,
      raw: row.raw
    };
  });

  return { rows, diagnostics };
}

export function parseMoneyMinor(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const negativeByParens = /^\(.*\)$/.test(trimmed);
  const normalized = trimmed
    .replace(/^\((.*)\)$/, "$1")
    .replace(/[$€£CA USDcadusd\s]/g, "")
    .replace(/,/g, ".");

  const lastDot = normalized.lastIndexOf(".");
  const canonical = lastDot === -1
    ? normalized.replace(/[^0-9-]/g, "")
    : `${normalized.slice(0, lastDot).replace(/[^0-9-]/g, "")}.${normalized.slice(lastDot + 1).replace(/[^0-9]/g, "")}`;

  const amount = Number.parseFloat(canonical);
  if (!Number.isFinite(amount)) return null;
  const minor = Math.round(Math.abs(amount) * 100) * (amount < 0 || negativeByParens ? -1 : 1);
  return Object.is(minor, -0) ? 0 : minor;
}

function combineDebitCredit(debitValue: string | undefined, creditValue: string | undefined): number | null {
  const debit = parseMoneyMinor(debitValue);
  const credit = parseMoneyMinor(creditValue);
  if (debit === null && credit === null) return null;
  return (credit ?? 0) - Math.abs(debit ?? 0);
}

function parseCsvRecords(content: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      record.push(field);
      field = "";
      records.push(record);
      record = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function valueOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function sha256Canonical(raw: Record<string, string>): string {
  const canonical = Object.keys(raw)
    .sort()
    .map((key) => `${key}:${raw[key]}`)
    .join("\n");
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}
