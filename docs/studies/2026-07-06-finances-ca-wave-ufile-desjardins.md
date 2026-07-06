# Étude : Finances canadiennes dans OpenERP — remplacer Wave + UFile, connecter Desjardins

- **Date** : 2026-07-06
- **Type** : étude (recherche + gap analysis + feuille de route). Aucun code produit.
- **Contexte** : petite structure au Québec (fiscalité fédérale + provinciale QC). Outils actuels : Wave (facturation + comptabilité), UFile (déclaration T1/TP1), compte Desjardins (AccèsD), préparation fiscale assistée manuellement avec Claude.
- **Objectif** : chemin « sans rupture » pour faire via OpenERP tout ce qui se fait aujourd'hui avec Wave, UFile et Claude, y compris la réconciliation automatisée du compte Desjardins.

---

## 1. Synthèse exécutive

**Le besoin réel n'est pas « refaire Wave », c'est fermer la boucle argent → compta → impôts dans un seul système.** Aujourd'hui la boucle passe par trois outils et beaucoup de travail manuel assisté par Claude : Wave facture et tient les livres, AccèsD fournit les relevés, UFile produit la déclaration ; la catégorisation, le rapprochement mental et la préparation du T2125 sont faits « à la main avec Claude ».

**Bonne nouvelle : OpenERP a déjà le socle le plus dur.** Facturation complète (cycle de vie, récurrence, multi-devise), paiements avec réconciliation de statut, comptabilité en partie double (plan comptable, journal, validation débit=crédit), et un moteur de taxes TPS/TVQ correct (5 % / 9,975 %, non composé, versionné par date) avec écritures automatiques vers les comptes 2310/2320. C'est précisément la partie que la plupart des projets ratent.

**Ce qui manque est bien délimité** : (1) les dépenses et reçus (entité inexistante), (2) l'import de relevés bancaires et le moteur de rapprochement, (3) les périodes fiscales, sommaires TPS/TVQ et la clôture annuelle, (4) la préparation T2125/TP-80. Quatre chantiers, dont deux gros (dépenses, rapprochement).

**Trois orientations structurantes ressortent de la recherche :**

1. **Sortie de Wave par les exports, pas par l'API.** L'API GraphQL de Wave existe mais elle est limitée (périmètre restreint, quotas non publiés, schéma non versionné) et l'accès aux données exige un abonnement Pro actif. Le Data Export officiel (4 fichiers CSV/XLS : plan comptable, clients, factures, transactions) + Wave Connect (Google Sheets) suffisent pour une migration historique fiable, sans dépendre d'une API fragile.

2. **Connecteur Desjardins en deux temps : OFX/CSV d'abord, agrégateur ensuite, dans un service séparé au schéma FDX.** Desjardins n'a aucun portail développeur. Les agrégateurs qui le couvrent de façon confirmée (Flinks, Plaid, Finicity) sont soit tarifés B2B (Flinks : ~500 $ US/mois minimum), soit incertains sur le produit Transactions (Plaid). Or AccèsD exporte déjà OFX et CSV manuellement, gratuitement, sans partage d'identifiants. Et le cadre canadien de « consumer-driven banking » (Loi C-15, sanction royale mars 2026, règlements en consultation juin 2026, standard FDX pressenti, Desjardins membre fondateur de FDX Canada) rend plausible une API native d'ici 2027-2028. Conclusion : un service connecteur dédié, schéma normalisé aligné FDX, provider pluggable — provider n° 1 = upload OFX/CSV AccèsD, provider n° 2 (optionnel, plus tard) = Flinks ou Plaid, provider n° 3 (futur) = API FDX native.

3. **Impôts : viser la PRÉPARATION, jamais la télétransmission.** La certification NETFILE/ImpôtNet est un processus de test annuel avec l'ARC ET Revenu Québec, à refaire chaque année, avec un plafond de 20 déclarations par produit — un coût récurrent de plusieurs mois-personne par an pour un utilisateur unique. L'ERP doit produire un dossier T2125/TP-80 « prêt-à-saisir » (agrégats par ligne officielle, export PDF + CSV/JSON) que l'utilisateur reporte dans UFile en moins d'une heure. C'est exactement ce que Claude faisait manuellement — et c'est là que l'agentique OpenERP (chat/canvas) prend le relais nativement.

