# Shared Entities v1 — Canon transverse MVP OpenERP

## Progress

Fait: création du canon transverse arbitré 2026-05-14 (PG-06) à partir du decision-pack et des 6 specs MVP. Quatre articles formalisés, primitives cross-cutting documentées, frontières inter-modules figées.
À faire: alignement de chaque spec module sur ce canon avant codage ; toute divergence module doit être justifiée explicitement et tracée en revue. Implémentation foundation expose ces primitives en premier ; CRM, project, billing, reporting, agentic consomment ensuite.
Attendu: ce document est le contrat transverse autoritaire. Les specs module y font référence. Toute redéfinition module d'une entité listée ici constitue une régression à corriger en PR.

## Purpose

Ce document fige les entités, types et conventions transverses partagées par les 6 specs MVP OpenERP. Il résout la divergence terminologique et structurelle identifiée par la double revue Claude reviewer / codex de 2026-05-12 et formalise le canon arbitré 2026-05-14 (cf. `decision-pack.md` section PG-06).

Toute spec module DOIT consommer ces définitions sans les redéfinir. Toute extension (champ supplémentaire, projection, sous-type) est permise tant qu'elle ne casse pas la sémantique canonique ; toute renomination ou réinterprétation est interdite sans amendement explicite à ce document.

Ce contrat s'applique aux 6 specs MVP :

- `foundation-security-i18n.md` (foundation, propriétaire de la plupart des primitives ici listées)
- `crm-customer-timeline.md` (CRM)
- `project-time-to-invoice.md` (project / delivery)
- `billing-accounting.md` (finance)
- `reporting-automation.md` (reporting / typed automation)
- `agentic-impacts.md` (agentic, transverse)

---

## Article 1 — Organization, Tenant, Money, FX

### 1.1 Organization vs Tenant

`Organization` est l'entité métier. `tenant` est un synonyme runtime/session pour désigner le périmètre d'isolation. Les deux pointent vers la même clé (`organization_id`), mais ne sont pas interchangeables dans le vocabulaire :

- documentation, schémas DB, libellés UI, noms de FK : `Organization` / `organization_id`.
- contexte de requête, middleware, header HTTP, claim JWT, RLS policy : `tenant_id` (alias technique).

Cette discipline évite la confusion observée par codex en revue (PG-06).

#### Schéma `Organization`

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `legal_name` | text | NOT NULL |
| `display_name` | text | NOT NULL |
| `slug` | text | UNIQUE, NOT NULL, lowercase, kebab-case |
| `status` | enum(`active`,`suspended`,`archived`) | NOT NULL, default `active` |
| `default_locale` | text | NOT NULL, BCP-47 (ex: `fr-CA`) |
| `default_currency` | text(3) | NOT NULL, ISO 4217 |
| `default_timezone` | text | NOT NULL, IANA tz (ex: `America/Toronto`) |
| `country` | text(2) | NOT NULL, ISO 3166-1 alpha-2 |
| `province_state` | text | NULLABLE, ISO 3166-2 sub-division |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

Toutes les tables métier portent une colonne `organization_id UUID NOT NULL REFERENCES organization(id)` et sont soumises aux policies RLS Postgres (cf. PG-03).

### 1.2 Money type

Type valeur structuré utilisé pour tout montant monétaire dans le système. Remplace tout `numeric` ou `decimal` nu dès qu'une devise est en jeu.

#### Schéma `Money`

| Champ | Type | Contraintes |
| --- | --- | --- |
| `amount_minor` | bigint | NOT NULL, montant en plus petite unité (cents, centimes), peut être négatif pour les crédits |
| `currency` | text(3) | NOT NULL, ISO 4217 (`CAD`, `USD`, `EUR`, etc.) |
| `scale` | smallint | NOT NULL, défaut 2 pour devises majeures, 0 pour JPY, 3 pour KWD, etc. |

#### Encodage SQL

Stocké soit en composite type Postgres `money_t` soit en triplet de colonnes nommées `{*_amount_minor, *_currency, *_scale}` selon contraintes d'index. Le composite type est privilégié pour cohérence ; le triplet est acceptable pour colonnes très fréquemment filtrées sur le scalaire (ex: `total_amount_minor`).

#### Encodage TS / API

```
{
  "amount_minor": 12500,
  "currency": "CAD",
  "scale": 2
}
```

Représente 125,00 CAD. Jamais sérialisé en float. La lib `@sentropic` doit fournir un helper `Money.fromMinor(amount, currency)` et `Money.format(money, locale)` pour rendu localisé.

### 1.3 FX et résolution de taux

Le tenant tient un seul livre comptable (`single book`, PG-06 article 1 + BA-DEC-011) dans sa `default_currency`. Les transactions multi-devises sont permises (factures, opportunités, paiements), et le taux de change est résolu via le service foundation `currency.resolve`.

