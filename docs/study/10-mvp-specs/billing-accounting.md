# MVP Spec: Billing And Accounting Operations

## Progress

Fait: Billing/accounting MVP spec drafted for invoice drafts, recurring billing schedules, project invoice proposals, payment status, journal postings, tax registration settings, and conservative accounting controls.
À faire: Draft reporting/automation spec; module-spec package is about 80% complete.
Attendu: Use this spec as the financial boundary for MVP implementation, while keeping statutory filing and native payroll outside scope until versioned rule packs exist.

## Objective

Create a conservative finance module that can support service-company billing without claiming complete statutory accounting or payroll coverage.

The MVP must:

- generate invoice drafts from project invoice proposals, recurring schedules, and manual lines;
- issue invoices with traceable source records;
- record payment status and manual payment registration;
- create balanced journal entries for invoice and payment events;
- track GST/HST/QST registration settings and tax lines through a configurable tax interface;
- support accounts receivable aging and export-ready ledger data;
- keep payroll, statutory filings, and full tax filing workflows out of MVP implementation.

## Roles

| Role | Responsibilities |
| --- | --- |
| Finance user | Reviews invoice drafts, issues invoices, records payments, reviews accounting entries, and runs AR exports. |
| Finance manager | Approves posting, period locks, write-offs, and sensitive corrections. |
| Project manager | Reviews project invoice proposal readiness and line traceability. |
| Sales lead | Reads customer contract/billing status where allowed. |
| Owner/admin | Configures chart, tax registrations, numbering, currencies, and approval thresholds. |
| Auditor/read-only user | Reads posted financial records and audit logs without mutation. |

## Data Entities

| Entity | Required Fields |
| --- | --- |
| `ChartOfAccounts` | id, organization_id, name, country, province_state, currency, status, created_at. |
| `Account` | id, organization_id, code, name, type, normal_balance, tax_control_flag, active, parent_account_id. |
| `TaxRegistration` | id, organization_id, authority, registration_number, tax_type, country, province_state, effective_from, effective_to, filing_frequency, status. |
| `TaxCategory` | id, organization_id, name, tax_type, country, province_state, taxable_treatment, active, effective_from, effective_to. |
| `TaxRateVersion` | id, organization_id, tax_category_id, rate_percent, effective_from, effective_to, source_note. |
| `Invoice` | id, organization_id, customer_company_id, language, currency, status, invoice_number, issue_date, due_date, subtotal_amount, tax_amount, total_amount, balance_due, source_type, source_id, created_at, posted_at. |
| `InvoiceLine` | id, organization_id, invoice_id, source_type, source_id, description_key, quantity, unit_price, subtotal_amount, tax_category_id, tax_amount, total_amount, revenue_account_id, trace_payload. |
| `RecurringBillingSchedule` | id, organization_id, customer_company_id, contract_id, service_item_id, status, frequency, next_run_date, start_date, end_date, currency, amount, tax_category_id. |
| `Payment` | id, organization_id, customer_company_id, invoice_id, payment_method, status, amount, currency, received_at, reference, created_at. |
| `JournalEntry` | id, organization_id, entry_number, status, entry_date, source_type, source_id, memo_key, posted_by, posted_at. |
| `JournalEntryLine` | id, organization_id, journal_entry_id, account_id, debit_amount, credit_amount, currency, customer_company_id, tax_registration_id, source_line_id. |
| `AccountingPeriod` | id, organization_id, fiscal_year, period_start, period_end, status, locked_at, locked_by. |
| `FinanceExport` | id, organization_id, export_type, period_start, period_end, status, created_by, created_at, file_id. |

## States

### Invoice Status

| State | Meaning |
| --- | --- |
| `draft` | Editable before issue. |
| `approved` | Reviewed and ready to issue. |
| `issued` | Sent or made available to customer; accounting entry can be posted. |
| `partially_paid` | Payment total is below invoice total. |
| `paid` | Balance due is zero. |
| `void` | Cancelled with controlled reason before or after issue according to policy. |
| `written_off` | Balance closed by approved write-off. |

### Journal Entry Status

