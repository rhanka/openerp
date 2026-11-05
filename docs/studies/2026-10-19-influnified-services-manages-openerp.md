# Services managés OpenERP proposables à Influnified

Date : 2026-10-19. Demandé par l'owner via la session `influence`, pour présentation à l'owner.
Rédigé en français : document d'aide à la décision owner (les docs techniques du dépôt restent en anglais).

Client visé : Gaël Fleissner (Influnified / Australia Experiences).

## 1. Cadrage

Mots de l'owner : « je ne veux rien reprendre d'influnified, je veux évaluer les opportunités pour
offrir des services managés pertinents à influnified ».

Conséquences retenues :

- **Aucune reprise de fonction, de conception ou de modèle de données d'Influnified.** Le sens
  « Influnified → OpenERP » est abandonné ; la réserve de propriété intellectuelle qui l'accompagnait
  est sans objet. Ce document ne la mentionne plus.
- **Chaque service se branche sur la plateforme de Gaël sans la remplacer.** Un service qui recouvre
  son produit (campagnes, annuaire, portails) est classé « à ne pas proposer », même s'il est
  techniquement disponible.
- L'owner précise par ailleurs n'avoir signé aucun accord de confidentialité avec Gaël. Aucune
  obligation de confidentialité contractuelle ne pèse donc sur les informations de la réunion.

## 2. Deux constats préalables qui conditionnent toute l'offre

### 2.1 L'identité n'est pas un service OpenERP

L'exemple « organisations et identité multi-agences (passkeys, OIDC) » ne tient pas en l'état, et c'est
l'inverse de ce qu'il suppose.

`docs/ops/auth-oidc-rp.md` est une référence de configuration **relying party** : OpenERP est
*consommateur* d'identité, pas fournisseur. Le même document précise que « WebAuthn handlers and the
legacy identity-provider issuer are removed » : OpenERP se **dessaisit** de son propre fournisseur
d'identité et de ses gestionnaires de passkeys au profit de la plateforme Sentropic
(`docs/ops/auth-platform-cutover.md`, bascule activée en DEV, production volontairement désactivée).

Les tables `passkey_credentials` et `passkey_challenges` existent bien dans le schéma, mais la
trajectoire les vide de leur rôle. Vendre une identité managée à Influnified revient donc à vendre
**le fournisseur d'identité de la plateforme Sentropic**, qui est un autre produit et un autre
périmètre de conduite — pas un service OpenERP.

Ce qui reste bien à OpenERP sur cet axe : le **cloisonnement par organisation** (`organizations`,
`tenant_settings`, `organization_members`, politiques RLS en migration `0003`), c'est-à-dire la
structure multi-agences, pas l'authentification.

### 2.2 Ce qui manque, de façon transverse, pour vendre quoi que ce soit en managé

Ces manques pèsent sur **tous** les services ci-dessous. Ils sont la vraie liste de travaux d'une offre
managée, indépendamment du service retenu.

| Manque transverse | Constat dans le dépôt | Portée |
| --- | --- | --- |
| **Identifiants client machine et quotas** | Aucune gestion de clés d'API, aucune limitation de débit, aucun quota par client. La seule occurrence de politique de reprise est `apps/api/src/webhook/webhook-retry-policy.ts`, côté sortant. | Bloquant. Une API managée sans identifiant par client ni plafond n'est pas exploitable commercialement. |
| **Métriques** | Sondes `/healthz` et `/readyz` présentes. Aucun endpoint de métriques trouvé. | Bloquant pour un engagement de service. |
| **Niveau de service écrit** | Aucun SLO ni SLA dans `docs/ops`. | Bloquant pour contractualiser. |
| **Sauvegarde et restauration attestées** | Évoquées dans les runbooks, non attestées ici : `unverified`. | Bloquant pour héberger les données d'un tiers. |
| **Facturation du service lui-même** | OpenERP facture les clients de ses utilisateurs ; il ne facture pas ses propres abonnés. | Structurant si l'offre devient récurrente. |
| **Finition fonctionnelle** | README : projet en phase d'étude/spécification. Suivi `track` à 31/66. Complétude écran par écran non vérifiée : `unverified`. | Réserve maintenue, à lever avant tout engagement. |