**Feuille de route en 5 phases (P0 → P4), chacune en double-run avec Wave/UFile jusqu'à parité prouvée** : P0 import de l'historique Wave ; P1 facturation 100 % ERP ; P2 connecteur Desjardins + rapprochement ; P3 dépenses, sommaires TPS/TVQ et clôture ; P4 dossier impôts T2125/TP-80. Wave n'est résilié qu'après P3 validé sur une période de taxes complète ; UFile est conservé (comme outil de saisie/transmission) même après P4.

---

## 2. Cartographie Wave

### 2.1 Périmètre fonctionnel (ce qui est utilisé / utile)

| Bloc Wave | Contenu | Pertinence pour l'ERP |
|---|---|---|
| Facturation | Factures, devis, récurrence, numérotation, envoi email, paiement en ligne (Wave Payments) | À répliquer (le cœur existe déjà dans OpenERP) |
| Comptabilité | Partie double, plan comptable, journal, rapports (P&L, bilan, grand livre) | À répliquer (socle déjà présent) |
| Transactions et catégorisation | Import bancaire automatique, catégorisation par règles, fusion facture↔paiement | Cœur du gap OpenERP (P2) |
| Reçus | Capture de reçus, extraction, rattachement aux dépenses (fonction du plan Pro) | Cœur du gap OpenERP (P3) |
| Taxes de vente | Codes TPS/TVQ par ligne, rapport de taxe de vente (taxe perçue vs payée) | Moteur présent dans OpenERP ; sommaires manquants |
| Rapports | P&L, bilan, âge des comptes, rapport de taxes | Partiellement présent ; états financiers manquants |

Modèle tarifaire : plan Starter gratuit + plan Pro payant (ordre de grandeur ~20 $ CA/mois) ; les connexions bancaires automatiques et la capture de reçus sont réservées au plan payant. Le coût du statu quo n'est donc pas nul.

### 2.2 API GraphQL Wave — état 2026

- **Existe et documentée** : endpoint `https://gql.waveapps.com/graphql/public`, OAuth 2.0 Bearer, enregistrement d'application sur developer.waveapps.com.
- **Périmètre restreint** : businesses, clients, factures, produits, transactions/comptes. Pas de gestion d'utilisateurs, pas d'accès complet au journal.
- **Contraintes fortes** :
  - l'octroi d'accès requiert un business avec **abonnement Pro ou Wave Advisor actif** ; si l'abonnement tombe, le refresh token échoue (403) ;
  - **quotas non publiés**, pas d'en-têtes de rate-limit documentés ;
  - **schéma non versionné** : changements cassants silencieux possibles.
- **Verdict** : utilisable en appoint (lecture des factures récentes pendant le double-run), mais **ne pas bâtir la migration dessus**.

### 2.3 Exports Wave (voie recommandée pour P0)

- **Data Export officiel** (Business settings → Data Export) : archive de **4 fichiers CSV/XLS** couvrant la comptabilité (transactions, plan comptable, clients, factures).
- **Wave Connect** (add-on Google Sheets officiel) : téléchargement du plan comptable, clients, produits, factures, transactions ; sert aussi à l'import en masse — utile pour extraire des vues filtrées par dates.
- **Rapports exportables** (CSV/PDF) : « Account Transactions » filtré par dates pour le grand livre.

### 2.4 Connexions bancaires de Wave

- Wave utilise **Plaid** comme agrégateur pour les connexions bancaires US et Canada (import automatique de transactions).
- Couverture Desjardins via Wave/Plaid : historiquement inégale (le support Wave documente des types de comptes supportés et une communauté active sur les connexions en échec). C'est un point de douleur connu du statu quo — l'ERP peut faire mieux avec l'import OFX direct.

---

## 3. Cartographie UFile

### 3.1 Ce que couvre une déclaration type (travailleur autonome QC)