| State | Meaning |
| --- | --- |
| `draft` | Generated or manual entry not posted. |
| `posted` | Final accounting record. |
| `reversed` | Reversed by linked correcting entry. |

### Accounting Period Status

| State | Meaning |
| --- | --- |
| `open` | Ordinary transactions allowed. |
| `closing` | Review in progress; sensitive changes restricted. |
| `closed` | Ordinary edits blocked; corrections require controlled entry. |

## Permission Model

Required permissions:

- `finance.invoice.read.own|team|organization`
- `finance.invoice.write.organization`
- `finance.invoice.approve.organization`
- `finance.invoice.issue.organization`
- `finance.payment.write.organization`
- `finance.journal.read.organization`
- `finance.journal.post.organization`
- `finance.period.manage.organization`
- `finance.tax.manage.organization`
- `finance.export.organization`

Rules:

- issuing invoices requires finance permission;
- posting journal entries requires finance posting permission;
- void, write-off, and period close require manager-level approval;
- closed-period corrections require reversal/correction workflow;
- tax settings require admin/finance configuration permission;
- exports are always audited.

## Workflows

### Invoice From Project Proposal

1. Project module emits approved invoice proposal handoff.
2. Finance user creates invoice draft from proposal.
3. System creates invoice lines with source links to proposal lines and time entries.
4. Tax interface calculates tax lines from customer location, registration settings, tax category, and effective rate version.
5. Finance user reviews and approves.
6. Finance user issues invoice.
7. System creates draft or posted journal entry according to tenant policy.

### Recurring Billing

1. User creates recurring schedule from contract/subscription.
2. Schedule stores frequency, amount, tax category, start/end, next run date, and status.
3. Worker generates invoice draft for due schedule.
4. Finance reviews and issues invoice.
5. Schedule advances next run date or ends.

### Payment Registration

1. Finance user records payment against invoice.
2. System validates amount, currency, payment date, and reference.
3. Payment updates invoice balance and payment status.
4. System creates payment journal entry or draft.
5. Overpayment/underpayment requires explicit handling state.

### Period Close Basics

1. Finance user reviews invoices, payments, journal entries, aging, and export readiness.
2. Finance manager marks period as closing.
3. System blocks ordinary backdated changes where configured.
4. Finance manager closes period.
5. Later corrections use reversing/correction entries.

## Business Rules

- Journal entries must balance before posting.
- Invoice numbers are generated by tenant numbering policy and cannot be reused.
- Issued invoice edits require revision, void, or credit/correction flow; no silent mutation.
- Invoice lines must retain source type/id when generated from project, recurring billing, or contract.
- Tax rates are effective-dated and stored as versions.
- Tax calculation must be replaceable by regional rule pack; MVP does not certify statutory tax filing.
- GST/HST/QST registration settings are organization configuration, not hard-coded assumptions.
- Collected tax posts to liability accounts, not revenue accounts.
- Payment registration cannot create negative invoice balances without overpayment policy.
- Closed periods block ordinary edits.
- Exports must include filters, period, actor, timestamp, and file checksum.

## API Expectations

Initial API surface:

- `GET /finance/accounts`
- `POST /finance/accounts`
- `GET /finance/tax-registrations`
- `POST /finance/tax-registrations`
- `PATCH /finance/tax-registrations/{id}`
- `GET /finance/tax-categories`
- `POST /finance/tax-categories`
- `GET /billing/recurring-schedules`
- `POST /billing/recurring-schedules`
- `PATCH /billing/recurring-schedules/{id}`
- `POST /invoices/from-project-proposal`
- `GET /invoices`
- `POST /invoices`
- `GET /invoices/{id}`
- `PATCH /invoices/{id}`
- `POST /invoices/{id}/approve`
- `POST /invoices/{id}/issue`
- `POST /invoices/{id}/void`
- `POST /payments`
- `GET /journal-entries`
- `POST /journal-entries`
- `POST /journal-entries/{id}/post`
- `POST /accounting-periods/{id}/close`
- `POST /finance/exports`

API rules:

- all finance writes return audit event ids;
- posting endpoints validate balanced accounting and permissions;
- tax calculation response includes rate version id and source configuration id;
- invoice generation from project proposal is idempotent by proposal id;
- export endpoints create asynchronous jobs with file reference.

