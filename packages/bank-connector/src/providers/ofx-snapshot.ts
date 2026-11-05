/**
 * Strict, single-read OFX snapshot adapter shared by the OFX provider and the
 * one-shot import CLI. Source bytes stay in this process and are converted to
 * an immutable normalized snapshot before either caller can use them.
 */
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import type {
  NormalizedAccount,
  NormalizedAccountType,
  NormalizedTransaction,
} from "../fdx.js";

export const DEFAULT_OFX_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_OFX_MAX_TRANSACTIONS = 2_000;

const MAX_OFX_MAX_BYTES = DEFAULT_OFX_MAX_BYTES;
const STMTTRN_BLOCK_RE = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
const STMTTRN_START_RE = /<STMTTRN>/gi;
const BANK_ACCOUNT_BLOCK_RE = /<BANKACCTFROM>([\s\S]*?)<\/BANKACCTFROM>/gi;
const BANK_ACCOUNT_START_RE = /<BANKACCTFROM>/gi;
const ACCOUNT_SECTION_START_RE = /<(?:BANKACCTFROM|CCACCTFROM|INVACCTFROM)>/gi;

export class OfxInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfxInputError";
  }
}

export interface OfxSnapshot {
  account: NormalizedAccount;
  transactions: NormalizedTransaction[];
}

/** Backward-compatible pure-parser view used by the existing provider tests. */
export interface ParsedOfx extends OfxSnapshot {
  accountId: string;
  currency: string;
}

export interface OfxSnapshotOptions {
  /** Explicit import base that the supplied file must resolve beneath. */
  allowedBaseDir: string;
  /** May lower the 5 MiB hard maximum but must never raise it. */
  maxBytes?: number;
  /** May lower the v1 batch maximum but must never raise it. */
  maxTransactions?: number;
}

function inputError(message: string): never {
  throw new OfxInputError(`ofx-upload: ${message}`);
}

function requireNoNul(value: string, field: string): void {
  if (value.includes("\0")) inputError(`${field} contains a NUL byte`);
}

function isWithin(base: string, candidate: string): boolean {
  const path = relative(base, candidate);
  return path !== "" && path !== ".." && !path.startsWith("../") && !isAbsolute(path);
}

function assertNoLexicalTraversal(filePath: string): void {
  const segments = filePath.split(/[\\/]+/u);
  if (segments.includes("..")) inputError("filePath escapes the configured import base through lexical traversal");
}

function resolveBaseDir(allowedBaseDir: string): string {
  requireNoNul(allowedBaseDir, "allowedBaseDir");
  let base: string;
  try {
    base = realpathSync(allowedBaseDir);
  } catch {
    return inputError("configured import base is unavailable");
  }
  try {
    if (!statSync(base).isDirectory()) {
      return inputError("configured import base is not a directory");
    }
  } catch {
    return inputError("configured import base is unavailable");
  }
  return base;
}

export function assertRegularOfxFile(stat: { isSymbolicLink(): boolean; isFile(): boolean }): void {
  if (stat.isSymbolicLink()) inputError("OFX source must not be a symlink");
  if (!stat.isFile()) inputError("OFX source must be a regular file");
}

function requireRegularNonSymlink(path: string): void {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    return inputError("OFX source is unavailable");
  }
  assertRegularOfxFile(stat);
}

/**
 * Resolves an existing source with real-path containment and final-component
 * non-symlink checks. The bounded open/read below repeats the regular-file
 * check on its descriptor to close the check-to-open race.
 */
export function resolveOfxPath(filePath: string, allowedBaseDir: string): string {
  requireNoNul(filePath, "filePath");
  if (filePath.length === 0) inputError("filePath is required");
  assertNoLexicalTraversal(filePath);

  const configuredBase = resolve(allowedBaseDir);
  const candidate = isAbsolute(filePath) ? resolve(filePath) : resolve(configuredBase, filePath);
  requireRegularNonSymlink(candidate);

  const base = resolveBaseDir(allowedBaseDir);
  let realCandidate: string;
  try {
    realCandidate = realpathSync(candidate);
  } catch {
    return inputError("OFX source is unavailable");
  }
  if (!isWithin(base, realCandidate)) inputError("OFX source escapes the configured import base");
  if (!filePath.endsWith(".ofx")) inputError("OFX source must use the .ofx extension");
  return realCandidate;
}

function resolveMaxBytes(value: number | undefined): number {
  if (value === undefined) return DEFAULT_OFX_MAX_BYTES;
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_OFX_MAX_BYTES) {
    inputError(`byte cap must be an integer between 1 and ${MAX_OFX_MAX_BYTES}`);
  }
  return value;
}

function resolveMaxTransactions(value: number | undefined): number {
  if (value === undefined) return DEFAULT_OFX_MAX_TRANSACTIONS;
  if (!Number.isSafeInteger(value) || value < 1 || value > DEFAULT_OFX_MAX_TRANSACTIONS) {
    inputError(`transaction cap must be an integer between 1 and ${DEFAULT_OFX_MAX_TRANSACTIONS}`);
  }
  return value;
}

interface FileFingerprint {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
}

function fingerprint(fd: number): FileFingerprint {
  const stat = fstatSync(fd);
  if (!stat.isFile()) inputError("OFX source must be a regular file");
  return {
    dev: stat.dev,
    ino: stat.ino,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
  };
}

function sameFingerprint(left: FileFingerprint, right: FileFingerprint): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

