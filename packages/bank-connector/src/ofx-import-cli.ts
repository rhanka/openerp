#!/usr/bin/env node
/**
 * One-shot, connector-owned OFX producer. It never accepts tenant input,
 * reads a bounded local source once, and sends only normalized JSON to the
 * existing API write boundary.
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  NormalizedAccount,
  NormalizedAccountType,
  NormalizedTransaction,
} from "./fdx.js";
import {
  DEFAULT_OFX_MAX_BYTES,
  OfxInputError,
  readOfxSnapshot,
  type OfxSnapshot,
} from "./providers/ofx-snapshot.js";
import { resolveServerContext } from "./server-context.js";

const ACCOUNT_TYPES: readonly NormalizedAccountType[] = [
  "checking",
  "savings",
  "credit",
  "loan",
  "investment",
  "other",
];
const MAX_ID_TEXT = 512;
const MAX_DESCRIPTION_TEXT = 4 * 1024;
const MAX_SHORT_TEXT = 512;

export interface BankingImportAccountInput {
  id: string;
  providerRef: string;
  name: string;
  type: NormalizedAccountType;
  currency: string;
  institution: string;
}

export interface BankingImportTransactionInput {
  id: string;
  accountId: string;
  postedAt: string;
  amount: number;
  currency: string;
  description: string;
  merchant?: string;
  category?: string;
  status: "posted";
  providerRef: string;
}

export interface BankingImportInput {
  provider: "ofx-upload";
  account: BankingImportAccountInput;
  transactions: BankingImportTransactionInput[];
}

export interface PreparedOfxImport {
  body: BankingImportInput;
  sourceRows: number;
  pendingOmitted: number;
  submitted: number;
}

class ImportInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportInputError";
  }
}

class CliFailure extends Error {
  constructor(
    readonly code: CliErrorCode,
    readonly exitCode: 1 | 2,
  ) {
    super(code);
    this.name = "CliFailure";
  }
}

type CliErrorCode =
  | "USAGE"
  | "CONFIG_ERROR"
  | "AUTH_REQUIRED"
  | "INVALID_INPUT"
  | "AUTH_REJECTED"
  | "HTTP_REJECTED"
  | "HTTP_FAILURE"
  | "API_PROTOCOL";

interface WritableOutput {
  write(chunk: string): boolean;
}

export interface OfxImportCliDependencies {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  stdout?: WritableOutput;
  stderr?: WritableOutput;
}

interface CliConfig {
  filePath: string;
  baseDir: string;
  apiUrl: string;
  bearerToken: string;
  maxBytes: number;
}

function importInputError(message: string): never {
  throw new ImportInputError(message);
}

function requireText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > max) {
    importInputError("invalid normalized text field");
  }
  return value;
}

function canonicalCurrency(value: unknown): string {
  const raw = requireText(value, 3).trim();
  const currency = raw.toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) importInputError("invalid normalized currency");
  return currency;
}

function assertStrictIsoTimestamp(value: unknown): string {
  const raw = requireText(value, 64);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(raw);
  if (!match) importInputError("invalid normalized postedAt");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    importInputError("invalid normalized postedAt");
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    importInputError("invalid normalized postedAt");
  }
  if (!Number.isFinite(Date.parse(raw))) importInputError("invalid normalized postedAt");
  return raw;
}

function assertScaleTwoAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) importInputError("invalid normalized amount");
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-8) {
    importInputError("invalid normalized amount");
  }
  return value;
}

function optionalText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return requireText(value, MAX_SHORT_TEXT);
}

function assertAccount(account: NormalizedAccount): BankingImportAccountInput {
  const type = account.type;
  if (!ACCOUNT_TYPES.includes(type)) importInputError("invalid normalized account type");
  return {
    id: requireText(account.id, MAX_ID_TEXT),
    providerRef: requireText(account.providerRef, MAX_ID_TEXT),
    name: requireText(account.name, MAX_DESCRIPTION_TEXT),
    type,
    currency: canonicalCurrency(account.currency),
    institution: requireText(account.institution, MAX_DESCRIPTION_TEXT),
  };
}

function assertTransactionIdentity(transaction: NormalizedTransaction, refs: Set<string>): {
  id: string;
  providerRef: string;
} {
  const id = requireText(transaction.id, MAX_ID_TEXT);
  const providerRef = requireText(transaction.providerRef, MAX_ID_TEXT);
  if (refs.has(providerRef)) importInputError("duplicated transaction providerRef");
  refs.add(providerRef);
  return { id, providerRef };
}

/**
 * Maps exactly one normalized OFX account into the already-shipped banking
 * wire contract. Identity is copied, never derived; account balances and any
 * tenant/file/provider payload fields are deliberately absent.
 */
