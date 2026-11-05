# Intégration d'OpenERP au Cluster Mesh Sentropic — orientation

Date : 2026-10-24. Demandé par l'owner. **Révision 2** (même jour) après réponse de la session
`sentropic` et revérification contre `origin/main` : trois constats de la révision 1 étaient tirés
d'un arbre périmé et sont corrigés ici, voir §1.3.

Rédigé en français comme les autres dossiers de `docs/studies/` (aide à la décision owner ;
les documents techniques du dépôt restent en anglais).

Trois objets :

1. **Relais** du besoin multi-locataire vers Sentropic — fait, voir §5.
2. **Voie d'intégration** du cluster mesh pour OpenERP, avec deux modes réellement disponibles :
   fonctions gérées en autonomie, ou déléguées à un fournisseur. Dans notre déploiement,
   `sentropic.sent-tech.ca` est le fournisseur ; les deux modes doivent rester possibles.
3. **Recadrage owner du 2026-10-24** sur le modèle de données (engram, SAP, Odoo) — voir §8.

## 1. Ce qu'est le Cluster Mesh — constat vérifié sur `origin/main`

Ce n'est **pas** le ClusterMesh de Cilium (le CNI du cluster `poc` est bien cilium, mais ce n'est pas
le sujet). C'est le paquet TypeScript `@sentropic/cluster-mesh`, **version 0.21.2**, décrit par son
propre manifeste comme : « Injectable Cluster Mesh control-plane contracts, namespace modules, and
single-instance runtime ».

### 1.1 Ce qui est construit

Le plugin de composition Hono **existe** (`packages/cluster-mesh/src/hono/plugin.ts`) et sa signature
est exactement celle que nous devons viser :

```ts
export function createClusterMeshPlugin(options: ClusterMeshPluginOptions): Hono {
  for (const module of registry.enabled()) {
    const router = module.createRouter({
      context: options.runtime.context,
      receipts: options.runtime.receiptPort,
    });
    plugin.route(options.mounts?.[module.namespace] ?? module.namespace, router);
  }
}
```

Autour : `runtime/` (générations), `modules/` (registre + gardes de topologie passerelle, llm-mesh,
mcp), `persistence/`, `sessions/`, `mcp/`, `token-exchange.ts`, `trust/`, `engram-memory/`, et des
routeurs déjà écrits pour `cli`, `comments`, `health`, `session`, `workspaces`.

Les contrats neutres sont dans `@sentropic/contracts` **0.3.0** — `cluster-mesh-namespace.ts` et
`verified-invocation-context.ts` — exactement là où l'invariant D1 l'exige.

Côté produit Sentropic, la cible r13 est **partiellement livrée** : la migration unique
`api/drizzle/control/0007_cluster_mesh_r13.sql` existe, ainsi que
`api/src/services/cluster-mesh/{invocation-verifier,postgres-runtime-store,postgres-cutover-store,session-workspace,live-declarations}.ts`
et des tests de bascule pour les espaces de noms `admin` et `agents`.
`createDegenerateClusterMesh` est désormais marqué `@deprecated` avec son localisateur de suppression
(« after its remaining callers cut over in Lots 4–32 »).

### 1.2 Ce qui reste fermé

| Capacité | État déclaré dans `mesh.ts` |
| --- | --- |
| `mode` | `single-node` |
| `localDevices` / `localProjection` | `available` par défaut, `gated` si le port le déclare |
| `tokenExchange` | `available` **si** une liaison d'émetteur est configurée, `gated` sinon |
| `interServerDirectory` | `gated` — sans liaison v1 |
| `memoryReplication` | `gated` |

La **fédération multi-nœuds n'existe donc toujours pas** : l'annuaire inter-serveurs lève
`CapabilityGatedError`, et la seule entrée d'annuaire est ce serveur plus ses postes attachés. Aucun
engagement de calendrier ne doit reposer dessus.

L'invariant qui gouverne tout le reste, cité de la spécification r13 :

> **D1=B everywhere**. Every provider remains independently integrable, testable and disableable, owns
> its domain runtime/data/secrets, and never imports `@sentropic/cluster-mesh` merely to operate.

