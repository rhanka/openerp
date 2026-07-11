/**
 * OFX upload provider — zero-cost, zero-custody fallback (see docs/studies/2026-07-06-sentropic-
 * connecteur-plaid-mutualise.md §3.3: Desjardins/Plaid coverage gaps make OFX upload a required
 * multi-provider path, not an optional one).
 *
 * Parses the minimal subset of OFX (SGML, not XML) needed for a statement download:
 * <STMTTRN> blocks with DTPOSTED, TRNAMT, FITID, NAME/MEMO. No external dependency — OFX v1 tags
 * are `<TAG>value` on their own line with no closing tag, so a small line-oriented regex scan is
 * enough for this skeleton. Known limitation: only the first <BANKACCTFROM>/<CURDEF> in the file
 * is used, i.e. multi-account OFX files are not split per account.
 */
import { readFileSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

import type {
  BankProvider,
  ListTransactionsParams,
  ListTransactionsResult,
  NormalizedAccount,
  NormalizedTransaction,
  ProviderContext,
} from "../fdx.js";

const STMTTRN_BLOCK_RE = /<STMTTRN>[\s\S]*?<\/STMTTRN>/gi;

function extractTag(source: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^\\r\\n<]*)`, "i").exec(source);
  return match?.[1]?.trim() || undefined;
}

/** Turns an OFX DTPOSTED value (YYYYMMDD[HHMMSS][.sss][tz]) into an ISO 8601 timestamp. */
function parseOfxDate(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  const year = digits.slice(0, 4) || "1970";
  const month = digits.slice(4, 6) || "01";
  const day = digits.slice(6, 8) || "01";
  const hour = digits.slice(8, 10) || "00";
  const minute = digits.slice(10, 12) || "00";
  const second = digits.slice(12, 14) || "00";
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
}

function requireField(block: string, tag: string): string {
  const value = extractTag(block, tag);
  if (!value) {
    throw new Error(`ofx-upload: missing <${tag}> in a <STMTTRN> block`);
  }
  return value;
}

interface OfxParsed {
  accountId: string;
  currency: string;
  transactions: NormalizedTransaction[];
}

/** Pure OFX text -> normalized parse. No filesystem access — unit-testable on a fixed fixture. */
export function parseOfx(content: string): OfxParsed {
  const accountId = extractTag(content, "ACCTID") ?? "unknown";
  const currency = extractTag(content, "CURDEF") ?? "CAD";

  const blocks = content.match(STMTTRN_BLOCK_RE) ?? [];
  const transactions = blocks.map((block): NormalizedTransaction => {
    const fitid = requireField(block, "FITID");
    const dtposted = requireField(block, "DTPOSTED");
    const trnamt = requireField(block, "TRNAMT");
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");
    const description = name ?? memo ?? "";

    return {
      id: fitid,
      accountId,
      postedAt: parseOfxDate(dtposted),
      // OFX TRNAMT is already signed with the normalized convention (positive = credit).
      amount: Number.parseFloat(trnamt),
      currency,
      description,
      status: "posted",
      providerRef: fitid,
    };
  });

  return { accountId, currency, transactions };
}

export interface OfxUploadOptions {
  /**
   * Directory the uploaded .ofx file must live under. Any `ctx.filePath` that resolves outside it
   * (path traversal, absolute escape) is rejected before the file is opened. When omitted, the
   * process cwd is used as the base — callers SHOULD pass an explicit upload dir.
   */
  allowedBaseDir?: string;
}

/**
 * Resolves `filePath` and guarantees it stays within `allowedBaseDir`. Rejects `../` traversal,
 * absolute paths escaping the base, and NUL bytes. Returns the safe absolute path to open.
 */
export function resolveOfxPath(filePath: string, allowedBaseDir?: string): string {
  if (filePath.includes("\0")) {
    throw new Error("ofx-upload: filePath contains a NUL byte");
  }
  const base = resolve(allowedBaseDir ?? process.cwd());
  const resolved = isAbsolute(filePath) ? resolve(filePath) : resolve(base, filePath);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    throw new Error("ofx-upload: filePath escapes the allowed upload directory");
  }
  return resolved;
}

/**
 * Builds an ofx-upload provider. The uploaded OFX text is read, parsed, and discarded within each
 * call — it is never cached in module or instance state (own-OFX stays ephemeral, C1 requirement).
 */
export function createOfxUploadProvider(options: OfxUploadOptions = {}): BankProvider {
  const { allowedBaseDir } = options;

  return {
    id: "ofx-upload",

    async listAccounts(ctx: ProviderContext): Promise<NormalizedAccount[]> {
      if (!ctx.filePath) {
        throw new Error("ofx-upload: filePath is required");
      }
      const content = readFileSync(resolveOfxPath(ctx.filePath, allowedBaseDir), "utf8");
      const bankId = extractTag(content, "BANKID");
      const { accountId, currency } = parseOfx(content);

      const account: NormalizedAccount = {
        id: accountId,
        providerRef: accountId,
        name: `OFX ${accountId}`,
        type: "checking",
        currency,
        institution: bankId ?? "ofx-upload",
      };
      return [account];
    },

    async listTransactions(
      ctx: ProviderContext,
      params: ListTransactionsParams
    ): Promise<ListTransactionsResult> {
      if (!ctx.filePath) {
        throw new Error("ofx-upload: filePath is required");
      }
      const content = readFileSync(resolveOfxPath(ctx.filePath, allowedBaseDir), "utf8");
      let { transactions } = parseOfx(content);

      if (params.accountId) {
        const accountId = params.accountId;
        transactions = transactions.filter((t) => t.accountId === accountId);
      }
      if (params.since) {
        const since = params.since;
        transactions = transactions.filter((t) => t.postedAt >= since);
      }

      return { transactions };
    },
  };
}
