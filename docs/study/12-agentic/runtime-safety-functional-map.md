# Agentic Runtime Safety Functional Map

## Progress

Fait: document de Task 15 créé avec les sections obligatoires, la lecture fonctionnelle de chaque primitive de sécurité, et le mapping vers les lacunes identifiées de `@sentropic`.
À faire: validation des seuils de budget et des paramètres de supervision avec la sécurité produit et finance.
Attendu: aucune decision produit immediate; cette section sert au travail de conception Phase 3.

## Purpose

Ce document décrit comment OpenERP passe d'un runtime agentique interne à un runtime utilisable en production ERP/CRM multi-tenant. Il couvre les garde-fous fonctionnels, les contraintes d'exécution, et les points de contrôle qui permettent de relier agents, identités, marketplace, et supervision. L'objectif est de définir un profil sécuritaire sans reprendre l'expression des produits de référence.

Les primitives ci-dessous doivent rester independantes de la syntaxe d'un framework donne, et restent en OpenERP wording.
Elles servent a:

- proteger les donnees tenant et les comptes financiers;
- stabiliser la distribution de mini-modules selon la confiance;
- permettre un contrôle humain lisible;
- permettre un debug et une preuve d'audit en FR/EN.

## Primitives

### Policy Engine

- Purpose in OpenERP:
  - La Policy Engine doit évaluer chaque appel d'outil avant et après exécution, selon la règle métier tenant, le profil identitaire actif, la source de délégation, et le contexte de cycle de vie.
  - Elle applique notamment des limites d'action (montant, objet, calendrier, type de modification, niveau de risque), avec issue possible: autoriser, bloquer, demander approbation.
  - Sans cette couche, un agent autonome ou un agent de mini-module reste un executant automatique et non un composant gouverne.

- Integration with `@sentropic`:
  - `@sentropic` dispose deja d'une boucle LLM et d'un moteur d'execution d'outils, mais n'a pas de policy hook a l'interieur de cette boucle.
  - L'intégration se fait en interposant un contrôle de décision entre le planificateur d'actions et l'exécution d'outil.
  - Les traces de décision doivent être persistantes et raccordées aux journaux existants (event, audit, workflow state).

- Dependency on identity:
  - Acting-As: applique la politique du contexte utilisateur actif, typiquement pour usage conversational.
  - Service Principal: applique la politique de scopes administratifs non-humains pour tâches batch et schedules.
  - On-Behalf-Of: applique des droits derives limites et temporels quand une action externe et de plus forte importance est deleguee.
  - Les patterns suivent directement le fichier identity.

- Dependency on marketplace tier:
  - Private to tenant: politique de base tenant + policy versionnement minimal.
  - Curated partners: politique d'entrée + contrôles d'édition et de revue pour le module et son publisher.
  - Public community: regles de validation supplementaires (signatures, provenance, politique de re-evaluation periodique).
  - Les modes haute-sensibilite (facturation, close, dunning externe) doivent passer par gates plus stricts.

- FR/EN considerations:
  - Messages de rejet, motifs de refus, et codes de decision doivent exister en FR et EN.
  - Les libelles de policy visibles dans la console de supervision restent en OpenERP wording, avec libelles FR/EN pour la relecture.

### Sandboxing

- Purpose in OpenERP:
  - Le sandboxing limite les effets de bord d'un mini-module, surtout quand l'agent execute des appels reseau, du parsing, ou du code de pretraitement.
  - Il doit contenir tres concretement les ressources (temps CPU, memoire, temps reel, appels sortants), les chemins d'acces, et les actions interdites selon le tenant.
  - Sans ce niveau, un module simple avec un bug de configuration peut perturber plusieurs modules, ou sortir du tenant.

- Integration with `@sentropic`:
  - `@sentropic` offre une boucle durable, mais n'a pas de profil d'isolation a proprement parler.
  - OpenERP doit introduire une couche d'execution enveloppante ou un runtime d'isolation pour les mini-modules, en fonction du trust tier.
  - Le resultat attendu reste compatible avec la queue existante et la gestion d'event actuelle.

