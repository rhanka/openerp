# Design — MVP Specs Enrichment (2026-05-12)

## Progress

Fait: Brainstorming validé, design approuvé en séance, Phase 2 ajustée pour combiner relecture Claude et cross-check codex.
À faire: Exécuter writing-plans pour produire le plan d'exécution détaillé puis dispatcher 6 sous-agents Claude pour la Phase 1, lancer la double revue (Claude + codex) en Phase 2, et consolider en Phase 3.
Attendu: Tu valides ce design (ce fichier) ; je passe immédiatement à writing-plans.

## Objective

Enrichir les 6 specs MVP de `docs/study/10-mvp-specs/` pour passer d'une description fonctionnelle légère (260-300 lignes, 79 pour agentic-impacts) à un **decision pack** présentable, sur lequel le porteur produit arbitre rapidement les choix programme et fige les specs avant implémentation.

Specs cibles :

- `foundation-security-i18n.md`
- `crm-customer-timeline.md`
- `project-time-to-invoice.md`
- `billing-accounting.md`
- `reporting-automation.md`
- `agentic-impacts.md` (passe spéciale, voir Phase 1.6)

## Strategic Posture

**Maximisation de la réutilisation fonctionnelle légale.** Pour chaque spec, le sous-agent applique strictement la posture par donneur définie dans `docs/study/03-shortlist/shortlist.md` et synthétisée dans `docs/study/00-methodology/license-matrix.md` (ou équivalent) :

- **MIT / Apache-2.0** (Aureus, Kill Bill, OpenMeter, Superset, Node-RED, BookStack, Zulip) : data model, workflow, API patterns peuvent inspirer l'architecture après revue notice/dépendances ; reuse de code possible avec attribution.
- **LGPL** (Odoo, sauf modules entreprise) : étude fonctionnelle libre, inspiration architecture en abstraction ; pas de copie de noms de tables/champs verbatim, pas de copie de texte UI, pas de structure de code identique.
- **GPL / AGPL** (ERPNext, Twenty, Dolibarr, EspoCRM, SuiteCRM, Kimai, Frappe HR, IDURAR, Lago, Plane, Vikunja, Crater) : étude fonctionnelle uniquement ; aucune copie d'expression (noms, libellés UI, structure de code, schémas verbatim).
- **EPL / mixte** : prudence par défaut, pas de reuse avant revue file-level.
- **Propriétaire** (Notion, Airtable, ClickUp, Slack, etc.) : benchmark public uniquement, aucune copie d'expression.

L'aggression porte sur **l'amplitude fonctionnelle** (couvrir ce que les ERP de référence font), pas sur l'expression. L'expression (code, UI text, schémas verbatim) reste **indépendamment rédigée** dans tous les cas.

## Phase 1 — Six Enrichissements En Parallèle

Six sous-agents Claude `general-purpose` lancés simultanément, un par spec, prompt isolé. Chaque sous-agent :

1. Lit la spec actuelle, `shortlist.md`, et 2-4 fiches donneurs pertinentes dans `docs/study/02-fiches/`.
2. Préserve les sections existantes (Objective, Roles, Data Entities, States, Permission Model, etc.).
3. Ajoute après les sections existantes un bloc `## Enrichment 2026-05-12` contenant les sous-sections suivantes.

### 1. Functional Depth

- 3-5 user stories nominatives au format : `As a [role], I [action] so that [outcome]`, chaque story rattachée à au moins une capability listée plus tôt dans la spec.
- 1 golden path détaillé pas à pas pour le workflow principal (étapes utilisateur + transitions de données).
- 4-6 edge cases (concurrence, données invalides, locale FR/EN, retry, audit, multi-tenant).
- Acceptance criteria testables (format Given/When/Then ou bullet list), couvrant golden path + edge cases.

### 2. Cross-ERP Benchmark

Tableau capability × 3-5 donneurs. Colonnes :

| Capability | Odoo | ERPNext | Twenty | Dolibarr | Posture appliquée |

Cellules : présence + niveau de profondeur (Present/Partial/Absent/Premium-only). Pour chaque ligne, ajouter un marquage explicite :

