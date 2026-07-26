/**
 * OFX upload provider. File normalization is delegated to the shared strict
 * snapshot adapter so this provider and the one-shot import CLI cannot drift.
 */
import type {
  BankProvider,
  ListTransactionsParams,
  ListTransactionsResult,
  NormalizedAccount,
  ProviderContext,
} from "../fdx.js";
import {
  parseOfx,
  readOfxSnapshot,
  resolveOfxPath,
  type OfxSnapshotOptions,
} from "./ofx-snapshot.js";

export { parseOfx, resolveOfxPath } from "./ofx-snapshot.js";

export interface OfxUploadOptions {
  /**
   * Directory the OFX source must live under. MCP retains its historical cwd
   * default; the import CLI deliberately requires an explicit configured base.
   */
  allowedBaseDir?: string;
  /** May lower, but never raise, the strict v1 source byte cap. */
  maxBytes?: number;
  /** May lower, but never raise, the strict v1 transaction cap. */
  maxTransactions?: number;
}

function snapshotOptions(options: OfxUploadOptions): OfxSnapshotOptions {
  return {
    allowedBaseDir: options.allowedBaseDir ?? process.cwd(),
    ...(options.maxBytes !== undefined ? { maxBytes: options.maxBytes } : {}),
    ...(options.maxTransactions !== undefined ? { maxTransactions: options.maxTransactions } : {}),
  };
}

/**
 * Builds an OFX provider. Each call takes one bounded snapshot and discards
 * raw source data immediately after normalization; nothing is cached.
 */
export function createOfxUploadProvider(options: OfxUploadOptions = {}): BankProvider {
  const strictOptions = snapshotOptions(options);

  function sourceSnapshot(ctx: ProviderContext) {
    if (!ctx.filePath) {
      throw new Error("ofx-upload: filePath is required");
    }
    return readOfxSnapshot(ctx.filePath, strictOptions);
  }

  return {
    id: "ofx-upload",

    async listAccounts(ctx: ProviderContext): Promise<NormalizedAccount[]> {
      return [sourceSnapshot(ctx).account];
    },

    async listTransactions(
      ctx: ProviderContext,
      params: ListTransactionsParams,
    ): Promise<ListTransactionsResult> {
      let { transactions } = sourceSnapshot(ctx);

      if (params.accountId) {
        const accountId = params.accountId;
        transactions = transactions.filter((transaction) => transaction.accountId === accountId);
      }
      if (params.since) {
        const since = params.since;
        transactions = transactions.filter((transaction) => transaction.postedAt >= since);
      }
      return { transactions };
    },
  };
}