- Dependency on identity:
  - Acting-As: sandbox orienté objet utilisateur courant, pour actions interactives a faible risque.
  - Service Principal: sandbox par privilèges techniques definitifs, avec restrictions sur appels externes.
  - On-Behalf-Of: sandbox dynamique selon delegation (temps, scope, objet).
  - L'identite active doit toujours être conservée dans la preuve d'execution.

- Dependency on marketplace tier:
  - Private to tenant: isolation de policy + restrictions applicatives de base.
  - Curated partners: isolation process/containeur leger, egress control et allow-list reseau.
  - Public community: isolation OS/container plus stricte, revocation rapide, et re-execution safe.
  - Les modules communautaires imposent une fermeture plus forte par defaut et une sortie de fail-safe.

- FR/EN considerations:
  - Les alertes de sandbox breach et les rapports d'echec doivent être bilingues pour les admins.
  - Les raisons d'arret technique doivent rester lisibles en FR/EN dans les journaux resumés.

### MCP Interop

- Purpose in OpenERP:
  - MCP Interop fait l'integration standardisee des outils externes et du monde OpenERP.
  - Elle couvre deux voies:
    1) clients MCP: OpenERP agents appellent des serveurs MCP;
    2) serveur MCP OpenERP: les outils OpenERP sont exposés de manière contrôlée.
  - Elle permet aux mini-modules de dependre d'ecosystemes externes de facon traçable.

- Integration with `@sentropic`:
  - `@sentropic` n'expose ni client MCP ni serveur MCP aujourd'hui.
  - L'integration se fait via un adaptateur tool layer entre appels internes et discovery MCP.
  - La conversion de métadonnées d'outils, de scopes, et de contrats de retour doit rester OpenERP-specific.

- Dependency on identity:
  - Acting-As: contextes utilisateur, sessions courtes et audites.
  - Service Principal: credenciales machine et tokens technique, necessite rotation.
  - On-Behalf-Of: delegation contraint la surface MCP appellee.
  - La politique d'identite est le pivot de la confiance quand plusieurs tenants consomment des outils communs.

- Dependency on marketplace tier:
  - Private to tenant: flux MCP majoritairement internes au tenant et liste blanche interne.
  - Curated partners: règles de registration + checks de confiance et métadonnées signées.
  - Public community: registry exposure, signatures, provenance, et qualite de revocation obligatoire.

- FR/EN considerations:
  - Les noms de ressources affichés et les messages d'autorisation MCP doivent être localisés FR/EN.
  - Les schema techniques restent stablement neutres mais les libelles utilisateur restent OpenERP vocabulary FR/EN.

### GenAI Observability

- Purpose in OpenERP:
  - La GenAI Observability donne la visibilite complete du cycle agent: contexte d'entree, appel modele, appel outil, decision policy, coût, supervision, et outcome.
  - Elle alimente debug, incident response, audit, et revue de performance par famille d'agents.
  - Sans cette couche, les erreurs d'agent deviennent opacifies en production.

- Integration with `@sentropic`:
  - `@sentropic` contient déjà une base de traces par tour, ce qui constitue une base exploitable.
  - Le gap est la couche transverse: standardisation des attributs, corrélation entre policy state, budgets, et supervision.
  - L'objectif est de produire des traces OpenERP, non de copier un schema externe.

- Dependency on identity:
  - Chaque trace doit porter actor identity, execution identity, et la chaine de delegation quand applicable.
  - L'identite est un filtre de retention/audit pour finance, compliance, et relecture.

- Dependency on marketplace tier:
  - Private to tenant: observabilite complete pour admin tenant.
  - Curated partners: trace de publication, d'approbation, et de provenance.
  - Public community: rétention plus longue, masquage des données sensibles, et contrôle des exports.

- FR/EN considerations:
  - Le tableau de suivi (events, raisons, recommandations) doit être bilingue.
  - Les vues FR/EN pour le suivi des runs doivent partager les mêmes identifiants d'événements.

### Secrets And Credentials

- Purpose in OpenERP:
  - Les secrets couvrent clefs API LLM, tokens outils externes, secrets webhooks, et secrets de publication.
  - Le contrôle inclut stockage chiffré, séparation tenant, rotation, et récupération de révocation en urgence.
  - Sans cette couche, un seul compromis de runtime met en danger toutes les integrations.

