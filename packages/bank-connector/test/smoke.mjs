#!/usr/bin/env node
/**
 * BANK-MCP smoke test — spawns the built server (dist/mcp-server.js) over stdio using the
 * official MCP client, runs initialize + tools/list, and checks the 3 expected tools come back.
 * No network / no Plaid credentials required.
 *
 * Usage: npm run build -w @sentropic/openerp-bank-connector && node test/smoke.mjs
 * (run from packages/bank-connector)
 */
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(here, "../dist/mcp-server.js");

const EXPECTED_TOOLS = ["bank_list_providers", "bank_list_accounts", "bank_list_transactions"];

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
  });
  const client = new Client({ name: "bank-connector-smoke", version: "0.1.0" });

  await client.connect(transport); // runs the initialize handshake
  const { tools } = await client.listTools();
  await client.close();

  const names = tools.map((t) => t.name).sort();
  console.log(`tools/list -> ${names.join(", ")}`);

  const missing = EXPECTED_TOOLS.filter((name) => !names.includes(name));
  if (missing.length > 0) {
    console.error(`SMOKE FAILED: missing tools: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (names.length !== EXPECTED_TOOLS.length) {
    console.error(`SMOKE FAILED: expected exactly ${EXPECTED_TOOLS.length} tools, got ${names.length}`);
    process.exit(1);
  }
  console.log("SMOKE OK: initialize + tools/list returned the 3 expected tools");
}

main().catch((error) => {
  console.error(`SMOKE FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
