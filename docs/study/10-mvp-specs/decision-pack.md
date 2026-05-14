# MVP Decision Pack — 2026-05-12

Sprint de cadrage MVP OpenERP. Consolidation transverse des 6 specs MVP enrichies, double revue (Claude reviewer + codex second-avis), correction `@sentropic`.

## Statut

- **Fait** : 6 specs MVP enrichies, double revue Claude + codex, decision-pack MD + PPTX, sweep rename `@sentropic`, **12 décisions programme arbitrées 2026-05-14**, **décisions gravées inline dans les 6 specs**.
- **À faire** : PR `@sentropic` (MCP + OTel + policy hooks + multi-tenant identity + marketplace + sandbox API) via `~/src/entropiq` en respect du plan @sentropic ; création `shared-entities-v1.md` (canon PG-06) ; `NOTICE` racine ; script CI anti-copy ; impl foundation (RLS + RBAC + ICU + Money + ApprovalRequest + Idempotency-Key).
- **Attendu** : foundation impl démarrée + PR @sentropic ouverte, autre agent continue le dev. Toi en supervision/audit. Pas de nouvel arbitrage requis avant feedback impl.

## Synthèse exécutive — arbitrage 2026-05-14

État final : **12 décisions programme arbitrées**, toutes RESOLVED. Décisions gravées dans les 6 specs MVP.

Arbitrage des 5 risques structurels initiaux :
1. ✓ Multi-tenant : UserIdentity + OrganizationMember (PG-02), RLS row-level + abstraction TenantIsolationStrategy (PG-03).
2. ✓ Queue : pgmq MVP + interface JobQueue abstraite multi-backends (PG-04).
3. ✓ Activity : préfixage canon `CrmActivity`, `ProjectTask`, `ServiceActivity`, `AgentRun` (PG-06 article 3).
4. ✓ Events : 3 couches séparées `AuditEvent` / `DomainEvent` / `TimelineEntry` (PG-06 article 2).
5. ✓ Anti-copy : owner programme + script CI `tools/anti-copy-grep.sh` ciblé patterns expression (PG-12).

Décision identité agentique élargie (PG-09) : RFC 8693 token exchange MVP + SPIFFE post-MVP via abstraction `IdentityProvider`. Chaîne délégation auditable de bout en bout.

Décision templating (PG-11) : extraction `@sentropic/docx-templating` (immédiat) + `@sentropic/pdf-templating` (audit + roadmap Paged Media + FR-CA + statutaire).

Sandbox agents (A-1) : pushé à `@sentropic`. OpenERP exige API sandbox + capability manifest. Feature request si manquant.

## Décisions programme — arbitrage

12 décisions transverses. **Reco = ma proposition**. Statut : `RESOLVED` (déjà tranché ou par fact), `OPEN-P0` (bloquant code), `OPEN-P1` (architectural), `OPEN-P2` (produit).

### PG-01 — License `@sentropic` `RESOLVED`
- **Fait** : SDK renommé `@entropiq` → `@sentropic` 2026-05-12, license = plain MIT à toi-même.
- Conséquence : AGT-D-12 et AGT-D-13 résolus ; tout déploiement commercial OpenERP est juridiquement clear côté runtime.
- **Action restante** : sweep rename des 31 docs `@entropiq` → `@sentropic`.

### PG-02 — Identité + membership multi-tenant `OPEN-P0`
- Constat codex : `User.organization_id` (foundation actuel) casse l'usage réel où un humain est membre de plusieurs organisations.
- Options : **(a)** `UserIdentity` global (auth/email/MFA) + `OrganizationMember` (par tenant : statut, rôles, locale) — **codex reco** ; **(b)** rester `User.organization_id` mono-org MVP ; **(c)** support multi-org en MVP via table `UserOrgLink`.
- **Reco** : (a) si tu veux des humains multi-org (consultants externes, partenaires) ; (b) si tu acceptes 1 humain = 1 compte par tenant. Plus simple mais friction utilisateur.
- **Impact** : décision foundation P0, change toutes les FK et tous les JWT.