#### Service `currency.resolve(source_currency, target_currency, effective_at)`

Retourne une `FxRateSnapshot`. Idempotent par `(source, target, effective_at)`. Caché par jour. Consommé par billing (post invoice), reporting (revenue by customer), agentic (budget conversion).

#### Schéma `FxRateSnapshot`

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `source_currency` | text(3) | NOT NULL, ISO 4217 |
| `target_currency` | text(3) | NOT NULL, ISO 4217 |
| `rate` | decimal(20,10) | NOT NULL, taux multiplicatif (`source * rate = target`) |
| `effective_at` | date | NOT NULL, date d'application |
| `source` | enum(`manual`,`boc`,`ecb`,`provider`) | NOT NULL, provenance du taux |
| `provider_reference` | text | NULLABLE, id externe quand applicable |
| `captured_at` | timestamptz | NOT NULL |

Un `FxRateSnapshot` est immuable. Toute correction crée un nouveau snapshot ; les références existantes (`JournalEntryLine.fx_rate_snapshot_id`) conservent l'ancien id.

---

## Article 2 — Events triple-layer

Trois couches d'événements DOIVENT rester séparées. Confondre leurs rôles produit des projections illisibles, des audits incomplets, ou des intégrations qui bloquent la migration. La revue codex 2026-05-12 a identifié cette confusion comme risque structurel (`account_move` Odoo, `mail.thread` Odoo).

### 2.1 Comparatif

| Couche | Rôle | Audience | Mutabilité | Rétention défaut | Partitionnement |
| --- | --- | --- | --- | --- | --- |
| `AuditEvent` | Conformité immuable, preuve d'action | Auditeur, owner, compliance | Append-only strict | 1 an, plancher 90 jours | Mensuel |
| `DomainEvent` | Intégration inter-modules, déclencheur typed automation | Modules consommateurs, workers | Append-only avec `consumed_at` | 30 jours par défaut, configurable | Par event_type optionnel |
| `TimelineEntry` | Projection lisible par humain | Utilisateur métier (sales, project mgr, finance) | Append-only avec soft-edit du `summary_key` autorisé | Indéfini tant que le parent existe | Par parent (company, project) |

### 2.2 Schéma `AuditEvent`

Source de vérité conformité. Étendu avec colonnes optionnelles agentiques (PG-06 article 2, AGT-D-08).

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `actor_user_id` | UUID | NULLABLE quand `actor_type = system` |
| `actor_type` | enum(`human`,`agent`,`system`) | NOT NULL |
| `action` | text | NOT NULL, grammar `<module>.<entity>.<verb>` (ex: `crm.opportunity.stage_changed`) |
| `resource_type` | text | NOT NULL |
| `resource_id` | UUID | NULLABLE pour évents système non scopés |
| `before_summary` | jsonb | NULLABLE |
| `after_summary` | jsonb | NULLABLE |
| `ip_hash` | text | NULLABLE, hash non réversible |
| `user_agent_hash` | text | NULLABLE |
| `correlation_id` | UUID | NULLABLE, chaîne de causation |
| `idempotency_record_id` | UUID | NULLABLE, FK IdempotencyRecord |
| `created_at` | timestamptz | NOT NULL |
| **Colonnes agentiques (optionnelles)** | | |
| `source` | enum(`human`,`agent`,`system`) | NULLABLE, redondance utile pour filtre rapide |
| `agent_id` | UUID | NULLABLE, FK AgentDefinition |
| `agent_run_id` | UUID | NULLABLE, FK AgentRun |
| `tool_call_id` | UUID | NULLABLE, FK ToolCall |
| `policy_decision_id` | UUID | NULLABLE, FK PolicyDecision |
| `delegation_id` | UUID | NULLABLE, identifiant chaîne délégation |
| `acting_principal` | text | NULLABLE, claim `act` RFC 8693 |
| `on_behalf_of` | text | NULLABLE, claim `may_act` RFC 8693 |
| `approval_request_id` | UUID | NULLABLE, FK ApprovalRequest |

#### Contraintes

- Append-only enforcé par trigger Postgres (pas d'UPDATE ni DELETE depuis l'application).
- Partitionnement mensuel par `created_at`.
- Rétention par défaut 12 mois, configurable par tenant via `TenantSettings.audit_retention_months` (plancher 3 mois, plafond illimité).
- Accès permissionné séparément (`audit.event.read.organization`).
- Aucune édition via API publique ; corrections = nouveaux events `*.corrected`.

### 2.3 Schéma `DomainEvent`

