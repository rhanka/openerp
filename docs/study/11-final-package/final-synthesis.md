# Synthese Finale OpenERP

## Avancement

Fait: etude corpus, fiches, shortlist, Graphify wave A, extension collaboration, carte fonctionnelle, recommandation MVP, dossier anti-copy, recherche Canada/Quebec et specs MVP initiales termines.
À faire: lancer la phase implementation planning puis le scaffold applicatif; phase d'etude initiale et extension collaboration terminees a 100%.
Attendu: valider le passage en implementation avec un premier plan sur foundation/security/i18n, car ce module conditionne CRM, projet, facturation, reporting, collaboration objet et automation.

## Decision Produit

Construire un ERP/CRM/back-office MIT, bilingue FR/EN, oriente services et petites/moyennes entreprises sous 2B de chiffre d'affaires.

Le MVP ne doit pas etre un clone complet d'Odoo, Twenty, Workday, Wave, Superset ou Node-RED. Il doit etre un produit original, centre sur le flux:

```text
CRM -> contrat/offre -> projet/service -> temps approuve -> facture -> ecriture comptable -> reporting -> automation typee
```

Manufacturing, WMS, planning, MES, qualite et maintenance restent des vertical packs. Ils doivent etre prepares dans le modele, mais pas au centre du premier MVP.

La collaboration est une couche transverse du produit ("transverse layer"), pas un deuxieme produit. Elle doit enrichir les objets ERP/CRM: client, opportunite, devis, contrat, projet, tache, temps, facture, support, actif, ordre de travail et audit.

## Base De Preuve

| Element | Resultat |
| --- | --- |
| Corpus open source | 44 projets documentes par fiches, dont 17 ajouts collaboration. |
| Graphify | 32 runs TypeScript-runtime, dont BookStack, Baserow et Zulip pour l'extension collaboration. |
| Proprietary references | Workday, Wave, QuickBooks, Sage, SAP Business One et autres gardes comme benchmarks publics uniquement. |
| Collaboration references | Notion, ClickUp, Airtable, Monday, Asana, Slack et Teams comme benchmarks publics uniquement. |
| Recherche statutaire | Sources officielles CRA, Revenu Quebec et CNESST pour cadrer paie, GST/QST, slips, remises, bulletins de paie, registre des salaires, vacances et jours feries. |
| Specs MVP | 5 specs implementation-ready: foundation/security/i18n, CRM, project/time-to-invoice, billing/accounting, reporting/automation. |

## Collaboration Extension

L'extension couvre quatre familles:

- knowledge workspace: pages client/projet, notes de reunion, SOPs, handover et fichiers;
- work management: taches legeres, decisions, approbations, formulaires et vues de suivi;
- async communication: commentaires, mentions, notifications et activite objet;
- collaboration controls: permissions heritees, audit, recherche, exports, retention et self-hosted.

Le positionnement reste ERP/CRM-first. OpenERP ne doit pas lancer un clone Notion, ClickUp, Slack ou Airtable dans le MVP. Les fonctions collaboration doivent etre attachees a des objets metier et reutiliser foundation/security/i18n.

## Collaboration Corpus Evidence

Le corpus collaboration ajoute AFFiNE, Anytype, AppFlowy, Baserow, BookStack, Docmost, Focalboard, Huly, Logseq, Mattermost, NocoDB, Outline, Plane, Rocket.Chat, Taiga, Vikunja et Zulip.

La conclusion de reuse est prudente:

- BookStack et Zulip sont les sources les plus propres pour inspiration technique permissive, avec attribution et reecriture;
- Baserow est interessant pour base/table/formulaire, mais ses frontieres premium/enterprise doivent rester separees;
- Rocket.Chat est exploitable seulement avec revue fichier par fichier a cause des zones enterprise;
- Outline, Anytype, AppFlowy, Docmost, Logseq, Plane, Vikunja, NocoDB, Mattermost, Taiga et Huly restent des references fonctionnelles ou publiques selon leur licence et leur structure.

Graphify a ete applique a BookStack, Baserow et Zulip pour isoler des patterns generiques: permissions wiki, noyau database/workspace et communication asynchrone. Les graphes servent a comprendre les domaines; ils ne deviennent pas une source de copie.

## Collaboration MVP Impact

Ajouter au MVP:

- commentaires et mentions sur objets ERP/CRM;
- fichiers attaches aux clients, opportunites, projets, taches, temps, factures, support, actifs et ordres de travail;
- timeline objet combinant evenements systeme, commentaires, fichiers et decisions;
- decisions et approbations structurees;
- taches legeres liees aux objets metier;
- pages client/projet pour notes, SOPs et handover;
- inbox de notifications regroupee par objet;
- recherche permission-aware sur pages, commentaires, fichiers, decisions et taches.

Post-MVP: templates riches, rooms client, formulaires avances, synchronisation outils externes et vues de charge. A deferer: chat generique, workspace database generique, whiteboard avance, marketplace bots et no-code app builder.

## Collaboration License And Anti-Copy

Target: MIT.

Les sources MIT/Apache/BSD peuvent informer l'architecture avec attribution et notices. Les sources AGPL/GPL, BSL, source-available et proprietaires restent functional reference only ou public benchmark only. Meme avec une licence permissive, l'implementation doit etre reecrite depuis les specs OpenERP.

Ne pas reutiliser code, UI text, docs, assets, screenshots, tests, demo data, schemas, API shapes, templates, slash commands, noms de blocs, routes, payloads ou workflow structures. Les surfaces collaboration sont particulierement reconnaissables; le controle anti-copy doit donc etre applique avant chaque merge de ce domaine.

## Recommandation MVP

Construire en premier:

- foundation: tenants, users, roles, permissions, audit, FR/EN, settings, files, notifications;
- CRM: companies, contacts, leads, opportunities, activities, customer timeline, imports;
- project/time-to-invoice: projects, tasks, assignments, time entries, approvals, invoice proposals;
- billing/accounting: invoices, recurring schedules, payments, journal entries, tax abstraction, period close basics;
- reporting/automation: saved views, operational reports, dashboards, exports, scheduled delivery, typed workflows and webhooks;
- collaboration objet: comments, mentions, files, decisions, approvals, lightweight tasks, pages, notifications and permission-aware search;
- deployment: SaaS first, self-hosted Kubernetes supported from the beginning.

## Hors MVP Explicite

- Native Quebec/Canada payroll engine.
- Native statutory filing and remittance submission.
- Full MES/shop-floor execution.
- Deep WMS/barcoding.
- Superset clone or advanced BI authoring.
- Node-RED clone or generic visual programming runtime.
- Full Kill Bill/OpenMeter-class subscription and usage engine.
- Generic Notion/ClickUp/Slack/Airtable clone.
- Generic company chat, whiteboard, bot marketplace or no-code workspace builder.

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
| Collaboration MVP addendum | `docs/study/07-mvp/collaboration-mvp-addendum.md` |
| Anti-copy dossier | `docs/study/08-anti-copy/anti-copy-dossier.md` |
| Collaboration anti-copy addendum | `docs/study/08-anti-copy/collaboration-anti-copy-addendum.md` |
| Canada/Quebec research | `docs/study/09-canada-quebec/statutory-research.md` |
| MVP specs | `docs/study/10-mvp-specs/` |
| Final PPTX | `docs/study/11-final-package/openerp-final-synthesis.pptx` |

## Decisions A Prendre

1. Confirmer que le premier sprint implementation commence par foundation/security/i18n.
2. Choisir le style API initial: REST/OpenAPI, GraphQL, ou REST d'abord avec event contracts.
3. Choisir le modele d'isolation tenant initial: shared DB avec tenant_id strict, schema per tenant, ou database per tenant pour certains plans.
4. Choisir le premier fournisseur ou format d'integration payroll Quebec/Canada.
5. Confirmer le premier pilot target: service company, recurring-service company, ou small manufacturer with services.
6. Confirmer les premiers objets collaboration: customer, opportunity, project, task, time entry, invoice et support case.

## Updated Next Step

Ecrire le plan d'implementation de foundation/security/i18n puis scaffold applicatif:

1. repo app structure;
2. Svelte/TypeScript frontend;
3. TypeScript backend;
4. PostgreSQL schema/migrations;
5. auth/roles/permissions/audit;
6. FR/EN i18n baseline;
7. CI/test/build pipeline;
8. Kubernetes/self-hosted skeleton;
9. primitives collaboration objet: comments, mentions, files, decisions, approvals, notifications and search hooks.