| Élément | Fédéral | Québec |
|---|---|---|
| Déclaration principale | T1 | TP1 |
| Revenus d'entreprise / travail autonome | **T2125** (état des résultats des activités d'une entreprise) | **TP-80** (revenus et dépenses d'entreprise) — généré par UFile en miroir du T2125 |
| Cotisations sociales | RPC/RRQ sur revenu net (annexe 8 / équivalent QC : RRQ), FSS | RRQ, FSS, RQAP |
| Taxes de vente | (hors T1 — production TPS/TVQ séparée, formulaire FPZ-500 à Revenu Québec qui administre TPS+TVQ) | idem |
| Acomptes provisionnels | calcul et rappels | idem |

**Données d'entrée du T2125/TP-80** (ce que l'ERP doit produire) : revenus bruts par activité ; dépenses par catégorie officielle (publicité, repas 50 %, assurances, intérêts, taxes/licences, bureau, fournitures, honoraires, loyer, entretien, salaires, frais de véhicule avec km, dépenses de bureau à domicile avec quote-part, etc.) ; DPA/amortissement (catégories CCA) ; TPS/TVQ selon méthode (montants nets si inscrit aux taxes).

### 3.2 Import/export UFile

- **Auto-fill my return (AFR)** : téléchargement automatique des feuillets depuis l'ARC (T4, T5, etc.). **Ne couvre pas les données d'entreprise T2125** — celles-ci sont saisies manuellement.
- **Pas d'import CSV/JSON** de données d'entreprise constaté dans la documentation UFile : la saisie du T2125 est manuelle, champ par champ.
- **Conséquence** : le livrable ERP réaliste est un **dossier prêt-à-saisir** (une page par ligne T2125/TP-80 avec le montant agrégé et le détail justificatif), pas un fichier d'import.

### 3.3 Télétransmission NETFILE/ImpôtNet — pourquoi ne pas y aller

- La certification NETFILE est un **processus de test annuel avec l'ARC** ; au Québec s'ajoute la certification **ImpôtNet Québec avec Revenu Québec**. Chaque année d'imposition = re-certification complète.
- Le CRA plafonne tout logiciel certifié NETFILE à **20 déclarations par ordinateur/compte** (produit grand public) ; la fenêtre de transmission est annuelle (ex. 23 février 2026 → 29 janvier 2027 pour 2025).
- Pas de frais de dossier publics à l'ARC, mais le coût réel est l'ingénierie : implémentation du format de transmission, des validations, des deux administrations (ARC + RQ), tests de conformité, maintenance annuelle obligatoire. **Estimation : plusieurs mois-personne la première année, puis un cycle de re-certification chaque année.** Pour un utilisateur unique, le ROI est indéfendable.
- **Cible retenue : PRÉPARATION** — agrégats T2125/TP-80 exacts, export structuré (PDF bilingue + CSV/JSON), et UFile conservé comme véhicule de transmission certifié (~25-30 $/an). C'est le même partage des rôles que l'utilisateur pratique déjà avec Claude, mais industrialisé.

---

## 4. Connectivité Desjardins

### 4.1 Constat de base

