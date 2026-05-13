# Agentic MVP Addendum

## Progress

Fait: extension agentique cadrée à partir du corpus, des fiches d'agents, des design spaces runtime, et de l'audit `@sentropic`.
À faire: transformer ce périmètre en spécifications de modules après validation du MVP agentique.
Attendu: garder l'agentique comme couche d'aide opérationnelle gouvernée, pas comme remplacement des workflows ERP/CRM.

## Purpose

Cet addendum précise le périmètre agentique acceptable pour le MVP OpenERP. Il complète la recommandation MVP sans élargir le produit vers un agent builder généraliste, une marketplace publique, ou des agents autonomes à large portée.

La priorité reste business: réduire les frictions de saisie, d'analyse, de relance, de rapprochement et de synthèse dans les familles CRM, projet, facturation, comptabilité, reporting, automatisation et collaboration objet.

## MVP-Safe Agentic Capabilities

Le MVP peut inclure des capacités agentiques seulement si elles respectent quatre contraintes:

- objet métier borné: l'agent agit sur une opportunité, un projet, une facture, une écriture, un rapport, un fil de décision, ou une tâche clairement identifiée;
- résultat relisible: l'agent produit une suggestion, une ébauche, une worklist, une anomalie, une synthèse ou une demande d'approbation avant impact sensible;
- politique vérifiable: chaque appel d'outil passe par une décision tenant-aware et laisse une trace d'audit;
- supervision humaine: toute communication client, tout effet comptable, toute relance financière, et tout changement de configuration restent validables ou réversibles.

Les capacités MVP-sûres sont donc: extraction, classification, rapprochement assisté, détection d'anomalie, rédaction relue, synthèse, support à la décision, orchestration multi-outils bornée, contrôle documentaire, validation de politique, notification/escalade, et communication client supervisée.

## MVP Agent Families

Le MVP retient un sous-ensemble concret des fiches Task 10 et Task 11:

| Famille | Agent MVP | Business outcome |
| --- | --- | --- |
| CRM | CRM Lead Qualification Agent | Structurer les leads entrants et réduire le délai entre contact initial, qualification commerciale et prochaine activité. |
| CRM | CRM Customer Follow-Up Agent | Maintenir une cadence de suivi client sans laisser les prochaines actions dépendre d'une mémoire individuelle. |
| Project/Service Delivery | Project Timesheet Classification Agent | Réduire les erreurs de saisie temps, améliorer le lien projet/tâche/billable, et préparer une facturation plus fiable. |
| Project/Service Delivery | Project Status Coaching Agent | Aider le chef de projet à détecter blocages, décisions attendues et communication client nécessaire avant dérive. |
| Billing | Billing Invoice Draft Agent | Préparer les factures à partir de temps approuvé, jalons et contrats, tout en gardant une validation finance avant émission. |
| Billing | Billing Dunning Agent | Préparer des relances contextualisées et supervisées pour réduire les retards de paiement sans automatiser l'envoi sensible. |
| Accounting Operations | Accounting AR Reconciliation Agent | Proposer des correspondances AR et signaler les écarts pour accélérer les worklists finance sans poster automatiquement. |
| Accounting Operations | Accounting AP Triage Agent | Classer les factures fournisseurs entrantes, détecter les pièces manquantes et orienter la revue comptable. |
| Reporting/Automation | Reporting Summary Drafting Agent | Produire une synthèse relisible de rapports opérationnels pour dirigeants, ventes, projet et finance. |
| Object-Bound Collaboration | Collaboration Decision Summarization Agent | Transformer les fils de commentaires en décisions, responsables et prochaines actions traçables. |

Les autres fiches restent utiles comme backlog fonctionnel, mais ne sont pas nécessaires pour prouver le premier cycle valeur: lead -> projet -> temps -> facture -> rapprochement -> reporting -> décision objet.

## MVP Runtime Posture (`@sentropic` Plus MCP And Policy Hooks)

Le runtime MVP part de `@sentropic` comme base d'orchestration agentique: client LLM, tool calling typé, boucle agent persistée en queue, sessions chat, workflow state machine, streaming, et trace recording.

Deux ajouts sont obligatoires avant usage produit:

- MCP client et MCP server, afin d'exposer et consommer des outils de manière contrôlée sans enfermer OpenERP dans un format interne;
- policy hooks pré-call et post-call, afin que chaque action d'agent soit autorisée, bloquée ou escaladée selon tenant, identité, objet, module, canal, budget et niveau de risque.

Le MVP ne doit pas exposer d'exécution libre. Les outils disponibles doivent être déclarés par domaine OpenERP, reliés à des permissions métier existantes, observés dans les traces, et désactivables par tenant.

