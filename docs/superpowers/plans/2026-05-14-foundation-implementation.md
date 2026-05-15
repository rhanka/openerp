# Plan — Foundation Implementation (2026-05-14)

## Progress

Fait: décisions programme arbitrées 2026-05-14 (decision-pack), shared-entities canon (PG-06), NOTICE, anti-copy script, veille charts. PR `@sentropic` #151 ouverte avec scaffold des 6 capabilities (BR-26).
À faire: scaffold workspace TS + impl foundation primitives (UserIdentity, OrganizationMember, RLS, RBAC, ICU, Money, ApprovalRequest, Idempotency-Key, AuditEvent étendu), dépend de @sentropic capabilities (BR-26→27..30).
Attendu: ce plan sert de contrat pour le prochain sprint impl ; toi en supervision, l'agent dev (codex ou autre) prend le relais.

## Objective

Démarrer l'implémentation foundation OpenERP en respectant strictement le canon `shared-entities-v1.md` et les 12 décisions programme arbitrées. Foundation est le bloquant amont : CRM, project, billing, reporting, agentic dépendent de ses primitives.

## Scope

Foundation MVP comprend les primitives suivantes, dans cet ordre :

1. **Workspace baseline** — Node workspace TS + SvelteKit shell + Postgres + pgmq + Vitest + Playwright
2. **Identity & multi-tenant** — `UserIdentity`, `OrganizationMember`, `Organization`, `TenantIsolationStrategy` (row-level + RLS pour MVP, abstraction switchable)
3. **Auth** — passkey/WebAuthn direct (drop password+TOTP MVP), session HTTP-only cookie + JWT signé pour agents (RFC 8693 token exchange)
4. **RBAC** — `Permission`, `Role`, `PermissionGrant` flat `resource.action.scope` ; objet-level granularité MVP
5. **i18n** — `TranslationKey` table + ICU JSON nested catalogue FR-CA/EN-CA
6. **Money & FX** — `Money {amount_minor, currency, scale}` type + `FxRateSnapshot` + service `currency.resolve()`
7. **AuditEvent triple-layer** — `AuditEvent` (compliance immutable, partitionnée mensuel) + `DomainEvent` (intégration) + `TimelineEntry` (projection)
8. **ApprovalRequest** — entité partagée + REST API + MCP tool `request_approval()` + SDK
9. **Idempotency-Key** — middleware foundation + table `IdempotencyRecord` (TTL 24h)
10. **JobQueue abstraction** — interface `JobQueue` + impl pgmq (BullMQ/NATS swappable)

## Dependencies

- **`@sentropic` PR #151 (BR-26)** : capabilities runtime nécessaires
  - MCP client + server : consommé par ApprovalRequest tool MCP
  - OTel hooks : consommé par AuditEvent étendu agentic
  - Policy hooks : consommé par RBAC + ApprovalRequest escalate path
  - Multi-tenant identity primitives : consommé par UserIdentity JWT issuance
  - Marketplace publication primitives : consommé post-MVP
  - Sandbox API + capability manifest : consommé par AgentRun

L'impl peut démarrer en parallèle de BR-26 mais doit converger sur les contrats `@sentropic` au plus tard à la fin de chaque lot.

## Lots d'exécution

### Lot 0 — Workspace baseline (semaine 1)

- Initialiser Node workspace monorepo (`apps/api`, `apps/web`, `apps/worker`, `packages/domain`, `packages/i18n`)
- SvelteKit shell minimal (login + org switcher placeholder)
- Postgres + pgmq schema baseline
- Vitest + Playwright config
- Anti-copy CI hook : `tools/anti-copy-grep.sh` dans pre-commit + GitHub Actions
- Exit lot 0 : `npm ci && npm test` passe sur workspace vide ; `tools/anti-copy-grep.sh` exit 0

### Lot 1 — Identity & multi-tenant (semaine 2)

- Schémas : `UserIdentity`, `OrganizationMember`, `Organization`, `TenantIsolationStrategy` (interface + impl `RowLevelRlsStrategy`)
- Migrations Postgres + RLS policies sur toutes tables métier
- `User.actor_type = human | agent | system`
- JWT signing + RFC 8693 token exchange
- Tests intégration : RLS bloque cross-tenant ; multi-org membership fonctionne
- Exit lot 1 : un humain peut se connecter, basculer entre N orgs, RLS isole

