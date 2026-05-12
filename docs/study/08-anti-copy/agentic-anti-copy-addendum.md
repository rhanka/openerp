# Agentic Anti-Copy Addendum

## Progress

Fait: surface agentique identifiée pour les prompts, personas, outils, workflows, traces, catalogues, politiques, sandbox et runtime.
À faire: appliquer cette checklist à toute spec ou PR touchant au runtime agentique, aux mini-modules ou aux catalogues internes.
Attendu: chaque artefact agentique doit partir des specs OpenERP et non d'une expression externe copiée ou traduite.

## Purpose

Cet addendum complète le dossier anti-copy principal pour la partie agentique. Les agents exposent une surface d'expression plus large que le code: instructions, personas, catalogues d'outils, graphes d'exécution, jeux d'évaluation, traces, UI de configuration, politiques et templates de runtime.

L'objectif est de permettre une étude fonctionnelle rigoureuse tout en empêchant la reprise de formulations, structures, exemples ou interfaces propres à des projets externes.

## Agentic-Specific Expression Risks

Les risques spécifiques aux agents sont:

- instructions système, prompts, personas et garde-fous textuels;
- tool definitions, noms d'outils, paramètres, descriptions et schémas de retour;
- workflow definitions, graphes d'agent, états d'exécution, routes de reprise et transitions;
- eval datasets, golden traces, cas de test, attendus textuels et corpus de démonstration;
- marketplace UI, registry UI, agent catalog UI, configuration UI et builder UI;
- policy DSL surface syntax, exemples de règles, libellés de violation et fixtures;
- sandbox and runtime configuration templates, secrets examples, quotas, egress rules and deployment examples;
- onboarding copy, sample agents, demos, screenshots and tutorial text.

Ces éléments peuvent être étudiés comme fonctions, mais doivent être réécrits comme artefacts OpenERP originaux.

## Prompts And Personas

Les prompts et personas externes ne doivent pas être copiés, traduits, résumés de trop près, ni utilisés comme base de reformulation directe. OpenERP doit définir ses agents à partir des objets métier, des permissions, des traces et des exigences bilingues documentées dans ses propres specs.

Un prompt OpenERP acceptable doit citer le module, l'objet, l'action, le niveau de supervision, la langue attendue, les limites de données, et le format de sortie interne. Il ne doit pas reprendre le ton, la structure de rôle, les avertissements, les disclaimers, les exemples ou les formulations d'un assistant externe.

## Tool Definitions And Schemas

Les tool definitions sont une surface protégée d'expression technique: noms de tools, descriptions, paramètres, schémas de validation, erreurs, exemples d'appel et structures de retour.

OpenERP doit définir ses outils avec des noms alignés sur ses domaines métier: CRM, projet, facturation, comptabilité, reporting, collaboration objet, identité, policy et audit. Les paramètres doivent suivre les objets OpenERP et non les contrats d'une bibliothèque externe ou d'une démo.

## Workflow And Agent Graph Definitions

Les graphes d'agent, workflows, états, transitions, retry paths, branches de supervision et formats de run ne doivent pas être copiés. Les workflows OpenERP doivent être décrits depuis les événements métier: lead créé, temps approuvé, facture préparée, paiement reçu, anomalie comptable, décision projet, relance client.

Le design autorisé est fonctionnel: entrée, action proposée, outil appelé, décision de policy, checkpoint humain, sortie, effet, trace. Le nommage et la structure doivent rester propres à OpenERP.

## Eval Datasets And Golden Traces

Les eval datasets, golden traces, jeux de conversation, fixtures d'outils, attendus textuels et scénarios de démonstration externes sont exclus de la réutilisation. Même lorsque la licence semble permissive, ces artefacts contiennent une expression spécifique au produit et à son domaine.

OpenERP doit créer ses propres cas d'évaluation depuis ses specs: opportunités, projets, temps, factures, écritures, décisions objet, rapports et messages client. Les données doivent être synthétiques ou explicitement autorisées, sans reprise de jeux externes.

## Marketplace And Registry UI

Les surfaces marketplace et registry sont hautement reconnaissables: catégories, cartes, filtres, badges, onboarding, page de détail, flux d'installation, états de validation, avis, métadonnées éditeur et textes de sécurité.

Le MVP OpenERP ne contient qu'un niveau internal-governed private tier. Toute future interface de publication partenaire ou communautaire devra être conçue à partir des primitives OpenERP: tenant, scope, signature, provenance, policy, audit, révocation, version et supervision.

## Agent Catalog, Configuration, And Builder UI

