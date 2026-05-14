# Synthese Finale OpenERP

## Avancement

Fait: etude corpus, fiches, shortlist, Graphify wave A, extension collaboration, extension agentique, carte fonctionnelle, recommandation MVP, dossier anti-copy, recherche Canada/Quebec, specs MVP enrichies, decision-pack arbitrage 2026-05-14 cloturé (12 decisions programme + 30 decisions spec), shared-entities canon v1, NOTICE, anti-copy-grep script, veille charts, PR @sentropic mergee, plan d'implementation foundation publie.
À faire: démarrer le sprint impl foundation (lot 0 à 6 du plan `2026-05-14-foundation-implementation.md`); les decisions sont figees, le canon transverse `shared-entities-v1.md` sert de contrat.
Attendu: relais dev par autre agent (codex) sur PR `@sentropic` BR-26 + lots foundation OpenERP; toi en supervision/audit.

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
| Agentic references | Corpus agentique, 50 entreprises datees et design spaces runtime/identite/autonomie/marketplace/supervision. |
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

## Agentic Extension

L'extension agentique complete l'etude avec un cadrage fonctionnel, runtime, gouvernance et anti-copy pour des agents supervises dans OpenERP. Les sources principales sont la carte fonctionnelle agentique [`docs/study/06-functional-map/agentic-functional-map.md`](../06-functional-map/agentic-functional-map.md), l'addendum MVP [`docs/study/07-mvp/agentic-mvp-addendum.md`](../07-mvp/agentic-mvp-addendum.md) et les design spaces dans [`docs/study/12-agentic/`](../12-agentic/).

La posture reste ERP/CRM-first: l'agent n'est pas un produit separe, ni un constructeur generaliste. Il augmente les objets OpenERP existants avec aide a la qualification, classification, rapprochement, synthese, relance, reporting et decision objet.

## Agentic Functional Headline

Le headline fonctionnel est: **agents supervises pour accelerer le flux lead -> projet -> temps -> facture -> rapprochement -> reporting -> decision objet**.

Les familles MVP retenues sont CRM, project/service delivery, billing, accounting operations, reporting/automation et object-bound collaboration. Le detail est dans [`docs/study/12-agentic/agents-by-use-case.md`](../12-agentic/agents-by-use-case.md), [`docs/study/12-agentic/patterns-library.md`](../12-agentic/patterns-library.md) et les fiches agentiques de [`docs/study/02-fiches/`](../02-fiches/).

Les vertical packs procurement, MES, WMS, payroll et manufacturing planning restent later vertical packs, not part of the agentic MVP; voir [`docs/study/12-agentic/vertical-packs-surface-map.md`](../12-agentic/vertical-packs-surface-map.md).

## Agentic Runtime Base: `@sentropic`

Le runtime de base recommande `@sentropic` comme ancre: client LLM, tool calling type, boucle agent persistante, chat session, workflow state machine, streaming et trace recording. L'audit est documente dans [`docs/study/12-agentic/entropiq-audit.md`](../12-agentic/entropiq-audit.md).

Deux manques doivent etre ajoutes avant usage produit: MCP client/server et policy hooks pre-call/post-call. La posture runtime complete est dans [`docs/study/12-agentic/runtime-safety-functional-map.md`](../12-agentic/runtime-safety-functional-map.md) et [`docs/study/07-mvp/agentic-mvp-addendum.md`](../07-mvp/agentic-mvp-addendum.md).

## Agentic Identity And Business Autonomy

L'identite agentique repose sur Acting-As pour l'assistance en session, Service Principal pour les jobs planifies/event-driven et On-Behalf-Of pour les workflows delegues. Le detail est dans [`docs/study/12-agentic/identity-design-space.md`](../12-agentic/identity-design-space.md).

L'autonomie business MVP commence par self-service catalog: discovery, selection/activation et configuration limitee. L'authoring reste post-MVP; voir [`docs/study/12-agentic/business-autonomy-design-space.md`](../12-agentic/business-autonomy-design-space.md).

## Agentic Marketplace Posture

Le MVP est limite a un niveau **internal-governed private tier only**: modules visibles dans le tenant, activation controlee, version tracee, revocation possible et audit d'activation.

