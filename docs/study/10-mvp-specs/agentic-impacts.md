# Agentic Impacts On MVP Specs

## Progress

Fait: impacts agentiques consolidés depuis l'addendum MVP, la carte fonctionnelle agentique, les design spaces runtime, identité, autonomie et supervision.
À faire: transformer ces impacts en exigences détaillées pendant la phase de specs produit.
Attendu: appliquer ces impacts comme contraintes transverses avant d'implémenter tout mini-module agentique.

## Purpose

Ce document relie l'extension agentique aux cinq specs MVP existantes. Il ne remplace pas les specs de module; il précise les ajustements à prévoir quand OpenERP ajoute des agents supervisés dans le périmètre MVP.

Les impacts sont transverses: permissions, identité, audit, policy hooks, supervision, typed automation, FR/EN, traces et désactivation tenant.

## Foundation, Security, And I18n

Foundation doit fournir les primitives obligatoires pour tous les agents: identités Acting-As, Service Principal et On-Behalf-Of; scopes tenant/team/personal; permissions d'activation, configuration, exécution, supervision et désactivation; audit des appels d'outils; language preference FR/EN; secret handling; budgets; revocation et rotation.

Les hooks de policy doivent être disponibles avant et après appel d'outil. Le journal d'audit doit contenir tenant, acteur humain, agent technique, mode d'identité, délégation éventuelle, objet cible, outil appelé, décision de policy, statut de supervision, résultat et horodatage.

Les affordances UI attendues sont: badge d'exécution agentique, raison de blocage, demande d'approbation, action de reprise humaine, lien vers trace et bouton de désactivation selon permission.

Pointer: `docs/study/10-mvp-specs/foundation-security-i18n.md`.

## CRM And Customer Timeline

CRM doit accepter des agents bornés aux leads, opportunités, contacts, activités et timeline client. Les impacts principaux sont lead qualification, follow-up client, contact enrichment en post-MVP prudent, rédaction de messages client relus, et synthèse d'historique.

Les permissions doivent distinguer lecture CRM, proposition de mise à jour, création d'activité, rédaction de message et envoi réel. Les agents peuvent proposer une prochaine activité, préparer une note ou suggérer une qualification, mais les changements commerciaux sensibles et les messages externes restent validés par un utilisateur autorisé.

La timeline doit afficher l'origine agentique, la validation humaine, la langue de sortie, les objets consultés et les actions acceptées/refusées.

Pointer: `docs/study/10-mvp-specs/crm-customer-timeline.md`.

## Project, Time, And Invoice Proposal

Project/time doit intégrer les agents de classification de temps, coaching de statut, alertes de marge et préparation de proposition de facture. Les ajouts attendus sont: suggestions de mapping projet/tâche/activité, détection d'incohérences billable/non-billable, résumé de statut projet, signal de marge, et liste d'éléments prêts à facturer.

Les permissions doivent séparer saisie de temps, suggestion de classification, approbation manager, préparation de facture et transfert finance. Les agents ne doivent pas approuver leur propre classification ni transformer une proposition de facture en facture sans checkpoint humain.

Les événements typed automation peuvent déclencher des runs agentiques à partir de time entry submitted, time approved, project status changed, margin threshold crossed et invoice proposal ready. Chaque run doit être audité et réversible avant impact finance.

Pointer: `docs/study/10-mvp-specs/project-time-to-invoice.md`.

## Billing And Accounting Operations

Billing/accounting doit traiter les agents comme assistants supervisés: invoice draft, dunning preparation, renewal watch, AR reconciliation, AP triage et anomaly detection. Les agents peuvent proposer des correspondances, détecter écarts, préparer messages de relance, signaler pièces manquantes et construire des worklists.

Les permissions doivent isoler proposition, revue, posting, annulation, close period et communication client. Toute action comptable irréversible, tout envoi client et toute modification de période restent sous validation humaine. Les policy hooks doivent bloquer les actions hors période, hors seuil, hors scope tenant ou hors identité autorisée.

L'audit doit conserver source document, facture, paiement, écriture, période, montant, devise, règle appliquée, décision humaine et statut final.

Pointer: `docs/study/10-mvp-specs/billing-accounting.md`.

## Reporting And Typed Automation

Reporting/automation devient la couche de déclenchement et de supervision des workflows agentiques MVP. Les typed triggers existants doivent pouvoir appeler un mini-module agentique approuvé avec contexte limité, budget, policy hook, trace et checkpoint.

Les ajouts attendus sont: agent run definition, approved agent catalog reference, tool scope, input object scope, output type, supervision rule, retry policy, budget cap, language setting et trace retention. Les actions restent typées: notification, tâche, demande d'approbation, synthèse, worklist, webhook ou export supervisé.

Les rapports doivent permettre de relire les exécutions agentiques par tenant, module, agent, objet, statut, validation humaine, coût opérationnel, blocage policy et incident de supervision.

Pointer: `docs/study/10-mvp-specs/reporting-automation.md`.

## Cross-References

- `docs/study/07-mvp/agentic-mvp-addendum.md`
- `docs/study/12-agentic/identity-design-space.md`
- `docs/study/12-agentic/business-autonomy-design-space.md`
- `docs/study/12-agentic/marketplace-design-space.md`
- `docs/study/12-agentic/runtime-safety-functional-map.md`
- `docs/study/12-agentic/human-supervision-design-space.md`
- `docs/study/08-anti-copy/agentic-anti-copy-addendum.md`

## Anti-Copy Notes

Les impacts ci-dessus sont écrits depuis les artefacts OpenERP. Ils ne reprennent aucun prompt, tool schema, workflow definition, eval dataset, trace, marketplace UI, catalog UI, builder UI, policy syntax, sandbox template ou configuration runtime externe.

Toute spec détaillée devra garder noms d'objets, permissions, états, messages FR/EN, traces et workflows dans le vocabulaire OpenERP.