## MVP Identity Posture

Le MVP utilise trois patterns d'identité:

- Acting-As pour les assistants conversationnels dans une session utilisateur active;
- Service Principal pour les jobs planifiés ou event-driven à périmètre strictement défini;
- On-Behalf-Of pour les workflows typés nécessitant une délégation courte, auditable et révocable.

Toute exécution doit enregistrer acteur humain éventuel, agent technique, tenant, objet cible, politique évaluée, résultat, supervision et action finale. Sans ces champs, l'agent ne peut pas passer du prototype à un usage ERP/CRM maintenable.

## MVP Marketplace Posture (Internal-Governed Tenant Tier)

Le MVP est limité à un niveau **internal-governed private tier only**. Les mini-modules d'agents sont visibles et activables seulement dans le tenant, par des administrateurs ou responsables délégués, avec manifeste signé ou enregistré, version contrôlée, révocation possible, et audit d'activation.

Il n'y a pas de publication partenaire, pas de communauté publique, pas d'import libre, et pas de catalogue externe dans le MVP. Cette limite réduit les risques de licence, d'anti-copy, de sécurité, de support et de gouvernance.

## MVP Business Autonomy Posture (Self-Service Catalog First)

Le MVP retient d'abord un **self-service catalog**: découverte, sélection/activation et configuration limitée de mini-modules approuvés. Les rôles autorisés peuvent chercher, activer et paramétrer un agent dans les limites de leur scope personnel, équipe ou tenant.

L'authoring est conservé post-MVP. Les utilisateurs ne créent pas de nouveaux agents, graphes, politiques, outils, prompts, schémas ou interfaces dans le produit initial. Cette séparation garde le MVP exploitable par le métier sans ouvrir une surface de construction trop risquée.

## MVP Human Supervision Posture

La supervision MVP combine:

- approval-in-the-loop pour messages client, relances, factures, écritures, changements de configuration et actions irréversibles;
- canary mini-modules pour agents planifiés, avec fenêtres de test, seuils d'arrêt et rollback;
- typed checkpoints pour workflows agentiques: entrée, plan d'action, appel d'outil sensible, sortie proposée, décision humaine, effet final.

Chaque notification de supervision doit être bilingue FR/EN lorsque l'objet ou l'utilisateur l'exige, et doit mentionner l'objet, l'action proposée, la raison de l'escalade, le responsable attendu, et les options de validation/refus.

## Post-MVP

Post-MVP peut élargir:

- authoring assisté sous contrôle d'administrateur;
- publication partenaire curatée;
- communauté publique après primitives de registre, signature, révocation, observabilité et revue juridique;
- agents autonomes à portée plus large lorsque les politiques, budgets, traces et procédures d'incident sont éprouvés;
- intégration avancée avec vertical packs.

## Deferred

Sont explicitement différés hors MVP:

- authoring autonomy;
- partner marketplace;
- community marketplace;
- autonomous large-scope agents;
- vertical pack agents, notamment procurement, MES, WMS, payroll et manufacturing planning.

## Integration-First

Les intégrations agentiques doivent rester contractuelles et observables: outils OpenERP internes, MCP lorsque disponible, connecteurs externes gouvernés, webhooks audités et files de travail contrôlées. Le MVP ne doit pas transformer un connecteur externe en surface produit copiée.

Pour les domaines sensibles, l'intégration-first signifie: récupérer le contexte, préparer une proposition, laisser le module OpenERP décider, puis journaliser la décision et l'effet final.

## Acceptance Questions For Later Specs

- Quel objet OpenERP est modifié, proposé ou résumé par l'agent?
- Quelle identité agit: Acting-As, Service Principal ou On-Behalf-Of?
- Quelle politique autorise, bloque ou escalade l'appel?
- Quel outil est appelé et quel scope tenant lui est accordé?
- Quelle trace prouve la décision et le résultat?
- Quelle action exige validation humaine avant impact client, finance ou configuration?
- Comment le tenant désactive-t-il l'agent ou revient-il à la version précédente?
- Quel texte FR/EN est présenté à l'utilisateur et à l'auditeur?
- Quelle donnée sensible est exclue du contexte agentique?
- Quelle partie reste post-MVP ou intégration-first?

## Anti-Copy Notes

L'addendum ne reprend aucun prompt, persona, workflow definition, tool schema, eval dataset, démo, marketplace UI, agent catalog UI, agent builder UI, onboarding copy, policy DSL syntax, sandbox config, ni MCP server schema externe.

Les agents MVP doivent être spécifiés avec des noms, objets, permissions, messages, états, traces et décisions écrits pour OpenERP. Les références externes servent uniquement à comprendre les fonctions, licences, risques et primitives nécessaires.
