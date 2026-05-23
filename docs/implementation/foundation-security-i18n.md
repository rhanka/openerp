# Foundation Security I18n Implementation Notes

## Source Of Truth

Implementation starts from `docs/study/10-mvp-specs/foundation-security-i18n.md`.

The implementation plan is `docs/superpowers/plans/2026-05-09-foundation-security-i18n-implementation.md` (initial slice) and `docs/superpowers/plans/2026-05-14-foundation-implementation.md` (Lots 0–6 sprint).

## Anti-Copy Gate

- No third-party source code, schemas, API contracts, UI strings, tests, demo data, reports, templates, screenshots, or module layouts were used as implementation inputs.
- GPL and AGPL projects are functional references only through OpenERP-written specs.
- MIT, Apache-2.0, and BSD references require attribution notes before any direct reuse.
- Every PR touching domain behavior must name the OpenERP spec section it implements.

## Acceptance Coverage

- Tenant setup creates baseline roles and owner.
- Zero active owners is blocked.
- Permissions deny by default.
- Role changes write audit events.
- FR and EN catalogs must match before release.
- Self-hosted update state exposes the three support windows.
- Audit events are append-only through public APIs.

## Foundation Closure State (2026-05-22)

Foundation Lots 0–5 are closed. Demo Slice 1 UI is live behind Playwright reviewer coverage. Lot 5 was scoped against the surface actually published by `@sentropic` post-BR-26 (h2a + llm-mesh), not the original plan's list of standalone MCP/OTel/sandbox/marketplace libs.

### Lot 0 — Workspace baseline

- Monorepo TS workspaces: `apps/api`, `apps/web`, `apps/worker`, `packages/domain`, `packages/i18n`.
- Postgres + docker-compose (`docker-compose.yml`).
- pgmq via `PgJobQueue` (`apps/api/src/foundation/job-queue.ts`).
- Vitest unit + Playwright e2e (`apps/web/tests/foundation.spec.ts`).
- Anti-copy CI hook (`tools/anti-copy-grep.sh`) + ripgrep installation step in CI.
- Aggregate gate `npm run check:foundation` (workspace + i18n + anti-copy + lint + test + build).

### Lot 1 — Identity & multi-tenant

- Canon entities (migration `0002_canon_entities.sql`): `user_identities` (global), `organization_members`, `fx_rate_snapshots`, `timeline_entries`, `approval_requests`, `idempotency_records`.
- Row-Level Security forced on tenant-scoped tables (migration `0003_rls_policies.sql`) using `app.current_organization_id` session-local setting.
- Application role `openerp_app` (no superuser, no BYPASSRLS) for tenant queries.
- `RowLevelRlsStrategy` (`apps/api/src/foundation/tenant-isolation.ts`).
- `IdentityProvider` with RFC 8693 token exchange and revocation (`apps/api/src/foundation/identity-provider.ts`).

### Lot 2 — Auth + RBAC + i18n

- Passkey / WebAuthn registration and login (`apps/api/src/foundation/passkey-service.ts`, `apps/api/src/http/handlers/webauthn.ts`).
- RBAC middleware (`apps/api/src/http/rbac-middleware.ts`).
- `TranslationKey` table (migration `0004_translation_keys.sql`) + ICU MessageFormat resolver (`apps/api/src/foundation/translation-resolver.ts`).
- FR-CA / EN-CA catalogs in `@sentropic/openerp-i18n`.

### Lot 3 — Money + AuditEvent triple-layer (closed 2026-05-21)

- `Money` and `FxRateSnapshot` centralized in `@sentropic/openerp-domain` (`makeMoney`, `sameCurrency`).
- `CurrencyResolver` + FX snapshots (`apps/api/src/foundation/currency-resolver.ts`, `fx-rates.ts`).
- DomainEvent outbox (`apps/api/src/foundation/domain-events.ts`).
- TimelineEntry projection + entry-type grammar validator (`apps/api/src/foundation/timeline-entries.ts`, `entry-type-grammar.ts`).
- **AuditEvent monthly partition** (migration `0007_audit_events_partition.sql`):
  - `audit_events` is a RANGE-partitioned parent on `created_at` with composite PK `(id, created_at)`.
  - Canon columns complete: `correlation_id`, `idempotency_record_id`, `agent_run_id`, `acting_principal`, `on_behalf_of` (Article 2.2).
  - Default partition + materialized current-month partition.
  - Helper `app_ensure_audit_partition(date)` for lazy monthly rotation.
  - Append-only enforced via `BEFORE UPDATE` / `BEFORE DELETE` triggers calling `audit_events_block_mutations()`; cascades to every partition (PG 16).
  - Seeds bypass the trigger via `set local session_replication_role = replica`; this is documented in `apps/api/src/scripts/seed-dev-lib.ts`.
  - RLS re-applied on the recreated table.

### Lot 4 — ApprovalRequest + Idempotency + JobQueue

- ApprovalRequest entity + REST routes (`apps/api/src/http/routes/approval-requests.ts`, `apps/api/src/http/handlers/approval-requests.ts`, `apps/api/src/foundation/approval-service.ts`).
- IdempotencyRecord middleware + table (CTE-based insert fix applied to keep raw column names inside the writer CTE).
- `PgJobQueue` with `claim`, `succeed`, `fail` (migration `0005_jobs.sql`).

### Lot 5 — @sentropic agentic integration (closed 2026-05-22)

