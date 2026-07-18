# D9 — Persistance des transactions bancaires & du rapprochement

- **Date** : 2026-07-18
- **Série** : prolonge les décisions D1–D8 (`docs/studies/2026-07-11-wave-replacement-decisions.md`)
- **Statut** : dossier d'arbitrage owner — **orientation prête, décision propriétaire requise avant build**
- **Périmètre** : app-local (grand livre de rapprochement interne). N'entame **pas** les gates custody/egress de l'architecte (données synthétiques / OFX-propres uniquement, provider allowlist ; Plaid PROD reste No-Go ARCH-11).
- **Orientation produite par 3 passes indépendantes** (protocole de décision MASTER, choix structurant / data-mutating → 3 agents) :
  - Passe 1 — état-de-l'art / best-practices (subagent)
  - Passe 2 — revue de l'implémenté / current-state (subagent)
  - Passe 3 — contradiction / synthèse (subagent)
  - Synthèse finale & arbitrage : conductor (re-vérifié contre le code).

---

## 1. Contexte & problème

Objectif : **remplacer totalement le rapprochement bancaire de Wave**. C'est la fonction phare manquante.

Aujourd'hui, le moteur de rapprochement (`apps/api/src/reconciliation/`) est **pur et en lecture seule** : il reçoit des transactions bancaires **en mémoire** fournies par l'appelant, les apparie à des `payments` persistés, et **ne persiste rien**. Résultat : aucun état n'est conservé — rien n'empêche de re-suggérer deux fois la même transaction, rien n'enregistre qu'une ligne bancaire a été rapprochée.

Pour un rapprochement bout-en-bout, il manque **(a)** un stockage des transactions bancaires importées, **(b)** un lien de rapprochement persistant transaction ↔ enregistrement interne, avec états et audit. C'est un **choix de modèle de persistance structurant** — d'où ce dossier.

## 2. État actuel (vérifié dans le code)

**Existe :**
- `match.ts` — scoring pur : filtre **dur** devise + `abs(montant)` exact, bonus date (≤0,25 sur `dateToleranceDays=4`), bonus référence/tokens (0,15), base 0,6, appariement glouton 1↔1, tie-break déterministe, `minScore=0,6`.
- `normalize.ts` — conversion pure unités majeures→mineures.
- `reconcile-service.ts` — **lecture seule** : charge les `payments`, apparie en mémoire, ne persiste rien (contrat lecture-seule documenté et délibéré).
- `bank-connector` — `NormalizedTransaction` (id, accountId, postedAt, montant signé, currency, description, merchant?, category?, status `posted|pending`, providerRef) et `NormalizedAccount` (id/providerRef/name/type/currency/institution) ; deux providers `ofx-upload` + `plaid-sandbox`, read-only mono-tenant.
- Comptabilité (`0024`) — `accounts` (type `asset|liability|equity|revenue|expense`), `journal_entries` (`source_type` **CHECK fermé** `invoice|payment|manual`, status `draft|posted|void`), `journal_entry_lines` (debit/credit jsonb, équilibre vérifié en code). `postPaymentToJournal` : débit Banque `1000`, crédit AR `1100`. **Aucun compte de passage/clearing.**
- Précédent réutilisable : `email_sends` (`0040`) — journal idempotent audité (`unique(org, idempotency_key)`, status enum, RLS).

**Manque (précisément) :**
1. Aucune table `bank_transactions` — les transactions normalisées ne sont jamais écrites.
2. Aucune table de lien de rapprochement — `ReconResult.matched` est renvoyé puis jeté ; **aucun flag `reconciled` sur `payments`** (design totalement ouvert).
3. Aucune route HTTP n'expose le suggest ni un apply/confirm.
4. `ReconCandidateKind` = `payment|invoice` mais seul `payment` est câblé (pas de `invoiceToCandidate`).
5. Aucune intégration comptable depuis une ligne bancaire (`source_type` fermé).

## 3. Options

| Option | Description | Verdict |
|---|---|---|
| **A — Grand livre d'attestation (match-only)** | Persister transactions + liens ; confirmer un match pose un état + audit, **aucune écriture comptable**. Couche d'attestation au-dessus des Payments/Invoices déjà comptabilisés. | **RETENUE v1** |
| **B — Match + écriture de compte de passage à la confirmation** | La confirmation poste une écriture via un compte de clearing vers la Banque ; une ligne sans enregistrement devient le point de création de l'écriture. | Différé (post-v1) |
| **C — Import de relevés + espace de rapprochement périodique** (solde ouverture→clôture, verrou de période) | Pratique formelle de relevé bancaire. | Sur-dimensionné maintenant |