## Events

Required domain events:

- `finance.tax_registration.created`
- `finance.tax_category.updated`
- `billing.schedule.created`
- `billing.schedule.invoice_draft_created`
- `invoice.draft_created`
- `invoice.approved`
- `invoice.issued`
- `invoice.voided`
- `payment.registered`
- `journal_entry.created`
- `journal_entry.posted`
- `journal_entry.reversed`
- `accounting_period.closed`
- `finance.export.created`

## Localization Requirements

- Invoice labels, payment terms, tax labels, line descriptions, and validation messages require FR/EN.
- Customer language determines invoice rendering language unless overridden.
- Currency and number formatting follow document language/locale rules but stored values remain numeric and currency-explicit.
- Tax registration names and document labels must support GST/HST/QST and future regional tax packs.

## Reporting Requirements

MVP finance reporting should include:

- open invoice list;
- AR aging;
- payments by period;
- revenue by customer/project;
- tax liability workpaper by tax registration and period;
- journal entry export;
- invoice proposal to invoice trace report;
- period close checklist.

## Acceptance Tests

- Invoice generated from project proposal preserves all source line references.
- Invoice cannot be issued without customer, due date, currency, and at least one line.
- Issued invoice creates balanced journal entry or configured draft entry.
- Journal entry posting fails if debits and credits do not balance.
- Payment registration reduces invoice balance.
- Full payment changes invoice status to paid.
- Overpayment requires explicit policy state.
- Tax line uses effective tax rate version for invoice issue date.
- Collected tax posts to liability account.
- Closed accounting period blocks ordinary invoice/payment edits.
- Void action requires reason and audit event.
- Finance export creates file object and audit event.
- FR and EN invoice labels exist before document generation.

## Non-Goals

- No native payroll calculation.
- No T4/RL slip filing.
- No statutory tax return filing certification.
- No bank feed reconciliation automation in MVP.
- No full subscription-billing engine equivalent to Kill Bill.
- No high-volume usage rating engine equivalent to OpenMeter.
- No copied Odoo accounting models, reports, XML views, localization templates, or workflows.
- No copied Kill Bill/OpenMeter APIs, state machines, generated clients, templates, or tests.

## Agentic Impacts

Agentic support adds supervised invoice preparation, dunning preparation, renewal watch, AR reconciliation suggestions, AP triage, anomaly detection, policy-blocked accounting actions and audit-visible finance approval; the consolidated impact map is in [`docs/study/10-mvp-specs/agentic-impacts.md`](agentic-impacts.md).

## Enrichment 2026-05-12

Cette annexe approfondit la spec sans la modifier. Posture licence rappelée : Odoo LGPL et FacturaScripts LGPL = inspiration prudente en abstraction; Dolibarr GPL, Crater AGPL et InvoicePlane (NOASSERTION + restrictions de marque) = référence fonctionnelle seulement; Kill Bill et OpenMeter Apache-2.0 = modèle de données et patterns API peuvent inspirer librement, sous réserve d'ajouter les mentions dans `NOTICE` à la racine. Aucun nom de table Odoo (du type `account_move`, `account_journal`) ni libellé UI Dolibarr ne doit transparaître dans la spec ou l'implémentation. Le marché prioritaire reste FR-CA et la conformité Québec est une exigence transverse.

### Functional Depth

#### User stories