Ce qui, à l'inverse, est déjà de niveau exploitable et porte l'offre :

- **Contrat d'API publié** : document OpenAPI 3.1 **généré** depuis le registre de routes
  (`apps/api/src/http/openapi.ts`, servi sur `/openapi.json`) — il couvre toute la surface enregistrée,
  pas un sous-ensemble.
- **Surface HTTP réelle** sur CRM, facturation, projet, reporting, bancaire, approbations, webhooks,
  workflows (33 gestionnaires dans `apps/api/src/http/handlers`).
- **Middlewares d'exploitation** : RBAC (`rbac-middleware.ts`), idempotence
  (`idempotency-middleware.ts`), résolution de locataire par JWT (`createJwtTenantResolver`), échange
  de jeton machine (`/auth/exchange-agent-token`).
- **Cloisonnement des données** par organisation avec RLS au niveau base.
- **Exploitation Kubernetes** : overlays dev et prod, CD GitHub Actions, worker planifié.

## 3. Services proposables — vue d'ensemble

| # | Service | État OpenERP | Intégration | Effort pour le rendre managé | Recommandation |
| --- | --- | --- | --- | --- | --- |
| S1 | Structure multi-agences (organisations, cloisonnement) | `existant` | API + JWT | M | Proposer, mais comme socle des autres services, pas seul |
| S2 | Facturation clients et taxes | `existant` | API + webhook | M | **Proposer en premier** |
| S3 | Validations | `existant` | API + webhook | S | **Proposer en premier** |
| S4 | Traitements planifiés et webhooks | `existant` | API + webhook | M | Proposer |
| S5 | Reporting et livraison planifiée | `existant` | API + livraison | M | Proposer |
| S6 | Journal d'audit et traçabilité | `existant` | API | S à M | **Proposer en premier** |
| S7 | Comptabilité et rapprochement bancaire | `existant` | API + import | M à L | Proposer plus tard |
| S8 | Paiement groupé des créateurs | `absent` | API + fichier | L | Ne pas vendre avant construction |
| — | Identité et passkeys | hors OpenERP (§ 2.1) | — | — | Renvoyer vers la plateforme Sentropic |

### Pourquoi S2, S3 et S6 d'abord

Ce sont les trois services où la capacité OpenERP est livrée, où le besoin d'Influnified est documenté
et daté, et où le branchement ne touche pas au cœur de valeur de Gaël. Ils se vendent séparément, sans
dépendance au portail ni à l'identité.

## 4. Services — détail

### S1 — Structure multi-agences

**Besoin Influnified.** Le dossier d'analyse le qualifie textuellement : « une seule agence, aucune
notion d'organisation : cloisonner chaque donnée par agence est le chantier le plus structurant ». Le
modèle de données déduit des écrans porte la mention « l'entité Agence n'existe pas encore, il n'y a
qu'une agence ». L'objectif annoncé est le passage en multi-agences.

**État OpenERP.** `existant` : `organizations`, `tenant_settings`, `organization_members`, politiques
RLS (`0003_rls_policies.sql`), résolution de locataire par JWT, sélection d'organisation
(`auth_pending_tenant_selections`, route `select-organization`). Le cloisonnement est appliqué au
niveau de la base, pas seulement dans le code applicatif.

**Ce qui manque pour le proposer en managé.** Les manques transverses du § 2.2 s'appliquent tous.
Spécifiquement : ce service n'a de sens que porté par les services métier qui l'utilisent — vendre un
cloisonnement sans donnée à cloisonner n'est pas une offre.

**Intégration.** API REST avec JWT portant l'organisation ; `/auth/exchange-agent-token` pour un appel
machine à machine depuis le worker Cloudflare d'Influnified.

