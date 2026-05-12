# Agentic Identity Delegation Design Space

## Progress

Fait: section rédigée selon Task 12, avec structure imposée, recommandations par mode, implications d'audit, et références croisées aux futurs espaces marketplace et business autonomy.
À faire: valider le mapping final avec l'équipe sécurité OpenERP avant implémentation.

## Purpose

OpenERP doit piloter des agents dans un cadre de responsabilité clair. Cette section définit le modèle d'identité de délégation qui détermine qui peut agir, sous quelles limites, et comment chaque action est attribuée. Les trois patterns servent de base à la configuration des agents selon leur mode (conversational, autonomous event-driven or scheduled, workflow-typed), aux besoins de supervision, et à la preuve d'audit.

## Three Identity Patterns

### Acting-As

Acting-As applique l'identité de la session humaine qui déclenche l'action. Les permissions sont exactement celles de la session utilisateur au moment de l'appel, complétées par les droits d'objet déjà requis par l'UI OpenERP; l'agent ne peut pas étendre ce périmètre par défaut. L'audit doit pointer d'abord sur `actor_user_id` et enregistrer l'identifiant technique de l'agent comme exécutant technique, ce qui rend la relecture opérationnelle lisible pour la finance, le pilotage projet et le support client. Le cycle de vie de ce pattern est transitoire: il démarre avec la session utilisateur active et se termine à la fermeture de la session ou à la finalisation du workflow, avec expiration automatique si le token d'UI expire. Exemple OpenERP: assistant de rédaction dans une fiche client, résumé de thread objet, ou correction de feuille de temps sur demande explicite.

### Service Principal

Service Principal crée une identité non humaine dédiée, nommée au niveau tenant, avec un périmètre explicite de scopes (modules, objets, montants, canaux, réseau cible) attribué par un administrateur. L'audit est attribué au principal lui-même, et doit inclure la politique de droits activée afin que l'exécution soit imputable même sans utilisateur en ligne. Le cycle de vie est long: provisionnement administrateur, activation, rotation de secret, révocation par politique tenant, puis purge des sessions actives associées. Exemple OpenERP: rappel de relance Dunning nocturne, scan d'anomalies de journal comptable, ou génération planifiée de worklist de rapprochement.

### On-Behalf-Of

