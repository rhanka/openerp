# Agentic Patterns Library

## Progress

Fait: Task 6 section 6 du plan lancée et rédigée avec les 12 patterns demandés, les mappings vers les familles MVP, et les classes de mode d'agent.
À faire: réutiliser cette bibliothèque dans les fiches par cas métier (Task 7 et suivantes) et vérifier la cohérence de périmètre avec les axes d'autonomie.
Attendu: aucune décision de produit, ce fichier sert de vocabulaire opérationnel pour les artefacts de la phase 2.

## Purpose

Le document définit une bibliothèque de motifs réutilisables pour OpenERP. Chaque motif transforme une tâche métier récurrente en bloc d'opportunité: moins d'écart de saisie, moins d'erreurs, meilleur contrôle opérationnel.  
Il s'agit d'une écriture indépendante OpenERP, centrée sur la manière dont un agent agit dans un flux ERP/CRM réel: objets, politiques, supervision, et audit.

## Patterns

### Extraction

- business outcome: réduire la saisie manuelle répétitive, accélérer la préparation de dossiers de vente, de projet et de finance.
- typical input: courriers clients, pièces jointes PDF, formulaires partiels, historiques de message, logs métier, données de plateformes externes.
- typical output: objets OpenERP normalisés (contacts, opportunité, dépense, ligne d'échéance, pièce comptable), avec métadonnées de qualité et de confiance.
- typical tools required: connecteurs d'entrée objets (CRM, projet, facturation, accounting, collaboration), parser documentaire, recherche textuelle, mapping de champs, validation de schéma interne.
- supervision posture: workflow-typed pour les flux réguliers d'ingestion; confirmation humaine pour les mappings ambiguës ou sensibles fiscalement/financièrement.
- anti-copy risk: éviter la reprise de structures de champs ou de règles d'extraction issues de références externes; reformuler toute logique d'extraction en conventions OpenERP et tracer les décisions de mapping.

### Classification

- business outcome: orienter vite les éléments entrants vers le bon objet, le bon responsable, et la bonne file opérationnelle.
- typical input: interactions clients, demandes de support, documents fournisseurs, transactions et écarts comptables.
- typical output: étiquettes de classe métier, destination de workflow, priorité opérationnelle, et proposition de propriété responsable.
- typical tools required: recherche multi-objets, index de taxonomie, règles métier de base, service de décision légère, registre d'historique.
- supervision posture: conversational quand une classification ambiguë est présentée; autonome pour classes claires avec seuils explicites; workflow-typed pour la distribution de tâches récurrentes.
- anti-copy risk: ne pas reproduire les taxonomies externes de catégories; générer des classes et libellés propres au modèle OpenERP et documenter les révisions.

### Reconciliation

- business outcome: fermer proprement le cycle AR/AP en associant paiements, écritures et documents de façon constante.
- typical input: paiement reçu, facture émise, entrée de journal, mouvement de règlement, avoir, écritures de lot.
- typical output: suggestion de rapprochement, statut de correspondance, points de divergence, et actions de correction préconisées.
- typical tools required: lecture comptable, moteur de matching transactionnel, règles de montant/date/référence, moteur de simulation d'appariement, journaux d'audit.
- supervision posture: workflow-typed avec checkpoints; verrouillage automatique des écarts critiques et relance humaine obligatoire pour inversion d'écritures.
- anti-copy risk: ne pas copier flux de rapprochement ni états d'écarts textuellement; récrire les étapes et seuils de rapprochement selon les conventions comptables OpenERP.

### Anomaly Detection

- business outcome: prévenir les dérives opérationnelles tôt (doublons, délais anormaux, écarts de marge, événements inhabituels).
- typical input: séries temporelles de temps facturé, alertes de paiement, taux d'activité projet, incidents de qualité de données.
- typical output: signal d'anomalie priorisé, contexte de déclencheur, piste d'investigation, impact potentiel et proposition d'action.
- typical tools required: moteur d'analyse de métriques, alerting, accès au coffre de règles métier, historique de comportement par objet, outil de tâche corrective.
- supervision posture: autonome en continu avec seuils tenant; escalade immédiate en cas de risque financier ou réglementaire.
- anti-copy risk: éviter la reproduction de signatures de détection propres à des produits tiers; priorités et règles doivent être issues de la grammaire OpenERP et validées par domaine métier.

### Drafting

- business outcome: produire rapidement des ébauches exploitables pour emails, notes client, compte-rendus, drafts de communication interne.
- typical input: contexte objet, attentes métier, contraintes de ton/forme, historique récent, éléments à inclure.
- typical output: version brouillon prête à relire, version enrichie, liste de vérification des pièces manquantes.
- typical tools required: moteur de génération, lecture objets liés (opportunité, projet, facture, tâche), templates internes, dictionnaire FR/EN de marqueur.
- supervision posture: conversationnel par défaut pour validation finale; workflow-typed lorsque l'ébauche est générée dans un processus contractuel.
- anti-copy risk: interdiction de copier formulations de fournisseurs; chaque brouillon doit partir d'un modèle OpenERP et rester sans référence à des exemples externes.

### Summarization

- business outcome: rendre les informations complexes actionnables pour équipes internes et clients via des résumés courts, fiables et traçables.
- typical input: fil de discussion, notes de projet, changelog de tâche, rapports hebdomadaires.
- typical output: synthèse par objet, décisions prises, blocage éventuel, prochaine action, liste d'éléments vérifiés.
- typical tools required: accès lecture à l'historique objet, agrégateur de notes, extraction d'entités métier, formatage FR/EN.
- supervision posture: conversationnel pour compte-rendu humain; workflow-typed pour rapports récurrents automatisés avec validation du superviseur.
- anti-copy risk: ne pas reformater directement la voix rédactionnelle d'un autre produit; résumé produit à partir de faits, pas d'un style emprunté.

### Decision Support

- business outcome: améliorer la qualité des arbitrages opérationnels sur relances, priorités, allocations, et actions commerciales.
- typical input: options métier contradictoires, contraintes budgétaires, délais client, règles d'acceptation et charges disponibles.
- typical output: recommandation structurée, justification, risques, alternatives possibles et proposition de prochaine action.
- typical tools required: règles de calcul, comparateurs de scénario, contexte financier, données de charge projet, moteur de politique tenant.
- supervision posture: conversationnel pour décision finale, autonome possible pour pré-ciblage, workflow-typed pour arbitrages dans des chaînes automatisées.
- anti-copy risk: éviter d'importer structures de recommandation propriétaires; reconstruire les matrices de décision autour des priorités OpenERP et des signaux métier internes.

### Multi-Tool Orchestration

- business outcome: coordonner des actions distribuées sans perdre la cohérence entre CRM, facturation, service et reporting.
- typical input: demande utilisateur complexe ou événement métier avec dépendances entre modules.
- typical output: plan d'exécution multi-outils, ordre des appels, journal des dépendances, résultat global cohérent.
- typical tools required: orchestrateur de tâches, bus d'événements, connecteurs objets OpenERP, outils de verrouillage de transaction, suivi d'état.
- supervision posture: workflow-typed avec points d'arrêt définis; autonomie séquencée si toutes les décisions préalables sont prédéfinies par politique.
- anti-copy risk: ne pas dupliquer visuellement ou logiquement une architecture d'orchestration externe; réécrire les états d'exécution en interne et conserver des API d'appel OpenERP propres.

### Document QA

- business outcome: réduire les erreurs de publication, de conformité documentaire et de communication externe avant envoi.
- typical input: draft de contrat, facture, note, pièce justificative, document pour le client ou contrôle interne.
- typical output: rapport de qualité documentaire, anomalies détectées, points à corriger, statut "prêt pour envoi" quand applicable.
- typical tools required: contrôleur de template, vérificateur de champs requis, vérificateur de pièces jointes, service FR/EN, moteur de règles de conformité interne.
- supervision posture: workflow-typed dans les points de publication, conversationnel pour revue humaine sur les cas à impact juridique.
- anti-copy risk: ne pas reprendre contrôles de qualité et phrases d'erreur d'une solution concurrente; définir une matrice de contrôle OpenERP propre.

### Compliance Validation

- business outcome: garantir qu'une action demeure conforme aux politiques internes, au périmètre tenant, et aux contraintes de supervision avant exécution.
- typical input: action demandée, identité d'exécutant, contexte objet, politique active, horodatage d'événement.
- typical output: décision d'autorisation, blocage motivé, escalade, journal de conformité.
- typical tools required: moteur de politique, registre d'identités, moteur de budget/règles, journal d'audit, hooks de supervision.
- supervision posture: hybride: workflow-typed pour chemins standards, autonome avec garde-fous pour déclenchements planifiés.
- anti-copy risk: éviter de copier matrices de gouvernance, libellés de violation, ou enchaînements de contrôle d'une source externe; la gouvernance OpenERP doit rester autonome.

### Notification And Escalation

- business outcome: informer immédiatement les équipes concernées et faire remonter les cas qui dépassent le seuil de risque ou d'urgence.
- typical input: événements déclencheurs, état d'avancement agent, seuils métier, règles d'escalade.
- typical output: notification contextualisée, fil d'escalade, tâches d'attente de validation, preuve de réception/lecture.
- typical tools required: moteur de notification, file d'attente d'événements, règles de destinataires, canaux email/app, journal d'escalade.
- supervision posture: autonome pour envoi de premier niveau; validation humaine obligatoire pour escalade critique, reprise en workflow pour actions non conformes.
- anti-copy risk: écrire ses propres textes de notification et chaînes d'escalade; ne pas adopter scripts de suivi de ticket d'une autre plateforme.

### Customer Communication

- business outcome: maintenir un échange cohérent FR/EN avec le client sur statut, délais, demandes et décisions.
- typical input: changements d'état projet/facturation, événements support, demandes de clarification, documents attendus.
- typical output: message client prêt à envoyer, historique d'échange structuré, actions recommandées pour la suite.
- typical tools required: objets CRM/projet/facturation, moteur de traduction interne, gabarits OpenERP, service de canal de messagerie.
- supervision posture: conversational pour la rédaction finale, workflow-typed pour notifications de base, autonome sur rappels programmés.
- anti-copy risk: éviter de répliquer scripts de relance et ton de marque externe; construire les parcours de communication à partir de règles OpenERP et du cadre FR/EN.

## Pattern To MVP Family Mapping

| Pattern | Mapping to MVP Families |
| --- | --- |
| Extraction | CRM, object-bound collaboration, reporting and automation |
| Classification | CRM, project and service delivery, object-bound collaboration |
| Reconciliation | billing, accounting operations |
| Anomaly Detection | accounting operations, reporting and automation, billing |
| Drafting | billing, project and service delivery, object-bound collaboration |
| Summarization | CRM, reporting and automation, project and service delivery |
| Decision Support | CRM, project and service delivery, billing |
| Multi-Tool Orchestration | object-bound collaboration, reporting and automation, billing, accounting operations |
| Document QA | billing, accounting operations, project and service delivery |
| Compliance Validation | accounting operations, billing, project and service delivery |
| Notification And Escalation | CRM, project and service delivery, object-bound collaboration |
| Customer Communication | CRM, project and service delivery, billing |

## Pattern To Agent Mode

| Pattern | Principal Agent Mode |
| --- | --- |
| Extraction | conversational + workflow-typed |
| Classification | conversational + workflow-typed |
| Reconciliation | workflow-typed |
| Anomaly Detection | autonomous + workflow-typed |
| Drafting | conversational |
| Summarization | conversational + workflow-typed |
| Decision Support | conversational + workflow-typed |
| Multi-Tool Orchestration | workflow-typed + autonomous |
| Document QA | workflow-typed + conversational |
| Compliance Validation | workflow-typed + autonomous |
| Notification And Escalation | autonomous + conversational |
| Customer Communication | conversational + workflow-typed |

## Anti-Copy Notes

- Ce document utilise une reformulation originale OpenERP pour chaque motif.  
- Aucune grammaire de workflow, taxonomie de classes, ni structure de sortie n'est copié depuis un produit tiers.  
- Les éléments de politique, de seuils, de messages et de rôles sont des décisions OpenERP, fondées sur la littérature de marché et les sources de l'étude uniquement.  
- Les prompts et les exemples opérationnels restent internes à OpenERP; les références externes ne servent qu'à la cartographie fonctionnelle.  

## OpenERP Takeaways

- Les motifs adaptés au MVP sont Extraction, Classification, Reconciliation, Compliance Validation, et Notification And Escalation.
- Les premiers gains viennent de patterns orientés flux récurrents (facturation, encaissement, support projet), avec validation humaine aux points de bascule.
- Un pattern ne prend de la valeur que lorsqu'il est relié à une politique explicite et à une trajectoire d'escalade claire.
- Les familles CRM et reporting and automation partagent de nombreux patterns transverses; les familles accounting operations et billing exigent une garde-fou stricte des règles.
- La combinaison recommandée pour la phase actuelle reste: conversationnel pour toutes les actions clientes, workflow-typed pour les processus métier fermés, autonome pour alertes et surveillance continue.
