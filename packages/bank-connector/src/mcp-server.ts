#!/usr/bin/env node
/**
 * Bank connector MCP server (stdio) — squelette BANK-MCP.
 *
 * Exposes normalized (FDX-inspired) bank data as three tools: bank_list_providers,
 * bank_list_accounts, bank_list_transactions. Providers are pluggable (see src/fdx.ts,
 * src/providers/*) — today: plaid-sandbox and ofx-upload. Custody of provider credentials stays
 * in-process for this skeleton; the target architecture moves it to the Sentropic platform vault
 * (docs/studies/2026-07-06-sentropic-connecteur-plaid-mutualise.md §4).
 *
 * Run: node dist/mcp-server.js (after `npm run build`).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import type { BankProvider, ProviderContext, ListTransactionsParams } from "./fdx.js";
import { ofxUploadProvider } from "./providers/ofx-upload.js";
import { plaidSandboxProvider } from "./providers/plaid-sandbox.js";

const providers: readonly BankProvider[] = [plaidSandboxProvider, ofxUploadProvider];
const providersById = new Map(providers.map((provider) => [provider.id, provider] as const));

function requireProvider(id: string): BankProvider {
  const provider = providersById.get(id);
  if (!provider) {
    throw new Error(
      `unknown provider "${id}" — available: ${[...providersById.keys()].join(", ")}`
    );
  }
  return provider;
}

/** Never surface raw thrown values: keeps stack traces / unexpected payload fields out of tool errors. */
function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export const server = new McpServer({
  name: "openerp-bank-connector",
  version: "0.1.0",
});

server.registerTool(
  "bank_list_providers",
  {
    title: "List bank providers",
    description: "List the bank data providers available to this connector (id only, no credentials).",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ providers: providers.map((p) => ({ id: p.id })) }, null, 2),
      },
    ],
  })
);

server.registerTool(
  "bank_list_accounts",
  {
    title: "List bank accounts",
    description: "List normalized (FDX-inspired) bank accounts exposed by a provider.",
    inputSchema: {
      provider: z.string().describe("Provider id — see bank_list_providers"),
    },
  },
  async ({ provider }) => {
    try {
      const impl = requireProvider(provider);
      const accounts = await impl.listAccounts({});
      return { content: [{ type: "text" as const, text: JSON.stringify({ accounts }, null, 2) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text" as const, text: toErrorMessage(error) }] };
    }
  }
);

server.registerTool(
  "bank_list_transactions",
  {
    title: "List bank transactions",
    description:
      "List normalized (FDX-inspired) bank transactions from a provider, optionally scoped to an account.",
    inputSchema: {
      provider: z.string().describe("Provider id — see bank_list_providers"),
      accountId: z.string().optional().describe("Restrict to a single normalized account id"),
      since: z.string().optional().describe("ISO 8601 date — inclusive lower bound on postedAt"),
      cursor: z.string().optional().describe("Opaque pagination cursor returned by a previous call"),
      filePath: z.string().optional().describe("Path to a .ofx file — required for the ofx-upload provider"),
    },
  },
  async ({ provider, accountId, since, cursor, filePath }) => {
    try {
      const impl = requireProvider(provider);

      const ctx: ProviderContext = {};
      if (filePath) ctx.filePath = filePath;

      const params: ListTransactionsParams = {};
      if (accountId) params.accountId = accountId;
      if (since) params.since = since;
      if (cursor) params.cursor = cursor;

      const result = await impl.listTransactions(ctx, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text" as const, text: toErrorMessage(error) }] };
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(`bank-connector mcp-server failed to start: ${toErrorMessage(error)}`);
  process.exit(1);
});