Bus d'intégration inter-modules. Déclencheur des typed triggers (reporting / automation) et des consommateurs (billing depuis project, reporting depuis tous).

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `event_type` | text | NOT NULL, grammar `<module>.<entity>.<verb>` (ex: `invoice.issued`, `crm.opportunity.won`) |
| `resource_type` | text | NOT NULL |
| `resource_id` | UUID | NOT NULL |
| `payload_summary` | jsonb | NOT NULL, contenu minimal pour consommateur (pas de PII inutile) |
| `correlation_id` | UUID | NULLABLE |
| `causation_id` | UUID | NULLABLE, event parent qui a causé celui-ci |
| `emitted_at` | timestamptz | NOT NULL |
| `consumed_at` | timestamptz | NULLABLE, marqué quand worker a traité |

#### Contraintes

- Append-only.
- `event_type` validé contre un catalogue d'événements typed par module (cf. section Events de chaque spec).
- TTL par défaut 30 jours, prolongable pour replay.
- Backbone implémenté via `pgmq` (PG-04) derrière abstraction `JobQueue`.

### 2.4 Schéma `TimelineEntry`

Projection lisible. Une `TimelineEntry` est dérivée d'un `DomainEvent` ou d'une action utilisateur directe ; ce n'est jamais la source de vérité.

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `parent_type` | text | NOT NULL (ex: `company`, `opportunity`, `project`) |
| `parent_id` | UUID | NOT NULL |
| `entry_type` | text | NOT NULL, grammar `<module>.<entity>.<verb>` |
| `actor_user_id` | UUID | NULLABLE quand `actor_type = system` |
| `actor_type` | enum(`human`,`agent`,`system`) | NOT NULL |
| `summary_key` | text | NOT NULL, clé i18n vers `TranslationKey` |
| `payload` | jsonb | NULLABLE, variables d'interpolation pour le rendu |
| `sensitivity` | enum(`public`,`finance`,`hr`) | NOT NULL, default `public` (filtrage scope) |
| `occurred_at` | timestamptz | NOT NULL |

#### Contraintes

- Le rendu utilise `summary_key` + `payload` via ICU MessageFormat.
- Filtrage par `sensitivity` au niveau API (pas seulement UI) : un standard user ne voit pas les entries `finance` sans permission `finance.invoice.read.*`.
- Plusieurs `TimelineEntry` peuvent dériver d'un même `DomainEvent` (vue CRM + vue project pour un same handoff).

### 2.5 Convention de nommage d'événements

Grammar canonique partagée par les 3 couches : `<module>.<entity>.<verb>`.

- `<module>` ∈ {`crm`, `project`, `time`, `invoice`, `payment`, `journal_entry`, `accounting_period`, `agent`, `report`, `workflow`, `webhook`, `user`, `organization`, `role`, `audit`, `system`}
- `<entity>` : nom singulier de l'entité concernée
- `<verb>` : action passée (`created`, `updated`, `stage_changed`, `won`, `lost`, `approved`, `posted`, `voided`, `corrected`, `merged_into`, etc.)

Promotion PG-06 article 2 : cette grammaire s'applique aux 3 couches. Un validator runtime côté foundation rejette les `entry_type` ou `event_type` hors grammaire.

Exemples canoniques (extraits) :

```
crm.lead.created
crm.lead.converted
crm.opportunity.created
crm.opportunity.stage_changed
crm.opportunity.won
crm.opportunity.lost
crm.quote_handoff.requested
project.project.created_from_crm
project.task.status_changed
project.time_entry.submitted
project.time_entry.approved
project.invoice_proposal.created
project.invoice_proposal.approved
project.invoice_proposal.handoff_to_billing
invoice.draft_created
invoice.issued
invoice.voided
payment.registered
journal_entry.posted
accounting_period.closed
agent.run.started
agent.run.completed
agent.policy_decision.recorded
agent.tool_call.executed
user.invited
user.activated
user.roles_changed
organization.settings_changed
```

---

## Article 3 — Activity préfixage obligatoire

Le mot « Activity » nu est interdit en MVP. Il recouvrait dans la revue initiale quatre concepts distincts dont la fusion produisait des permissions ambiguës, des timelines polluées et des risques de copie Odoo (`mail.activity` / `mail.message`). Le canon arbitré PG-06 article 3 oblige le préfixage par domaine.

### 3.1 Les quatre familles

| Entité | Propriétaire | Rôle | Cycle de vie |
| --- | --- | --- | --- |
| `CrmActivity` | CRM | Log commercial (appel, réunion, note, tâche commerciale) | `planned` → `done` ou `cancelled` |
| `ProjectTask` | Project | Action à faire dans une livraison | `not_started` → `in_progress` → `done` ou `blocked` ou `cancelled` |
| `ServiceActivity` | Project (catalogue) | Type de prestation facturable | `active` ou `inactive` (référentiel) |
| `AgentRun` | Agentic | Exécution d'un agent (état conversation, séquence de tool calls) | `pending` → `running` → `succeeded` ou `failed` ou `cancelled` |

Aucune fusion. Aucun discriminateur `type`. Quatre tables séparées. Quatre cycles de vie séparés.

### 3.2 Schéma `CrmActivity`

