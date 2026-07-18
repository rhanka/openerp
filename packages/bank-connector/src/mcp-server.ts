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
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import type {
  BankProvider,
  Connector,
  ProviderContext,
  ListTransactionsParams,
  StpConnectorContext,
} from "./fdx.js";
import { createOfxUploadProvider } from "./providers/ofx-upload.js";
import { createPlaidSandboxProvider } from "./providers/plaid-sandbox.js";

/** Provider ids this connector can build — used by bank_list_providers without instantiating any. */
const PROVIDER_IDS = ["plaid-sandbox", "ofx-upload"] as const;

/** Directory uploaded .ofx files must live under (path-traversal guard). */
const OFX_UPLOAD_DIR = process.env.BANK_CONNECTOR_OFX_DIR ?? process.cwd();

/**
 * Builds a tenant-scoped Connector: a FRESH set of provider instances per call. No provider (and no
 * in-memory token cache it holds) is shared across tenants — this replaces the former module-global
 * provider singletons (C1 isolation requirement).
 */
export function createConnector(context: StpConnectorContext): Connector {
  const providersById = new Map<string, BankProvider>([
    ["plaid-sandbox", createPlaidSandboxProvider()],
    ["ofx-upload", createOfxUploadProvider({ allowedBaseDir: OFX_UPLOAD_DIR })],
  ]);

  return {
    context,
    listProviderIds: () => [...providersById.keys()],
    getProvider(id: string): BankProvider {
      const provider = providersById.get(id);
      if (!provider) {
        throw new Error(
          `unknown provider "${id}" — available: ${[...providersById.keys()].join(", ")}`
        );
      }
      return provider;
    },
  };
}

/** Fixed for this server process' single stdio session — there is no per-call client session to key on. */
const SERVER_SESSION_ID = randomUUID();

/**
 * Minimal secret lookup for the sandbox context: reads from process.env only, nothing persisted.
 * Providers still read their own provider-specific credentials directly (see
 * providers/plaid-sandbox.ts); this is the StpConnectorContext-shaped seam for callers that go
 * through `context.getSecret` instead.
 */
async function getSecret(name: string): Promise<string> {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`bank-connector: secret "${name}" is not set in the environment`);
  }
  return value;
}

/**
 * Server-side context resolver (ARCH-11). Builds a StpConnectorContext with NO client input at
 * all — this function takes zero arguments, so there is no channel for a tool caller to influence
 * tenantRef. In a real deployment the context is provided by the core (resolveTenant / S2S OBO
 * session, ARCH-11); the tenant is NEVER a client input. This standalone sandbox server has no
 * real core session yet, so it establishes a mono-tenant context from server config/env
 * (STP_TENANT_REF, defaulting to "local"). requestId is fresh per call; the MCP session id is
 * fixed for this process' stdio session.
 */
export function resolveServerContext(): StpConnectorContext {
  const tenantRef = process.env.STP_TENANT_REF ?? "local";
  return {
    requestId: randomUUID(),
    principal: {
      sub: process.env.STP_PRINCIPAL_SUB ?? "bank-connector-server",
      tenantRef,
      roles: [],
    },
    session: {
      mcpSessionId: SERVER_SESSION_ID,
      clientId: process.env.STP_CLIENT_ID ?? "openerp-bank-connector-mcp",
      source: process.env.STP_MCP_SOURCE ?? "claude-code",
    },
    tenantRef,
    consentRefs: [],
    getSecret,
  };
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
        text: JSON.stringify({ providers: PROVIDER_IDS.map((id) => ({ id })) }, null, 2),
      },
    ],
  })
);

/**
 * Client-visible input for bank_list_accounts. Deliberately has NO tenant field — the client must
 * never be able to choose the tenant (ARCH-11); the tenant comes only from resolveServerContext().
 */
export const LIST_ACCOUNTS_INPUT_SHAPE = {
  provider: z.string().describe("Provider id — see bank_list_providers"),
};

server.registerTool(
  "bank_list_accounts",
  {
    title: "List bank accounts",
    description: "List normalized (FDX-inspired) bank accounts exposed by a provider.",
    inputSchema: LIST_ACCOUNTS_INPUT_SHAPE,
  },
  async ({ provider }) => {
    try {
      const connector = createConnector(resolveServerContext());
      const impl = connector.getProvider(provider);
      const accounts = await impl.listAccounts({ tenant: connector.context });
      return { content: [{ type: "text" as const, text: JSON.stringify({ accounts }, null, 2) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text" as const, text: toErrorMessage(error) }] };
    }
  }
);

/**
 * Client-visible input for bank_list_transactions. Deliberately has NO tenant field — the client
 * must never be able to choose the tenant (ARCH-11); the tenant comes only from
 * resolveServerContext().
 */
export const LIST_TRANSACTIONS_INPUT_SHAPE = {
  provider: z.string().describe("Provider id — see bank_list_providers"),
  accountId: z.string().optional().describe("Restrict to a single normalized account id"),
  since: z.string().optional().describe("ISO 8601 date — inclusive lower bound on postedAt"),
  cursor: z.string().optional().describe("Opaque pagination cursor returned by a previous call"),
  filePath: z.string().optional().describe("Path to a .ofx file — required for the ofx-upload provider"),
};

server.registerTool(
  "bank_list_transactions",
  {
    title: "List bank transactions",
    description:
      "List normalized (FDX-inspired) bank transactions from a provider, optionally scoped to an account.",
    inputSchema: LIST_TRANSACTIONS_INPUT_SHAPE,
  },
  async ({ provider, accountId, since, cursor, filePath }) => {
    try {
      const connector = createConnector(resolveServerContext());
      const impl = connector.getProvider(provider);

      const ctx: ProviderContext = { tenant: connector.context };
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

// Only auto-start the stdio transport when this file is run directly (`node dist/mcp-server.js`),
// not when it is imported — e.g. by tests exercising resolveServerContext() / the tool input shapes.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(`bank-connector mcp-server failed to start: ${toErrorMessage(error)}`);
    process.exit(1);
  });
}