/** Reads exactly one bounded immutable byte snapshot. No caller receives the source bytes. */
function readBoundedOfxText(path: string, maxBytes: number): string {
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fingerprint(fd);
    if (before.size > maxBytes) inputError("OFX source exceeds the configured byte cap");

    // One spare byte detects a file that grows during the bounded read without
    // ever allocating beyond the configured maximum plus that sentinel.
    const bytes = Buffer.alloc(before.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    const after = fingerprint(fd);
    if (offset !== before.size || !sameFingerprint(before, after)) {
      inputError("OFX source changed while it was read");
    }
    return bytes.subarray(0, offset).toString("utf8");
  } catch (error) {
    if (error instanceof OfxInputError) throw error;
    return inputError("OFX source could not be read safely");
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function extractTag(source: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^\\r\\n<]*)`, "i").exec(source);
  return match?.[1];
}

function extractTags(source: string, tag: string): string[] {
  return [...source.matchAll(new RegExp(`<${tag}>([^\\r\\n<]*)`, "gi"))]
    .map((match) => match[1] ?? "");
}

function requireSourceText(value: string | undefined, tag: string): string {
  if (value === undefined || value.trim() === "") inputError(`missing <${tag}>`);
  return value;
}

function parseOfxDate(raw: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2})(?:\.(\d{1,3}))?)?$/.exec(raw);
  if (!match) inputError("malformed OFX date");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? 0 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const millisecond = match[7] === undefined ? 0 : Number(match[7].padEnd(3, "0"));
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    inputError("malformed OFX date");
  }
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
    || parsed.getUTCHours() !== hour
    || parsed.getUTCMinutes() !== minute
    || parsed.getUTCSeconds() !== second
  ) {
    inputError("malformed OFX date");
  }
  return parsed.toISOString();
}

function parseStrictAmount(raw: string): number {
  if (!/^[+-]?\d+(?:\.\d{1,2})?$/.test(raw)) inputError("invalid OFX decimal amount");
  const amount = Number(raw);
  const scaled = amount * 100;
  const minor = Math.round(scaled);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(minor) || Math.abs(scaled - minor) > 1e-8) {
    inputError("invalid OFX decimal amount");
  }
  return amount;
}

function normalizeAccountType(raw: string | undefined): NormalizedAccountType {
  if (raw === undefined || raw.trim() === "") return "checking";
  const type = raw.trim().toLowerCase();
  if (type === "checking") return "checking";
  if (type === "savings" || type === "moneymrkt") return "savings";
  if (type === "credit" || type === "creditline") return "credit";
  if (type === "loan") return "loan";
  if (type === "investment") return "investment";
  if (type === "other") return "other";
  inputError("unsupported OFX account type");
}

/** Pure strict OFX text -> normalized snapshot; it deliberately has no filesystem access. */
export function parseOfx(content: string, options: { maxTransactions?: number } = {}): ParsedOfx {
  const maxTransactions = resolveMaxTransactions(options.maxTransactions);
  const accountSections = content.match(ACCOUNT_SECTION_START_RE) ?? [];
  const accountStarts = content.match(BANK_ACCOUNT_START_RE) ?? [];
  const accountBlocks = [...content.matchAll(BANK_ACCOUNT_BLOCK_RE)].map((match) => match[1] ?? "");
  if (accountSections.length !== 1 || accountStarts.length !== 1 || accountBlocks.length !== 1) {
    inputError("exactly one BANKACCTFROM account section is required");
  }
  const accountBlock = accountBlocks[0]!;
  const accountId = requireSourceText(extractTag(accountBlock, "ACCTID"), "ACCTID");
  const bankId = requireSourceText(extractTag(content, "BANKID"), "BANKID");
  const currencies = extractTags(content, "CURDEF");
  if (currencies.length !== 1) inputError("exactly one <CURDEF> is required");
  const currency = requireSourceText(currencies[0], "CURDEF");

  const transactionStarts = content.match(STMTTRN_START_RE) ?? [];
  const blocks = [...content.matchAll(STMTTRN_BLOCK_RE)].map((match) => match[1] ?? "");
  if (transactionStarts.length !== blocks.length) inputError("malformed STMTTRN section");
  if (blocks.length > maxTransactions) inputError("OFX source exceeds the transaction cap");

  const transactions = blocks.map((block): NormalizedTransaction => {
    const fitid = requireSourceText(extractTag(block, "FITID"), "FITID");
    const postedAt = parseOfxDate(requireSourceText(extractTag(block, "DTPOSTED"), "DTPOSTED"));
    const amount = parseStrictAmount(requireSourceText(extractTag(block, "TRNAMT"), "TRNAMT"));
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");
    const description = name !== undefined && name.trim() !== "" ? name : memo;
    if (description === undefined || description.trim() === "") inputError("missing transaction description");

    return {
      id: fitid,
      accountId,
      postedAt,
      amount,
      currency,
      description,
      status: "posted",
      providerRef: fitid,
    };
  });

  return {
    account: {
      id: accountId,
      providerRef: accountId,
      name: `OFX ${accountId}`,
      type: normalizeAccountType(extractTag(accountBlock, "ACCTTYPE")),
      currency,
      institution: bankId,
    },
    transactions,
    accountId,
    currency,
  };
}

/**
 * Resolves, opens, bounds, and parses one OFX source. The returned object is
 * the sole normalized snapshot used by the provider/CLI; neither retains the
 * raw source string or bytes.
 */
export function readOfxSnapshot(filePath: string, options: OfxSnapshotOptions): OfxSnapshot {
  const maxBytes = resolveMaxBytes(options.maxBytes);
  const path = resolveOfxPath(filePath, options.allowedBaseDir);
  const content = readBoundedOfxText(path, maxBytes);
  return parseOfx(content, {
    ...(options.maxTransactions !== undefined ? { maxTransactions: options.maxTransactions } : {}),
  });
}