La condition posée par l'owner — rester maître de son destin, gérer en autonomie ou déléguer — n'est
donc pas une dérogation à négocier : c'est **l'invariant structurant du cluster mesh lui-même**.

### 1.3 Corrections de la révision 1

| Constat r1 | Correction r2 | Cause |
| --- | --- | --- |
| Paquet en `0.1.0`, plugin « cible, non construit » | `0.21.2`, plugin **construit** | Lecture faite dans l'arbre de travail `sentropic`, positionné sur une branche, et `main` **local** (`cb618e190`) en retard sur `origin/main` (`7fb76b7b2`) |
| `tokenExchange` fermé par conception | Fermé seulement **faute de liaison d'émetteur configurée** | idem |
| Spécification r13 `unverified`, absente de `spec/` | **Confirmée sur `origin/main`** : `491cab16c` en est un ancêtre | `git ls-tree main` interrogeait la référence locale périmée |
| Demande n°1, projection filaire, à co-écrire | **Déjà implémentée** — voir §5.3 | non vérifié en r1 |

Méthode retenue pour la suite : toute affirmation sur Sentropic est vérifiée contre `origin/main`,
jamais contre l'arbre de travail.

## 2. Où en est OpenERP — constats vérifiés dans le dépôt

OpenERP est **déjà consommateur du club**, et c'est l'argument d'entrée le plus solide :

- `apps/api/package.json` dépend de `@sentropic/auth-hono@0.13.0`, `@sentropic/auth-client`,
  `@sentropic/h2a@^0.1.7`.
- `apps/web/package.json` dépend de `@sentropic/chat-ui`, `auth-ui`, `design-system-*`.
- `apps/api/src/auth/router.ts` enveloppe les fabriques `auth-hono` — les modules mêmes que le plugin
  compose pour `/auth` et `/oauth`. OpenERP **prouve donc déjà** qu'ils fonctionnent hors du plugin.

| Constat | Emplacement | Conséquence |
| --- | --- | --- |
| Racine de composition unique à ports injectés (`resolveTenant`, `db`, `identityProvider`) | `apps/api/src/http/app.ts:buildApp` | La forme attendue est déjà là. |
| Délégation déjà pilotée par drapeau, défaut-off en production | `platformAuth: { enabled: false } \| { enabled: true, ... }` | Le patron des deux modes existe et tourne. |
| Coordination de drapeaux + garde CI | `OPENERP_PLATFORM_AUTH_ENABLED` / `_UI_ENABLED` sur une clé ConfigMap unique ; `npm run check:auth-cutover` vérifie DEV=1/1 et PROD=0/0 | Mécanisme réutilisable tel quel. |
| Contexte lu indirectement | 30 des 31 fichiers de `http/handlers/` lisent `c.get("tenant")` et `c.get("db")` | Changer **qui produit** le contexte touche un intercepteur, pas 31 gestionnaires. |
| Locataire jamais tiré de l'entrée | `tenant-resolvers.ts` : « NEVER trusts unsigned x-organization-id / x-user-identity-id headers » | Même invariant que `boundaries.ts` (« never from input data »). |
| **Écart de forme** | 31 fonctions `mountXRoutes(app)` mutent l'application racine | Le plugin consomme `createRouter({context, receipts}): Hono`. Mécanique. |
| **Écart de modèle** | un seul niveau : `organization_id`, RLS via `app.current_organization_id` | Voir §5. |

## 3. Les deux modes, définis

Le mode se choisit **par fonction**, jamais globalement.

| Fonction | Mode `self` | Mode `mesh` | Interrupteur |
| --- | --- | --- | --- |
| Identité des personnes | Passkeys et émetteur locaux | Fournisseur de la plateforme, OpenERP en *relying party* | `OPENERP_PLATFORM_AUTH_ENABLED` — **existe**, DEV=1, PROD=0 |
| Identité machine (NHI) | `/auth/exchange-agent-token` | Cycle de vie NHI h2a | à créer |
| Frontière de locataire | `createJwtTenantResolver` | `ValidatedMembershipPort` | à créer |
| Quittances / journal neutre | `audit_events` seul | `audit_events` + `InvocationReceiptPort` | à créer |
| Quotas par client | aucun (manque connu) | admission du mesh | à créer, **côté Sentropic d'abord** |
| Données métier, RLS, migrations | **toujours `self`** | jamais | — |