1. **Finance user — émission de facture sur projet livré.** En tant que `finance.user`, je veux ouvrir un brouillon de facture proposé par le module projet, vérifier les lignes (temps, jalons, débours), ajuster la description et émettre la facture avec numéro séquentiel et envoi PDF/FR au client québécois, afin de clôturer le cycle facturable sans ressaisir les références d'origine.
2. **Finance user — encaissement et rapprochement bancaire.** En tant que `finance.user`, je veux enregistrer un paiement reçu (chèque, virement, carte) contre une facture émise, appliquer une devise différente si nécessaire, et marquer la ligne bancaire importée comme rapprochée, afin de mettre à jour le solde dû et créer l'écriture comptable équilibrée.
3. **Sales lead — visibilité contrat et facturation.** En tant que `sales.lead`, je veux consulter en lecture l'état des factures et des paiements pour mes comptes assignés, sans pouvoir muter, afin d'arbitrer une relance commerciale ou un upsell sans solliciter la finance.
4. **Project manager — préparation de la proposition de facturation.** En tant que `project.manager`, je veux passer en revue les heures, jalons et débours d'un projet, marquer les lignes comme prêtes à facturer ou à reporter, et déclencher la proposition vers la finance, afin que le brouillon de facture parte avec des sources tracées et un perimeter validé.
5. **Finance manager — clôture de période et relances.** En tant que `finance.manager`, je veux verrouiller une période, examiner les factures en souffrance, déclencher une vague de relances (dunning) selon le palier d'âge, et approuver les radiations exceptionnelles, afin de garder un AR sain et un journal verrouillé auditable.

#### Golden path : projet facturable → écriture comptable

```
Project module          Finance                  Tax engine             Accounting             Bank
-------------           ---------                ----------             -----------            -----
proposal.ready  -->  invoice.draft_created
                       (lines + source_id)  -->  rate_version_resolved
                                                 (GST 5% + QST 9.975%)
                     invoice.approved
                     invoice.issued ----------------------->  journal_entry.created (draft)
                                                              journal_entry.posted
                                                              (AR debit, revenue credit,
                                                               tax liability credit)
                     payment.registered <-------------------- bank.line.imported
                                                              journal_entry.created
                                                              (cash debit, AR credit)
                                                              bank.line.reconciled
                     invoice.status = paid
```

Chaque étape doit produire un event de domaine déjà listé (`invoice.draft_created`, `invoice.issued`, `payment.registered`, `journal_entry.posted`) avec id d'audit, et la traçabilité `source_type/source_id` survit jusqu'à la ligne du journal.

#### Edge cases

| Edge case | Comportement attendu |
| --- | --- |
| Taxe Québec mixte GST/QST sur client hors-Québec | Le moteur résout `place_of_supply` à partir de l'adresse du client; si hors-Québec, QST n'est pas appliquée; rate version capturée dans `InvoiceLine.tax_amount` avec id de version. |
| Devise alternative (CAD vs USD) | Facture émise en USD; taux de change capturé au moment de l'émission; journal entry stocke montant transactionnel et montant en monnaie de tenue de livres; gain/perte de change reconnu à l'encaissement. |
| Paiement partiel répété | Chaque `payment.registered` réduit `balance_due`; statut passe `partially_paid` jusqu'au solde nul; aucune mutation silencieuse, chaque paiement crée son écriture. |
| Avoir (credit note) sur facture émise | Avoir est une nouvelle facture liée (`source_type=invoice_credit`); journal entry inverse partiellement ou totalement, avec motif et approbation manager si la période originale est verrouillée. |
| Dunning sur facture en retard | Worker batch détecte les factures dépassant `due_date` selon paliers configurés (30/60/90 jours); propose un événement `dunning.proposed` revu manuellement; aucun envoi automatique sans approbation MVP. |
| Retry payment processor (Stripe webhook) | Echec PSP réenfile la tentative selon politique; nouvelle ligne `Payment` en statut `failed`; ne mute pas le statut de facture; corrélation par `reference` idempotent. |
| Facture issue d'un schedule récurrent expiré | Le worker vérifie `end_date` avant génération; si la date est dépassée, schedule passe `ended` sans créer de brouillon. |

#### Acceptance criteria additionnels

- Tout brouillon généré depuis une proposition projet est idempotent par `proposal_id`; ré-appeler la création doit retourner le brouillon existant.
- L'émission de facture en monnaie alternative refuse de poster si le taux de change effectif est absent ou expiré.
- Toute écriture comptable d'avoir référence l'écriture initiale (`reversed_by` / `reverses`).
- Tout paiement par PSP enregistre l'id de transaction externe et la version de configuration PSP utilisée.
- Le moteur de taxe expose `rate_version_id` et `source_configuration_id` dans la réponse, et l'API rejette tout post sans ces deux ids.
- Aucune facture ne peut être éditée silencieusement après émission; tout changement passe par avoir, void, ou correction approuvée.