La publication partenaire et la communaute publique restent post-MVP, avec exigences de signature, registre, provenance, revue, policy, sandbox et observabilite decrites dans [`docs/study/12-agentic/marketplace-design-space.md`](../12-agentic/marketplace-design-space.md).

## Agentic Runtime Safety And Supervision

Les primitives obligatoires sont policy engine, sandboxing, MCP interop, GenAI observability, secrets and credentials, budgets et human supervision. Elles sont cartographiees dans [`docs/study/12-agentic/runtime-safety-functional-map.md`](../12-agentic/runtime-safety-functional-map.md).

La supervision combine approval-in-the-loop, canary mini-modules, typed checkpoints, escalation rules et exigences bilingues FR/EN. Le detail est dans [`docs/study/12-agentic/human-supervision-design-space.md`](../12-agentic/human-supervision-design-space.md).

## Agentic Deep Research Summary

La recherche agentique couvre le corpus open source, les references proprietaires datees, les startups et produits recents, les cas d'usage metier, MCP, observabilite, policy et sandbox. Les syntheses sources sont dans [`docs/study/01-corpus/agentic-corpus-report.md`](../01-corpus/agentic-corpus-report.md), [`docs/study/04-proprietary-references/agentic-references.md`](../04-proprietary-references/agentic-references.md) et [`docs/study/12-agentic/startups-deep-research.md`](../12-agentic/startups-deep-research.md).

Les references proprietaires et source-available restent benchmarks publics ou references fonctionnelles. Les projets permissifs peuvent informer l'architecture avec notices et attribution si une decision technique de reuse est prise.

## Agentic License And Anti-Copy

La cible produit reste MIT. `@sentropic` est l'ancre runtime, mais sa restriction commerciale custom doit etre resolue avant de le traiter comme distribution MIT ordinaire; voir [`docs/study/12-agentic/license-posture.md`](../12-agentic/license-posture.md).

Les surfaces agentiques les plus sensibles sont prompts, personas, tool schemas, workflow definitions, eval datasets, demos, marketplace UI, agent catalog/configuration/builder UI, policy DSL syntax, sandbox config et MCP server schemas. Les controles sont dans [`docs/study/08-anti-copy/agentic-anti-copy-addendum.md`](../08-anti-copy/agentic-anti-copy-addendum.md).

## Agentic MVP Recommendation

Ajouter au MVP seulement des agents supervises, bornes a des objets OpenERP et relies aux workflows existants: qualification lead, suivi client, classification de temps, coaching projet, preparation de facture, relance preparee, rapprochement AR, triage AP, synthese reporting et decision object-bound.

Les impacts sur les specs MVP existantes sont centralises dans [`docs/study/10-mvp-specs/agentic-impacts.md`](../10-mvp-specs/agentic-impacts.md). L'ordre de construction reste foundation/security/i18n d'abord, puis CRM, projet/time-to-invoice, billing/accounting, reporting/automation, collaboration objet et agents supervises.

## Recommandation MVP

Construire en premier:

- foundation: tenants, users, roles, permissions, audit, FR/EN, settings, files, notifications;
- CRM: companies, contacts, leads, opportunities, activities, customer timeline, imports;
- project/time-to-invoice: projects, tasks, assignments, time entries, approvals, invoice proposals;
- billing/accounting: invoices, recurring schedules, payments, journal entries, tax abstraction, period close basics;
- reporting/automation: saved views, operational reports, dashboards, exports, scheduled delivery, typed workflows and webhooks;
- collaboration objet: comments, mentions, files, decisions, approvals, lightweight tasks, pages, notifications and permission-aware search;
- agents supervises: lead qualification, follow-up, timesheet classification, project status coaching, invoice preparation, dunning preparation, AR/AP assistance, reporting summaries and object-bound decision summaries;
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
- Agent builder generaliste, marketplace partenaire/communautaire, agents autonomes a large portee et agents vertical packs.

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
| Agentic MVP addendum | `docs/study/07-mvp/agentic-mvp-addendum.md` |
| Agentic anti-copy addendum | `docs/study/08-anti-copy/agentic-anti-copy-addendum.md` |
| Agentic design space | `docs/study/12-agentic/` |
| Canada/Quebec research | `docs/study/09-canada-quebec/statutory-research.md` |
| MVP specs | `docs/study/10-mvp-specs/` |
| Decision pack (MD + PPTX) | `docs/study/10-mvp-specs/decision-pack.md` / `.pptx` |
| Shared entities canon v1 | `docs/study/10-mvp-specs/shared-entities-v1.md` |
| Charts Svelte veille | `docs/study/10-mvp-specs/charts-svelte-watch.md` |
| Foundation impl plan | `docs/superpowers/plans/2026-05-14-foundation-implementation.md` |
| NOTICE racine | `NOTICE` |
| Anti-copy CI script | `tools/anti-copy-grep.sh` |
| Final PPTX | `docs/study/11-final-package/openerp-final-synthesis.pptx` |