Trois règles non négociables, traduction de D1=B :

1. `self` doit rester fonctionnel **mesh éteint**. Une fonction déléguée tombe en échec fermé sans
   entraîner le reste.
2. OpenERP **n'importe jamais** `@sentropic/cluster-mesh`. Il ne dépend que des paquets neutres —
   `@sentropic/contracts` (contextes, contrat d'espace de noms) et `@sentropic/events`
   (`InvocationReceiptPort`) — plus les modules réutilisables qu'il monte lui-même.
3. Chaque fonction déléguée arrive avec un drapeau par défaut à 0 et une garde CI, sur le modèle de
   `check:auth-cutover`.

## 4. Les quatre coutures d'intégration

### 4.1 Confiance et échange de jetons — RFC 8693

`trust.ts` définit le profil RFC 8693 exact (`grant_type
urn:ietf:params:oauth:grant-type:token-exchange`, `subjectToken`, `audience`, `scope[]`, acteur
`{ sub, iss, h2aEngagement }` — « Opaque h2a engagement reference; cluster-mesh never interprets it »).
Un module `token-exchange.ts` et un répertoire `trust/` existent ; la capacité bascule à `available`
dès qu'une liaison d'émetteur est configurée.

OpenERP a déjà un échange de jeton machine hors standard (`/auth/exchange-agent-token`). **La
convergence est la couture la plus rentable** : en `self` OpenERP émet, en `mesh` le courtier émet et
OpenERP vérifie en serveur de ressources (`@sentropic/oauth-verify` existe dans le club). Même contrat
pour le consommateur dans les deux modes.

Effort : M. Dépendance : configuration d'une liaison d'émetteur, plus OpenERP déclaré en audience.

### 4.2 Frontière de locataire

`boundaries.ts` expose `ValidatedMembershipPort.resolveApproved({ workspaceId, userId })` → `{ tenantId,
userId, status: 'approved' }`, puis `TenantResidenceContext { tid, workspace: 'ws:sha256:…', userId,
homeNodeId }`. L'identifiant d'espace de travail ne circule que sous forme d'empreinte SHA-256.

Côté OpenERP : un intercepteur, `TenantResidenceContext` → `TenantContext { organizationId,
actorUserId }`, échec fermé si la correspondance échoue. Deux pièges :

- **Collision de nom** : `@sentropic/contracts` exporte aussi un `TenantContext`
  (`{ tenantId, workspaceId, userId, sessionId?, runId? }`), de forme différente. Import sous alias.
- **Collision de modèle** : deux niveaux côté mesh, un seul chez nous. C'est le §5.

### 4.3 Identité machine (NHI)

`nhi.ts` ne réimplémente rien : `createH2aNhiLifecycle` délègue à la ligne de commande h2a
(`h2a nhi attest | offboard | export`), « h2a remains the authority ». OpenERP dépend déjà de
`@sentropic/h2a`.

Conséquence directe : **ne pas construire de table de clés d'API dans OpenERP.** Le manque
« identifiants client machine » de l'étude Influnified
(`docs/studies/2026-10-19-influnified-services-manages-openerp.md`, §2.2, classé bloquant) se ferme par
délégation. Limite : le port est un lanceur de commandes (`CommandRunnerPort`), donc une exécution de
binaire, pas une API HTTP — insuffisant pour du multi-client managé.

### 4.4 Quittances et événements

`InvocationReceiptPort` vient de `@sentropic/events`, et le plugin le passe au module en même temps que
le contexte. Les étapes sont nommées : `transported`, `verified`, `acted`.

OpenERP a le substrat : `audit_events` en ajout seul, et `foundation/audit-emit.ts` avec le patron
`setWorkflowEvaluator` / `setWebhookEvaluator`. Un troisième port `setReceiptEmitter` a la même forme :
`self` écrit dans `audit_events` seul, `mesh` émet aussi la quittance neutre. C'est la couture à faire
en premier : elle ne dépend de rien chez Sentropic.

Effort : S.

### 4.5 Ce qui n'est pas délégable

Postgres, les politiques RLS, les migrations ; la sémantique métier (facturation, taxes, approbations,
comptabilité) ; l'Ingress et l'espace de noms Kubernetes ; le contrat OpenAPI publié. D1=B l'impose
autant que notre intérêt : « owns its domain runtime/data/secrets ».

## 5. Le besoin multi-locataire — relayé à Sentropic le 2026-10-24

### 5.1 L'écart, énoncé précisément

OpenERP a **un** niveau : `organization_id`, isolé par RLS via `app.current_organization_id`.
`tenant_settings` est clé-primaire sur `organization_id` : chez nous, « locataire » **est**
« organisation ». `user_identities` est global, hors RLS.

Le mesh en a **deux** : `tenantId` au-dessus de `workspaceId` (`@sentropic/contracts` 0.3.0, forme
inchangée depuis 0.1.1).

**Précision du 2026-10-27, à la lecture de `spec/SPEC_EVOL_DATA_ARCHITECTURE.md` sur `origin/main`** :
cette discordance est un écart du **runtime cluster mesh**, pas de l'architecture de données. Celle-ci
définit une enveloppe d'objet universel à portée **définie par la liaison** — « Sentropic binding =
`tenantId` + `workspaceId` ; **OpenERP binding = `organizationId`** — a required bare `workspaceId`
would force every external builder to fake one » — et pose que « OpenERP […] owns its OWN Postgres […]
Universality is a CONTRACT story with OpenERP, never a shared database ». Nos deux contraintes sont
donc déjà écrites chez eux. Ce qui reste ouvert est l'ancrage d'un niveau **client** au-dessus de
l'organisation pour quota et consolidation (§5.2), pas la compatibilité de notre portée.

Pour une offre managée — un client, plusieurs agences — il n'existe donc **aucun objet au-dessus de
l'organisation** : rien à quoi accrocher un quota par client, une consolidation inter-agences, ou la
facturation du service lui-même.

### 5.2 Deux chemins

| Chemin | Contenu | Coût | Appréciation |
| --- | --- | --- | --- |
| (a) Souple — un OpenERP, N clients | Table `tenants`, colonne `organizations.tenant_id`, **modification du prédicat RLS sur toutes les tables protégées** | Invasif, touche la garantie d'isolation | À ne pas engager pour les premiers clients |
| (b) Dur — un espace de noms par client | Déjà outillé : contrat de locataire poc-k8s, `tenant-provisioner` (pouvoir borné par RBAC + ValidatingAdmissionPolicy), quotas, LimitRange, NetworkPolicy par espace de noms | Un Postgres par client | **Recommandé** |

**État de la décision** : l'owner, interrogé par la session `sentropic`, n'a tranché ni (a) ni (b). Il
a recadré sur le modèle de données — voir §8. La question de l'ancrage multi-locataire **reste donc
ouverte**, et elle n'est pas résolue par le recadrage : un gestionnaire de modèle ne crée pas un niveau
au-dessus de `organization_id`.

### 5.3 État des six demandes

Enregistrées par la session `sentropic` dans
`/home/antoinefa/src/sentropic/.tmp/openerp-mesh/REQUEST-openerp.md`, Track
`01M5Q9AAEHKBGN905VMJDM6C34`. Aucun porteur désigné ; passage par une spécification Astra et une revue
indépendante avant réponse de recevabilité, après l'urgence immo #861.

**Mise à jour, fin de journée** : les corrections du §1.3 sont annexées au même fichier de demandes.
Les demandes 1 et 2 y sont ramenées à « extraire le vérificateur d'invocation dans un paquet
réutilisable, plus configuration d'audience et d'émetteur » ; 3 à 6 restent inchangées. L'owner a
demandé de suspendre toute question non-immo jusqu'à la clôture d'immo #861 : la question de tenancy
(§5.1) et la position sur le recadrage modèle de données (§8) lui sont portées juste après. Aucune
action côté Sentropic d'ici là — et aucune de ces dépendances n'est sur le chemin critique de L0, L2
et L4.

| # | Demande | État vérifié |
| --- | --- | --- |
| 1 | Projection filaire du contexte vérifié | **Déjà implémentée.** `api/src/services/cluster-mesh/invocation-verifier.ts` : enveloppe signée `sentropic.cluster-mesh.receipt/v1`, Ed25519/EdDSA avec `kid`, portant `audience`, `workspaceId`, `principalId`, `scopes[]`, `policyRevision`, `generationId`, `invocationId`, `idempotencyKey`, `nonce`, TTL ≤ 300 s, contrôle de rejeu, et le triplet d'étapes de quittance. La demande se réduit donc à : exposer ce vérificateur dans un paquet réutilisable (il est aujourd'hui sous `api/src/services/`) et déclarer OpenERP en audience. |
| 2 | Liaison RFC 8693 | Plus fermée par conception : `available` dès qu'un émetteur est configuré. Demande réduite à la configuration + audience. |
| 3 | `ValidatedMembershipPort` lié à une autorité réelle | Ouverte. |
| 4 | Cycle de vie NHI en HTTP | Ouverte. |
| 5 | Quotas et plafonds HTTP par locataire | Ouverte. Ne pas confondre avec `clusterMesh.capacity.maxConcurrent` (défaut 12, refus `capacity_exhausted`), dimensionné pour l'actionnement de sessions et de PTY ; et `CostContext` est en jetons et dépense LLM. Demande d'extension, pas d'activation. |
| 6 | Annuaire inter-serveurs | Ouverte, et c'est la seule qui conditionne un deuxième nœud. |

