# Écart de parité — Facture Wave vs Facturation OpenERP (préparation lot P1)

- **Date** : 2026-07-10
- **Portée** : petite entreprise Québec, TPS 5 % + TVQ 9,975 %, factures bilingues FR/EN.
- **Méthode** : lecture du code réel (modèle de données, API, UI, i18n), références `fichier:ligne`. Analyse déléguée à un subagent puis **re-vérifiée par le conducteur** (le risque taxes ci-dessous a été confirmé et corrigé, commit `6d2147f`).
- **Amont** : `2026-07-06-finances-ca-wave-ufile-desjardins.md` (P1), `2026-07-10-wave-replacement-loop.md`.

## Statut d'ensemble

Le back-office comptable (cycle de vie, taxes multi-juridictions, paiements, écritures, récurrence) est solide. La facture **en tant que document statutaire remis au client** (identité vendeur + numéros d'inscription, coordonnées client gravées sur la pièce, conditions, PDF, envoi, lien de paiement) est absente.

## 1. Tableau de parité

Taille : **S** = champ/route additive réversible ; **M** = surface applicative (service + route + UI) ; **L** = nouveau sous-système ou décision structurante.

| Capacité (facture Wave) | État OpenERP (fichier:ligne) | Écart | Taille |
|---|---|---|---|
| Numéro de facture | `invoices.invoice_number` unique par org ; `generateInvoiceNumber` → `INV-000006` sur `count+1` — `0021_billing_invoices.sql:13,25` ; `invoice-service.ts:78-83` | Présent. Numérotation par `count` (pas gapless/verrouillée) ; `tenant_settings.document_numbering_policy` existe mais non câblé | S |
| Date d'émission | `issue_date` posé à l'`issue` — `0021:19` ; `invoice-service.ts:376-377` | Présent | — |
| Date d'échéance | Colonne `due_date` existe mais jamais renseignée — `0021:20` ; absente de `issueInvoice` | Colonne OK, dérivation manquante | S |
| Lignes (desc., qté, prix, montant) | `invoice_lines` — `0021:31-42` ; rendu `[id]/+page.svelte:248-276` | Présent, mais `quantity integer` → pas de quantités fractionnaires (1,5 h) | S |
| Sous-total | `invoices.subtotal` — `0021:16` ; `invoice-service.ts:99-106` | Présent | — |
| Taxes ventilées TPS/TVQ | `tax_categories` + `tax_rate_versions` ; `computeInvoiceTaxes` → `taxBreakdown[{jurisdiction,label,rateBps,amount}]` — `tax-service.ts:541-601` | Ventilation correcte ; **aucun numéro d'inscription TPS/TVQ** rattaché | M |
| Total | `invoices.total` + `taxTotal` — `0021:16-18` | Présent | — |
| Montant payé / solde dû | `payments` `0022:7-19` ; solde calculé en UI `total − Σpaiements` — `[id]/+page.svelte:47-52` | Présent (calcul en vue, non persisté) | — |
| Devise | `invoices.currency`, défaut `CAD` | Présent (mono-devise) | — |
| Conditions de paiement | Absent — aucune colonne | Manquant | S |
| Langue FR/EN de la facture | i18n FR+EN complet ; facture rendue dans la locale du lecteur, pas du client ; `companies.language` existe mais non câblé | Sélection FR/EN par client/facture manquante | M |
| Notes / mentions légales | Absent | Manquant | S |
| En-tête vendeur (nom, adresse, TPS/TVQ) | `organizations.legal_name/country/province_state` `0001:5-13` ; aucun numéro d'inscription, aucune adresse, jamais snapshotté | Manquant (données + snapshot) | M |
| Coordonnées client sur la pièce | `companies.billing_address/legal_name/email` existent mais non snapshottés (seul `company_id` FK) | Données OK, non gravées | M |
| Logo | Absent partout | Manquant | M/L (UX) |
| Rendu PDF | Aucun code | Manquant | L |
| Envoi courriel | Aucun code | Manquant | L |
| Lien / paiement en ligne | Aucun code | Manquant | L |
| Récurrence | `recurring_billing_schedules` `0027:7-22` ; `POST /billing/recurring-schedules/run` | Présent | — |
| Cycle de vie / statut | `draft→issued→paid/partially_paid/void/written_off` ; stepper UI | Présent | — |
| Création manuelle de facture | `createInvoice` + `POST /billing/invoices` OK ; **aucun formulaire UI** de saisie ligne à ligne (UI = « Convertir depuis proposition ») | API OK, UI de saisie manquante | M |

## 2. Champs de données manquants — facture statutaire québécoise

`[DATA]` = colonne à ajouter (additive, réversible, non-UX) ; `[DECISION]` = arbitrage ; `[UX]` = mise en page (hors scope, UX-gated).

**Émetteur (vendeur)**
- `[DATA]` Numéro d'inscription **TPS/GST** — n'existe nulle part. Requis ARC pour facture ≥ 30 $.
- `[DATA]` Numéro d'inscription **TVQ/QST** — n'existe nulle part. Requis Revenu Québec.
- `[DATA]` Adresse postale complète émetteur — `organizations` n'a que `country` + `province_state`.
- `[DATA]` Nom légal émetteur : existe mais jamais transporté sur la facture.
- `[DECISION]` Niveau de stockage des numéros (organizations vs tenant_settings vs table dédiée).

**Client (acheteur)**
- `[DATA]` Adresse/nom client **snapshottés à l'émission** : dispo côté `companies` mais la facture ne référence que `company_id` → un changement rétroagirait sur une facture émise. Une pièce statutaire doit figer ces valeurs.

**Mentions et conditions**
- `[DATA]` Conditions de paiement (« Net 30 »), date d'échéance effective, notes/mentions bilingues, numéro de PO client.
- `[DATA/UX]` Taux par ligne de taxe : la donnée `rateBps` existe ; son affichage « TPS 5 % / TVQ 9,975 % » est `[UX]`.

## 3. Décisions structurantes vs technique réversible

**Décisions à cadrer avant P1 (candidats decision dossier)**
1. Stockage des numéros TPS/TVQ (organizations vs tenant_settings vs `billing_issuer_profile`).
2. Approche de rendu **PDF** : HTML→PDF (Playwright déjà au repo pour l'e2e) vs lib native vs service externe. Impacte l'image k8s. **L**.
3. **Snapshot vs référence** pour identité vendeur/client (recommandé : figer à l'émission pour conformité).
4. **Envoi courriel** : fournisseur SMTP/API, gabarit, journal d'envoi/rebonds. **L** + dépendance externe.
5. **Lien de paiement** : intégrer un PSP vs simples instructions de virement.
6. **Langue de la facture** : câbler `companies.language` vs champ par facture vs choix à l'émission (partiellement UX).
7. **Gabarit visuel / logo / placement** : entièrement UX-gated.

**Technique réversible (implémentable sans décision UX)**
- `[S]` Colonnes additives `invoices` : `terms`, `notes`, `po_number`, `issuer_snapshot jsonb`, `customer_snapshot jsonb` (même pattern additif que `0023:44-46`).
- `[S]` Dériver `due_date = issue_date + termes` dans `issueInvoice`.
- `[S]` `invoice_lines.quantity` `integer` → `numeric` (quantités fractionnaires).
- `[S]` Câbler `tenant_settings.document_numbering_policy` dans `generateInvoiceNumber`.
- `[M]` Formulaire UI de création manuelle (API `POST /billing/invoices` déjà présente).

## 4. Risque de correctness relevé et TRAITÉ

- **Unité des taux de taxe** : le commentaire de `0023_billing_taxes.sql` indiquait « basis points : 500 = 5.00% », alors que `computeInvoiceTaxes` divise par **100000** (milli-pourcent : `5000` = 5,000 %). Contradiction interne (500=5 % ⇒ /10000, 9975=9,975 % ⇒ /100000) et piège à seed : une TPS seedée à `500` aurait valu **0,5 %**.
  - Vérification conducteur : la convention réelle du repo est **milli-pourcent** — test d'ancrage `billing-tax-service.test.ts:308-315` (100 $ → GST 500 + QST 998 = 1498, total 11498) et fixtures `5000/9975`. Le **code de calcul est correct**.
  - Correction (`6d2147f`) : commentaire de migration réécrit en milli-pourcent avec avertissement anti-seed, et fixture mal étiquetée `billing-accounting-service.test.ts:274` `rateBps 500 → 5000` (valeur non assertée par le journal, alignée sur la convention). 43 tests billing verts, lint OK.

## 5. Synthèse P1

- **Socle document** (S/M, sans décision bloquante) : snapshots vendeur/client, `terms`/`notes`/`po_number`, `due_date`, affichage taux, quantités fractionnaires, formulaire de création manuelle.
- **Champs statutaires QC** (M, une décision de stockage) : numéros TPS/TVQ émetteur + adresse.
- **Sous-systèmes L** (chacun une décision) : PDF, envoi courriel, lien de paiement.
- **UX-gated** (hors scope) : gabarit visuel, logo, présentation bilingue, IA de l'écran de facture.

*Fichiers de référence* : `apps/api/src/db/migrations/0021_billing_invoices.sql`, `.../0023_billing_taxes.sql`, `packages/domain/src/billing.ts`, `apps/api/src/billing/invoice-service.ts`, `apps/api/src/billing/tax-service.ts`, `apps/api/src/http/handlers/billing-invoices.ts`, `apps/web/src/routes/admin/billing/invoices/[id]/+page.svelte`, `packages/i18n/src/foundation.fr.json`.