**Pourquoi A :** les 3 passes convergent sur « suggestion-first, audit-heavy, pas de mutation autonome du grand livre » pour v1. B exige un nouveau `source_type` `bank`, un compte de clearing par org, une logique de contre-passation dès le départ, et un invariant anti-double-comptabilisation — décision comptable distincte et séparément révisable, pas un sous-produit de « persister des données bancaires ». C est prématuré tant que ARCH-11 gate toute donnée financière réelle.

## 4. Schéma v1 retenu (résolu)

Trois tables additives (migrations 0041+), conventions `0040` (RLS do-block enable+force, policies `_tenant_select`/`_tenant_modify` via `app_current_organization_id()`, `organization_id references organizations(id)`, argent en `jsonb {amountMinor,currency,scale}`) :

**`bank_accounts`** (minimal — **sans** credentials / cursors / webhook state, qui sont la surface gated ARCH-11) :
`id, organization_id, provider (check ofx|plaid_sandbox), provider_account_ref, display_name, currency, active, deleted_at, created_at, updated_at, unique(organization_id, provider, provider_account_ref)`.

**`bank_transactions`** :
`id, organization_id, bank_account_id (FK), provider, provider_transaction_ref, posted_at, amount jsonb, raw_description, reconciliation_status default 'unmatched' (check unmatched|matched|ignored), raw_payload jsonb NULL, deleted_at, created_at, updated_at`, `unique(organization_id, bank_account_id, provider, provider_transaction_ref)`, index `(organization_id, reconciliation_status)`, `(organization_id, posted_at)`.

**`reconciliation_links`** :
`id, organization_id, bank_transaction_id (FK), candidate_kind (check payment|invoice), candidate_id uuid (polymorphe, pas de FK dure — cf. journal_entries.source_id), allocated_amount_minor numeric NULL, score numeric, reasons jsonb, status default 'proposed' (check proposed|confirmed|rejected), created_at, updated_at`, **index unique partiel** sur `bank_transaction_id WHERE status='confirmed'` (une ligne bancaire ne peut être confirmée que contre un seul candidat).

**Frontière d'import** : mappe `NormalizedTransaction[]` → `bank_transactions`, **filtre `status !== 'posted'`** (v1 = posted uniquement), et **provider allowlist en dur** (`ofx`, `plaid_sandbox`) — rejet à cette frontière d'écriture unique = enforcement du gate en code, pas en intention.

**Mutations** : nouveau module frère (pas `reconcile-service.ts`, qui reste read-only) — confirm / reject / unmatch / ignore, chacun émettant `recordAuditEvent` (`banking.bank_transaction.imported`, `banking.reconciliation.{proposed,confirmed,rejected}`, `banking.bank_transaction.ignored` — namespace libre).

## 5. Disputes tranchées (par la passe de synthèse)