## 6. Comment OpenERP entre dans le club : troisième racine de composition

Deux constats ferment la voie naïve, et le second est désormais vérifié **au niveau du type** :

- `@sentropic/contracts` exporte `CLUSTER_MESH_NAMESPACES` comme tableau constant **fermé** de 29
  entrées, et `ClusterMeshNamespaceModule.namespace` est typé sur cette union. Il n'y a ni ligne
  OpenERP ni point d'extension : un trentième espace de noms ne compile pas.
- Les espaces `/business`, `/analytics`, `/workspaces`, `/documents`, `/transfers`, `/admin` sont des
  domaines du **produit Sentropic**. Monter OpenERP dans la racine produit créerait une collision
  sémantique avec nos propres facturation, projet, reporting, approbations.

La voie juste : **OpenERP est une troisième racine de composition HTTP du club**, sur le précédent
`apps/auth-idp` (« an explicit second root ») et la voie `STANDALONE` « Standalone provider host » du
schéma cible. OpenERP l'occupe déjà sans l'avoir nommée, puisqu'il monte `auth-hono` hors du plugin.

Dans notre déploiement : `sentropic.sent-tech.ca` est le nœud fournisseur (`homeNodeId`) ; `openerp-dev`
et `openerp-prod` restent des espaces de noms distincts avec leur propre Ingress. Autonomie de
déploiement préservée, délégation par contrat.