### PG-03 — Isolation multi-tenant `OPEN-P0`
- Foundation propose row-level `organization_id` + Postgres RLS.
- Options : (a) row-level + RLS (reco foundation, **conserve**) ; (b) schema-per-tenant (impact migrations énorme) ; (c) DB-per-tenant (ops lourd MVP).
- **Reco** : (a) row-level + RLS. À acter formellement, bloque tous les schémas.

### PG-04 — Queue engine unifié `OPEN-P0`
- Billing propose `pgmq`, reporting et agentic muets ; risque 3 queues coexistantes.
- Options : (a) **pgmq** (PG-natif, simple ops) ; (b) BullMQ+Redis (Node mature) ; (c) NATS JetStream (polyglot) ; (d) managed (Inngest).
- **Reco** : (a) `pgmq` pour MVP, interface `JobQueue` abstraite pour migration future.

### PG-05 — Catalogue i18n unifié `OPEN-P0`
- Foundation propose ICU JSON nested ; project utilise `fr_label`/`en_label` colonnes SQL (anti-pattern, incohérent avec foundation).
- **Reco** : ICU JSON nested + table `TranslationKey` foundation, project corrige `ServiceActivity` pour utiliser keys.

### PG-06 — Canon entités partagées `OPEN-P0`
- Codex propose un canon que tu valides en bloc :
  - `Organization` = entité métier, `tenant_id` = synonyme runtime/session
  - `Money = {amount_minor: int, currency: string(3), scale: int}` foundation
  - `AuditEvent` (compliance immutable) / `DomainEvent` (intégration) / `TimelineEntry` (projection lisible) — trois couches séparées
  - `Activity` → préfixer : `CrmActivity`, `ProjectTask`, `ServiceActivity`, `AgentRun`
  - `Company` = entité ; "customer" = rôle (`Company.is_customer = true`)
  - `Project` owns `InvoiceProposal` ; `Billing` owns `Invoice` ; centraliser `source_type/source_id`
- **Reco** : valider ce canon en bloc + créer `docs/study/10-mvp-specs/shared-entities-v1.md`.

### PG-07 — `ApprovalRequest` entité foundation `OPEN-P1`
- Foundation a `approve` (action ACL), project a `TimeApproval` (table), CRM a threshold, billing a void/write-off, agentic a approval-in-the-loop. **Cinq réinventions** sans canon.
- **Reco** : entité `ApprovalRequest {request_id, requester, approver, subject_type, subject_id, status, decision_reason, decided_at}` dans foundation, consommée partout.

