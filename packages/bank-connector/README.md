# @sentropic/openerp-bank-connector

Skeleton (BANK-MCP) for the bank connector: normalized (FDX-inspired) accounts/transactions,
exposed as an MCP server over stdio. Bank providers (Plaid, OFX upload, ...) are pluggable behind
one interface — same shape as the connectors claude.ai exposes for Google Drive/Gmail.

## Architecture target

This package is an in-process skeleton. The target architecture — evaluated in
[`docs/studies/2026-07-06-sentropic-connecteur-plaid-mutualise.md`](../../docs/studies/2026-07-06-sentropic-connecteur-plaid-mutualise.md)
(§4) — moves it to a platform service operated by Sentropic:

```
[Banks] <-> Plaid <-> [bank-connector (Sentropic platform, dedicated k8s ns)]
                        |- vault secrets (Plaid client + per-org access_token)
                        |- FDX-normalized REST API (accounts, transactions, balances)
                        |- MCP server (this package's shape)
                        |- Plaid webhooks -> per-org event bus
                        `- pluggable providers: plaid | ofx-upload | flinks | native FDX
[OpenERP api] --S2S (@sentropic/auth, AUTH-39-C)--> bank-connector (org-scoped)
```

In this skeleton, provider credentials/tokens live only in this process' memory
(see `src/providers/plaid-sandbox.ts`) — there is no vault yet.

## Providers

| id | status | notes |
|---|---|---|
| `plaid-sandbox` | skeleton | replays `tools/bank-connector/poc-plaid-sandbox.mjs` (institutions/search -> sandbox/public_token/create -> exchange -> transactions/sync). Reads `PLAID_CLIENT_ID` / `PLAID_SANDBOX_SECRET` from the repo-root `.env` (gitignored). Access token cached in-process only, never persisted. |
| `ofx-upload` | skeleton | zero-cost, zero-custody fallback — required because Desjardins is not fully covered by Plaid Transactions (see study §3.3). Minimal `<STMTTRN>` parser, no external dependency. |

Both implement the same `BankProvider` interface (`src/fdx.ts`): `listAccounts(ctx)` and
`listTransactions(ctx, { accountId?, since?, cursor? })`, returning `NormalizedAccount[]` /
`NormalizedTransaction[]`. Transaction `amount` is signed with **positive = credit** (money in);
Plaid's raw sign is inverted at the mapping boundary, OFX's `TRNAMT` already matches this
convention.

## MCP tools

- `bank_list_providers` — lists available provider ids.
- `bank_list_accounts { provider }` — normalized accounts for a provider.
- `bank_list_transactions { provider, accountId?, since?, cursor?, filePath? }` — normalized
  transactions; `filePath` is required for `ofx-upload`, ignored otherwise.

Errors returned by a tool call are always a short message (`isError: true`) — raw provider
payloads and credentials are never echoed back.

## Usage (local MCP client)

```sh
npm install
npm run build -w @sentropic/openerp-bank-connector
claude mcp add bank-connector -- node packages/bank-connector/dist/mcp-server.js
```

Or run it directly for a manual stdio session:

```sh
node packages/bank-connector/dist/mcp-server.js
```

## Development

```sh
npm run build -w @sentropic/openerp-bank-connector   # tsc -> dist/
npm test -w @sentropic/openerp-bank-connector         # vitest run — no network
node packages/bank-connector/test/smoke.mjs           # tools/list smoke check (after build)
```

The `plaid-sandbox` provider is only exercised end-to-end when `PLAID_CLIENT_ID` /
`PLAID_SANDBOX_SECRET` are present in the repo-root `.env` — unit tests cover the pure
Plaid-to-FDX mapping functions on a fixed fixture instead (`test/plaid-mapping.test.ts`), no
network call.

## One-shot OFX import CLI (v1)

The connector also supplies a manual, OFX-only producer for the existing
`POST /banking/import` API boundary. It is not an upload endpoint, worker, or
scheduled process. Raw OFX is read once inside this connector process, turned
into a normalized snapshot, and never sent over HTTP.

Build first, then run exactly one `.ofx` source located below an explicitly
configured import base:

```sh
export OPENERP_BANK_IMPORT_BEARER_TOKEN="$OPENERP_AGENT_TOKEN"
export BANK_CONNECTOR_OFX_IMPORT_BASE_DIR="$PWD/tmp/bank-import"
export OPENERP_BANK_IMPORT_API_URL="http://127.0.0.1:4000"
npm run build -w @sentropic/openerp-bank-connector
npm run import:ofx -w @sentropic/openerp-bank-connector -- --file statement.ofx
```

`OPENERP_AGENT_TOKEN` must be an existing short-lived signed JWT for the same
mono-tenant environment configured for the connector process. Obtain it through
the existing authenticated `POST /auth/exchange-agent-token` flow using a
verified human session Bearer token; the API issues the agent token for at most
15 minutes. The CLI sends it only as `Authorization: Bearer ...`; it does not
accept `--tenant`/`--org`, send a tenant header, or put a tenant field in JSON.

The source must be a regular, non-symlink lowercase `.ofx` file beneath the
real-path-resolved base. The default maximum is 5 MiB (lower it with
`BANK_CONNECTOR_OFX_IMPORT_MAX_BYTES`), and a file may contain one account and
at most 2,000 transactions. The command emits aggregate-only JSON:
`sourceRows`, `pendingOmitted`, `submitted`, `newlyImported`, `replayNoOps`,
and `code`. It never prints the source path, OFX contents, transaction details,
credentials, or raw API response. A successful replay is a no-op; it does not
compare or update content under an existing `ACCTID`/`FITID` identity.

## Known limitations (skeleton)

- No pagination loop wired into `bank_list_transactions` for `plaid-sandbox` — a single
  `transactions/sync` page is returned with `nextCursor` for the caller to re-request.
- `ofx-upload` accepts exactly one `<BANKACCTFROM>`/`<CURDEF>` per file (no multi-account OFX splitting).
- No vault, no S2S auth, no per-org scoping, no webhook ingestion — all deferred to the platform
  phase (C1+ in the study).
