# Évaluation d'opportunité — Connecteur bancaire Plaid mutualisé porté par Sentropic

Date : 2026-07-06 · Statut : évaluation (coordination architecte Sentropic en cours via h2a)
Amont : `2026-07-06-finances-ca-wave-ufile-desjardins.md` (P2 — connecteur Desjardins).

## 1. L'idée

Sentropic (la plateforme) devient l'opérateur **unique** de l'accès Plaid (et des agrégateurs
suivants), et l'expose aux apps fédérées (OpenERP, autres) comme un **connecteur mutualisé** —
même modèle que les connecteurs MCP de claude.ai (GDrive, Gmail…) : le secret vit dans un
environnement sécurisé central, les apps consomment une API normalisée, chacun peut « porter son
connecteur » sur cette infrastructure.

## 2. Ce que la mutualisation apporte

| Bénéfice | Détail |
|---|---|
| Custody unique des secrets | `client_id`/`secret` Plaid + `access_token` par organisation stockés une seule fois, dans le périmètre durci de la plateforme (sealed-secrets/vault k8s, jamais dans les apps) |
| Un seul onboarding Plaid | Profil entreprise + questionnaire sécurité + accès Production faits **une fois** par l'opérateur Sentropic, pas par chaque app/chaque client |
| API normalisée (FDX) | Les apps consomment comptes/transactions normalisés ; le provider (Plaid, Flinks, OFX upload, API FDX native 2027+) est **pluggable derrière la même interface** |
| Surface MCP | Le connecteur devient aussi un serveur MCP → les agents (Claude dans OpenERP, chat Sentropic) accèdent aux données bancaires avec les mêmes consentements |
| Mesure/facturation | Plaid pay-as-you-go est facturé à l'Item : la plateforme peut mesurer par org et refacturer/mutualiser |
| Webhooks centralisés | Transactions webhooks Plaid ingérés une fois, redistribués aux apps abonnées |

## 3. Les risques et conditions (à ne pas contourner)

1. **ToS Plaid — modèle plateforme** : le self-serve pay-as-you-go couvre l'usage « pour son
   propre produit ». Opérer pour des **tiers** (multi-clients « powered by Sentropic ») relève
   du programme partenaire/plateforme de Plaid — accord spécifique à obtenir. ➜ Phase 1 :
   Sentropic opère pour ses propres apps/orgs fédérées (défendable) ; ouverture à des tiers =
   négociation Plaid dédiée.
2. **Vie privée (PIPEDA + Loi 25 QC)** : données financières = sensibles ; il faut consentement
   explicite par organisation, registre des consentements, résidence des données (Plaid US/CA),
   droit à l'effacement (révocation d'Item), journalisation d'accès. La plateforme devient
   « fournisseur de services » au sens Loi 25 → contrat de service avec chaque org.
3. **Desjardins/Plaid** : produit Transactions non listé pour Desjardins (Assets en
   contournement, à POCer). Le connecteur DOIT rester multi-provider (OFX upload = provider zéro
   coût et zéro custody, déjà décidé en P2a).
4. **Responsabilité incident** : la custody centralisée concentre le risque — exigences :
   chiffrement au repos par org, rotation, séparation des rôles d'accès, alerting.

## 4. Architecture cible (proposition à l'architecte Sentropic)

```
[Banques] ⇄ Plaid ⇄ [bank-connector (plateforme Sentropic, ns dédié k8s)]
                        ├─ vault secrets (client Plaid + access_tokens par org)
                        ├─ API REST FDX-normalisée (comptes, transactions, soldes)
                        ├─ Serveur MCP (mêmes scopes/consentements)
                        ├─ Webhooks Plaid → bus d'événements par org
                        └─ Providers pluggables : plaid | ofx-upload | flinks | fdx-natif
[OpenERP api] —S2S (@sentropic/auth, AUTH-39-C)→ bank-connector (scopé org)
```

- Le connecteur est un **service plateforme** (comme traefik/cert-manager dans poc-k8s), pas un
  module OpenERP. OpenERP n'a que le client S2S + l'UI d'enrôlement/rapprochement.
- Plaid **Link** (le widget d'enrôlement bancaire) est servi par le connecteur ; l'app hôte ne
  voit jamais ni credentials bancaires ni access_token — seulement un `itemRef` opaque scopé org.

## 5. Modèle d'enrôlement (réponse à la question)

Trois niveaux, du global au rôle :

| Niveau | Qui | Quoi | Fréquence |
|---|---|---|---|
| **1. Plateforme (Sentropic central)** | Opérateur Sentropic | Enregistre l'app Plaid (Production, questionnaire sécurité), garde `client_id/secret` au vault, déploie le bank-connector | Une fois |
| **2. Application (OpenERP global)** | Admin OpenERP ↔ plateforme | OpenERP est enregistré comme **client S2S** du connecteur (même mécanique que l'OauthClient AUTH-39 en attente : enrôlement au niveau plateforme centrale, credentials de service par env dev/prod) + activation du connecteur pour l'org (consentement Loi 25, plan de facturation) | Une fois par env/org |
| **3. Rôle métier (comptable)** | Utilisateur au rôle `comptable` dans l'org | Depuis OpenERP (module Facturation → Rapprochement), lance **Plaid Link** hébergé par le connecteur, authentifie le compte Desjardins de l'entreprise → le connecteur stocke l'access_token scopé org et rend un `itemRef` ; le comptable gère le cycle de vie (re-consentement, révocation) | Par compte bancaire |

Donc oui : **l'enrôlement admin global se fait au niveau de la plateforme centrale Sentropic**
(niveaux 1 et 2 — exactement le même canal que l'enrôlement d'app déjà prévu par la fédération
AUTH-39 : sentropic.sent-tech.ca enrôle l'app, l'org l'active), et le **rôle comptable** ne
manipule que le niveau 3, sans jamais voir un secret.

## 6. Chiffrage indicatif et phases

| Phase | Contenu | Taille |
|---|---|---|
| C0 | Décision d'architecture avec Sentropic (h2a en cours) + POC sandbox Plaid (Trial 0 $) : Link hébergé, token au vault, endpoint transactions FDX | S (POC ~2-3 j) |
| C1 | bank-connector v1 plateforme : provider `ofx-upload` + `plaid` (Trial), S2S AUTH-39-C, scopes org | M |
| C2 | UI OpenERP rôle comptable (enrôlement Link, gestion Items) + moteur de rapprochement (P2 de l'étude finances) | M |
| C3 | Surface MCP + consentements Loi 25 outillés + métrologie par org | M |
| C4 | Ouverture à des tiers (« porter son connecteur ») : accord plateforme Plaid, marketplace de providers | L + juridique |

## 7. Recommandation

**GO C0 immédiat** : coût nul (Plaid Trial), aligne trois chantiers existants (P2 finances,
AUTH-39-C S2S, modèle MCP claude.ai), et la custody plateforme est l'endroit naturel du secret.
Conditions : rester multi-provider (OFX d'abord), et ne pas ouvrir aux tiers avant l'accord
plateforme Plaid (C4).