### Cross-ERP Benchmark

Posture lecture seule des références fonctionnelles ; aucun verbatim de structure, nom de table, ou libellé UI n'est transposé. Notation : `S` = couverture forte; `P` = partielle; `W` = faible/absent.

| Capability | Odoo (LGPL) | Dolibarr (GPL) | Kill Bill (Apache) | OpenMeter (Apache) | FacturaScripts (LGPL) | Crater (AGPL) | Posture MVP OpenERP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Invoice generation (one-shot) | S | S | S | P | S | S | MVP natif, abstraction propre, sources tracées (`source_type/source_id`). |
| Recurring billing schedule | P | S (contrats) | S (subscription) | S (plans) | P | S (recurring) | MVP natif minimal; scheduler interne (pgmq cron); voir Tech Layer. |
| Subscription lifecycle (prorate, addon, upgrade) | P | P | S | S | W | P | Post-MVP ou intégration via Kill Bill embed; MVP fait le recurring simple. |
| Usage-based metering | W | W | P | S | W | W | Hors MVP; design d'interface compatible OpenMeter Apache pour insertion future. |
| Tax calculation (rules + versioning) | S | P | P | P | S | P | MVP natif, moteur règles versionnées GST/QST; interface pluggable. |
| Multi-currency | S | S | P | P | P | S | MVP : devise stockée par facture; conversion explicite au post; reporting devise base. |
| Payment integration | S (Stripe/Adyen/PayPal) | S (Stripe/PayPal/Stancer) | S (plugin model) | P | P | P (Stripe) | MVP : Stripe-only; abstraction PSP interne pour ajouter Square/Moneris plus tard. |
| Dunning workflow | P | P | S | P | W | P | MVP : règles paliers manuelles, propositions revues; pas d'envoi auto. |
| Bank reconciliation | S | P | W | W | P | W | MVP : import OFX/CSV manuel + matching règles; API banque (Plaid/Flinks) post-MVP. |
| Journal entries (double-entry) | S | S | W | W | S | P | MVP natif; postes équilibrés obligatoires; verrouillage période; aucune copie de modèle Odoo. |
| Chart of accounts | S | S | W | W | S | W | MVP : assistant + jeu pré-chargé CA/QC abstrait (pas de copie l10n_ca). |
| Tax reporting CA/QC (GST/HST/QST) | P (`l10n_ca`) | P (taxes doubles Canada) | W | W | W (Espagne-orienté) | W | MVP : workpaper net tax par période, par registration; pas de certification dépôt statutaire. |
| Customer portal (factures, paiements) | S | P | W (API) | W | P | P | MVP : portail lecture facture + paiement Stripe; gros chantier post-MVP. |
| Credit note / avoir | S | S | S | P | S | P | MVP natif; lien `reverses`; approbation manager si période close. |

Lecture principale :

- Kill Bill (Apache) domine sur subscription/dunning et reste la référence licence-friendly pour design d'interface; OpenMeter (Apache) idem pour usage metering. Mentions `NOTICE` à ajouter si on s'inspire de leurs patterns API.
- Odoo, Dolibarr, FacturaScripts, Crater, InvoicePlane restent en référence fonctionnelle — aucun verbatim de schéma ou de libellé UI.
- Le MVP reste service-company friendly; subscription avancée et metering sont des extensions, pas un cœur.

### UI Screen Inventory

Écrans cibles MVP. Chaque écran a un rôle, des entités lues, des actions, et des contrôles d'accès. Les libellés finaux sont à fournir en FR-CA et EN; les exemples ci-dessous sont des étiquettes de référence interne, pas un verbatim Dolibarr/Crater.