export function prepareOfxImport(snapshot: OfxSnapshot): PreparedOfxImport {
  const mappedAccount = assertAccount(snapshot.account);
  const providerRefs = new Set<string>();
  const transactions: BankingImportTransactionInput[] = [];
  let pendingOmitted = 0;

  for (const transaction of snapshot.transactions) {
    const identity = assertTransactionIdentity(transaction, providerRefs);
    if (transaction.status === "pending") {
      pendingOmitted += 1;
      continue;
    }
    if (transaction.status !== "posted") importInputError("invalid normalized transaction status");
    const accountId = requireText(transaction.accountId, MAX_ID_TEXT);
    if (accountId !== mappedAccount.id) importInputError("normalized transaction accountId is orphaned");
    const currency = canonicalCurrency(transaction.currency);
    if (currency !== mappedAccount.currency) importInputError("normalized transaction currency does not match account");
    const merchant = optionalText(transaction.merchant);
    const category = optionalText(transaction.category);
    transactions.push({
      id: identity.id,
      accountId,
      postedAt: assertStrictIsoTimestamp(transaction.postedAt),
      // Keep signed major units intact. The API is the scale-2 conversion boundary.
      amount: assertScaleTwoAmount(transaction.amount),
      currency,
      description: requireText(transaction.description, MAX_DESCRIPTION_TEXT),
      ...(merchant !== undefined ? { merchant } : {}),
      ...(category !== undefined ? { category } : {}),
      status: "posted",
      providerRef: identity.providerRef,
    });
  }

  return {
    body: {
      provider: "ofx-upload",
      account: mappedAccount,
      transactions,
    },
    sourceRows: snapshot.transactions.length,
    pendingOmitted,
    submitted: transactions.length,
  };
}

function parseArgs(argv: readonly string[]): { filePath: string } {
  if (argv.length !== 2 || argv[0] !== "--file" || argv[1] === undefined || argv[1] === "") {
    throw new CliFailure("USAGE", 2);
  }
  return { filePath: argv[1] };
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string, code: CliErrorCode): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") throw new CliFailure(code, 2);
  return value;
}

function configuredMaxBytes(env: NodeJS.ProcessEnv): number {
  const raw = env.BANK_CONNECTOR_OFX_IMPORT_MAX_BYTES;
  if (raw === undefined) return DEFAULT_OFX_MAX_BYTES;
  if (!/^[1-9]\d*$/u.test(raw)) throw new CliFailure("CONFIG_ERROR", 2);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > DEFAULT_OFX_MAX_BYTES) {
    throw new CliFailure("CONFIG_ERROR", 2);
  }
  return value;
}

function readConfig(argv: readonly string[], env: NodeJS.ProcessEnv): CliConfig {
  const { filePath } = parseArgs(argv);
  const baseDir = requiredEnv(env, "BANK_CONNECTOR_OFX_IMPORT_BASE_DIR", "CONFIG_ERROR");
  const rawApiUrl = requiredEnv(env, "OPENERP_BANK_IMPORT_API_URL", "CONFIG_ERROR");
  const bearerToken = requiredEnv(env, "OPENERP_BANK_IMPORT_BEARER_TOKEN", "AUTH_REQUIRED");
  if (/\s/u.test(bearerToken)) throw new CliFailure("AUTH_REQUIRED", 2);
  let apiUrl: string;
  try {
    const url = new URL(rawApiUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    apiUrl = new URL("/banking/import", url).toString();
  } catch {
    throw new CliFailure("CONFIG_ERROR", 2);
  }
  return { filePath, baseDir, apiUrl, bearerToken, maxBytes: configuredMaxBytes(env) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function submitImport(
  prepared: PreparedOfxImport,
  config: CliConfig,
  fetchImpl: typeof fetch,
): Promise<{ newlyImported: number; replayNoOps: number }> {
  let response: Response;
  try {
    response = await fetchImpl(config.apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.bearerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(prepared.body),
    });
  } catch {
    throw new CliFailure("HTTP_FAILURE", 1);
  }
  if (!response.ok) {
    throw new CliFailure(response.status === 401 || response.status === 403 ? "AUTH_REJECTED" : "HTTP_REJECTED", 1);
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new CliFailure("API_PROTOCOL", 1);
  }
  if (!isRecord(result) || !Array.isArray(result.imported) || result.skippedPending !== 0) {
    throw new CliFailure("API_PROTOCOL", 1);
  }
  const newlyImported = result.imported.length;
  if (newlyImported > prepared.submitted) throw new CliFailure("API_PROTOCOL", 1);
  return { newlyImported, replayNoOps: prepared.submitted - newlyImported };
}

function writeAggregate(output: WritableOutput, value: Record<string, number | string>): void {
  output.write(`${JSON.stringify(value)}\n`);
}

/**
 * Testable command entry point. Its observable output is aggregate-only; all
 * source paths, source data, bearer tokens, and raw API responses stay hidden.
 */
export async function runOfxImportCli(
  argv: readonly string[],
  dependencies: OfxImportCliDependencies = {},
): Promise<number> {
  const env = dependencies.env ?? process.env;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  try {
    const config = readConfig(argv, env);
    // Tenant context is constructed only by the zero-input trusted process
    // resolver. It is never serialized or converted into a request header.
    void resolveServerContext();
    const snapshot = readOfxSnapshot(config.filePath, {
      allowedBaseDir: config.baseDir,
      maxBytes: config.maxBytes,
    });
    const prepared = prepareOfxImport(snapshot);
    const result = await submitImport(prepared, config, fetchImpl);
    writeAggregate(stdout, {
      code: "OK",
      sourceRows: prepared.sourceRows,
      pendingOmitted: prepared.pendingOmitted,
      submitted: prepared.submitted,
      newlyImported: result.newlyImported,
      replayNoOps: result.replayNoOps,
    });
    return 0;
  } catch (error) {
    const failure = error instanceof CliFailure
      ? error
      : error instanceof OfxInputError || error instanceof ImportInputError
        ? new CliFailure("INVALID_INPUT", 1)
        : new CliFailure("HTTP_FAILURE", 1);
    writeAggregate(stderr, { code: failure.code });
    return failure.exitCode;
  }
}

async function main(): Promise<void> {
  const exitCode = await runOfxImportCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