## 7. Travaux côté OpenERP, en lots

| Lot | Contenu | Dépendance externe | Effort |
| --- | --- | --- | --- |
| L0 | `mountXRoutes(app)` → `createXRouter({context, receipts}): Hono` pour les 31 gestionnaires, regroupés par les 9 domaines déjà présents dans `http/routes/`. Aucun changement de comportement ; contrat filaire caractérisé avant/après. | aucune | M, mécanique |
| L1 | Port de contexte : un intercepteur, `TenantResidenceContext` → `TenantContext`, échec fermé, alias sur le `TenantContext` de `@sentropic/contracts`. | `@sentropic/contracts` 0.3.0 | S |
| L2 | Port de quittances : `setReceiptEmitter` sur `InvocationReceiptPort`, étapes `transported`/`verified`/`acted`. | `@sentropic/events` | S |
| L3 | Convergence de `/auth/exchange-agent-token` vers RFC 8693, et vérification de l'enveloppe `sentropic.cluster-mesh.receipt/v1` en serveur de ressources. | liaison d'émetteur + audience OpenERP | M |
| L4 | Métriques et agrégation d'état (manque bloquant de l'étude Influnified). | contrat `/health` du mesh | S |

Ordre recommandé : L0, L2, L1, L4, L3. L0 est le préalable de tout et ne coûte aucune décision : il rend
les routeurs montables ailleurs sans rien déléguer. La session `sentropic` a confirmé que L0 et L2
n'entrent en conflit avec rien de leur côté.