**Effort et recommandation.** M. Proposer comme **socle inclus** dans S2, S3 et S6, pas comme un
service autonome facturable.

### S2 — Facturation clients et taxes

**Besoin Influnified.** Le dossier relève la facturation client automatisée avec un modèle de surcharge
parmi les souhaits, Stripe étant visé mais non en place. Le Collab Dashboard suit déjà « facture envoyée
et payée » à la main.

**État OpenERP.** `existant` : `invoices`, `invoice_lines`, `recurring_billing_schedules`,
`tax_categories`, `tax_rate_versions`, `payments`, plus le figement d'identité d'émetteur sur facture
(`0038`, `0039`). Gestionnaires HTTP correspondants présents.

**Ce qui manque pour le proposer en managé.** Les manques transverses. En propre : aucun connecteur de
prestataire de paiement (`absent` des deux côtés) ; la numérotation et les mentions légales de facture
doivent être confrontées aux obligations australiennes, le dépôt étant calibré Canada/Québec
(`tax_region`, locales `en`/`fr`) — `not covered`.

**Intégration.** API REST pour créer factures et lignes depuis Influnified ; webhook sortant vers
Influnified sur changement d'état de facture et encaissement.

**Effort et recommandation.** M. **Proposer en premier.** C'est le service où l'écart entre « ce que
Gaël fait à la main » et « ce qui est livré chez nous » est le plus net. Réserve à énoncer au client :
la conformité de facturation australienne n'est pas couverte.

### S3 — Validations

**Besoin Influnified.** Deux validations distinctes sont documentées : l'**approbation du brief par
l'entreprise cliente** (horodatée, avec empreinte du brief et case à cocher) et l'**approbation de
paiement** du Collab Dashboard (« approuvé pour paiement »). Le dossier relève aussi que la colonne
adresse IP est vide dans les approbations client, donc que la preuve est incomplète.

**État OpenERP.** `existant` et générique par construction : `approval_requests` est paramétré par
`subject_type` / `subject_id`, avec approbateur par identité ou par rôle, urgence, statut
(`pending` / `approved` / `rejected` / `escalated` / `expired`), motif de décision et expiration. Les
deux validations d'Influnified sont deux instances du même objet, sans développement spécifique.

**Ce qui manque pour le proposer en managé.** Les manques transverses. En propre : la capture de
l'adresse IP et de l'agent utilisateur au moment de la décision n'est pas attestée dans le schéma
d'`approval_requests` — c'est précisément le défaut que le dossier signale côté Influnified, à ne pas
reproduire. À vérifier avant de vendre la ligne « preuve ».

**Intégration.** API REST pour créer une demande et lire sa décision ; webhook sortant sur décision.

**Effort et recommandation.** S. **Proposer en premier.** Le plus petit effort, le besoin le plus
précis, et un service qui ne touche à rien du cœur de Gaël.

### S4 — Traitements planifiés et webhooks

**Besoin Influnified.** Le dossier recense quatre tâches planifiées et une file `CONNECT_PULL` sur le
worker `ae-platform`, dont la fonction exacte reste une question ouverte de l'audit, ainsi que des
déploiements manuels fréquents sur la base de production.

**État OpenERP.** `existant` : `workflow_definitions`, `workflow_runs`, `workflow_schedules`,
`webhook_endpoints`, `webhook_deliveries`, `jobs`, worker `openerp-worker` dédié. Le suivi `track`
montre les garde-fous de livraison déjà traités : refus de redirection et contrôle du port sortant,
garde SSRF, reprise exponentielle, disjoncteur après N échecs consécutifs.

**Ce qui manque pour le proposer en managé.** Les manques transverses, en particulier les métriques :
vendre de l'exécution planifiée sans exposer le taux d'échec ni la latence de file n'est pas tenable.

**Intégration.** API REST pour déclarer définitions et cadences ; webhooks sortants vers Influnified.

**Effort et recommandation.** M. Proposer, mais après S2, S3 et S6 : remplacer des crons qui tournent
est moins vendeur que combler un manque.

