# Dossier de décisions — Remplacement Wave / bank-connector

- **Date** : 2026-07-11
- **Type** : dossier de décision (agent → owner). Source markdown ; à formaliser via `present-decision` pour les points irréversibles.
- **Contexte** : loops `loop-mrf59g1p` (wave-replacement) + objective architecte `loop:openerp-bank-connector-2026-07-10`. Le backlog réversible P0/C1/C2 est livré et poussé ; ne restent que les décisions ci-dessous. Aucune n'est prise unilatéralement.
- **Amont** : `2026-07-06-finances-ca-wave-ufile-desjardins.md`, `2026-07-06-sentropic-connecteur-plaid-mutualise.md`, `2026-07-10-wave-invoice-parity-p1.md`, `2026-07-10-wave-replacement-loop.md`.

## Classement

| # | Décision | Nature | Bloque | Qui tranche |
|---|---|---|---|---|
| D1 | Accès Plaid **Production** | **Irréversible** (onboarding + engagement) | données bancaires réelles | Owner + architecte (gates C3/ARCH-11) |
| D2 | Entité légale signataire ToS Plaid + controller PIPEDA/Loi 25 | **Irréversible** (juridique) | D1 | Owner (escaladé par l'architecte) |
| D3 | Résiliation de l'abonnement Wave | Réversible-avec-coût | fin du double-run | Owner, après P3 validé |
| D4 | Stockage des numéros d'inscription TPS/TVQ de l'émetteur | Structurante (schéma) | facture statutaire P1 | Owner/archi |
| D5 | Approche de rendu **PDF** de facture | Structurante (infra) | P1 envoi | Owner/archi |
| D6 | Fournisseur d'**envoi courriel** | Structurante (dépendance) | P1 envoi | Owner/archi |
| D7 | **Lien de paiement** (PSP vs virement) | Structurante (produit/sécurité) | parité Wave Payments | Owner |
| D8 | **Snapshot vs référence** identité vendeur/client sur la facture | Structurante (schéma/conformité) | P1 | Owner/archi |

---

## D1 — Accès Plaid Production  *(IRRÉVERSIBLE)*

- **Ou** : `packages/bank-connector` (provider plaid), custody plateforme Sentropic.
- **Orientation proposée** : **NE PAS** demander l'accès Production maintenant. Rester en sandbox (C0/C1/C2 read-only mono-tenant, déjà GO). L'accès Production est gaté par l'architecte derrière ARCH-11 + ToS-D0 + DPA/Loi 25 + auth webhook + audit egress (5 gates).
- **Options rejetées** :
  - *Demander Production tout de suite* — rejeté : le binding org→tenant est unsafe (tenantId:=workspaceId en prod, DD9 interim) → risque de fuite financière cross-org ; bloqueur compliance dur.
  - *OFX-only, jamais Plaid* — non rejeté mais insuffisant seul : OFX reste le provider par défaut zéro-custody, Plaid reste optionnel derrière la même interface.
- **Preuves** : envelopes architecte 2026-07-10/11 (GO C1 scopé) ; `2026-07-06-sentropic-connecteur-plaid-mutualise.md` §3 ; commit sandbox `040dbf3`.
- **Risques** : engagement pay-as-you-go + responsabilité controller ; mitigation = rester sandbox jusqu'aux 5 gates.
- **Décision proposée** : **différer** ; ré-ouvrir quand ARCH-11 est fait et l'entité D2 tranchée.
- **Go/No-Go** : No-Go tant que les 5 gates ne sont pas verts.

## D2 — Entité légale signataire ToS Plaid + controller Loi 25  *(IRRÉVERSIBLE)*

- **Ou** : niveau plateforme Sentropic (opérateur unique du secret Plaid).
- **Orientation proposée** : décision **owner**, escaladée par l'architecte — l'agent ne tranche pas. Deux candidats : (a) l'entité qui exploite Sentropic (opérateur mutualisé, tier `operator-secret`), (b) chaque organisation cliente (custody par org, pas de mutualisation).
- **Options rejetées** : *l'app OpenERP porte le secret* — rejeté : le bank-connector est une instance du broker, pas une primitive de custody (reframe architecte).
- **Preuves** : envelope architecte Q3 (2026-07-10) ; `SPEC_EVOL_BANK_CONNECTOR` delta `SecretStatus.scope 'operator'`.
- **Risques** : responsabilité PIPEDA/Loi 25 (fournisseur de services), contrats par org.
- **Décision proposée** : owner choisit l'entité signataire avant tout accès Production (D1).
- **Go/No-Go** : bloque D1.

## D3 — Résiliation Wave  *(réversible-avec-coût)*

- **Ou** : abonnement Wave PRO.
- **Orientation proposée** : ne résilier **qu'après P3 validé sur une période de taxes complète** en double-run (parité prouvée). Jusque-là, Wave reste en lecture seule.
- **Options rejetées** : *résilier après P1* — rejeté : la compta/taxes/rapprochement ne sont pas encore prouvés à parité.
- **Preuves** : feuille de route `2026-07-06-finances-ca-wave-ufile-desjardins.md` §6 (jalons de bascule).
- **Risques** : perte d'accès à l'historique Wave ; mitigation = P0 import (outillage livré) exécuté avant résiliation.
- **Décision proposée** : conserver Wave jusqu'à P3 Go ; UFile conservé indéfiniment.
- **Go/No-Go** : résiliation autorisée seulement après une production de taxes réelle depuis l'ERP.

## D4 — Stockage numéros TPS/TVQ émetteur  *(structurante)*

- **Ou** : schéma `organizations` vs `tenant_settings` vs future `billing_issuer_profile`.
- **Orientation proposée** : **`tenant_settings`** (config par org, additive, séparée des identités), avec `gst_registration_number` / `qst_registration_number` + adresse émetteur. Réserver `billing_issuer_profile` pour un futur multi-entités.
- **Options rejetées** : *`organizations`* — mélange config fiscale et identité de tenant ; *table dédiée maintenant* — sur-ingénierie pour un émetteur unique.
- **Preuves** : `2026-07-10-wave-invoice-parity-p1.md` §2.1/§3 ; migration `0001_foundation.sql` (tenant_settings existe).
- **Risques** : migration de données si multi-entités plus tard ; faible (additif).
- **Décision proposée** : ajouter les champs à `tenant_settings` (migration additive).
- **Go/No-Go** : Go si owner confirme émetteur unique par org à ce stade.

## D5 — Rendu PDF facture  *(structurante)*

- **Ou** : chaîne d'émission facture (P1).
- **Orientation proposée** : **HTML→PDF via Playwright/Chromium** (déjà présent au repo pour l'e2e) — réutilise une dépendance existante, gabarit HTML testable, bilingue.
- **Options rejetées** : *lib PDF native (pdfkit/react-pdf)* — nouvelle dépendance, mise en page plus rigide ; *service externe* — dépendance réseau + données financières sortantes.
- **Preuves** : `2026-07-10-wave-invoice-parity-p1.md` §3.2 ; présence Playwright (`apps/web/tests`).
- **Risques** : poids d'image k8s (Chromium) ; mitigation = job worker dédié ou rendu à la demande.
- **Décision proposée** : HTML→PDF Playwright, gabarit **UX-gated** (passe par `openerp-ux-decision`).
- **Go/No-Go** : Go sur la techno ; la mise en page reste No-Go sans UX Decision Record.

## D6 — Envoi courriel  *(structurante)*

- **Ou** : émission facture (P1) + notifications.
- **Orientation proposée** : abstraction `EmailSender` avec provider configurable (SMTP par défaut), journal d'envoi audité, idempotent.
- **Options rejetées** : *coder en dur un fournisseur* — rejeté (verrouillage) ; *pas de journal* — rejeté (conformité/traçabilité).
- **Preuves** : `2026-07-10-wave-invoice-parity-p1.md` §1/§3.
- **Risques** : délivrabilité, rebonds ; mitigation = journal + statut d'envoi.
- **Décision proposée** : port `EmailSender` + provider SMTP, choix du fournisseur = owner.
- **Go/No-Go** : Go sur l'abstraction ; provider concret = décision owner.

## D7 — Lien de paiement  *(structurante)*

- **Ou** : parité Wave Payments.
- **Orientation proposée** : **différer** — phase 1 = instructions de virement (Interac/virement bancaire) sur la facture ; PSP (Stripe/autre) en phase ultérieure.
- **Options rejetées** : *intégrer un PSP dès P1* — coût + sécurité (PCI) + décision produit non nécessaire à la parité de facturation.
- **Preuves** : `2026-07-10-wave-invoice-parity-p1.md` §3.
- **Risques** : friction d'encaissement ; acceptable en phase 1.
- **Décision proposée** : virement d'abord, PSP plus tard (décision produit owner).
- **Go/No-Go** : Go phase 1 sans PSP.

## D8 — Snapshot vs référence identité vendeur/client  *(structurante)*

- **Ou** : schéma `invoices` (P1).
- **Orientation proposée** : **snapshot à l'émission** (`issuer_snapshot`, `customer_snapshot` jsonb figés au moment de l'`issue`) — conformité statutaire : une facture émise ne doit pas muter si l'adresse client change après coup.
- **Options rejetées** : *jointure live sur `companies`/`organizations`* — rejeté : réécrirait rétroactivement une pièce émise.
- **Preuves** : `2026-07-10-wave-invoice-parity-p1.md` §2.2/§3 (#3).
- **Risques** : duplication de données ; acceptable (exigence de conformité).
- **Décision proposée** : colonnes snapshot jsonb, remplies à l'`issue` uniquement.
- **Go/No-Go** : Go si owner confirme l'exigence de figement à l'émission.

---

## Synthèse pour l'owner

- **À trancher maintenant (bloquants amont)** : D2 (entité signataire) → conditionne D1 (Plaid prod). Les deux restent **No-Go** tant qu'ARCH-11 n'est pas fait.
- **À trancher pour lancer P1 facture** : D4 (stockage TPS/TVQ), D8 (snapshot), D5 (PDF techno). D6/D7 peuvent suivre.
- **À trancher plus tard** : D3 (résiliation Wave) après P3.
- **Réversible déjà fait, sans décision** : import Wave (outillage), isolation bank-connector C1, moteur de rapprochement C2 (normalize→match→service).

Prochaine étape agent : sur accord owner, formaliser D1/D2 via `present-decision` (irréversibles) et implémenter D4/D8/D5 (réversibles, attended pour le blast radius domaine).

---

## Arbitrage owner — 2026-07-11 (présenté via present-decision, AskUserQuestion)

| # | Décision | **Arbitrage owner** | Suite |
|---|---|---|---|
| D1 | Accès Plaid Production | **Différer** (rester sandbox jusqu'à ARCH-11 + 5 gates) | attendre architecte C3/ARCH-11 |
| D2 | Entité signataire ToS/Loi 25 | **Trancher maintenant** — owner choisit l'entité (option restante à nommer : opérateur Sentropic mutualisé vs custody par org) | sous-question owner ouverte |
| D3 | Résiliation Wave | **Après P3 validé** (double-run période de taxes complète) | Wave lecture seule d'ici là |
| D4 | Stockage numéros TPS/TVQ émetteur | **GO — `tenant_settings`** (numéros + adresse émetteur) | migration additive + service |
| D5 | Rendu PDF facture | **GO — HTML→PDF via Playwright** (dépendance déjà au repo) | gabarit UX-gated (openerp-ux-decision) |
| D6 | Envoi courriel | **GO — abstraction `EmailSender` (SMTP par défaut)** ; provider concret plus tard | port + journal d'envoi |
| D7 | Lien de paiement | **Virement d'abord**, PSP en phase ultérieure | instructions virement sur facture |
| D8 | Snapshot vendeur/client | **GO — snapshot figé à l'émission** (`issuer_snapshot`/`customer_snapshot` jsonb) | migration additive + `issueInvoice` |

**Découplage confirmé** : le chemin Plaid (D1/D2, gaté architecte) est indépendant de la facture statutaire P1 (D4/D5/D8, GO immédiat). L'implémentation P1 démarre ; Plaid attend ARCH-11.

**Sous-décision D2 ouverte** : l'owner a choisi de trancher l'entité signataire maintenant mais doit encore la **nommer** — opérateur Sentropic mutualisé (tier operator-secret, un seul onboarding Plaid pour toutes les orgs fédérées) **vs** custody par organisation (chaque org signe/onboard, pas de mutualisation).