## 8. Recadrage owner du 2026-10-24 — modèle de données, engram, SAP, Odoo

Mots de l'owner, transmis par la session `sentropic` : « Le modele de donnee devrai etre managé par
engram et basé globalement sur un standard soit sap soit odoo (si possible les deux pour gerer
l interop) ».

### 8.1 Ce qu'est engram, vérifié

`engram` n'est pas un produit tiers : c'est le module mémoire du cluster mesh,
`packages/cluster-mesh/src/engram-memory/`, identifiant de module `engram-memory`, contrat
`memory-binding-v1`, empreinte de contrat épinglée et co-signée. Sa règle d'empreinte porte encore
`graphify-memory/l3a-module-descriptor/v1` : c'est la couche mémoire Graphify, consolidée.

Sa substance : JSON canonique (JCS), chaînes de hachage (`memoryJournalChain`, `memoryZeroHash`),
profils requis `atomic-units-v1`, `immutable-chains-v1`, `immutable-boundaries-v1`, clés d'
enregistrement/enveloppe/état/outbox/capture/résultat, validation de transitions de capture et
d'admission, dorsales Postgres **et** SQLite, index lexical avec pierres tombales, et des plafonds de
travail fixes : **8 enregistrements, 1 ajout, 1 Mio par événement unitaire**.

### 8.2 Ce que cela implique, factuellement

engram est un **journal mémoire append-only, adressé par contenu, à chaînes immuables**. Ce n'est pas
un gestionnaire de schéma relationnel métier. Nos 68 tables portent de l'état métier **mutable** avec
intégrité référentielle et besoins d'agrégation : factures, paiements, taxes, approbations,
rapprochement bancaire. Les profils `immutable-chains-v1` / `immutable-boundaries-v1` et un plafond de
8 enregistrements par événement ne décrivent pas cet usage.

Où engram s'applique **réellement** chez nous, et c'est un gain : notre `audit_events` en ajout seul et
notre sortie d'événements — soit exactement le lot L2. Chaînes de hachage et quittances y sont au bon
endroit. Engram comme substrat du journal : oui. Engram comme gestionnaire du modèle métier : non
vérifiable en l'état.

### 8.3 Sur « un standard, soit SAP soit Odoo »

Deux constats à porter avant toute conception :

- **Ni SAP ni Odoo n'est un standard ouvert.** Le modèle SAP est propriétaire. Odoo Community est du
  code sous LGPLv3. Adopter la structure de données de l'un ou de l'autre est une reprise de structure
  tierce, ce que deux règles du dépôt interdisent explicitement : « Target: original MIT OpenERP
  implementation » et « Do not copy third-party code, UI text, fixtures, screenshots, **workflow
  structures**, templates, or demo data from research sources ». Une sortie MIT ne peut pas incorporer
  de structures dérivées de LGPL sans instruire la question de licence.
- **Les standards d'interopérabilité qui existent réellement** pour ce périmètre sont d'un autre
  ordre : UBL 2.x / Peppol BIS pour la facture, ISO 20022 pour les paiements et le bancaire, SAF-T pour
  l'export comptable d'audit, OAGIS pour les messages inter-ERP. Pour SAP et Odoo spécifiquement,
  l'interopérabilité passe par leurs API publiques (OData/BAPI côté SAP, XML-RPC/JSON-RPC côté Odoo).

Orientation que je propose, qui atteint le but énoncé par l'owner — l'interop avec les deux — sans
adopter le modèle interne d'aucun : **garder notre modèle, et placer les contrats d'interopérabilité
normalisés à la frontière** (UBL/Peppol en facturation, ISO 20022 au bancaire, SAF-T à l'export
comptable), la correspondance vers SAP et Odoo se faisant par leurs API publiques. Le modèle reste
nôtre, l'interop est standard, et les deux cibles sont couvertes.