### PG-08 — Idempotency-Key universel `OPEN-P1`
- Foundation propose Idempotency-Key sur 4 endpoints seulement. Trop restrictif (reviewers d'accord).
- **Reco** : `Idempotency-Key` header obligatoire sur **toute** POST/DELETE à side-effect métier ; pattern dans foundation.

### PG-09 — Identité agent `OPEN-P1`
- Agentic propose JWT signé OpenERP-native, foundation auth = cookie HTTP-only humain.
- **Reco** : hybride — cookie pour humains, JWT signé pour agents ; `User.actor_type = human | agent | system`. À acter foundation + agentic ensemble.

### PG-10 — Stack BI / dashboard `OPEN-P1`
- Reporting propose `native SvelteKit dashboard component` ; CRM/project ont besoin de dashboards sans engagement clair.
- Options : (a) native SvelteKit + primitive foundation `Widget`/`Dashboard` ; (b) Superset embed iframe ; (c) Grafana Apache embed.
- **Reco** : (a) primitive native, Superset/Grafana en pack post-MVP optionnel. Évite dérive Superset-clone.

### PG-11 — Stack PDF rendering `OPEN-P2`
- Reporting propose server-side template ; billing parle de PDF FR/EN sans préciser.
- Options : (a) Typst ou React-PDF server-side ; (b) headless browser (Playwright) ; (c) PDFKit.
- **Reco** : (a) server-side template aligne reporting + billing + foundation. Évite Chromium en self-host.

### PG-12 — Anti-copy review process `OPEN-P2`
- 23 hotspots consolidés (Chatter Odoo, ObjectMetadata Twenty, account_move Odoo, mail.thread, ir.rule, etc.). Aucun owner programme + aucun script CI.
- **Reco** : (a) un owner anti-copy nommé qui revoit chaque PR ; (b) script `tools/anti-copy-grep.sh` qui grep les patterns interdits à chaque commit.

## Décisions clés par spec (résumé)

### Foundation
- F-1 RBAC plat `resource.action.scope` confirmé
- F-2 Étendre `AuditEvent` foundation avec colonnes optionnelles agentiques (`source`, `agent_id`, `tool_call_id`, `policy_decision_id`) **avant** que les autres specs ne dépendent du schéma
- F-3 Audit log = table append-only partitionnée par mois, rétention défaut 1 an, plancher 90j
- F-4 Auth MVP = password + TOTP (passkey post-MVP)
- F-5 Permission granularity = objet uniquement MVP, hook record-policy réservé post-MVP

### CRM
- C-1 Lead/Opportunity séparés (Odoo-style abstrait, pas verbatim)
- C-2 Custom fields = JSON column + `CustomFieldDefinition` declarative **limité** (pas de runtime metadata engine, anti-copy Twenty)
- C-3 Multi-currency par opportunité — à valider avec billing
- C-4 QuoteHandoff : CRM owns handoff event, billing owns quote doc
- C-5 Pipeline stage translation = table dédiée (pas keys dynamiques avec tenant_id) — désaccord reviewer corrigé

### Project + Time
- P-1 Time entry = manual + timer optionnel (codex réserve : timer post-MVP recommandé)
- P-2 Approval per-week (vs per-entry trop granulaire, vs per-project trop coarse)
- P-3 Invoice trigger = mix manuel + milestone, récurrent post-MVP
- P-4 Tâche hiérarchie = parent-enfant 1 niveau MVP, portfolio post-MVP
- P-5 Lien projet ↔ opportunité = 1:N (un projet peut consommer plusieurs opportunités)

### Billing + Accounting
- B-1 Subscription = native simple + interface compatible Kill Bill pour migration
- B-2 Plan comptable = pré-chargé CA/QC abstrait + révision juridique avant pilote
- B-3 Tax engine = pluggable interne versionné (GST/QST règles)
- B-4 Multi-currency = MVP (impact CRM + reporting), book tenant single, transactions multidevises
- B-5 Payment = Stripe seul MVP, multi-PSP via abstraction prête

### Reporting + Automation
- R-1 BI = native SvelteKit + primitive foundation `Widget` (cf. PG-10)
- R-2 Automation = typed YAML DSL + TS handlers, pas de Node-RED canvas MVP
- R-3 Scheduled reports = `pgmq` cron (cf. PG-04)
- R-4 Drill-down = live SQL MVP, materialized views post-MVP
- R-5 Permissions = via foundation RBAC, **+ assouplissement codex** : autoriser dashboards "team-scope" (vs admin-curated only trop strict)
- R-6 PDF = server-side template (cf. PG-11)

### Agentic Impacts
- A-1 Sandbox = isolated-vm pour code interne signé MVP, gVisor en option pack vertical post-MVP (codex désaccord : isolated-vm n'est pas une frontière suffisante si code tiers hostile ; à acter MVP-scope handlers internes seulement)
- A-2 Policy = native TS MVP, OPA en pack post-MVP
- A-3 Observability = OpenInference + OpenLLMetry MVP
- A-4 Identity = JWT signé (cf. PG-09)
- A-5 MCP registry = interne native MVP
- A-6 Supervision UI = hybride inline + panneau `/supervision` ; **contrainte transverse** : tout écran métier réserve une zone "supervision banner"

## Séquence de décision

Quatre phases. Tu arbitres dans l'ordre.

**P0 — semaine 0 (bloque code)**
PG-01 ✓ (résolu) · PG-02 identité multi-tenant · PG-03 isolation RLS · PG-04 queue · PG-05 i18n · PG-06 canon entités

**P1 — semaine 1-2 (architectural)**
PG-07 ApprovalRequest · PG-08 Idempotency-Key · PG-09 identité agent · PG-10 BI stack

**P2 — semaine 2-3 (produit)**
PG-11 PDF · PG-12 anti-copy process · F-1 à F-5 · C-1 à C-5 · P-1 à P-5 · B-1 à B-5 · R-1 à R-6 · A-1 à A-6

**P3 — semaine 3-4 (opérationnel)**
Rename `@sentropic` swept · NOTICE racine créé · script anti-copy CI · spec figée

## Désaccords reviewers à porter à ta connaissance

- **Sandbox MVP** : codex conteste isolated-vm si MVP doit accueillir du code tiers hostile. Si MVP = handlers internes signés uniquement, isolated-vm OK ; à clarifier le scope.
- **Reporting team-scope** : Claude reviewer recommande d'assouplir "admin-curated only" pour autoriser dashboards team-scope ; sinon utilisateurs exportent en Excel.
- **CRM Activity vs Task fusion** : codex en désaccord avec unification CRM → préfère `Task` ≠ `Interaction` (cycle de vie distinct). À trancher.
- **AGT-D-12 commitment upstream `@sentropic`** : Claude reviewer suggère reformulation neutre "fork interne avec roadmap d'évaluation retour upstream à 6 mois" pour éviter engagement irréaliste.

## Anti-copy hotspots — top 12

1. Odoo `mail.thread` / Chatter (CRM + foundation Comment)
2. Twenty `ObjectMetadata` engine (CRM custom fields)
3. Twenty `workspaceMember` (foundation)
4. Odoo `ir.model.fields` field-ACL (foundation)
5. Odoo `mail.activity` / `mail.message` split (CRM)
6. Odoo `l10n_ca` (billing)
7. Odoo `account.move` / `account.move.line` (billing)
8. Odoo `auth_totp` UI text (foundation)
9. Odoo `ir.rule` record rules DSL (foundation)
10. Kimai timesheet entities + invoice renderers (project)
11. Superset chart controls + Selenium PDF (reporting)
12. Node-RED node palette + flow JSON (reporting)

Liste complète (23 hotspots) dans `tmp/claude-cross-review.md` section 9.

## Action — mode réalisation/audit

Arbitrage terminé 2026-05-14. Prochaines étapes :

1. **PR `@sentropic`** via `~/src/entropiq` en respect du plan @sentropic. Scope : MCP client + server, OTel hooks, policy hooks, multi-tenant identity primitives (UserIdentity + acting_for), marketplace publication primitives, sandbox API + capability manifest. L'autre agent (codex) continue le dev process.
2. **`shared-entities-v1.md`** créé comme contrat transverse (canon PG-06 articles 1-4).
3. **`NOTICE` racine** créé (Kill Bill, OpenMeter, Superset, Node-RED Apache).
4. **`tools/anti-copy-grep.sh`** créé (patterns Odoo `ir.*`, `account.move`, `mail.thread` + Twenty `ObjectMetadata` + Frappe `doctype` + Kimai `KEvent` + SuiteCRM `bean->`).
5. **Implémentation foundation** (UserIdentity + OrganizationMember + RLS + RBAC + ICU JSON + Money + ApprovalRequest + Idempotency-Key + AuditEvent étendu).
6. **Veille charts Svelte** dispatchée (layerchart, svelte-echarts, chart.js, observable plot) pour PG-10.

Porteur produit en supervision/audit. Pas de nouvel arbitrage requis avant feedback impl.

---

**Fin du decision-pack.** Version PPTX : `docs/study/10-mvp-specs/decision-pack.pptx`.