### S5 — Reporting et livraison planifiée

**Besoin Influnified.** Le dossier décrit un rapport quotidien par campagne et, côté portail client,
des résultats avec export PDF et CSV.

**État OpenERP.** `existant` : `report_definitions`, `report_runs`, `saved_views`, `dashboards`,
`dashboard_widgets`, `scheduled_deliveries`, `delivery_runs`.

**Ce qui manque pour le proposer en managé.** Les manques transverses. En propre : le rendu visuel des
résultats d'Influnified (anneaux par plateforme, comparaisons, classements) relève de son produit ; le
service ne peut porter que la définition, l'exécution et la livraison, pas la présentation client.

**Intégration.** API REST pour les définitions ; livraison planifiée par courriel ou dépôt de fichier.

**Effort et recommandation.** M. Proposer, en délimitant explicitement que la présentation reste chez
Gaël — sinon le service glisse vers le remplacement du portail.

### S6 — Journal d'audit et traçabilité

**Besoin Influnified.** C'est une demande explicite du client, pas une déduction : Gaël garde
l'architecture juridique de son côté avec un avocat et « demande la traçabilité technique seulement ».
Le dossier relève par ailleurs « from a security standpoint I have no idea what really happens ».

**État OpenERP.** `existant` : `audit_events` partitionné (`0007`, aligné sur le canon en `0009`),
`domain_events`, `timeline_entries`, route `admin/audit`, gestionnaire `audit-events.ts`.

**Ce qui manque pour le proposer en managé.** Les manques transverses. En propre : la conservation et
l'inaltérabilité doivent être énoncées (durée de rétention, protection contre la modification,
export) — rien de tel n'est écrit aujourd'hui, c'est `not covered`.

**Intégration.** API REST d'écriture d'événement depuis Influnified, puis lecture et export.

**Effort et recommandation.** S à M. **Proposer en premier.** C'est le seul service de la liste que le
client a demandé de lui-même, ce qui en fait la porte d'entrée commerciale la plus solide.

### S7 — Comptabilité et rapprochement bancaire

**Besoin Influnified.** Non formulé par Gaël. Déduit de la présence d'un suivi de facturation et de
paiements manuels.

**État OpenERP.** `existant` : `accounts`, `journal_entries`, `journal_entry_lines`,
`fx_rate_snapshots`, `bank_accounts`, `bank_transactions`, `reconciliation_links`, modules
`reconciliation` et `finance-import`, paquet `packages/bank-connector`.

**Ce qui manque pour le proposer en managé.** Les manques transverses, plus un référentiel comptable
australien non couvert (`not covered`), alors que le dépôt est calibré Canada/Québec.

**Intégration.** API REST plus import de relevés.

**Effort et recommandation.** M à L. Proposer plus tard : besoin non exprimé et dépendance à un
référentiel comptable hors de notre calibrage actuel.

### S8 — Paiement groupé des créateurs

**Besoin Influnified.** Documenté et actif : rémunération, approuvé pour paiement, créateur payé,
« Payment file », coordonnées bancaires chiffrées en base, export de fichier groupé Wise aujourd'hui,
Stripe souhaité.

**État OpenERP.** `absent`. La table `payments` est liée à `invoice_id` et `company_id` : elle modélise
l'**encaissement client**, pas le décaissement vers un prestataire. Aucune entité fournisseur, aucun
ordre de paiement sortant, aucun lot de paiement.

**Ce qui manque pour le proposer en managé.** Tout le domaine, plus les manques transverses, plus deux
exigences propres : la détention de coordonnées bancaires de tiers (donnée sensible, chiffrement et
inventaire à la hauteur de ce qui a été fait pour Plaid dans `docs/ops/plaid-pii-inventory.md`) et le
statut réglementaire d'un acteur qui déclenche des paiements pour le compte d'autrui — non instruit,
`unknown`.

**Intégration.** API REST plus génération de fichier de paiement groupé.