- `Table stakes` (commun à tous, non différenciant)
- `Functional reuse` (inspirable légalement selon le donneur)
- `Skip` (hors scope MVP)
- `Anti-copy hotspot` (zone où ne pas copier l'expression, malgré la tentation)

### 3. UI Screen Inventory

Liste itemisée des écrans MVP. Pour chaque écran :

- Nom (terminologie interne, pas reprise verbatim d'un donneur)
- Objectif utilisateur
- Données principales affichées
- Actions disponibles
- Composants UI clés (table, formulaire, timeline, etc.)
- Inspiration éventuelle (donneur + capability, sans copie de texte UI)
- Localisation FR/EN (clé de catalogue, longueurs maximales)

Format texte uniquement (pas d'ASCII art lourd). 5-10 écrans typiquement par spec.

### 4. Tech Layer Options

3-5 choix techniques ouverts identifiés dans la spec. Pour chaque :

- Décision : nom court
- Contexte : pourquoi cette décision compte pour cette spec
- Options : 2-3 alternatives avec trade-off (perf, complexité, licence, alignement avec foundation)
- Recommandation par défaut + raison
- Décision dépendante d'autres specs ? (référence croisée)

Exemples : choix ORM/DB (Postgres / Postgres + ClickHouse / Postgres + SQLite réplique), choix UI lib (SvelteKit kit composants / Skeleton / mix), choix transport (REST / tRPC / hybride), choix moteur de queue (BullMQ / pgmq / NATS), choix moteur de règles (interne / open policy agent), etc.

### 5. Decision Register

3-7 décisions ouvertes structurées au format YAML-like :

```
- decision: "Champ tax_region sur Company: ISO-3166-2 vs taxonomie maison"
  options:
    - name: ISO-3166-2 (CA-QC, CA-ON, FR, US-NY)
      pros: standard, interop, parsable
      cons: pas tous les pays
    - name: taxonomie maison (slug)
      pros: flexible, FR-CA-spécifique possible
      cons: divergence des normes
  reco: ISO-3166-2 + extension propriétaire pour cas non couverts
  impact: licence=none, timeline=+0j, depend=foundation
```

### 1.6 Passe spéciale agentic-impacts

`agentic-impacts.md` (79 lignes) est moins une spec qu'un addendum transverse. Sa passe :

- Pas de sections 1, 3 (functional depth, UI inventory) — non pertinent.
- Section 2 (benchmark) → tableau des frameworks agentiques étudiés (cf. agentic deep research) vs `@entropiq`.
- Section 4 (tech layer) → consolidation des options déjà ouvertes en Phase 3 agentique (policy, sandbox, MCP, observability).
- Section 5 (decision register) → décisions agentiques transverses qui impactent les 5 autres specs (ex: tous les écrans Activity doivent-ils être instrumentés pour agent supervision dès MVP ?).

## Phase 2 — Double Revue En Parallèle

Lancée dès que les 6 sous-agents Phase 1 ont fini. Les deux revues tournent **en parallèle**.

### Branche A — Sous-agent Claude reviewer

`general-purpose` ou `Plan` lancé avec prompt :

- Lire les 6 specs enrichies + `shortlist.md` + `agentic-extension-final.md` (ou équivalent Phase 4 agentic).
- Vérifier la cohérence terminologique (mêmes mots pour mêmes concepts).
- Vérifier la cohérence des entités partagées (User, Organization, Money, AuditEvent, Tenant scope, etc.).
- Détecter les couplages cachés (timeline CRM ↔ activité projet, billing ↔ accounting, reporting ↔ tous les domaines).
- Détecter les zones où la posture licence appliquée dépasse la posture du donneur.
- Identifier les **options programme** (décisions transverses au-delà d'une spec : choix DB partout, choix UI lib partout, monorepo packaging, naming convention API, etc.).
- Proposer une **séquence de décision** ordonnée pour la présentation utilisateur (qu'est-ce que je dois trancher d'abord).
- Écrire dans `tmp/claude-cross-review.md`.

### Branche B — codex exec

Commande type :

```
codex exec -s read-only -C /home/antoinefa/src/openerp \
  -o tmp/codex-review.md \
  --skip-git-repo-check \
  "Read docs/study/10-mvp-specs/*.md and docs/study/03-shortlist/shortlist.md.
  Identify:
  (a) divergence between specs on shared entities and terms;
  (b) license overreach risks given each spec's claimed donor sources versus shortlist.md;
  (c) decisions where you disagree with the recommendation given.
  Output a concise review in markdown to tmp/codex-review.md.
  Do not edit files outside tmp/."
```

Lancée en background via `Bash run_in_background`. Sortie capturée dans `tmp/codex-review.md`.

## Phase 3 — Consolidation Par Moi

Je lis `tmp/claude-cross-review.md` et `tmp/codex-review.md`. Je rédige `docs/study/10-mvp-specs/decision-pack.md` :

- **Top of the pack** : 5-8 décisions programme (transverses) avec recommandation.
- **Par spec** : 3-5 décisions clés à arbitrer, recommandation explicite.
- **Risques signalés** : convergences/divergences entre les deux reviewers.
- **Séquence de décision** proposée pour la session de présentation.

`tmp/claude-cross-review.md` et `tmp/codex-review.md` sont **gitignored** (sous `tmp/`). Seul `decision-pack.md` est commit dans `docs/study/10-mvp-specs/`.

## Outputs

| Fichier | Phase | Commit ? |
| --- | --- | --- |
| `docs/superpowers/specs/2026-05-12-mvp-specs-enrichment-design.md` | Design | Oui (ce fichier) |
| `docs/superpowers/plans/2026-05-12-mvp-specs-enrichment-plan.md` | Plan | Oui (writing-plans) |
| `docs/study/10-mvp-specs/{6 specs}.md` enrichies | Phase 1 | Oui, 6 commits séparés (1 par spec) |
| `tmp/claude-cross-review.md` | Phase 2A | Non (gitignored) |
| `tmp/codex-review.md` | Phase 2B | Non (gitignored) |
| `docs/study/10-mvp-specs/decision-pack.md` | Phase 3 | Oui |

## Guardrails

- Aucun push remote tant que le porteur produit n'a pas validé le decision-pack.
- Pas de texte UI verbatim copié des donneurs (en particulier Odoo, Twenty, ERPNext, Dolibarr).
- Schémas de données et noms de champs : rédigés indépendamment, alignés sur conventions internes du projet.
- Toute reuse de code permissif (MIT/Apache) → notice tracée dans un `NOTICE` à la racine ou dans la spec concernée.
- Commits sans mention d'IA / d'Anthropic / de Claude (règle projet en mémoire).

## Estimation

| Phase | Durée |
| --- | --- |
| Phase 1 (6 sous-agents parallèles) | 10-15 min |
| Phase 2 (Claude reviewer + codex en parallèle) | 10-20 min (codex est le chemin critique) |
| Phase 3 (consolidation par moi) | 10 min |
| **Total** | **~30-45 min** |

## Acceptance Coverage

| Acceptance criterion | Comment validé |
| --- | --- |
| Specs enrichies couvrent 3 axes (decisions + benchmark + functional depth) | Lecture des 6 specs : présence des 5 sous-sections dans le bloc `## Enrichment 2026-05-12` |
| Posture licence respectée par donneur | Phase 2 reviewer Claude + cross-check codex flaggent toute dérive |
| Decision-pack présentable et arbitrable | Phase 3 : 5-8 décisions programme + 3-5 décisions par spec, format YAML-like avec reco |
| Pas de copie d'expression verbatim | Phase 2 cross-check explicite ; aucun texte UI ou nom de champ identique à un donneur |
| Cohérence entités partagées entre specs | Phase 2 branche A vérifie explicitement User, Organization, Money, AuditEvent |
| Workflow reste decision-driven, pas d'implémentation | Aucun code applicatif touché en Phase 1-3 ; uniquement `docs/study/10-mvp-specs/` et `tmp/` |

## Transition

Après commit de ce fichier et validation porteur, j'invoque la skill `writing-plans` pour produire le plan d'exécution détaillé (`docs/superpowers/plans/2026-05-12-mvp-specs-enrichment-plan.md`) avec, pour chaque sous-agent Phase 1, un prompt précis et auto-suffisant.