- Integration with `@sentropic`:
  - Le runtime actuel gere des credentials de modele dans les services, ce qui reste une base.
  - Il manque un modele de coffre a secrets tenant et per-module, avec cycle de vie complet (mint, rotation, revoke).
  - OpenERP doit ajouter une couche de gestion securisee independante du runtime applicatif.

- Dependency on identity:
  - Acting-As: lecture de secrets user uniquement quand un chemin explicite le permet.
  - Service Principal: droits techniques encadres par scopes; rotation planifiee et incident-driven.
  - On-Behalf-Of: secret d'action borne dans temps et objet.

- Dependency on marketplace tier:
  - Private to tenant: secrets fournis/geres par tenant et par module interne.
  - Curated partners: clef publish/delegation separée, audit de publication.
  - Public community: modeles de secret minimaux et execution via tokens de courte duree.

- FR/EN considerations:
  - UI de rotation, erreurs de rotation, et pages de debug secret doivent être localisées FR/EN.
  - Les libelles sensibles doivent eviter des details de configuration qui pourraient exposer un pattern externe.

### Budgets

- Purpose in OpenERP:
  - Les Budgets couvrent limites de coût LLM, nombre de tours, taux de sortie, et impact par tenant/family d'agent.
  - Ils reduisent les risques financiers et servent de garde-fou anti-derive pour agents autonomes.
  - Ils doivent aussi regler les limites de planification et de cadence pour workloads haut volume.

- Integration with `@sentropic`:
  - `@sentropic` donne des points de mesure techniques utiles (durability, traces partielle), mais pas de gouvernance budgetaire.
  - OpenERP doit brancher les quotas sur le scheduler, la factory d'agent, et les actions de garde.

- Dependency on identity:
  - Acting-As: budgets personnels/operatifs plus legers, avec override possible sous supervision.
  - Service Principal: budget tenant-wide pour activites scheduled et event-driven.
  - On-Behalf-Of: budget derive du delegateur et des droits temporaires.

- Dependency on marketplace tier:
  - Private to tenant: budgets configurables par profil tenant.
  - Curated partners: quotas par publisher/module et tests de charge par groupe.
  - Public community: quotas stricts par package et circuit de coupe si depassement.

- FR/EN considerations:
  - Monnaie, unite, format de montant, et seuils affiches en FR/EN.
  - Les alertes de budget doivent être traduites pour support et finance.

### Human Supervision

- Purpose in OpenERP:
  - La supervision humaine assure qu'une action risquée ou un doute métier peut être bloquée, validée, ou reroutée.
  - Elle inclut approbation in-loop, escalade, canary, checkpoints deterministes, et rollback.
  - Sans ce bloc, la responsabilite client et compta devient non reconstruisible.

- Integration with `@sentropic`:
  - `@sentropic` stocke un graphe d'exécution et un historique d'états, ce qui est une base.
  - Il manque toutefois la surface explicite pour pause/resume humain, escalation queue, approbation de sortie et rollback de version mini-module.
  - Les adaptateurs OpenERP doivent traduire les résultats d'état en checkpoints business.

- Dependency on identity:
  - Acting-As: relecture quasi-continue, notamment pour actions client et CRM.
  - Service Principal: approbation de gouvernance systémique (workflow de lot, contrôle financier, canary).
  - On-Behalf-Of: validation de delegant explicite avant et apres actions critiques.

- Dependency on marketplace tier:
  - Private to tenant: forte visibilite admin et gate interne.
  - Curated partners: supervision ajoutee de publication, incidents et support.
  - Public community: supervision et canaux de reponse plus stricts, revocation rapide possible.

- FR/EN considerations:
  - Message d'approbation, formulaire de rejet, et escalade doivent exister en FR/EN.
  - Les workflows de supervision doivent utiliser les mêmes libellés de rôle et d'état en FR/EN.

## Mapping To `@sentropic` Gaps

### Missing today

- MCP client and server posture are absent; mini-modules cannot discover or expose tools through a standard interop surface.
- Policy hooks are absent at each tool invocation point.
- Multi-tenant identity primitives for non-human acting identities are not implemented.
- Marketplace publication primitives are absent (manifests, signing/provenance model, tiered registry hooks, sandbox wiring).
- Supervision connectors are absent (approval pause, escalation queue, canary control, rollback orchestration).
- Full tenant-scoped secret lifecycle management and budget governance are not in place.