Le catalogue agentique interne du MVP doit présenter des mini-modules déjà approuvés, non un constructeur généraliste. Les écrans doivent permettre découverte, activation, configuration limitée, désactivation et audit.

Il est interdit de copier agent catalog UI, configuration UI ou builder UI: libellés, microcopy, structure de formulaire, exemples, templates, diagrammes, cartes, icônes spécifiques, flow canvas et onboarding. Un builder d'agents reste post-MVP et devra avoir une spec OpenERP indépendante avant toute implémentation.

## Policy DSL Surface Syntax

Les syntaxes de policy DSL, exemples de règles, noms de fonctions, fixtures, messages de refus et conventions de test ne doivent pas être copiés. OpenERP peut étudier le rôle fonctionnel d'une policy engine: décider permit/block/escalate, tracer la décision et appliquer les contraintes tenant.

La surface produit OpenERP doit parler de règles métier, profils, scopes, objets, montants, canaux, budgets, supervision et audit, avec une expression propre. Toute réutilisation technique éventuelle d'un moteur permissif doit passer par revue de licence et attribution.

## Sandbox And Runtime Configuration Templates

Les configurations de sandbox, manifests, runtime flags, exemples d'egress, secrets examples, quotas, deployment examples, scripts de démarrage et profils de sécurité ne doivent pas être copiés.

OpenERP doit décrire les exigences: isolation par tenant, restriction réseau, durée maximale, budget, journalisation, secret handling, révocation, canary et rollback. La configuration concrète est un artefact OpenERP ou infrastructure interne, pas une reprise de template externe.

## Pre-Merge Audit Checklist

Chaque PR touchant aux agents doit répondre oui/non à ces questions avant merge:

- La PR cite-t-elle la section OpenERP source de vérité utilisée?
- Les projets externes qui ont informé la spec sont-ils listés dans la note de PR?
- Les sources GPL ou AGPL éventuelles sont-elles confirmées comme functional reference only?
- Les sources source-available ou propriétaires éventuelles sont-elles confirmées comme public benchmark only?
- Aucun prompt, persona, message système ou garde-fou externe n'a-t-il été copié ou traduit?
- Aucun tool schema, nom d'outil, paramètre, description ou exemple d'appel externe n'a-t-il été copié?
- Aucun workflow definition, agent graph, état, transition ou run format externe n'a-t-il été copié?
- Aucun eval dataset, golden trace, fixture, conversation de test ou scénario de démo externe n'a-t-il été copié?
- Aucune marketplace UI, registry UI, agent catalog UI, configuration UI ou builder UI externe n'a-t-elle été copiée?
- Aucune policy DSL syntax, règle exemple, fixture, message d'erreur ou test externe n'a-t-il été copié?
- Aucun sandbox template, manifest, runtime flag, secret example ou deployment example externe n'a-t-il été copié?
- Les chaînes FR/EN sont-elles écrites dans le wording OpenERP?
- Les noms d'agents, d'outils, d'états, de scopes et de traces sont-ils natifs aux objets OpenERP?
- La PR décrit-elle les sources externes utilisées comme étude fonctionnelle, sans inclure d'extrait protégé?
- La PR description inclut-elle une note anti-copy pour la surface agentique touchée?

## Source-Family Posture For Agentic Projects

| Source family | Agentic posture |
| --- | --- |
| MIT / BSD-like | Study allowed; direct reuse only with attribution decision and no copied product expression. |
| Apache-2.0 | Study allowed; technical reuse possible only with NOTICE, patent and attribution review. |
| LGPL / MPL / EPL | Cautious study; no direct runtime integration without explicit file-level and distribution review. |
| GPL / AGPL | Functional reference only for agent capabilities, UI concepts and runtime primitives. |
| Source-available / proprietary | Public benchmark only; no code, prompt, schema, UI, demo, trace or config reuse. |

## Anchor-Specific Notes (`@entropiq` And External Frameworks)

`@entropiq` is the user-owned runtime anchor for OpenERP and can be used as the implementation base subject to the license posture already documented in `docs/study/12-agentic/entropiq-audit.md` and `docs/study/12-agentic/license-posture.md`. The commercial restriction noted there must be resolved before treating it as ordinary MIT-compatible distribution material.

External frameworks, protocol references, policy engines, sandbox systems, observability tools and marketplaces may inform functional requirements only unless a separate technical reuse decision is recorded. OpenERP must author its own prompts, tools, schemas, traces, catalog language, policy wording, sandbox requirements and user-facing FR/EN strings.