1. **Forme du lien** → **hybride** : table `reconciliation_links` (0/1 via l'unique partiel) **+** colonne `allocated_amount_minor` nullable ajoutée maintenant (gratuit, évite une migration future pour les splits). **Pas** d'invariant `sum(allocations) ≤ montant` : `match.ts` exige l'égalité exacte des montants → aucun appelant v1 ne peut produire d'allocation partielle ; imposer un invariant que rien n'exerce = risque sans gain.
2. **Comptes bancaires** → **table minimale maintenant** (miroir de `NormalizedAccount`, déjà conçu en amont), **pas** une colonne texte (ne peut pas porter l'unicité par compte ni la devise), **pas** la gestion de connexion complète (gated).
3. **Vocabulaire d'états** → un jeu canonique par niveau, **jamais** un mot partagé : `link.status = proposed|confirmed|rejected` ; `bank_transaction.reconciliation_status = unmatched|matched|ignored`. Règle : `confirmed` = lien uniquement, `matched` = transaction uniquement. La contre-passation = `confirmed→proposed` (une ligne, l'audit externe suffit).
4. **Instabilité FITID pending→posted** → v1 **importe `posted` uniquement** (filtre à la frontière) ; unicité `(organization_id, bank_account_id, provider, provider_transaction_ref)`. La vraie règle « posted supersede pending » est différée à l'arrivée d'un provider avec liaison pending fiable.
5. **Ligne de périmètre v1** → cf. §6/§7 (les passes convergent une fois auto-posting et splits retirés).

## 6. Décisions OWNER requises avant build (arbitrage)

| # | Question | Option A | Option B | **Préco** |
|---|---|---|---|---|
| 1 | Écriture comptable à la confirmation ? | Auto-post (clearing) | **Match-only** | **B (match-only)** — pas de `source_type` `bank` ni de compte clearing aujourd'hui ; décision comptable distincte. |
| 2 | Second approbateur sur confirm ? | `ApprovalService` (déjà câblé sur time-entry) | **Mono-acteur + audit** | **B (mono-acteur + audit)** en v1 ; bascule vers A quand argent réel + plusieurs opérateurs. |
| 3 | Lignes multi-devises en v1 ? | Câbler `FxRateSnapshot` | **Mono-devise (rejet si mismatch)** | **B (mono-devise)** — Fx existe mais ajoute de l'ambiguïté au scoring sans besoin v1. |
| 4 | Stocker `raw_payload` par transaction ? | **Oui** | Champs normalisés seulement | **A (oui)** — colonne peu coûteuse, forte valeur de résolution de litige, cohérent avec les snapshots D8. |
| 5 | Vue « file d'exception » pour lignes sans candidat ? | Vue dédiée | **Filtrable via `reconciliation_status='unmatched'`** | **B (pas de vue dédiée)** — une vraie file = travail IA/produit gated par le UX Decision Record, hors dossier schéma. |

> Avec les 5 préconisations, **tout le périmètre v1 est réversible et constructible immédiatement** (additif, aucune mutation comptable, données synthétiques uniquement). C'est un **« réversible-à-valider »** : je ne le construis pas seul sans ton feu vert car il fixe la direction produit/données du rapprochement.

## 7. Périmètre v1 vs différé

**Ship v1 (réversible, maintenant, sous préco §6)** : les 3 tables + repos + frontière d'import (filtre posted + allowlist) + suggest en lecture seule alimenté par les lignes persistées `unmatched` + module de mutation confirm/reject/unmatch/ignore + audit.

**Différé (hors lot)** : auto-posting / compte de clearing / ALTER `source_type` (Option B) ; splits N:N + invariant + UX batch ; UI file d'exception ; FX multi-devises ; persistance des `pending` + règle supersede ; champs de gestion de connexion (`bank_accounts`) ; **Plaid PROD** (bloqué indépendamment par ARCH-11 + ToS-D0 + DPA/Loi 25 + auth webhook + audit egress).

## 8. Gate ARCH-11

**Clean.** Chaque item du ship v1 opère sur des données déjà GO (C0/C1/C2 sandbox mono-tenant), sourcées uniquement d'`ofx` upload ou `plaid_sandbox`, allowlist provider en dur à la frontière d'écriture unique — ne touche jamais aux credentials Plaid PROD, à l'auth webhook, ni à l'egress cross-org (tous bloqués indépendamment).

## 9. Décision proposée & Go/No-Go

- **Ou** : `apps/api/src/reconciliation/` + `apps/api/src/db/migrations/0041+` + `apps/api/src/http/{routes,handlers}` (banking) + `packages/domain` (types).
- **Orientation** : Option A (attestation match-only), schéma §4, préconisations §6.
- **Options rejetées** : B (auto-post — décision comptable séparée), C (workspace périodique — prématuré).
- **Preuves** : 3 passes indépendantes convergentes ; code vérifié (`match.ts`, `0022`, `0024`, `0040`, `bank-connector/fdx.ts`) ; contraintes existantes (source_type fermé, pas de flag reconciled, ReconCandidateKind polymorphe).
- **Risques & mitigations** : double-comptabilisation → écartée (aucune écriture en v1) ; faux positifs de dédoublonnage → posted-only + unicité par compte ; dérive de gate → allowlist en dur en code ; sur-ingénierie → invariant splits différé.
- **Décision proposée** : GO Option A avec préconisations §6 (B,B,B,A,B).
- **Go/No-Go observable** : migrations 0041+ appliquées ; import synthétique OFX-propre écrit des `bank_transactions` idempotents ; suggest en lecture seule renvoie des suggestions sur les lignes persistées ; confirm/unmatch transitionne l'état + émet un audit ; gates verts (domaine build, API lint, API test, web svelte-check) ; zéro donnée réelle, zéro écriture comptable.

**En attente de ton arbitrage sur les 5 décisions §6 pour lancer le build v1.**
