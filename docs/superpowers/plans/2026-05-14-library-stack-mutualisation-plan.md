# Plan — Library Audit + Stack Mutualisation OpenERP ↔ `@sentropic` (2026-05-14)

## Progress

Fait: identification du besoin par le porteur produit lors de la clôture cadrage 2026-05-14. Inventaire préliminaire des stacks OpenERP et `@sentropic` documenté ci-dessous.
À faire: exécuter la passe d'audit obsolescence (dépendances par version) et de mutualisation (extraction vers `@sentropic` quand pertinent).
Attendu: 0 obsolescence sur les deux repos + ré-usage maximal des libs `@sentropic` MIT depuis OpenERP, sans duplication d'effort.

## Objective

Deux objectifs combinés :

1. **Audit obsolescence** : pour chaque dépendance des deux repos, vérifier qu'on est sur version courante supportée, identifier les deprecation flags, recommander upgrade path.
2. **Mutualisation stack** : pour chaque domaine technique (templating, charts, BI, observabilité, queue, identity, etc.), arbitrer si OpenERP doit consommer une lib `@sentropic` (extraction) plutôt qu'introduire son propre code, et inversement si `@sentropic` doit absorber des helpers OpenERP.

## Scope

### Repos concernés

- **OpenERP** : `/home/antoinefa/src/openerp` — TypeScript + SvelteKit + Node + Postgres + pgmq
- **`@sentropic`** : `/home/antoinefa/src/entropiq` (URL repo conservée historique, package `@sentropic/*`) — TypeScript + Node + agent runtime + LLM mesh + docx templating

### Dépendances actuelles à inventorier

À auditer dans chaque `package.json` (root + workspaces) :

- **OpenERP `package.json` root** : `@types/node`, `typescript`, `vitest`, npm workspaces (migré depuis pnpm le 2026-05-14 pour aligner avec `@sentropic`)
- **OpenERP `apps/*` et `packages/*`** : à inventorier au lot d'exécution
- **`@sentropic/api/package.json`** : runtime LLM, providers (OpenAI, Anthropic, Gemini, Mistral, Cohere), docx, queue manager, etc.
- **`@sentropic/ui/package.json`** : SvelteKit + deps frontend
- **`@sentropic/packages/llm-mesh`** : LLM access SDK (BR-14c)

## Mutualisation opportunities (pré-identifiées)

### Identifiées à la clôture cadrage 2026-05-14

| Domaine | OpenERP actuel | `@sentropic` actuel | Décision target | Action |
| --- | --- | --- | --- | --- |
| **PPTX generation** | `python-pptx` via `tools/build-decision-pack.py` + venv | `SPEC_EVOL_PPTXGENJS_TOOL.md` (planifié) | TS-native `pptxgenjs` ; futur `@sentropic/pptx-templating` | Migrer `build-decision-pack.py` → TS quand `@sentropic/pptx-templating` extrait |
| **DOCX templating** | rien (consommateur futur) | `dolanmiu/docx` + couche maison `patchDocument` + `{{...}}` syntaxe | Extraire `@sentropic/docx-templating` (PG-11) | OpenERP consomme via npm |
| **PDF templating** | rien (consommateur futur) | basique, à étendre | Extraire `@sentropic/pdf-templating` + roadmap Paged Media (PG-11) | OpenERP consomme via npm |
| **LLM client** | rien (consommateur futur) | `@sentropic/llm-mesh` (BR-14c published) | Réutiliser sans dupliquer | OpenERP installe `@sentropic/llm-mesh` |
| **Charts** | rien (foundation à venir) | rien explicite | LayerChart (PG-10 veille tête de classement) + coordination tokens `@sent-tech` | Aligner choix avant impl lot 1+ foundation |
| **Test framework** | Vitest | Vitest + Playwright | Aligné (déjà) | RAS |
| **Workspace monorepo** | npm workspaces (migré pnpm → npm 2026-05-14) | npm + workspace BR-14f mergé | Aligné (déjà) | RAS |
| **Husky hooks** | absent | présent (vu `HUSKY=0` dans workflow) | Aligner : adopter Husky côté OpenERP | À configurer lot 0 foundation |
| **Make targets** | absent | présent (`make commit MSG=...`) | À évaluer : adopter ou conserver npm scripts directs | Décision lot 0 foundation |
| **CI workflows** | GitHub Actions `ci.yml` + `anti-copy.yml` créés 2026-05-14 | présent avec patterns spécifiques | Aligner la grille de jobs si pertinent | À examiner après lot 0 |
| **Queue engine** | pgmq prévu (PG-04) | présent avec queue manager interne | À évaluer mutualisation | Décision impl lot 4 foundation |
| **Identity / JWT** | RFC 8693 prévu (PG-09) | à ajouter via PR #151 (BR-26) | `@sentropic/identity` consommé par OpenERP | Sortie de BR-26 puis lot 5 foundation |
| **Observability OTel** | OpenInference + OpenLLMetry (AGT-D-03) | à ajouter via PR #151 | Hooks `@sentropic` consommés par OpenERP | Sortie de BR-26 puis lot 5 foundation |
| **MCP client/server** | foundation expose entities (PG-07 ApprovalRequest) | à ajouter via PR #151 | Lib `@sentropic` consommée | Sortie de BR-26 puis lot 4-5 foundation |
| **Policy engine** | native TS MVP (AGT-D-02) | hooks via PR #151 | OpenERP fournit la policy au runtime `@sentropic` | Sortie de BR-26 puis lot 5 foundation |

