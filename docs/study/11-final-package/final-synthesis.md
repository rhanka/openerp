# Synthese Finale OpenERP

## Avancement

Fait: etude corpus, fiches, shortlist, Graphify wave A, carte fonctionnelle, recommandation MVP, dossier anti-copy, recherche Canada/Quebec et specs MVP initiales termines.
À faire: lancer la phase implementation planning puis le scaffold applicatif; phase d'etude initiale terminee a 100%.
Attendu: valider le passage en implementation avec un premier plan sur foundation/security/i18n, car ce module conditionne CRM, projet, facturation, reporting et automation.

## Decision Produit

Construire un ERP/CRM/back-office MIT, bilingue FR/EN, oriente services et petites/moyennes entreprises sous 2B de chiffre d'affaires.

Le MVP ne doit pas etre un clone complet d'Odoo, Twenty, Workday, Wave, Superset ou Node-RED. Il doit etre un produit original, centre sur le flux:

```text
CRM -> contrat/offre -> projet/service -> temps approuve -> facture -> ecriture comptable -> reporting -> automation typee
```

Manufacturing, WMS, planning, MES, qualite et maintenance restent des vertical packs. Ils doivent etre prepares dans le modele, mais pas au centre du premier MVP.

## Base De Preuve

| Element | Resultat |
| --- | --- |
| Corpus open source | 27 projets documentes par fiches. |
| Graphify | 29 runs TypeScript-runtime sur Odoo, Twenty, Aureus ERP, Kill Bill, OpenMeter, Frappe HR, Kimai, frePPLe, OpenBoxes, Superset, Node-RED. |
| Proprietary references | Workday, Wave, QuickBooks, Sage, SAP Business One et autres gardes comme benchmarks publics uniquement. |
| Recherche statutaire | Sources officielles CRA, Revenu Quebec et CNESST pour cadrer paie, GST/QST, slips, remises, bulletins de paie, registre des salaires, vacances et jours feries. |
| Specs MVP | 5 specs implementation-ready: foundation/security/i18n, CRM, project/time-to-invoice, billing/accounting, reporting/automation. |

## Recommandation MVP

Construire en premier:

- foundation: tenants, users, roles, permissions, audit, FR/EN, settings, files, notifications;
- CRM: companies, contacts, leads, opportunities, activities, customer timeline, imports;
- project/time-to-invoice: projects, tasks, assignments, time entries, approvals, invoice proposals;
- billing/accounting: invoices, recurring schedules, payments, journal entries, tax abstraction, period close basics;
- reporting/automation: saved views, operational reports, dashboards, exports, scheduled delivery, typed workflows and webhooks;
- deployment: SaaS first, self-hosted Kubernetes supported from the beginning.

## Hors MVP Explicite

- Native Quebec/Canada payroll engine.
- Native statutory filing and remittance submission.
- Full MES/shop-floor execution.
- Deep WMS/barcoding.
- Superset clone or advanced BI authoring.
- Node-RED clone or generic visual programming runtime.
- Full Kill Bill/OpenMeter-class subscription and usage engine.

## Canada Et Quebec

La paie native doit rester hors MVP. Les sources officielles confirment que le produit doit d'abord fournir:

- payroll-prep exports;
- pay-period primitives;
- employee/time data usable by external payroll;
- GST/HST/QST registration and invoice tax disclosure fields;
- accounting tax liability accounts;
- future versioned statutory rule packs.

Native payroll cannot start until formulas, rates, effective dates, remittance calendars, slips, test fixtures and review process are versioned.

## Licence Et Anti-Copy

Target: MIT.

Posture:

- MIT/Apache/BSD: usable with attribution/notice tracking, but original implementation remains preferred;
- LGPL/MPL/EPL: cautious, review before technical reuse;
- GPL/AGPL: functional reference only;
- proprietary: public benchmark only.

Implementation must start from OpenERP specs, not source files from studied products. Do not copy code, UI text, docs, assets, tests, demo data, internal names, schemas, API shapes, reports, templates or workflow structures.

## Architecture Cible

| Layer | Direction |
| --- | --- |
| Frontend | Svelte + TypeScript, dense operational UI, FR/EN from first sprint. |
| Backend | TypeScript domain services and APIs. |
| Rust | Optional for high-integrity workers: import validation, exports, ledger checks, planning engines. |
| Data | PostgreSQL first, explicit tenant isolation. |
| Events | Domain events for audit, automation, reporting refresh and integrations. |
| Workers | Billing, imports, exports, notifications, reporting, automation. |
| Deployment | SaaS plus self-hosted Kubernetes. |

## Self-Hosted Update Policy

The self-hosted model follows the user-approved policy:

- under 12 months behind current supported version: normal support;
- 12-24 months behind: guided catch-up;
- over 24 months behind: unsupported or exceptional support.

The product must expose version state, preflight checks, backup requirement, migration path and bilingual release notes.

## Livrables Principaux

| Artifact | Path |
| --- | --- |
| Corpus | `docs/study/01-corpus/corpus-report.md` |
| Shortlist | `docs/study/03-shortlist/shortlist.md` |
| Graphify dossier | `docs/study/05-graphify/README.md` |
| Functional map | `docs/study/06-functional-map/global-functional-map.md` |
| MVP recommendation | `docs/study/07-mvp/mvp-recommendation.md` |
| Anti-copy dossier | `docs/study/08-anti-copy/anti-copy-dossier.md` |
| Canada/Quebec research | `docs/study/09-canada-quebec/statutory-research.md` |
| MVP specs | `docs/study/10-mvp-specs/` |
| Final PPTX | `docs/study/11-final-package/openerp-final-synthesis.pptx` |

## Decisions A Prendre

1. Confirmer que le premier sprint implementation commence par foundation/security/i18n.
2. Choisir le style API initial: REST/OpenAPI, GraphQL, ou REST d'abord avec event contracts.
3. Choisir le modele d'isolation tenant initial: shared DB avec tenant_id strict, schema per tenant, ou database per tenant pour certains plans.
4. Choisir le premier fournisseur ou format d'integration payroll Quebec/Canada.
5. Confirmer le premier pilot target: service company, recurring-service company, ou small manufacturer with services.

## Prochaine Etape Recommandee

Ecrire le plan d'implementation de foundation/security/i18n puis scaffold applicatif:

1. repo app structure;
2. Svelte/TypeScript frontend;
3. TypeScript backend;
4. PostgreSQL schema/migrations;
5. auth/roles/permissions/audit;
6. FR/EN i18n baseline;
7. CI/test/build pipeline;
8. Kubernetes/self-hosted skeleton.