Scope decision 2026-05-22: BR-26 was refactored at publish time. `@sentropic/h2a` 0.1.7 covers coordination / contracts / journal / ed25519 signing / authority matrix. `@sentropic/llm-mesh` covers LLM runtime (BR-14c). Standalone MCP / OTel / sandbox / marketplace libs are not published. Implementation aligned on what shipped.

#### A2 — h2a bridge

- `apps/api/src/foundation/h2a-bridge.ts` maps ApprovalRequest transitions onto `H2AEnvelopeType` (propose / accept / reject / escalate / event) and `H2ANegotiationState`.
- Each transition builds an `H2AJournalEntry` (artifactKind `ENGAGEMENT`, `engagementId = approval_request.id`, `correlationId = approval_request.id`) and chains via `prevHash` / `contentHash` using `createJournalEntry` / `appendJournalEntry`.
- Persisted into `audit_events.after_summary.journalEntry` with `audit_events.correlation_id = journalEntry.id`.
- Chain ordering uses the h2a `sequence` field stored in jsonb because `now()` is frozen inside a single transaction and would otherwise leave `created_at` ties non-deterministic.

#### A3 — Audit envelopes + journal

- Full propose → accept produces a verified chain end-to-end: `verifyJournalChain` returns `{ok: true}` in pg-smoke integration test.

#### A4 — ed25519 signing (optional)

- `apps/api/src/foundation/audit-signing.ts` reads `OPENERP_AUDIT_SIGNING_PRIVATE_KEY_PEM`, `OPENERP_AUDIT_SIGNING_PUBLIC_KEY_PEM`, `OPENERP_AUDIT_SIGNING_BY`. Returns `null` when any is absent (backward compatible).
- PEM with literal `\n` (single-line shell env) is normalized to a real PEM.
- `signJournalPayload` canonicalizes the payload minus its `signatures` field and signs via h2a `signCanonical`.
- Signature is attached to the payload BEFORE `createJournalEntry`, so the journal's `contentHash` covers the signature. Tampering with the signature breaks both `verifyCanonical` and `verifyJournalChain`.
- `verifyJournalEntrySignatures(entry, {publicKeyPem})` validates per-entry signatures.
- Tenant-scoped keys (per-organization keypairs in tenant_settings) are deferred until KMS / secret management is decided.

#### A5 — Agentic canon entities

- Migration `0008_agentic_entities.sql` creates the five Article 4.6 tables: `agent_definitions`, `agent_runs` (Article 3.5 full schema), `policy_decisions`, `tool_calls`, `supervision_requests`.
- Cycle FKs broken by deferred ALTERs: `agent_runs.policy_decision_id` added after `policy_decisions`; `policy_decisions.tool_call_id` FK added after `tool_calls`.
- RLS enabled and forced on each via a do-block over the table list.

#### AGT-D-08 hygiene

- Migration `0009_audit_events_canon_alignment.sql` retypes `audit_events.agent_id`, `tool_call_id`, `policy_decision_id`, `delegation_id` from `text` to `uuid` and adds FKs to `agent_definitions`, `agent_runs`, `tool_calls`, `policy_decisions`. `delegation_id` stays without FK per canon (delegation chain identifier only).
- PostgreSQL 16 cascades `ALTER COLUMN TYPE` from the partitioned parent to every partition. FK from a partitioned parent to a regular table is supported.

#### Deferred from Lot 5

- A6 sandbox API + capability manifest — no `@sentropic/*` package shipped for this surface; deferred until the runtime decides.
- Tenant-scoped audit signing keys — deferred until KMS / secret management decision.
- Application-side MCP client/server, OTel hooks, marketplace primitives — only `@sentropic/h2a-cli` exposes an `mcp-tools` listing today.

### Lot 6 — Foundation gate

- `check:foundation` aggregate gate green: 192 unit tests across 4 workspaces (api 171 + 6 skipped, domain 6, i18n 11, worker 4) + Playwright reviewer pass 35/36 (1 live opt-in skipped) + pg integration 7/7 incl. partition + h2a chain + agentic RLS + signed-chain end-to-end.
- TypeDoc generated for `@sentropic/openerp-domain`.
- Anti-copy CI doctype pattern refined; ripgrep installed in CI.

## UI Demo Slice 1

- Routes: `/login`, `/register-passkey`, `/admin/approvals`, `/admin/audit`.
- Locale switcher lives in the global Sentropic `Header` actions area per UXDR-002 D2 (accepted 2026-05-21).
- `apps/web/tests/ui-review.spec.ts` covers 3 viewports × 2 locales × 4 routes for header containment, route preservation, `html lang`, keyboard focus order.
- Live e2e (`live approvals can be decided from the UI`) is opt-in via `OPENERP_API_URL` + `OPENERP_DEV_ORG_ID` + `OPENERP_DEV_USER_ID`; see `rules/testing.md`.

## How To Run

```bash
# bring up postgres + create dev database (one-off)
docker compose up -d postgres
docker exec openerp-postgres-1 psql -U openerp -d postgres -c "create database openerp_dev"

# aggregate gate (unit tests only)
npm run check:foundation

# pg integration suite (incl. partition + h2a chain + signed chain + agentic RLS)
OPENERP_INTEGRATION_DATABASE_URL=postgresql://openerp:openerp@127.0.0.1:5432/openerp_dev \
  npm test -w @sentropic/openerp-api -- --no-file-parallelism

# reviewer Playwright pass
npm run test:e2e -w @sentropic/openerp-web
```