### À identifier au lot d'exécution

- Linter rules (ESLint config) — partager via `@sentropic/eslint-config` ?
- Tsconfig base — partager via `@sentropic/tsconfig` ?
- Prettier config — partager ?
- Date / number / currency formatters FR-CA / EN-CA — extraire vers `@sentropic/locale-canada` ?
- Anti-copy CI grep — partager via npm script ?

## Lots d'exécution (proposés)

### Lot A — Inventaire & audit obsolescence

- [ ] Inventorier toutes les deps `package.json` (root + workspaces) côté OpenERP
- [ ] Inventorier idem côté `@sentropic`
- [ ] Pour chaque dep : version actuelle, version latest, deprecation status, security advisories
- [ ] Croiser avec dependabot (1 low OpenERP + 45 vulns @sentropic au 2026-05-14)
- [ ] Rapport `tmp/library-audit-<date>.md` (ou commit dans le repo)

### Lot B — Mutualisation decisions

- [ ] Pour chaque ligne du tableau "Mutualisation opportunities" : confirmer ou ajuster target
- [ ] Identifier de nouvelles opportunités (eslint, tsconfig, prettier, locale, etc.)
- [ ] Acter décisions dans un decision-pack léger (mêmes conventions que `decision-pack.md`)

### Lot C — Extraction `@sentropic` packages

- [ ] Pour chaque package à extraire (`@sentropic/docx-templating`, `@sentropic/pdf-templating`, `@sentropic/identity`, etc.) : ouvrir PR `@sentropic` dédiée (un BR par package ou groupé)
- [ ] Respect du processus `@sentropic` : worktree, conventional commits, atomic ~150 lignes
- [ ] Publication npm par CI/CD `@sentropic`

### Lot D — Adoption OpenERP

- [ ] Pour chaque package `@sentropic` publié : installer côté OpenERP, supprimer code dupliqué local
- [ ] Migrer `tools/build-decision-pack.py` (python-pptx) → TS (`pptxgenjs` ou `@sentropic/pptx-templating` post-extraction) — voir `feedback_no_python_tooling` en mémoire
- [ ] Tests d'intégration : decision-pack regen prouve l'équivalence

### Lot E — Closure audit obsolescence

- [ ] Upgrade deps obsolètes (semver patch/minor d'abord, major avec test)
- [ ] Re-run dependabot + verify 0 critical/high
- [ ] Mise à jour `NOTICE` racine si nouvelles deps Apache

## Dependencies

- **`@sentropic` PR #151 (BR-26)** mergée → précondition pour identity / MCP / OTel / policy / marketplace / sandbox
- **`@sentropic/llm-mesh` BR-14c** mergée (a7541823) → précondition pour LLM client mutualisé
- **`@sentropic/pptxgenjs` SPEC_EVOL_PPTXGENJS_TOOL.md** → précondition pour drop python-pptx

## Exit criteria

- Toutes deps OpenERP et `@sentropic` à jour (semver patch/minor) ou avec ticket explicite si major différé
- 0 vuln dependabot critical/high sur les deux repos
- `@sentropic/docx-templating` + `@sentropic/pdf-templating` extraits et consommés par OpenERP
- `tools/build-decision-pack.py` migré en TS (pas de venv python dans le repo)
- ESLint/Prettier/Tsconfig configs partagées via `@sentropic/*-config` (si décision lot B confirme)

## Cross-references

- Decision pack : `docs/study/10-mvp-specs/decision-pack.md` (PG-10, PG-11)
- Foundation impl plan : `docs/superpowers/plans/2026-05-14-foundation-implementation.md` (lot 5 = `@sentropic` integration)
- `@sentropic` PR : https://github.com/rhanka/entropiq/pull/151
- `@sentropic` BR-14c (llm-mesh) : commit `a7541823`
- Memory : `feedback_no_python_tooling` (préférence JS/TS)
- Memory : `feedback_decision_dossier_pptx` (PPTX deliverable)

## Note opérationnelle

Cette passe n'est pas urgente pour démarrer le sprint impl foundation (lots 0-6). Elle peut se faire en parallèle ou après. La priorité reste foundation impl ; cette passe nettoie la dette tooling avant que les deux repos divergent davantage.