- **Desjardins n'a aucun portail développeur ni produit API public** (openbankingtracker : « No API products listed »). Accès tiers uniquement via agrégateurs.
- **AccèsD (particuliers) exporte manuellement CSV et OFX** depuis l'historique de transactions (icône export). Limites : couvre l'activité récente (pas tout l'historique), les relevés mensuels et relevés Visa Desjardins restent **PDF seulement** ; CSV délimité par point-virgule, décimales à virgule.
- **AccèsD Affaires** : service de « transmission de données » type dépôt/retrait direct (fichiers batch ACH), **pas de webhook ni d'API** documentés.

### 4.2 Tableau comparatif des agrégateurs (état 2026)

| Agrégateur | Couverture Desjardins | Méthode de connexion | Prix indicatif | Adéquation mono-utilisateur |
|---|---|---|---|---|
| **Flinks** (Montréal) | **Confirmée** (Desjardins fut un investisseur précoce) | OAuth/consentement + repli scraping | Public : Starter ~500 $ US/mois (200 connexions), ~0,20 $/connexion, engagement 1 an | Faible (tarifé B2B) ; le meilleur techniquement au Canada |
| **Plaid Canada** | **Confirmée** pour Auth, Balance, Assets ; **Transactions non confirmé** pour Desjardins | Identifiants via UI Plaid (pas d'OAuth Desjardins) | Free tier (200 appels), puis ~0,30-0,60 $/mois par compte connecté (Transactions) | Moyenne : seul modèle à l'échelle d'un utilisateur, mais produit Transactions à valider sur Desjardins |
| **Finicity / Mastercard Open Finance** | Confirmée (agrégation de transactions) ; pas de vérification titulaire | Identifiants | Non public (enterprise) | Faible |
| **Inverite** (Canada seulement) | Probable (280+ IF canadiennes), non confirmée explicitement | Identifiants (IBV) | Pay-per-use, sans minimum | Moyenne-faible (orienté prêteurs/KYC, pas compta) |
| **MX** | Non confirmée | Identifiants → FDX | Enterprise seulement | Faible (plateforme B2B pour banques) |
| **Salt Edge** | Non confirmée | PSD2/scraping (Europe d'abord) | Enterprise | Faible pour le Canada |
| **Export manuel AccèsD (OFX/CSV)** | **Native, garantie** | Session AccèsD de l'utilisateur, aucun partage d'identifiants à un tiers | **0 $** | **Élevée** : friction = 1 téléchargement périodique |

### 4.3 Open banking canadien — calendrier réel

- **Loi C-15, sanction royale 26 mars 2026** : remplace la première Loi sur les services bancaires axés sur les consommateurs (2024) par un cadre complet.
- **Règlements proposés publiés dans la Gazette du Canada le 27 juin 2026** (consultation en cours au moment de cette étude).
- **Phase 1 (lecture)** : accès aux données de comptes (dépôts, placements, crédit, paiement) par des tiers accrédités, avec consentement. Cible 2026, mais la Banque du Canada jugeait « prématuré » de confirmer une date en mars 2026. Réaliste : 2027.
- **Phase 2 (écriture — initiation de paiement)** : cible mi-2027, conditionnée au Real-Time Rail (T3 2026).
- **Participation** : obligatoire pour les grandes banques de l'annexe I ; **volontaire pour les coopératives de crédit provinciales, donc Desjardins**. Mais Desjardins est **membre fondateur de FDX Canada (juillet 2020)** aux côtés des Six Grandes, Flinks, Plaid, Interac — signal d'intention clair.
- **Standard technique** : unique, désigné par le ministre, gouvernance « meaningfully Canadian » ; **FDX est le candidat évident** (non encore désigné formellement).

### 4.4 Architecture recommandée : connecteur bancaire séparé, provider pluggable

Le précédent Wise valide le modèle « reposer sur un tiers » : Wise s'appuie sur Plaid (Core Exchange, Permissions Manager) plutôt que de connecter chaque banque — mais pour le cas ERP, le sens du flux est inverse (l'app lit la banque), ce qui plaide pour une abstraction propre.

```
apps/bank-connector (service dédié, hors du cœur ERP)
├── Schéma normalisé aligné FDX : Account, Transaction, Statement, Consent
├── Entité provider-agnostique BankLink (≈ Item Plaid / LoginId Flinks / upload manuel)
├── Interface IBankProvider : getAccounts(), getTransactions(range), getBalance()
├── Providers :
│   ├── P1 : accesd-file  → upload OFX/CSV AccèsD (parseur OFX + CSV point-virgule)
│   ├── P2 : flinks | plaid (optionnel, activable, secrets isolés dans ce service)
│   └── P3 : fdx-native   → API Desjardins/FDX quand le cadre CDBA sera vivant
├── Déduplication (hash FITID OFX / montant+date+libellé), idempotence des imports
└── Événements normalisés vers l'ERP : transaction.imported, balance.refreshed
```

Principes : le cœur ERP ne connaît que le schéma normalisé ; les identifiants/tokens d'agrégateur ne quittent jamais le service connecteur ; chaque provider encapsule ses retries et limites ; le passage OFX manuel → agrégateur → FDX natif ne change rien en aval.

---

## 5. Gap analysis OpenERP (état réel du repo au 2026-07-06)

Base : lecture de `apps/api/src/billing/*`, `apps/web/src/routes/admin/billing/*`, migrations `0021`–`0024`, `0027`, `packages/domain/src/billing.ts`.

| Capacité | Existant (fichiers) | Manque | Taille |
|---|---|---|---|
| **Facturation client** | Complet : cycle `draft→issued→paid/partially_paid/void/written_off`, numérotation INV-XXXXXX, lignes avec traçage source, multi-devise, ponts CRM (quote handoff) et propositions, récurrence (weekly→annual) — `billing/invoice-service.ts`, `recurring-schedule-service.ts`, migrations 0021/0027, UI `/admin/billing/invoices` | Rendu **PDF de facture bilingue** + envoi email au client ; déclencheur automatique de la récurrence (pgmq/cron non câblé) ; paiement en ligne (équiv. Wave Payments) optionnel | **S-M** (PDF/email) |
| **Encaissements** | Complet : paiements multi-méthodes (`bank_transfer/card/cheque/cash/other`), réconciliation automatique du statut facture, balance due — `billing/payment-service.ts`, migration 0022 | Rien de bloquant ; lien paiement ↔ transaction bancaire (arrive avec P2) | **S** |
| **Dépenses / reçus** | **Absent** (seule une référence `EXP-…` dans les seeds d'approbations) | Entité dépense + lignes, catégorie comptable, fournisseur, pièce jointe reçu, extraction de reçu (agentique), taxes payées (CTI/RTI), écriture au journal | **L** |
| **Catégorisation comptable** | Plan comptable par tenant (types asset/liability/equity/revenue/expense), journal en partie double validé (Σdébits=Σcrédits), écritures auto depuis factures/paiements — `billing/accounting-service.ts`, migration 0024 | Catégorisation des **transactions bancaires importées** : règles récurrentes + suggestions Claude, comptes par défaut par contrepartie | **M** |
| **TPS/TVQ** | Moteur complet : catégories + versions de taux datées, base points milli-% (5000/9975), flag compound, ventilation persistée, écritures auto vers 2310 (TPS) / 2320 (TVQ), tests anchor 100 $ → 5,00 + 9,98 — `billing/tax-service.ts`, migration 0023, UI `/admin/billing/taxes` | **Taxes sur intrants** (CTI/RTI sur dépenses) ; **périodes de déclaration** (trimestre/an) ; **sommaire de production** type FPZ-500 (taxe perçue − CTI/RTI = net à remettre) ; HST si hors-QC un jour | **M** |
| **Rapprochement bancaire** | **Absent** | Service connecteur (cf. §4.4), import OFX/CSV, déduplication, moteur de matching transaction↔paiement/dépense (montant/date/référence, tolérances), file de suggestions, états de réconciliation par compte | **L** |
| **Clôture annuelle** | Fondation seule : `fiscal_year_start` dans les settings tenant | Périodes comptables + verrouillage, écritures de clôture (résultat → BNR), contrôles de fin de période, états financiers (P&L, bilan) | **M** |
| **Préparation T2125/TP-80** | **Absent** | Mapping plan comptable → lignes officielles T2125/TP-80, règles spécifiques (repas 50 %, bureau à domicile, véhicule/km), DPA simple, agrégats annuels, export PDF + CSV/JSON prêt-à-saisir UFile | **M** |
| **Import/export financier** | **Absent** | Import Wave (4 CSV du Data Export + Wave Connect), import OFX/CSV bancaire, exports rapports | **M** |

Atouts transverses déjà en place et différenciants vs Wave : audit trail append-only sur toutes les mutations, RLS par organisation, monnaie homogène `{amountMinor, currency, scale}`, soft-delete, timeline d'activité.

---

## 6. Feuille de route « sans rupture »

Principe : **double-run** — chaque phase tourne en parallèle de Wave/UFile jusqu'à parité mesurée ; aucune bascule sans critère de sortie chiffré. La colonne « Agentique » indique où Claude (chat/canvas OpenERP) remplace ce que l'utilisateur faisait manuellement avec Claude.

| Phase | Contenu | Taille | Critère de sortie (Go) | Agentique (Claude via OpenERP) |
|---|---|---|---|---|
| **P0 — Import historique Wave** | Importeur des 4 CSV du Data Export Wave (+ vues Wave Connect) → plan comptable, clients, factures, transactions/journal OpenERP ; rapport d'écart automatique | **M** | Balances par compte OpenERP = balances Wave à la date de coupure (écart 0,00 $) ; historique 2+ ans navigable | Claude mappe les comptes Wave → plan OpenERP, signale les anomalies d'import, explique chaque écart |
| **P1 — Facturation 100 % ERP** | PDF facture bilingue FR/EN (mentions TPS/TVQ + numéros d'inscription), envoi email, câblage du déclencheur de récurrence ; Wave passe en lecture seule pour la facturation | **M** | 1 cycle mensuel réel complet (émission → encaissement) fait dans l'ERP ; zéro facture créée dans Wave le mois suivant | Rédaction/relance de factures au chat (« facture X pour le client Y, comme le mois dernier ») |
| **P2 — Connecteur Desjardins + rapprochement** | Service `bank-connector` (schéma FDX, provider pluggable) ; **P2a** : provider upload OFX/CSV AccèsD (dédup FITID) ; **P2b** (optionnel) : provider Flinks ou Plaid derrière la même interface ; moteur de matching transaction↔paiement/dépense + file de suggestions | **L** | 2 mois consécutifs du compte Desjardins réconciliés à 100 % dans l'ERP ; ≥80 % des transactions matchées automatiquement ou en 1 clic | Claude catégorise les transactions importées, propose les matchs ambigus avec justification, apprend les règles récurrentes — remplace la catégorisation manuelle faite avec Claude aujourd'hui |
| **P3 — Dépenses, sommaires taxes, clôture** | Entité dépenses + reçus (upload, extraction), CTI/RTI sur intrants, périodes fiscales + verrouillage, **sommaire TPS/TVQ prêt pour FPZ-500** (perçu − intrants = net), écritures de clôture, P&L/bilan | **L** | 1 période de taxes produite depuis l'ERP, montants identiques au rapport de taxes Wave (double-run) ; production réelle faite avec les chiffres ERP → **résiliation Wave possible** | Extraction de reçus photographiés, contrôles de cohérence pré-production (« dépenses sans reçu », « TVQ incohérente »), narration de la clôture |
| **P4 — Dossier impôts T2125/TP-80** | Mapping comptes → lignes T2125/TP-80 (repas 50 %, bureau à domicile, véhicule), DPA simple, agrégats annuels, export **PDF bilingue + CSV/JSON prêt-à-saisir** ; UFile reste le véhicule NETFILE/ImpôtNet | **M-L** | Déclaration de l'année courante préparée depuis l'ERP et saisie dans UFile en <1 h sans retraitement ; écart 0 $ vs méthode antérieure (Wave+Claude) sur l'année de recouvrement | Claude assemble le dossier, explique chaque ligne, simule RRQ/acomptes, répond aux « pourquoi ce montant » — industrialise exactement le travail fait cette année à la main |

Jalons de bascule : après P1, plus de facturation Wave ; après P3 validé sur une période de taxes complète, résiliation de l'abonnement Wave ; UFile est conservé indéfiniment comme outil de transmission certifié (coût marginal, risque nul).

---

## 7. Risques et dépendances

| Risque / dépendance | Impact | Mitigation |
|---|---|---|
| Export AccèsD limité à l'activité récente (relevés PDF only) | Trous d'historique bancaire si import espacé | Cadence d'export mensuelle minimum ; P0 récupère l'historique long via les transactions Wave (qui les a déjà agrégées) |
| Produit Transactions de Plaid non confirmé sur Desjardins ; Flinks tarifé B2B (~500 $ US/mois) | P2b (agrégateur) potentiellement non viable en mono-utilisateur | P2a (OFX/CSV) est le chemin par défaut et suffisant ; P2b reste optionnel derrière l'interface provider |
| Calendrier CDBA incertain (Phase 1 « 2026 » non confirmée ; Desjardins volontaire, pas obligé) | API FDX native peut-être 2027-2028+ | Architecture FDX-alignée dès P2 : le provider natif se branchera sans refonte |
| API GraphQL Wave : schéma non versionné, accès lié à l'abonnement Pro | Rupture possible pendant le double-run si on s'y adosse | Migration par exports fichiers (P0) ; API utilisée seulement en confort, jamais en dépendance |
| Exactitude fiscale T2125/TP-80 (règles 50 % repas, bureau à domicile, DPA) | Erreur de déclaration | Double-run P4 sur une année complète vs UFile ; revue humaine systématique ; l'ERP prépare, ne transmet pas |
| Chantier dépenses (L) + rapprochement (L) en série | Effet tunnel | P2a livrable indépendamment de P3 ; matching d'abord sur paiements de factures (entités existantes), dépenses ensuite |
| Récurrence non câblée à un scheduler (pgmq/cron « later slice ») | P1 incomplet | Inclure le câblage dans P1 explicitement |
| Règle projet : décisions UX matérielles (nouvelles routes rapprochement/dépenses) | No-Go UX sans Decision Record | Prévoir les passes UX 2-3 agents au démarrage de P2/P3 (rules/MASTER.md) |

---

## 8. Sources (consultées le 2026-07-06)

**Wave**
- Wave Developer Portal — API Reference : https://developer.waveapps.com/hc/en-us/articles/360019968212-API-Reference
- Wave Developer Portal — OAuth Guide : https://developer.waveapps.com/hc/en-us/articles/360019493652-OAuth-Guide
- Wave Help — Download your account data (Data Export, 4 fichiers CSV/XLS) : https://support.waveapps.com/hc/en-us/articles/4411360860692
- Wave Help — Wave Connect (add-on Google Sheets) : https://support.waveapps.com/hc/en-us/articles/33001853661076
- Wave Help — Understand bank connections (Plaid) : https://support.waveapps.com/hc/en-us/articles/115005541303
- Wave Help — Supported account types for bank connections : https://support.waveapps.com/hc/en-us/articles/360031202851
- Stitchflow — Wave User Management API Guide (limites API) : https://www.stitchflow.com/user-management/wave/api

**UFile / fiscalité**
- UFile — NETFILE certification : https://www.ufile.ca/get-started/netfile-certification
- UFile — Auto-fill My Return : https://www.ufile.ca/get-started/auto-fill-my-return
- UFile Support — T2125 self-employment (génère TP-80) : http://support.drtax.ca/ufile/kb/web/source/webpages/kpa320-20211004200336de.htm
- Canada.ca — NETFILE, logiciels certifiés, fenêtre de transmission 2026, limite 20 déclarations : https://www.canada.ca/en/services/taxes/income-tax/personal-income-tax/how-file/tax-software/send-return/netfile.html
- FutureTax — description du processus de certification NETFILE (CRA + RQ) : https://www.futuretax.ca/netfile/

**Desjardins / agrégateurs / open banking**
- openbankingtracker — Desjardins (« No API products listed ») : https://www.openbankingtracker.com/provider/desjardins
- openbankingtracker — guide Flinks × Desjardins 2026 : https://www.openbankingtracker.com/flinks/desjardins
- Flinks — Pricing : https://www.flinks.com/pricing
- Flinks — institutions supportées : https://docs.flinks.com/docs/list-of-financial-institutions-we-support
- Plaid — page institution Desjardins : https://plaid.com/institutions/desjardins/
- Plaid — Pricing : https://plaid.com/pricing/
- fintable.io — couverture Finicity (Desjardins Online Solutions) : https://fintable.io/coverage/providers/FINICITY
- Inverite — Bank Verify : https://inveriteinsights.com/bank-verify/
- Guides d'export CSV AccèsD : https://www.flowvista.ca/guides/export-csv-desjardins ; https://piastro.ca/en/help/exporter-un-csv-desjardins/
- Guide AccèsD Affaires (PDF Desjardins) : https://www.desjardins.com/content/dam/pdf/en/business/accounts-treasury/accesd-affaires-guide.pdf
- Gazette du Canada — règlements proposés sur les services bancaires axés sur les consommateurs (27 juin 2026) : https://gazette.gc.ca/rp-pr/p1/2026/2026-06-27/html/reg3-eng.html
- FDX Canada — membres fondateurs (dont Desjardins, juillet 2020) : https://financialdataexchange.org/FDX/News/Press-Releases/FDX_Canada.aspx
- Baker McKenzie — analyse de la nouvelle CDBA : https://canada-insights.bakermckenzie.com/2025/12/09/canada-stepping-into-the-digital-financial-future-the-federal-government-tables-the-new-consumer-driven-banking-act/
- DLA Piper — The new Consumer-Driven Banking Act explained : https://www.dlapiper.com/en-pl/insights/publications/2026/04/the-new-consumer-driven-banking-act-explained
- Plaid — customer story Wise (Core Exchange, Permissions Manager) : https://plaid.com/customer-stories/wise/

**Repo OpenERP (état du code)**
- `apps/api/src/billing/` : `invoice-service.ts`, `payment-service.ts`, `tax-service.ts`, `accounting-service.ts`, `recurring-schedule-service.ts`
- Migrations : `apps/api/src/db/migrations/0021_billing_invoices.sql`, `0022_billing_payments.sql`, `0023_billing_taxes.sql`, `0024_billing_accounting.sql`, `0027_billing_recurring_schedules.sql`
- Domaine : `packages/domain/src/billing.ts` ; UI : `apps/web/src/routes/admin/billing/{invoices,accounting,taxes}` ; tests : `apps/api/test/foundation/billing-tax-service.test.ts`