| Écran | Rôle principal | Entités lues | Actions clés | Permissions |
| --- | --- | --- | --- | --- |
| Invoice list | `finance.user` | `Invoice`, `Customer`, `Payment` (résumé) | Filtrer (statut, date, client, devise), exporter, ouvrir détail | `finance.invoice.read.*` |
| Invoice draft editor | `finance.user` | `Invoice`, `InvoiceLine`, `TaxCategory`, `TaxRateVersion`, source proposal | Éditer lignes, recalculer taxes, ajouter remise, attacher pièces, approuver, émettre | `finance.invoice.write.organization`, `.approve`, `.issue` |
| Payment composer | `finance.user` | `Invoice`, `Payment`, `PaymentMethod` | Enregistrer paiement manuel, allouer multi-facture, traiter PSP retry, gérer overpayment | `finance.payment.write.organization` |
| Recurring schedule detail | `finance.user`, `sales.lead` (lecture) | `RecurringBillingSchedule`, `Customer`, `ServiceItem`, dernières factures générées | Modifier fréquence/montant, suspendre, terminer, simuler prochaine occurrence | `finance.invoice.write.*`, lecture partagée |
| Dunning queue | `finance.user`, `finance.manager` | `Invoice` en retard, paliers d'âge, dernières actions | Ouvrir cas, générer relance proposée (FR/EN), reporter, marquer en litige | `finance.invoice.read.organization` + `finance.payment.write` |
| Bank reconciliation | `finance.user` | `BankImportLine`, `Payment`, `JournalEntry` | Importer OFX/CSV, matcher règles, valider lot, créer paiement à la volée | `finance.payment.write.organization` |
| Journal browser | `finance.user`, `auditor` | `JournalEntry`, `JournalEntryLine`, `Account`, `AccountingPeriod` | Filtrer par période/journal, exporter, ouvrir source liée, annuler via reversing | `finance.journal.read.organization`, `.post`, `.reverse` |
| Chart of accounts admin | `owner/admin` | `ChartOfAccounts`, `Account` | Créer/modifier compte, activer/désactiver, assigner type/normal_balance, importer modèle CA/QC | `finance.tax.manage.organization` (config finance) |
| Tax report viewer | `finance.user`, `finance.manager` | `TaxRegistration`, lignes de facture, paiements, période | Générer workpaper GST/QST par période, exporter, marquer remis | `finance.export.organization` + lecture finance |
| Customer portal (read) | client externe authentifié | `Invoice` (cliente), `Payment` (cliente) | Voir factures, payer via Stripe, télécharger PDF FR/EN | session portail dédiée, RLS tenant |

Considérations transverses pour tous les écrans :

- Bilinguisme FR-CA / EN obligatoire (libellés, validations, exports PDF).
- États d'invoice/journal/période visibles sous forme de badges, sans verbatim Odoo ou Dolibarr.
- Tous les écrans qui mutent affichent l'événement d'audit produit (id, acteur, timestamp).

### Tech Layer Options

Cadre comparatif des choix d'implémentation. Chaque ligne propose options, posture licence quand pertinent, et un défaut MVP suggéré (sans figer la décision).

#### 1. Subscription / recurring billing engine

| Option | Avantages | Inconvénients | Posture licence |
| --- | --- | --- | --- |
| Natif (`RecurringBillingSchedule` + worker pgmq) | Contrôle total, schéma minimal, pas de service externe, suffisant pour service-company | Ne couvre pas prorata complexe, addons, entitlements | n/a |
| Kill Bill embed (Java service Apache-2.0) | Lifecycle subscription mature, dunning, plugins paiement | Stack Java additionnelle, exploitation lourde, `NOTICE` requis, anti-copy de schémas | Apache-2.0 OK, ajouter mention `NOTICE` |
| OpenMeter embed (Go service Apache-2.0) | Usage metering API-first, charts Kubernetes prêts, OpenAPI/TypeSpec | Stack Go additionnelle, encore en beta, anti-copy d'OpenAPI shapes | Apache-2.0 OK, ajouter mention `NOTICE` |

**Défaut MVP suggéré.** Natif simple pour le scope service-company; design d'interface compatible Kill Bill / OpenMeter pour insertion en phase 2 si subscription/usage devient un besoin produit.

#### 2. Plan comptable CA/QC

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| Pré-chargé CA/QC abstrait | Démarrage rapide, comptes types service-company | Doit être rédigé en propre, sans copier `l10n_ca` Odoo |
| Upload custom (CSV/JSON) | Flexibilité totale tenant | Friction onboarding, risque erreurs |
| Assistant guidé (questions → génération) | Onboarding doux, ciblage marché FR-CA | Effort produit important |