Remplace l'ancienne entité `Activity` du CRM (D-CRM-03 révoqué).

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `resource_type` | enum(`lead`,`opportunity`,`company`,`contact`) | NOT NULL |
| `resource_id` | UUID | NOT NULL |
| `activity_type` | enum(`call`,`meeting`,`note`,`task`,`email.inbound`,`email.outbound`) | NOT NULL |
| `subject` | text | NOT NULL |
| `due_at` | timestamptz | NULLABLE |
| `completed_at` | timestamptz | NULLABLE |
| `owner_user_id` | UUID | NOT NULL, FK User |
| `status` | enum(`planned`,`done`,`cancelled`) | NOT NULL |
| `outcome` | text | NULLABLE |
| `next_step` | text | NULLABLE |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

Status dérivé `overdue` calculé : `status = 'planned' AND due_at < now()`.

### 3.3 Schéma `ProjectTask`

Remplace l'ancienne table `Task` du module project (PG-06 article 3).

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `project_id` | UUID | NOT NULL, FK Project |
| `parent_task_id` | UUID | NULLABLE, FK ProjectTask, profondeur max 1 niveau (PT-D-04) |
| `name` | text | NOT NULL |
| `status` | enum(`not_started`,`in_progress`,`blocked`,`done`,`cancelled`) | NOT NULL |
| `priority` | enum(`low`,`normal`,`high`,`urgent`) | NOT NULL, default `normal` |
| `assignee_user_id` | UUID | NULLABLE, FK User |
| `due_date` | date | NULLABLE |
| `estimated_hours` | decimal(8,2) | NULLABLE |
| `billable_default` | boolean | NOT NULL, default true |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

### 3.4 Schéma `ServiceActivity`

Catalogue tenant de prestations facturables. PG-05 i18n via TranslationKey FK (les colonnes `fr_label` / `en_label` historiques sont retirées).

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `name` | text | NOT NULL, identifiant interne (kebab-case recommandé) |
| `description` | text | NULLABLE |
| `label_translation_key_id` | UUID | NOT NULL, FK TranslationKey (foundation), ICU FR-CA/EN-CA |
| `billable_default` | boolean | NOT NULL, default true |
| `default_rate_id` | UUID | NULLABLE, FK Rate |
| `active` | boolean | NOT NULL, default true |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

### 3.5 Schéma `AgentRun`