## Decisions Prises 2026-05-14

Le decision-pack (`docs/study/10-mvp-specs/decision-pack.md` + `.pptx`) consolide 12 decisions programme arbitrees, toutes RESOLVED. Resumé :

1. **PG-01 License @sentropic** : plain MIT (resolved 2026-05-12 via rename @entropiq → @sentropic).
2. **PG-02 Identite multi-tenant** : `UserIdentity` global + `OrganizationMember` par tenant.
3. **PG-03 Isolation multi-tenant** : row-level RLS Postgres + abstraction `TenantIsolationStrategy` switchable.
4. **PG-04 Queue engine** : pgmq MVP + interface `JobQueue` abstraite.
5. **PG-05 i18n catalogue** : ICU JSON nested + table `TranslationKey`.
6. **PG-06 Canon entites partagees** : 4 articles (Organization+Money, AuditEvent/DomainEvent/TimelineEntry, Activity prefixage, frontieres inter-modules).
7. **PG-07 ApprovalRequest** : entite foundation partagee, 3 surfaces (REST + MCP tool + SDK).
8. **PG-08 Idempotency-Key universel** : header obligatoire sur toute POST/DELETE side-effect.
9. **PG-09 Identite agent** : JWT + RFC 8693 token exchange MVP + SPIFFE post-MVP via abstraction `IdentityProvider`.
10. **PG-10 Stack BI** : primitive foundation `Widget`/`Dashboard` native SvelteKit (LayerChart tete de classement veille).
11. **PG-11 Templating** : extraction `@sentropic/docx-templating` + `@sentropic/pdf-templating`.
12. **PG-12 Anti-copy** : owner par defaut = porteur produit + script CI `tools/anti-copy-grep.sh`.

Decisions par spec (foundation, CRM, project, billing, reporting, agentic) gravees inline dans chaque spec MVP avec `status: RESOLVED, resolution: 2026-05-14, chosen: <option>`.

## Updated Next Step

Phase cadrage cloturee 2026-05-14. Le plan d'implementation foundation est publie dans `docs/superpowers/plans/2026-05-14-foundation-implementation.md` (7 lots, dependances `@sentropic` BR-26 tracees, exit criteria par lot).

Trajectoire :

1. **Lot 0 — Workspace baseline** : Node monorepo + SvelteKit shell + Postgres + pgmq + Vitest + Playwright + anti-copy CI.
2. **Lot 1 — Identite & multi-tenant** : `UserIdentity` + `OrganizationMember` + RLS row-level.
3. **Lot 2 — Auth + RBAC + i18n** : passkey/WebAuthn direct + permissions objet-level + ICU JSON.
4. **Lot 3 — Money + AuditEvent triple-layer** : type `Money` + `AuditEvent`/`DomainEvent`/`TimelineEntry`.
5. **Lot 4 — ApprovalRequest + Idempotency + JobQueue** : entite partagee + middleware + pgmq impl.
6. **Lot 5 — Integration `@sentropic`** : consommer capabilities PR #151 (MCP, OTel, policy hooks, identity primitives) + AuditEvent etendu agentic.
7. **Lot 6 — Foundation gate** : suite tests + doc + handoff aux specs CRM/project/billing/reporting/agentic.

Le relais dev est pris par un autre agent (codex). Le porteur produit reste en supervision/audit.