Non instruit à ce stade, et à ne pas présenter comme acquis : l'applicabilité ligne à ligne d'UBL à nos
tables de facturation, et le statut de Peppol au Canada et au Québec alors que le dépôt est calibré
Canada/Québec.

### 8.4 Rétrocession de l'ontologie à engram — 2026-10-27

Instruction owner : « rétrocéder l'ontologie à engram ; elle devrait favoriser une interopérabilité
complète SAP / Odoo / OpenERP ». Faite le 2026-10-27 vers la session `gr-conductor`.

Elle tombe sur un point de décision déjà écrit chez eux : le **gel du jeu standard (DD3)** attend une
co-conception avec cette session, et exige « at least one transactional document chain (order → lines
→ invoice) », les documents ERP à invariants relationnels étant désignés comme l'endroit où
l'hypothèse des 90 % « can die ».

Charge utile produite, extraction déterministe des 43 migrations, 0 lacune de parseur : 67 entités,
62 portant `organization_id`, 60 à RLS forcée, 146 relations typées, 57 champs énumérés, 27 invariants
de niveau table. Artefacts dans `tmp/ontology/` (non versionnés) : `openerp-ontology.json`,
`RETROCESSION-openerp-ontology.md`, `export-ontology.mjs`.

**Verdict transmis, contre-intuitif** : la partie double n'est pas où l'hypothèse meurt — la balance
`sum(debit) == sum(credit)` est un commentaire de la migration 0024, pas une contrainte base, les
montants étant des instantanés `jsonb`. Ce qu'un magasin d'objets génériques perd réellement :
l'unicité de numérotation par locataire, l'intégrité référentielle portée par le locataire (unicités
composites incluant `organization_id`), et l'immutabilité des preuves imposée en base
(deux CHECK de forme jsonb plus le déclencheur `bank_transactions_immutable_evidence`).

**Frontière proposée pour engram**, inverse de l'intuition : les preuves bancaires importées,
`audit_events` et la sortie d'événements d'abord — ajout seul, immutabilité exigée, chaînage de
hachage pertinent ; la chaîne documentaire mutable reste chez nous. Nos profils d'immutabilité maison
sont exactement ce que `immutable-chains-v1` offre nativement.

**Construction d'interopérabilité à trois** : noms de types du jeu standard DD3, sémantique de
document ancrée sur UBL 2.x/Peppol, ISO 20022 et SAF-T comme seule source normative, correspondances
SAP et Odoo par leurs identifiants d'API publiques dans des adaptateurs hors du modèle. Ancrer sur le
modèle interne de SAP ou d'Odoo produirait deux adaptateurs au lieu de trois correspondances, plus une
dépendance de licence.

## 9. Risques et réserves

- **Trois capacités restent `gated`** et le mesh s'annonce `single-node`. Aucun engagement de calendrier
  ne doit reposer sur la fédération tant que l'annuaire inter-serveurs n'est pas lié.
- **Les six demandes n'ont aucun porteur** : spécification Astra et revue indépendante d'abord, après
  l'urgence immo #861. Donc L0, L2 et L4 ne doivent dépendre de rien chez Sentropic — c'est le cas.
- **`@sentropic/contracts` est en 0.3.0**, pré-1.0 : la forme de `TenantContext` peut bouger. L'alias et
  l'intercepteur unique limitent l'exposition à un fichier.
- **L'ancrage multi-locataire reste non tranché** (§5.2). Toute offre managée multi-client est bloquée
  dessus, indépendamment du modèle de données.
- **Résidence** : `tid` et `homeNodeId` croisent les gardes de résidence canadienne de poc-k8s
  (`platform/70-residency-guard.yaml`, `71-residency-guard-docstore.yaml`). Interaction non instruite.
- **Non couvert** : sémantique d'application des coûts et quotas, DPoP, et les espaces de noms `/track`
  et `/memory` que la spécification Sentropic laisse en échec fermé pour source absente.