### Lot 2 — Auth + RBAC + i18n (semaine 3)

- Passkey/WebAuthn registration + login
- `Permission`, `Role`, `PermissionGrant` + middleware
- `TranslationKey` table + service de résolution FR-CA/EN-CA
- ICU JSON nested catalogue baseline
- Exit lot 2 : 1 utilisateur peut s'authentifier passkey + RBAC bloque actions interdites + UI affichée FR-CA

### Lot 3 — Money & AuditEvent (semaine 4)

- `Money` type partagé (TS) + `FxRateSnapshot` + `currency.resolve()` service
- `AuditEvent` table partitionnée mensuel + `DomainEvent` outbox + `TimelineEntry` projection
- Grammar `<module>.<entity>.<verb>` validation centrale
- Exit lot 3 : chaque action API émet `AuditEvent` ; `currency.resolve` retourne taux daté pour billing

### Lot 4 — ApprovalRequest + Idempotency-Key + JobQueue (semaine 5)

- `ApprovalRequest` entité + REST API + MCP tool
- `IdempotencyRecord` middleware + table
- `JobQueue` interface + `PgmqJobQueue` impl
- Exit lot 4 : ApprovalRequest end-to-end (création, décision, audit) + Idempotency-Key sur toutes POST/DELETE + 1 scheduled job tourne

### Lot 5 — Intégration `@sentropic` (semaine 6)

- Consommer `@sentropic` capabilities depuis PR #151 (MCP client, OTel, policy hooks, identity primitives)
- Adapter ApprovalRequest pour issuance JWT agent
- AuditEvent étendu agentic (colonnes `source`, `agent_id`, `tool_call_id`, `policy_decision_id`, `delegation_id`)
- Exit lot 5 : un agent dummy peut être issu, autorisé, exécuter un tool, et le tout audité

### Lot 6 — Foundation gate

- Charge de tests : `check:workspace`, `check:i18n`, `test:unit`, `test:integration`, `test:e2e`, `lint`, `build`, `anti-copy-grep`
- Documentation lib : générée depuis types
- Exit lot 6 : foundation prête à supporter CRM, project, billing, reporting

## Anti-copy posture

Pré-commit hook lance `tools/anti-copy-grep.sh`. Toute violation bloque le commit. Owner anti-copy nommé (à désigner). NOTICE racine maintenu à jour pour les dépendances Apache.

## Tech stack (rappel décisions)

- **Stack** : TypeScript, SvelteKit (UI), Node (API + worker)
- **DB** : Postgres + RLS row-level (PG-03)
- **Queue** : pgmq via interface `JobQueue` (PG-04)
- **i18n** : ICU JSON nested (PG-05)
- **Test** : Vitest unit + Playwright E2E (PG-04 réf)
- **API style** : REST + tRPC interne SvelteKit (PG-05 réf)
- **Templating** : `@sentropic/docx-templating` + `@sentropic/pdf-templating` (PG-11, post-extraction)
- **Charts** : LayerChart (PG-10 veille tête de classement)
- **Identity** : JWT signé + RFC 8693 token exchange (PG-09)
- **Policy engine** : native TS MVP (AGT-D-02), pluggable OPA/Cedar/Casbin post-MVP

## Cross-references

- Decision pack : `docs/study/10-mvp-specs/decision-pack.md`
- Shared entities canon : `docs/study/10-mvp-specs/shared-entities-v1.md`
- Foundation spec : `docs/study/10-mvp-specs/foundation-security-i18n.md`
- Agentic impacts : `docs/study/10-mvp-specs/agentic-impacts.md`
- Charts veille : `docs/study/10-mvp-specs/charts-svelte-watch.md`
- `@sentropic` PR : https://github.com/rhanka/entropiq/pull/151
- Anti-copy script : `tools/anti-copy-grep.sh`
- NOTICE : `NOTICE`

## Exit criteria du sprint

- Foundation primitives livrées et testées (lots 0-5)
- `@sentropic` PR #151 mergée et capabilities consommées (lot 5)
- Anti-copy CI green sur toutes les migrations + code applicatif
- Foundation gate (lot 6) passe complet
- CRM, project, billing, reporting peuvent démarrer leur impl en consommant les primitives foundation