### Partially present today

- LLM model routing and tool calling exist as a working runtime shell.
- Queue durability and stateful workflow orchestration exist, giving structure for future policy and supervision integration.
- Trace capture exists at chat turn level and can be extended into full GenAI observability.
- Basic HTTP route-level checks in the wider OpenERP stack offer baseline security references, but they are not inside the agent-loop enforcement path.

## Mapping To Trust Tier And Identity

| Primitive | Private To Tenant | Curated Partners | Public Community | Identity dependency |
| --- | --- | --- | --- | --- |
| Policy Engine | Tenant policy + minimal gating, low external trust requirement. | Signed publisher checks + policy lint + reinforced approval gates. | Public registry policy metadata + periodic review and rollback support. | Acting-As for simple user scoped actions; Service Principal for scheduled autonomy; On-Behalf-Of for bounded delegation. |
| Sandboxing | Process policy + limited isolation plus tenant boundaries. | Process/container layer + egress controls. | Container/OS-style isolation with emergency stop. | Service Principal identity can enforce longer-running tasks; Acting-As remains low-risk scope. |
| MCP Interop | Internal tenant MCP endpoints and internal toolset. | Curated external registration, signed descriptors, tenant allow-list. | Registry-style discovery with signature and provenance checks. | Delegation context required for any cross-user tool scope; On-Behalf-Of for elevated use. |
| GenAI Observability | Tenant-local trace retention and operator review. | Added publishing provenance and review trail for external modules. | Shared observability contract and reinforced redaction policies. | Human actor and delegated actor must be explicit in audit traces. |
| Secrets And Credentials | Tenant secret store minimum + admin-controlled rotation. | Separate publisher secret domain + revocation hooks. | Tenant-safe, revocable short-lived tokens, reinforced incident playbook. | Service Principal for background runs; Acting-As for explicit user actions; On-Behalf-Of for temporary elevation. |
| Budgets | Tenant budget defaults and per-agent limits. | Module-level caps plus partner governance. | Community package caps with auto-circuit and quarantine support. | On-Behalf-Of for temporary exceptions; Acting-As mainly for user-driven exceptions. |
| Human Supervision | Manual review for high-impact outcomes; approval-first for customer-facing actions. | Added publisher/approval controls and review windows. | Strict approval and rollback thresholds before broad tenant exposure. | Acting-As for synchronous review loops, Service Principal for unattended loops, On-Behalf-Of for delegated escalations. |

### Open points

Les règles détaillées de seuils budgétaires, de canary ratio, et de révocation cross-tenant restent `pending - to be confirmed by maintainer` pour certains cas de pilotage public/community.

## Anti-Copy Notes

Cette feuille reste rédigée en wording OpenERP et ne reprend pas de prompt, tool schema, DSL policy, template sandbox, workflow graph, MCP server naming, trace event names, demo, ni expression de catalogues.

La cible MIT impose:
- pas de copie de textes prompts outillés;
- pas de reprise de noms d'outils, de schemas de policies, de noms de ressources, ou de DSL;
- pas de copie de workflow definitions ou de schémas d'exécution provenant des références externes;
- pas de reproduction d'UI de catalogue, écran de publication, builder, ou onboarding d'un autre produit.

Les intégrations techniques restent fonctionnelles, indépendantes, et reconstruites à partir de specs OpenERP uniquement.

## OpenERP Takeaways

- `@sentropic` donne un noyau utile (LLM routing, queue durable, multi-agent orchestration, traces de base) et ne doit pas être traité comme un runtime sécuritaire fini.
- Les principaux travaux de l'etape sont:
  - brancher la policy engine entre appel d'outil et execution,
  - definir le modele de secrets tenant-first,
  - ajouter budget et supervision pour les agents autonomes,
  - activer MCP client/server avec contrôle identitaire et tiers de marketplace.
- Le contrat de design doit rester coherent avec l'identite (acting-as, service principal, on-behalf-of), avec la fonction de marketplace (private now, curated/community later), et avec les contraintes locales FR/EN.
- Les primitives sont prêtes pour la suite Phase 3 (brick fiches policy, sandbox, MCP, observability, supervision) sans engager d'implementation directe ni de copier de source externe.