**Défaut MVP suggéré.** Jeu CA/QC abstrait pré-chargé + import CSV en option; assistant en post-MVP.

#### 3. Moteur taxe

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| Règles hardcodées TVQ/TPS | Simple, rapide | Non versionné, non extensible, dette technique |
| Pluggable tax engine (interface + rule pack versionnés) | Conforme aux exigences spec (rate version, source_configuration_id), extensible | Effort design plus élevé |
| Externe (Avalara, TaxJar, etc.) | Décharge conformité statutaire | Coût récurrent, dépendance vendor, latence |

**Défaut MVP suggéré.** Pluggable interne avec rule pack GST/QST versionné; hooks d'externalisation post-MVP.

#### 4. Multi-currency

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| MVP (devise par facture, conversion au post) | Pilote bilingue Canada/US réaliste | Complexité reporting et reconciliation accrue |
| Post-MVP (CAD uniquement d'abord) | Réduit scope MVP | Repousse pilotes multi-devise |

**Défaut MVP suggéré.** MVP supporte devise par facture en lecture/écriture mais une seule devise de tenue de livres par tenant; gain/perte de change reconnu à l'encaissement seulement.

#### 5. Payment integration

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| Stripe-only | Implémentation rapide, marché QC OK | Vendor lock-in court terme |
| Stripe + Square + Moneris | Couverture marché QC + retail | Triplement effort, tests PSP |
| Multi-PSP abstraction (plugin model) | Extensible, anti lock-in | Effort architecture important |

**Défaut MVP suggéré.** Stripe-only en implémentation initiale, mais abstraction interne (`PaymentProvider` interface) afin d'ajouter Square/Moneris sans refactor du domaine paiement.

#### 6. Dunning workflow

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| Manuel (queue + actions opérateur) | Sûr, audit clair | Effort opérationnel |
| Automatisé règles (envoi auto) | Scalable | Risque réputation, conformité communication client |
| Hybride (règles proposent, humain valide) | Compromis adapté MVP | Workflow plus riche à implémenter |

**Défaut MVP suggéré.** Hybride : les paliers d'âge produisent des propositions de relance que le `finance.user` valide; aucun envoi automatique en MVP.

#### 7. Bank reconciliation

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| Import OFX/QFX/CSV manuel | Universel, simple, hors-ligne | Friction utilisateur |
| API banque (Plaid/Flinks) | UX moderne, automatique | Intégration complexe, conformité, coût |
| Les deux | Couverture maximale | Coût combiné |

**Défaut MVP suggéré.** Import OFX/QFX/CSV en MVP avec règles de matching simples; Flinks (orienté Canada) en post-MVP.

#### 8. Recurring billing scheduler

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| pgmq cron interne | Cohérent stack PG/pgmq, simple ops | Doit gérer reprises, fenêtres, idempotence |
| Kill Bill (service externe Apache) | Mature, robuste | Service Java additionnel |
| OpenMeter (service externe Apache) | API-first, K8s natif | Service Go additionnel, beta |

**Défaut MVP suggéré.** pgmq cron interne pour MVP; conserver l'interface compatible Kill Bill/OpenMeter pour permettre une migration plus tard si la volumétrie ou la complexité subscription le justifie.

### Decision Register

Format YAML-like. Chaque décision capture l'option retenue par défaut MVP, les alternatives évaluées, le statut, et un commentaire de rationale court.

```yaml
- id: BA-DEC-001
  topic: subscription-engine
  decision: native-recurring-only
  alternatives: [killbill-embed, openmeter-embed]
  status: proposed
  rationale: |
    MVP cible service-company; recurring simple suffit.
    Interface conçue pour migration Kill Bill / OpenMeter en phase 2.
  license_posture: n/a-natif

- id: BA-DEC-002
  topic: chart-of-accounts-bootstrap
  decision: preloaded-ca-qc-abstract + csv-import-optional
  alternatives: [upload-only, guided-assistant]
  status: proposed
  rationale: |
    Démarrage rapide pour pilotes FR-CA, assistant reporté post-MVP.
    Aucun import de l10n_ca Odoo; comptes redigés en propre.

- id: BA-DEC-003
  topic: tax-engine
  decision: internal-pluggable-versioned
  alternatives: [hardcoded, external-avalara]
  status: proposed
  rationale: |
    Conforme à l'exigence spec (rate_version_id, source_configuration_id).
    Rule pack GST/QST versionné conforme `statutory-research.md`.

- id: BA-DEC-004
  topic: multi-currency
  decision: mvp-multi-currency-invoice-single-book
  alternatives: [post-mvp-cad-only, full-multi-book]
  status: proposed
  rationale: |
    Devise par facture supportée; tenue de livres une seule devise par tenant.
    Reporting devise base; FX gain/loss au paiement.

- id: BA-DEC-005
  topic: payment-integration
  decision: stripe-only-with-internal-psp-abstraction
  alternatives: [stripe+square+moneris, multi-psp-plugin]
  status: proposed
  rationale: |
    Réduit scope initial; abstraction PSP interne pour ajouter Square/Moneris sans refactor.

- id: BA-DEC-006
  topic: dunning-workflow
  decision: hybrid-proposal-then-human-approve
  alternatives: [manual, fully-automated]
  status: proposed
  rationale: |
    Sécurise communication client; reste auditable.
    Aucun envoi auto en MVP.

- id: BA-DEC-007
  topic: bank-reconciliation
  decision: ofx-qfx-csv-import-with-rule-matching
  alternatives: [bank-api-plaid-flinks, hybrid]
  status: proposed
  rationale: |
    Couverture universelle MVP. Flinks (Canada) post-MVP.

- id: BA-DEC-008
  topic: recurring-scheduler
  decision: pgmq-cron-internal
  alternatives: [killbill-service, openmeter-service]
  status: proposed
  rationale: |
    Cohérent avec stack PG/pgmq. Idempotent.
    Interface compatible Kill Bill/OpenMeter conservée.

- id: BA-DEC-009
  topic: fiscal-data-encryption
  decision: column-level-at-rest-for-sensitive-tax-fields
  alternatives: [global-db-encryption-only, no-additional-encryption]
  status: proposed
  rationale: |
    Numéros TPS/TVQ, numéros bancaires, références PSP en chiffré colonne;
    autre données finance protégées par RLS + chiffrement disque global.

- id: BA-DEC-010
  topic: e-invoicing
  decision: post-mvp
  alternatives: [mvp-peppol, mvp-quebec-only]
  status: proposed
  rationale: |
    PEPPOL/QC e-invoicing reporté; PDF FR/EN + portail client suffisent MVP.
    Capture exigence pour rule pack futur.

- id: BA-DEC-011
  topic: accounting-periods
  decision: single-book-open-closed-states-mvp
  alternatives: [multi-book, parallel-period-overlap]
  status: proposed
  rationale: |
    Un seul livre par tenant; états open/closing/closed.
    Correction en période close via reversing entry.

- id: BA-DEC-012
  topic: invoice-numbering
  decision: per-tenant-configurable-sequence
  alternatives: [global-sequence, per-fiscal-year, per-jurisdiction]
  status: proposed
  rationale: |
    Tenant configure prefix, padding, reset annuel, séquence per registration.
    Sequence policy stockée et auditée; aucune réutilisation autorisée.

- id: BA-DEC-013
  topic: accounts-payable-ap
  decision: post-mvp
  alternatives: [mvp-basic-ap, mvp-full-ap]
  status: proposed
  rationale: |
    AP (factures fournisseurs, paiements sortants) reporté post-MVP.
    MVP centré AR + cycle facturable. AP triage agentique inscrit pour phase 2.

- id: BA-DEC-014
  topic: notice-attribution
  decision: add-notice-entries-for-apache-inspirations
  alternatives: [no-notice, full-license-bundle]
  status: required
  rationale: |
    Si Kill Bill et/ou OpenMeter inspirent des patterns API ou data model,
    NOTICE racine doit contenir attribution Apache-2.0 + lien repo.
    Aucun verbatim Odoo, Dolibarr, FacturaScripts, Crater, InvoicePlane.
```