Exécution d'un agent. Une seule entité, jamais fusionnée avec `CrmActivity`, `ProjectTask`, `ServiceActivity`.

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `agent_definition_id` | UUID | NOT NULL, FK AgentDefinition |
| `triggered_by_user_id` | UUID | NULLABLE, FK User (NULL si trigger système ou workflow typed) |
| `triggered_by_workflow_run_id` | UUID | NULLABLE, FK WorkflowRun |
| `acting_principal` | text | NOT NULL, claim `act` RFC 8693 |
| `on_behalf_of` | text | NULLABLE, claim `may_act` RFC 8693 |
| `mode` | enum(`acting_as`,`service_principal`,`on_behalf_of`) | NOT NULL |
| `status` | enum(`pending`,`running`,`succeeded`,`failed`,`cancelled`,`awaiting_approval`) | NOT NULL |
| `started_at` | timestamptz | NULLABLE |
| `completed_at` | timestamptz | NULLABLE |
| `budget_consumed` | jsonb | NOT NULL (tokens, $, tool_calls counters) |
| `policy_decision_id` | UUID | NULLABLE, FK PolicyDecision (décision d'entrée) |
| `approval_request_id` | UUID | NULLABLE, FK ApprovalRequest |
| `trace_id` | text | NULLABLE, identifiant OTel root span |
| `created_at` | timestamptz | NOT NULL |

### 3.6 Anti-confusion : exemples interdits

- ❌ Une table `activities` avec un champ `module` ou `category`.
- ❌ Une vue `unified_activities` qui UNION les quatre tables (acceptée seulement comme projection reporting strictement read-only).
- ❌ Une permission `activity.read.organization` non préfixée. Préfixer : `crm.activity.read.*`, `project.task.read.*`, `agent.run.read.*`.

---

## Article 4 — Frontières inter-modules

Chaque entité a un et un seul propriétaire (module qui définit le schéma, écrit, et publie les events). Les autres modules consomment via API, DomainEvent, ou jointure lecture.

### 4.1 Foundation owns

Primitives transverses. Pas de logique métier ; uniquement infrastructure.

- `User` — identité globale runtime (humain, agent, système). Le champ `actor_type ∈ {human, agent, system}` est le pivot.
- `UserIdentity` — identité d'auth (email, MFA, password hash, recovery codes). Une `UserIdentity` peut être membre de plusieurs `Organization` via `OrganizationMember` (PG-02).
- `OrganizationMember` — appartenance `{user_identity_id, organization_id, status, preferred_locale, roles[], created_at}`.
- `Role` — rôle scoppé tenant `{id, organization_id, name, system_role flag, status}`.
- `PermissionGrant` — `{role_id|user_id, resource, action, scope, conditions, created_by, created_at}`.
- `Permission` (catalogue) — `{resource.action.scope}` enuméré code (F-1).
- `AuditEvent` — cf. Article 2.
- `DomainEvent` — cf. Article 2.
- `ApprovalRequest` — cf. Cross-cutting primitives.
- `TranslationKey` — cf. Cross-cutting primitives.
- `IdempotencyRecord` — cf. Cross-cutting primitives.
- `Money` (type) — cf. Article 1.
- `FxRateSnapshot` — cf. Article 1.
- `FileObject` — `{id, organization_id, storage_key, filename, content_type, size_bytes, checksum, visibility_scope, created_by, created_at}`.
- `Comment` — discussion attachée à un parent `{id, parent_type, parent_id, body, visibility, created_by}`.
- `Notification` — message canal `{id, recipient_user_id, channel, subject_key, body_key, payload, status}`.
- `TenantSettings` — configuration tenant (locale, currency, retention, fiscal_year_start, branding_state).
- `JobQueue` (abstraction PG-04, implémentation `pgmq` MVP).
- `TenantIsolationStrategy` (abstraction PG-03, implémentation `row_level_security` MVP).
- `IdentityProvider` (abstraction PG-09, implémentation `rfc8693_token_exchange` MVP).
- `RateLimit` (primitive AGT-D-10).

### 4.2 CRM owns

- `Company` — entité métier (jamais « customer » : c'est un rôle, `Company.is_customer boolean`).
- `Contact` — personne rattachée à une `Company`.
- `Lead` — prospect non qualifié.
- `Opportunity` — pursuit commercial active.
- `PipelineStage` — étape de pipeline tenant.
- `PipelineStageTranslation` — `{pipeline_stage_id, locale, label}` (D-CRM-12 ; table dédiée, pas keys dynamiques dans le catalogue ICU).
- `CrmActivity` — cf. Article 3.
- `CustomerTag` — étiquette.
- `CustomerImportJob` — job CSV/XLSX.
- `CustomFieldDefinition` — déclaratif `{tenant_id, resource_type, field_name, label_fr_key, label_en_key, type, validation_schema}` (D-CRM-04 ; pas de runtime metadata engine).
- `QuoteHandoff` — événement de handoff vers billing `{id, opportunity_id, target_type, status, requested_by, accepted_at}` (D-CRM-09 ; CRM owns l'event, billing owns le document).
- `TimelineEntry` scopée CRM (parent = `company`, `opportunity`, `lead`, `contact`).

### 4.3 Project (delivery) owns

- `Project` — livraison.
- `ProjectTask` — cf. Article 3.
- `ServiceActivity` — cf. Article 3.
- `Assignment` — `{project_id, user_id, role_label, allocation_percent, start_date, end_date, billable_rate_id}`.
- `TimeEntry` — saisie temps.
- `TimeApproval` — projection au-dessus d'`ApprovalRequest` (cf. Cross-cutting primitives, PG-07).
- `ProjectBillingRule` — `{project_id, billing_method, rate_source, fixed_amount, milestone_name, active}`.
- `Rate` — taux horaire avec effective_from/effective_to.
- `InvoiceProposal` — handoff vers billing (project owns l'event, billing owns l'invoice).
- `InvoiceProposalLine` — ligne de proposition.
- `DeliveryTimelineEntry` — projection TimelineEntry parent = `project`.

### 4.4 Billing (finance) owns

- `Invoice` — document de facturation final.
- `InvoiceLine` — ligne (avec source_type/source_id pointant `InvoiceProposalLine` ou autre source tracée).
- `Payment` — encaissement.
- `RecurringBillingSchedule` — schedule récurrent (pgmq cron).
- `JournalEntry` — écriture comptable.
- `JournalEntryLine` — ligne d'écriture (débit/crédit/compte).
- `AccountingPeriod` — période fiscale tenant.
- `ChartOfAccounts` — plan comptable tenant.
- `Account` — compte.
- `TaxRegistration` — enregistrement fiscal (GST/HST/QST).
- `TaxCategory` — catégorie taxe.
- `TaxRateVersion` — taux effectif versionné.
- `FinanceExport` — export ledger.
- `QuoteDocument` — document de devis (billing owns le doc, CRM owns le handoff). Reservé MVP, surface complète post-MVP.

### 4.5 Reporting (et automation) owns

- `SavedView` — filtre/colonne sauvegardé.
- `ReportDefinition` — définition de rapport (SQL + bindings).
- `ReportRun` — exécution.
- `Dashboard` — tableau de bord.
- `DashboardWidget` — widget (cf. R-1, primitive native SvelteKit).
- `ScheduledDelivery` — livraison planifiée d'un rapport.
- `WorkflowDefinition` — typed YAML DSL.
- `WorkflowRun` — exécution typed automation.
- `WebhookEndpoint` — destination webhook.
- `WebhookDelivery` — livraison webhook.

### 4.6 Agentic owns

- `AgentDefinition` — `{id, organization_id, name, capabilities[], tools[], policies[], budget_caps, identity_mode, status}`.
- `AgentRun` — cf. Article 3.
- `PolicyDecision` — `{id, agent_run_id, tool_call_id, policy_id, decision (allow|deny|require_approval), reason, evaluated_at}`.
- `ToolCall` — `{id, agent_run_id, tool_name, input, output, status, started_at, completed_at, otel_span_id}`.
- `SupervisionRequest` — `{id, agent_run_id, mode (inline|panel), assigned_to_user_id, decision, decided_at}`.
- `AgentIdentity` — extension de `UserIdentity` avec `actor_type = agent`. PAS une table séparée ; conceptuellement c'est un `User.actor_type = agent` plus métadonnées agent dans `AgentDefinition`.

### 4.7 Frontières en cas de doute

| Question | Réponse | Source |
| --- | --- | --- |
| Qui owns le handoff CRM → billing pour devis ? | CRM owns `QuoteHandoff` (event), Billing owns `QuoteDocument` (doc) | D-CRM-09 |
| Qui owns le handoff project → billing pour facture ? | Project owns `InvoiceProposal` (event), Billing owns `Invoice` (doc) | PG-06 |
| Qui owns le typed trigger sur `invoice.issued` ? | Reporting (workflow engine consomme DomainEvent émis par Billing) | R-2 |
| Qui owns l'agent qui prépare une `InvoiceProposal` ? | Agentic owns `AgentRun`, Project owns la `InvoiceProposal` mutée | PG-06 article 3 |
| Qui owns l'`ApprovalRequest` cross-module ? | Foundation owns la primitive ; chaque module consomme | PG-07 |
| Qui owns la TimelineEntry visible côté CRM mais alimentée par project ? | CRM owns le scope visuel `TimelineEntry parent_type=company`, Project émet le `DomainEvent` qui la peuple | PG-06 article 2 |

---

## Cross-cutting primitives

Primitives foundation consommées par tous les modules.

### Money type (rappel)

```
Money {
  amount_minor: bigint     // ex: 12500 pour 125,00 CAD
  currency: string(3)      // ISO 4217, ex: "CAD"
  scale: smallint          // typiquement 2
}
```

Service `currency.resolve(source, target, effective_at) → FxRateSnapshot` consommé par billing (invoice post), reporting (revenue by customer in tenant base currency), agentic (conversion budget cap).

### ApprovalRequest

Entité foundation mutualisée. Remplace les cinq réinventions identifiées en revue (close-won threshold CRM, time approval project, invoice proposal approval project, void/write-off/period close billing, approval-in-the-loop agentic). PG-07.

#### Schéma

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `subject_type` | text | NOT NULL (ex: `crm.opportunity.close_won`, `project.time_entry.week`, `billing.invoice.void`, `agent.run.issuance`) |
| `subject_id` | UUID | NOT NULL, id de l'objet concerné |
| `requester_user_id` | UUID | NULLABLE quand requester est `system` ou `agent` |
| `requester_actor_type` | enum(`human`,`agent`,`system`) | NOT NULL |
| `approver_role` | text | NULLABLE, role attendu (ex: `finance.manager`) |
| `approver_user_id` | UUID | NULLABLE, approbateur effectif une fois décidé |
| `threshold_amount` | jsonb | NULLABLE, `Money` quand seuil financier |
| `urgency` | enum(`low`,`normal`,`high`,`critical`) | NOT NULL, default `normal` |
| `status` | enum(`pending`,`approved`,`rejected`,`escalated`,`expired`,`cancelled`) | NOT NULL |
| `decision_reason` | text | NULLABLE |
| `decided_at` | timestamptz | NULLABLE |
| `expires_at` | timestamptz | NULLABLE (TTL pour auto-escalation) |
| `created_at` | timestamptz | NOT NULL |

#### Exposition

- REST API : `POST /approvals`, `GET /approvals?status=pending`, `POST /approvals/{id}/approve`, `POST /approvals/{id}/reject`, `POST /approvals/{id}/escalate`.
- MCP tool : `request_approval(subject_type, subject_id, reason, urgency)` consommé par agents agentic (AGT-D-15).
- SDK `@sentropic/openerp-sdk` : helpers typed.

#### Politique

`ApprovalPolicy {tenant_id, subject_type, threshold_amount, approvers_role, escalation_ttl}` configurable par tenant (AGT-D-09). Hybride rôle (default) + tool (escalation rule) + tenant (policy override).

#### Consommateurs MVP

- CRM : `crm.opportunity.close_won` au-dessus du seuil (AC-F-03).
- Project : `project.time_entry.week` (PT-D-02), `project.invoice_proposal.approve`.
- Billing : `billing.invoice.void`, `billing.invoice.write_off`, `billing.accounting_period.close` (B-decisions).
- Agentic : `agent.run.issuance` (issuance du JWT agent via ApprovalRequest, AGT-D-04), `agent.tool_call.require_approval` (AGT-D-15).
- Foundation : pas de consommateur direct ; foundation owns la primitive uniquement.

### Idempotency-Key

Header HTTP obligatoire sur toute POST/DELETE à side-effect métier (PG-08). Pattern Stripe.

#### Convention

```
Idempotency-Key: <uuid-v4-ou-v7-fourni-par-le-client>
```

Le client génère et conserve l'`Idempotency-Key` pour permettre le replay sûr en cas de panne réseau.

#### Schéma `IdempotencyRecord`

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NOT NULL, FK Organization |
| `key` | text | NOT NULL, UNIQUE par tenant |
| `request_hash` | text | NOT NULL, SHA-256 du body + path + method (anti-collision) |
| `response_body` | jsonb | NOT NULL |
| `status_code` | smallint | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `expires_at` | timestamptz | NOT NULL, TTL 24h |

#### Sémantique

- Première requête avec `key=X` exécute l'action, stocke `response_body` + `status_code`.
- Replay (même `key=X`, même `request_hash`) retourne la réponse cachée sans ré-exécuter.
- Replay avec `key=X` et `request_hash` différent retourne `409 Conflict idempotency_key_reused` (le client a réutilisé la clé pour une autre opération).
- Au-delà du TTL 24h, l'enregistrement expire et la `key` peut être réutilisée.

#### Endpoints obligatoires MVP (non exhaustif)

- foundation : `POST /users/invitations`, `POST /organizations`, `PATCH /users/{id}` (changement rôle), `POST /password-resets`.
- CRM : `POST /crm/leads/{id}/convert`, `POST /crm/opportunities`, `POST /crm/opportunities/{id}/close-won`, `POST /crm/import-jobs/{id}/commit`.
- Project : `POST /time-entries`, `POST /invoice-proposals`, `POST /invoice-proposals/{id}/handoff-to-billing`.
- Billing : `POST /invoices`, `POST /invoices/{id}/issue`, `POST /payments`, `POST /journal-entries/{id}/post`, `POST /accounting-periods/{id}/close`.
- Reporting : `POST /reports/{id}/run`, `POST /webhooks/{id}/deliveries`.
- Agentic : `POST /agents/{id}/runs`, `POST /agents/runs/{id}/tools/{name}/call`.

### TranslationKey

Table foundation pour i18n de libellés DATA (donnée tenant). Distincte du catalogue UI statique fourni par fichiers ICU JSON applicatifs.

#### Schéma

| Champ | Type | Contraintes |
| --- | --- | --- |
| `id` | UUID v7 | PK |
| `organization_id` | UUID | NULLABLE (NULL pour clés systèmes globales) |
| `namespace` | text | NOT NULL (ex: `service_activity.label`, `pipeline_stage.name`, `tax_category.name`) |
| `key` | text | NOT NULL, identifiant stable |
| `locale` | text | NOT NULL, BCP-47 (`fr-CA`, `en-CA`) |
| `label` | text | NOT NULL, contenu localisé |
| `description` | text | NULLABLE, contexte traducteur |
| `status` | enum(`draft`,`active`,`deprecated`) | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

UNIQUE `(organization_id, namespace, key, locale)`.

#### Format

ICU MessageFormat nested JSON pour catalogue UI statique applicatif (cf. PG-05). Pour libellés DATA tenant, format texte simple avec interpolation ICU autorisée si nécessaire pour pluralisation.

#### Consommateurs

- `ServiceActivity.label_translation_key_id` FK directe.
- `PipelineStageTranslation` table dédiée (`{pipeline_stage_id, locale, label}`) car cycle de vie spécifique stage admin, mais MAY référencer TranslationKey foundation post-MVP.
- `InvoiceProposalLine.description_key` clé namespace `invoice_proposal.description`.
- `TimelineEntry.summary_key` clé namespace `<module>.<entity>.<verb>.summary`.
- `Notification.subject_key`, `Notification.body_key`.
- `TaxCategory`, `loss_reason`, `lead_source`, `activity_type`, `customer_tag` (CRM seed + tenant additions).

### Multi-tenant identity

PG-02 + PG-09. Foundation expose :

- `UserIdentity` : identité globale (passkey, MFA, recovery codes, email NFC-normalisé).
- `OrganizationMember` : appartenance `{user_identity_id, organization_id, status, preferred_locale, roles[]}`.
- `User` (vue logique) : projection runtime `{id, organization_id, actor_type, ...}` consommée par toutes les FK métier.

Un humain avec deux `OrganizationMember` voit le sélecteur d'organisation (cf. `org.switcher` foundation UI). Les FK métier (`Opportunity.owner_user_id`, `TimeEntry.user_id`, etc.) référencent toujours le `User` runtime du tenant courant.

### JobQueue abstraction

PG-04. Foundation expose une interface `JobQueue` avec une implémentation MVP `pgmq`. Aucun module ne touche `pgmq` directement.

Méthodes minimales :

- `enqueue(queue_name, payload, options: {scheduled_at, idempotency_key, delay})`
- `consume(queue_name, handler, options: {batch_size, visibility_timeout})`
- `ack(message_id)`, `nack(message_id, reason)`

Migration future possible (BullMQ+Redis, NATS JetStream, managed) sans réécriture des modules consommateurs.

---

## Cross-references

- `decision-pack.md` — arbitrage 2026-05-14, sections PG-01 à PG-12.
- `foundation-security-i18n.md` — propriétaire des primitives Article 1, 2, 4.1 et cross-cutting.
- `crm-customer-timeline.md` — consommateur Article 3 (`CrmActivity`), Article 4.2.
- `project-time-to-invoice.md` — consommateur Article 3 (`ProjectTask`, `ServiceActivity`), Article 4.3.
- `billing-accounting.md` — consommateur Article 1 (Money/FX), Article 2 (`JournalEntry` comme DomainEvent dédié), Article 4.4.
- `reporting-automation.md` — consommateur Article 2 (typed triggers sur DomainEvent), Article 4.5.
- `agentic-impacts.md` — consommateur Article 3 (`AgentRun`), Article 2 (AuditEvent étendu), Article 4.6, ApprovalRequest.
- `../12-agentic/identity-design-space.md` — détails identity delegation RFC 8693.
- `../12-agentic/runtime-safety-functional-map.md` — six capabilities agentiques transverses.
- `../../tools/anti-copy-grep.sh` (à créer, PG-12) — script CI patterns interdits.
- `../../NOTICE` (à créer, B-1 + PG-12) — attribution Kill Bill, OpenMeter, Superset, Node-RED.

---

## Anti-copy notes

Ce canon est rédigé indépendamment de tout donneur (Odoo, Twenty, ERPNext, Kimai, Frappe, Dolibarr, FacturaScripts, Crater, InvoicePlane, Kill Bill, OpenMeter, Superset, Node-RED, LangGraph, CrewAI, AutoGen, SuiteCRM, EspoCRM, Aureus, HubSpot, Salesforce). Aucun nom verbatim. Une pomme est une pomme : `Customer`, `Invoice`, `Project`, `Task`, `Company`, `Contact`, `Lead`, `Opportunity`, `Payment`, `Account` sont des noms business universels documentés depuis plusieurs décennies dans la littérature ERP/CRM publique.

Le préfixage Article 3 (`CrmActivity`, `ProjectTask`, `ServiceActivity`, `AgentRun`) protège contre la confusion conceptuelle observée chez Odoo (`mail.activity` / `mail.message`) et chez plusieurs CRMs (Twenty `Task` ≠ `Activity`).

Le triple-layer Article 2 (`AuditEvent` / `DomainEvent` / `TimelineEntry`) protège contre le risque de copie du Chatter Odoo (`mail.thread` / `mail.message` / `mail.tracking.value`) en séparant clairement les responsabilités au lieu de les fusionner.

L'entité `Money` Article 1 est rédigée en propre, sans réutilisation du composite type Odoo `res.currency` ni de l'API Money de Stripe (les helpers SDK porteront les mêmes signatures que tout type Money standard, mais sans copie).

Les anti-copy hotspots transverses (23 identifiés en revue 2026-05-12, top 12 listés dans `decision-pack.md`) sont couverts par `tools/anti-copy-grep.sh` (PG-12). Patterns ciblés en CI :

- Odoo : `mail.thread`, `mail.message`, `mail.activity`, `mail.tracking`, `account.move`, `account.move.line`, `account.journal`, `ir.model.fields`, `ir.rule`, `ir.logging`, `ir.model.access`, `res.users`, `res.company`, `res.partner`, `l10n_ca`, `auth_totp`, `auth_oauth`, `auth_password_policy`.
- Twenty : `ObjectMetadata`, `FieldMetadata`, `workspaceMember`, `workspace.permission`.
- Frappe : `doctype`, `frappe.model`.
- Kimai : `KEvent`, `Kimai\\` namespaces, timesheet entity names.
- SuiteCRM : `bean->`, `module_name`.
- Superset : `chart_controls`, Selenium PDF patterns.
- Node-RED : `node-palette`, flow JSON shapes.
- Dolibarr : `llx_*` table prefix.
- Kill Bill / OpenMeter : pattern API noms verbatim (autorisés en inspiration sous `NOTICE`, pas en code).

Toute PR touchant ces zones déclenche revue anti-copy obligatoire par l'owner programme (PG-12).