**Effort et recommandation.** L. **Ne pas vendre avant construction.** Le besoin est le plus concret de
la liste et c'est aussi la brique la plus structurante pour le périmètre cible d'OpenERP, où
« accounts receivable/payable » figure déjà. Mais l'annoncer avant de l'avoir construite, sur un sujet
qui touche à l'argent d'un tiers et dont le statut réglementaire n'est pas instruit, serait un
engagement à vide.

## 5. À ne pas proposer

| Élément | Raison |
| --- | --- |
| **Identité, passkeys, OIDC** | OpenERP est relying party et retire son propre fournisseur d'identité (§ 2.1). À renvoyer vers la plateforme Sentropic, qui est un autre produit et un autre périmètre. |
| **Portail client et portail créateur** | `prévu` chez nous mais hors tranche MVP, et surtout : les portails *sont* le produit de Gaël. Le proposer, c'est le remplacer, ce que le cadrage interdit. |
| **CRM complet, annuaire, gestion de campagnes** | Recouvrent directement ses écrans Campagnes et Annuaire. Techniquement disponibles, commercialement contraires au cadrage. |
| **Connecteurs réseaux sociaux (Meta, TikTok, YouTube) et scraping** | Hors périmètre produit OpenERP, et c'est le cœur de valeur d'Influnified. |
| **Boîte de réception unifiée** | `absent` chez nous aussi : `email_sends` ne couvre que le sortant. Rien à vendre. |
| **Paiement par carte et encaissement pour compte de tiers** | Nous ne sommes pas prestataire de services de paiement. À laisser à Stripe ou Wise. |
| **Hébergement ou reprise de la plateforme Influnified** | Hors de la demande : les services se branchent sans remplacer. |
| **Détection automatique des publications et scores de pertinence** | Spécifique à l'influence, hors périmètre. |

## 6. Risques

| Risque | Portée | Mitigation |
| --- | --- | --- |
| **État réel d'OpenERP non vérifié.** Schéma, modules et routes attestés ; complétude écran par écran et finition `unverified`. Projet décrit en phase d'étude. | Toutes les lignes `existant` | Passe de vérification fonctionnelle sur l'application en exécution avant tout engagement commercial. Réserve maintenue à la demande de l'owner. |
| **Aucun identifiant client machine ni quota.** | Bloquant transverse | Prérequis de toute offre managée : à chiffrer séparément des services eux-mêmes. |
| **Aucun niveau de service écrit, sauvegarde non attestée.** | Bloquant pour contractualiser | Écrire un SLO minimal et attester une restauration avant de signer. |
| **Calibrage réglementaire Canada/Québec contre marché australien.** | S2, S7 | Instruire les obligations australiennes de facturation avant de vendre S2. |
| **Statut réglementaire du déclenchement de paiements pour un tiers.** | S8 | Instruire avant toute annonce. |
| **Dépendance de l'offre à la bascule d'authentification.** La bascule plateforme est active en DEV, désactivée en production. | S1 et tous les appels authentifiés | Clarifier la trajectoire d'authentification avant de promettre un accès machine stable. |
| **Concentration client.** Un premier client managé sur un produit en phase d'étude oriente la feuille de route. | Stratégique | Décision owner : accepter ou non que les besoins d'Influnified priorisent le backlog. |

## 7. Ce qui n'est pas couvert

- `otter-transcript.txt` non ouvert pour ce document : le dossier structuré et `observed-facts.md` ont
  servi de source. Des besoins exprimés seulement à l'oral peuvent manquer.
- Aucun chiffrage commercial : les efforts sont des tailles de construction technique, pas des prix.
- Aucune instruction des obligations réglementaires australiennes (facturation, comptabilité,
  paiements) : `not covered`.
- Aucun accès au code d'Influnified : les besoins cités viennent du dossier d'analyse, pas d'une revue
  technique.
- Portail créateur jamais montré : les besoins qui s'y rattachent reposent sur les hypothèses du
  dossier.