On-Behalf-Of permet à un utilisateur autorisé de déléguer une sous-partie de ses droits à un agent via un jeton borné dans le temps, borné par objet/scope et par action. Les permissions héritées sont réduites au besoin métier (pas de rôle complet, pas d'élargissement implicite), et la chaîne de responsabilité doit rester visible: `delegator -> agent -> executed_action`. L'audit doit stocker le `delegated_by`, le `delegation_id`, et le périmètre effectif utilisé, afin que la relecture puisse distinguer l'initiateur et le rôle technique. Le cycle couvre émission contrôlée, usage, renouvellement explicite si nécessaire, et révocation précoce possible. Exemple OpenERP: gestionnaire de compte qui valide une action de relance client pour un commercial donné, ou module partenaire mini-module actif sur un périmètre client ciblé.

## Recommendations By Agent Mode

### Conversational

Par défaut: **Acting-As**. Le mode conversationnel repose sur un utilisateur actif et doit être intuitif pour la correction en direct, ce qui garde la traçabilité simple et la responsabilité humaine frontale. En seconde option, **On-Behalf-Of** est recommandé pour les actions nécessitant un périmètre élargi de manière contrôlée (par exemple création de documents financiers depuis une vue partagée), avec approbation explicite avant déclenchement. Le design OpenERP n'utilise pas de mode sans session active pour des messages client sans validation visible.

### Autonomous Event-Driven Or Scheduled

Par défaut: **Service Principal**. Ce mode doit pouvoir fonctionner sans session humaine en continu, sur planification ou événements métier, avec des limites strictes et des fenêtres de gouvernance définies par policy. L'exemple type est l'exécution batch, la détection d'événements critiques ou la préparation automatique de rappels. **On-Behalf-Of** peut être utilisé pour délégations ponctuelles à forte sensibilité objet, mais il doit rester limité par durée courte et audit renforcé.

### Workflow-Typed

Par défaut: **On-Behalf-Of**. Le mode workflow-typed lie un acteur d'origine (propriétaire du flux, équipe, ou admin) à une exécution répétable, et la délégation explicite est la méthode la plus robuste pour attribuer clairement la responsabilité. **Acting-As** est possible quand le déclenchement est strictement dans la session qui a lancé le flux, et **Service Principal** reste la variante minimale lorsque le workflow est purement interne au tenant sans décision de personne. Dans les trois cas, la sortie doit être liée à un checkpoint d'audit déterministe.

## Audit Implications

L'audit doit enregistrer pour chaque exécution: mode, identité active, identifiant de délégation éventuelle, droits résolus, politique évaluée, décisions de blocage/approbation, et identifiant de l'action business. Sans ces champs, la responsabilité opérationnelle n'est pas reconstruisible lors d'un contrôle interne, d'un incident de sécurité, d'une réclamation client, ou d'un post mortem de supervision. Pour les trois patterns, l'artefact d'exécution doit conserver un horodatage immutable, l'identifiant du tenant, le sujet final modifié, et l'état de supervision (validé, escaladé, annulé). Les rapports d'audit OpenERP doivent montrer si une action était humaine par défaut (Acting-As), non-humaine structurée (Service Principal), ou déléguée (On-Behalf-Of).

## Revocation And Rotation

Pour Acting-As, la révocation suit le cycle session: expiration de session, retrait de droits utilisateur, déconnexion des appareils et invalidation des refresh tokens si nécessaire. Pour Service Principal, les secrets doivent être renouvelés selon une cadence tenant par tenant, avec fenêtre de chevauchement courte pendant le basculement et journalisation des clés remplacées. Pour On-Behalf-Of, les jetons doivent être de courte durée, à durée finie, et révoqués immédiatement sur changement de rôle ou incident. En cas de compromission d'identité, la priorité est: pause d'exécution, purge des runs en attente, révocation ciblée, rotation des secrets, puis ré-enregistrement des droits. Si un doute subsiste sur le périmètre de l'exécution, l'état passe à `blocked` jusqu'à validation manuelle.

## Cross-References To Section 8 (Marketplace) And Section 10 (Business Autonomy)

- Section 8 (Marketplace): [`docs/study/12-agentic/marketplace-design-space.md`](marketplace-design-space.md).
- Section 10 (Business Autonomy): [`docs/study/12-agentic/business-autonomy-design-space.md`](business-autonomy-design-space.md).

Le choix de pattern d'identité conditionne le profil de confiance des mini-modules, la révision par marché tiers, les surfaces d'installation par rôle, et les droits d'activation par rôle/scope dans les futures couches autonomie.

## Anti-Copy Notes

Ce document reste OpenERP original. Il décrit des principes fonctionnels et des contrôles d'identité sans reproduire prompts, schémas, workflows, datasets d'évaluation, démos, interfaces, policy DSL, sandbox config, ou noms de serveurs MCP externes. Les références externes ne servent qu'à la cartographie fonctionnelle et ne sont pas portées en expression utilisable.

## OpenERP Takeaways

Les trois patterns ne sont pas interchangeables: ils répondent à des besoins différents selon la présence d'une session active, le niveau de contrôle par tenant, et la preuve d'imputabilité demandée. Acting-As convient aux interactions humaines assistées; Service Principal répond aux exécutions autonomes à cadence forte; On-Behalf-Of couvre la majorité des exécutions de flux nécessitant une trace de délégation claire. Avec ces règles, OpenERP peut conserver sa priorité business tout en introduisant des agents sûrs, audités, et opérables dans l'horizon de l'étude MIT cible.
