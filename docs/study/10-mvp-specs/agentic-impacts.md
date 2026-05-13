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

## Enrichment 2026-05-12

Cette passe d'enrichissement consolide les décisions agentiques transverses qui contraignent les 5 specs MVP (foundation, CRM, project, billing, reporting). Elle remplace la couche `Functional Depth` standard par une `Functional Surface` agentique, ajoute un benchmark cross-framework pour situer `@entropiq` dans le paysage, et matérialise les choix techniques transverses encore ouverts en un registre de décision destiné au decision-pack programme. La spec garde sa nature d'addendum: elle ne décrit pas un module MVP mais les invariants techniques qui doivent être pris en compte par chaque domaine.

### Functional Surface

Le MVP agentique OpenERP repose sur six capabilities transverses dérivées de la `runtime-safety-functional-map`. Chacune doit être pensée comme une contrainte sur les 5 specs avant codage.

- Tool execution (Required MVP): boucle d'appel d'outil typed avec contexte tenant, identité acteur et politique évaluée. Touche foundation (typed registry + audit), CRM (lecture/écriture lead, draft message), project (mapping time entry, suggestion classification), billing (lecture journal, draft réconciliation), reporting (déclenchement et binding aux typed triggers).
- Sandbox isolation (Stretch MVP, Required public/curated tier post-MVP): périmètre d'exécution borné pour mini-modules tiers. Touche foundation (loader + manifest); les 4 autres specs n'exposent au MVP que des agents internes signés où isolation niveau process suffit.
- Policy gating (Required MVP): décision pre-call et post-call alignée sur tenant, identité, scope, montant, fenêtre. Touche foundation (point d'application + journal de décision), CRM (gate envoi externe + qualif sensible), project (gate approbation + transfert finance), billing (gate posting + close + dunning externe), reporting (gate activation typed trigger + budget).
- Observability traces (Required MVP): trace par tour, par tool call, par décision policy, par décision humaine, exportable OTel. Touche foundation (event log central + corrélation), CRM/project/billing (vue exécutions par objet métier), reporting (relecture par agent et incident de supervision).
- Identity delegation (Required MVP): patterns Acting-As, Service Principal, On-Behalf-Of obligatoires en parallèle au MVP. Touche foundation (provisioning et rotation), CRM (Acting-As pour assistant conversationnel), project/billing (Service Principal pour batches nocturnes), reporting (On-Behalf-Of pour typed triggers délégués).
- Human supervision (Required MVP): approval-in-the-loop pour conversationnel, escalation queue pour autonome, typed checkpoints pour workflow-typed. Touche foundation (état d'approbation + notifications FR/EN), les 4 autres specs comme consommateurs de la primitive selon le mode dominant du module.

Capabilities post-MVP explicitement reportées: canary deployment pour mini-modules, rollback automatique policy version, marketplace publication primitives (signing, provenance, registry public), agent authoring (no-code builder pour business users).

### Cross-Framework Benchmark

Comparatif fonctionnel des frameworks référencés en `startups-deep-research.md` vs `@entropiq` (base agent runtime du projet, MIT interne sous évaluation cf. `license-posture.md`). Les frameworks externes sont en `cautious inspiration` ou `functional reference only` selon licence; aucun code, prompt, tool schema ou workflow definition n'est repris.

| Capability | @entropiq (current) | LangGraph | CrewAI | AutoGen | Posture MVP |
| --- | --- | --- | --- | --- | --- |
| Agent runtime (loop + state) | Présent (queue durable, états explicites) | Présent (state graph, MIT core) | Présent (crew/task, MIT) | Présent (conversation, MIT) | Required @entropiq, gap zero |
| Tool registry typed | Présent (internal TS, pas de discovery) | Présent | Présent | Présent | Required @entropiq, OK |
| MCP support (client + serveur) | Absent | Adapter présent | Adapter présent | Adapter présent | Gap à combler @entropiq (client puis serveur) |
| Policy hooks pre/post call | Absent | Absent (deferred to host) | Absent | Absent | Gap à combler @entropiq (différenciation OpenERP) |
| Sandbox integration | Absent | Absent | Absent | Absent | Gap à combler @entropiq (via couche externe E2B/gvisor/isolated-vm) |
| Observability hooks | Trace par tour, base existante | LangSmith natif (BSL hosted) | Native limitée | Native limitée | Required @entropiq, à étendre OTel via OpenInference/OpenLLMetry |
| Supervision API (pause/resume/approve) | Structure d'état, surface explicite absente | Interrupt/checkpoint présent | Limité | Limité | Gap à combler @entropiq (typed checkpoints OpenERP) |
| Multi-agent orchestration | Présent (task-graph) | Présent (graph) | Présent (crew) | Présent (conversation) | Required @entropiq, OK pour MVP (mono-agent par defaut) |

Lecture clé: `@entropiq` a le noyau (runtime + tool + multi-agent + traces base), les gaps sont MCP, policy, sandbox, supervision API. Les frameworks externes ne sont supérieurs sur aucune capability stratégique sauf adapter MCP déjà cablé (à reconstruire OpenERP-native). Skip explicite: pas de reuse code framework externe, contribution upstream MCP éventuelle uniquement.

### Tech Layer Options

Huit décisions techniques agentiques transverses qui contraignent l'implémentation des 5 specs MVP. Chaque option garde dépendance explicite vers les specs concernées.

1. Sandbox runtime
   - Contexte: aucun sandbox dans `@entropiq` aujourd'hui; les mini-modules MVP sont internes et signés, mais l'isolation reste nécessaire pour limiter blast radius et préparer trust tiers ultérieurs.
   - Options: (a) E2B cloud sandbox (Apache-2.0, self-hosting evidence pending); (b) gVisor self-host (Apache-2.0, OCI compatible, lourd ops); (c) Modal cloud (proprietary platform, exclu pour self-host); (d) isolated-vm in-process (ISC, lightweight, fit TS natif `@entropiq`); (e) hybride isolated-vm pour interne + gVisor pour tiers tiers post-MVP.
   - Reco: option (e) hybride. MVP démarre sur isolated-vm pour mini-modules privés tenant signés; gVisor cible explicite pour la roadmap curated/public.
   - Dépendances: foundation (loader + manifest), billing/project (modules sensibles doivent rester internes au MVP).

2. Policy engine
   - Contexte: `@entropiq` n'a aucun policy hook; OpenERP doit gater chaque tool call avant et après exécution.
   - Options: (a) OPA Rego DSL externe (Apache-2.0, sidecar mature); (b) Cedar entity-based (Apache-2.0, Rust, formal verification, intégration TS via service); (c) Casbin multi-model (Apache-2.0, biblio JS native); (d) native TS code OpenERP (zero DSL externe, vocabulaire ERP direct).
   - Reco: option (d) native TS au MVP pour vitesse + alignement vocabulaire OpenERP, avec abstraction `PolicyDecisionPoint` permettant de basculer vers Cedar ou OPA post-MVP si la complexité de règles explose.
   - Dépendances: foundation (point d'application + audit), billing (gates posting/close), CRM (gate envoi externe).

3. Observability backend
   - Contexte: traces base présentes `@entropiq`, mais corrélation policy/budget/supervision absente; OpenERP doit rester portable.
   - Options: (a) Langfuse self-host (MIT open-core); (b) Helicone proxy (Apache-2.0, capture transport); (c) Phoenix Arize (Elastic-2.0, functional reference only); (d) OpenInference conventions (Apache-2.0, OTel-native); (e) Traceloop OpenLLMetry SDK (Apache-2.0, OTel-native).
   - Reco: combinaison (d)+(e). Convention OpenInference pour semantic + SDK OpenLLMetry pour emission OTel; backend Langfuse self-host en option opérateur, sans dépendance OpenERP sur Langfuse.
   - Dépendances: foundation (event log central), reporting (vues de relecture agent).

4. Agent identity
   - Contexte: `@entropiq` lie sessions à humains via passkey, pas de service principal ni d'on-behalf-of.
   - Options: (a) SPIFFE/SVID (workload identity standard, lourd ops); (b) JWT signé avec delegation chain claim (léger, OpenERP-native); (c) OIDC subject claim avec `acting_for` extension (réutilise IdP existant tenant).
   - Reco: option (b) JWT signé OpenERP-native pour MVP, schéma de claims documenté (`tenant_id`, `agent_id`, `acting_as`, `acting_for`, `delegation_id`, `scope`, `exp`). Évolution post-MVP vers SPIFFE possible pour workloads multi-cluster.
   - Dépendances: foundation (provisioning + rotation), toutes specs (audit attribution).

5. MCP registry
   - Contexte: `@entropiq` absent côté MCP client et serveur; OpenERP doit décider tôt comment exposer ses outils ERP et consommer outils externes.
   - Options: (a) registry interne native OpenERP (table + service, contrôle total tenant); (b) registry public Anthropic/MCP officiel (Apache-2.0, discovery cross-vendor); (c) hybride registry interne + miroir vers public optionnel.
   - Reco: option (a) registry interne native au MVP, scope tenant-privé. Pas d'exposition publique avant signing + provenance + revocation + sandbox tier en place (post-MVP).
   - Dépendances: foundation (catalog), reporting (binding typed triggers vers tools approuvés).

6. Supervision UI
   - Contexte: pas de surface explicite pause/resume/approve dans `@entropiq`; supervision est Required MVP.
   - Options: (a) approval inline dans flow utilisateur (banner dans la fiche concernée); (b) panneau séparé `/supervision` centralisé; (c) les deux, avec source de vérité unique.
   - Reco: option (c). Approval inline pour conversationnel (rapide), panneau `/supervision` central pour autonome + workflow-typed + audit. Notifications FR/EN dès le MVP.
   - Dépendances: foundation (état + notifications), CRM (banner dans lead/contact), billing (banner dans invoice draft + panel pour close), project (panel pour transfert finance).

7. Sandbox snapshot/restore
   - Contexte: rollback d'agent post-exécution serait utile mais coûte cher en complexité.
   - Options: (a) snapshot/restore au MVP via sandbox tier (lourd); (b) report post-MVP avec rollback business niveau objet uniquement; (c) checkpoint sélectif (juste avant action irréversible).
   - Reco: option (b) au MVP. Le rollback est niveau objet métier (annule la facture brouillon, annule la suggestion), pas niveau process sandbox. Snapshot/restore vrai sandbox reporté en post-MVP avec marketplace tiers.
   - Dépendances: billing (annulation invoice draft), project (revert classification suggestion).

8. Audit MCP calls
   - Contexte: chaque appel MCP doit être audité; question d'organisation du log.
   - Options: (a) audit MCP dans audit log foundation unifié (un seul flux); (b) audit MCP séparé dédié agent avec corrélation via `correlation_id` au log central.
   - Reco: option (a) audit unifié foundation au MVP, avec champ `source` distinguant `human`, `agent`, `system`. Évite duplication, simplifie reporting.
   - Dépendances: foundation (event schema), reporting (filtres agent vs humain).

### Decision Register

Registre des décisions ouvertes au format YAML-like. Statut: `proposed` = reco présentée à confirmer; `pending-program` = remontée decision-pack programme; `pending-maintainer` = info technique manquante.

```yaml
- id: AGT-D-01
  topic: sandbox-runtime
  decision: hybride isolated-vm (MVP interne) + gVisor (roadmap tiers)
  status: proposed
  owner: foundation-spec
  blocks: [billing-spec, project-spec]

- id: AGT-D-02
  topic: policy-engine
  decision: native TS OpenERP avec abstraction PolicyDecisionPoint
  status: proposed
  owner: foundation-spec
  blocks: [billing-spec, crm-spec, reporting-spec]

- id: AGT-D-03
  topic: observability-backend
  decision: OpenInference conventions + OpenLLMetry SDK + Langfuse self-host optionnel
  status: proposed
  owner: foundation-spec
  blocks: [reporting-spec]

- id: AGT-D-04
  topic: agent-identity
  decision: JWT signé OpenERP-native avec claims tenant_id/agent_id/acting_as/acting_for/delegation_id/scope/exp
  status: proposed
  owner: foundation-spec
  blocks: [all-specs]

- id: AGT-D-05
  topic: mcp-registry
  decision: registry interne native OpenERP, tenant-privé au MVP, pas d'expo publique avant post-MVP
  status: proposed
  owner: foundation-spec
  blocks: [reporting-spec]

- id: AGT-D-06
  topic: supervision-ui
  decision: hybride inline (conversationnel) + panneau /supervision central (autonome + workflow-typed)
  status: proposed
  owner: foundation-spec
  blocks: [crm-spec, billing-spec, project-spec]

- id: AGT-D-07
  topic: sandbox-snapshot-restore
  decision: rollback niveau objet métier au MVP; snapshot sandbox post-MVP
  status: proposed
  owner: foundation-spec
  blocks: [billing-spec, project-spec]

- id: AGT-D-08
  topic: audit-mcp-calls
  decision: audit unifié foundation avec champ source [human|agent|system]
  status: proposed
  owner: foundation-spec
  blocks: [reporting-spec]

- id: AGT-D-09
  topic: approval-threshold-default
  decision: hybride par rôle (default) + override par tool (escalation rule) + override par tenant policy
  status: pending-program
  owner: program-decision-pack
  blocks: [billing-spec, crm-spec, project-spec]

- id: AGT-D-10
  topic: rate-limit-agent
  decision: triplet [par tenant (budget global), par user (Acting-As), par agent definition (Service Principal)]
  status: pending-program
  owner: program-decision-pack
  blocks: [foundation-spec, reporting-spec]

- id: AGT-D-11
  topic: bilingual-supervision-notification
  decision: FR-CA prioritaire dès MVP, EN en parallèle obligatoire, pas de fallback unilingue
  status: proposed
  owner: foundation-spec
  blocks: [all-specs]

- id: AGT-D-12
  topic: entropiq-fork-vs-contribution
  decision: STRATEGIC OPEN - fork interne contrôlé pour MVP (gaps MCP/policy/sandbox/supervision) avec intention de contribution upstream best-effort sur capabilities génériques (MCP client/server, OTel hooks); différenciation OpenERP (policy ERP, identity, supervision business) reste fork interne
  status: pending-program
  owner: program-decision-pack
  blocks: [foundation-spec, all-specs]

- id: AGT-D-13
  topic: entropiq-license-alignment
  decision: amender license @entropiq vers MIT pur OU émettre waiver écrit commercial avant déploiement production OpenERP
  status: pending-program
  owner: program-decision-pack
  blocks: [all-specs]

- id: AGT-D-14
  topic: agent-execution-budget-default
  decision: budget par tenant (cap absolu) + budget par agent_definition (cap relatif) + circuit breaker sur dépassement
  status: pending-program
  owner: program-decision-pack
  blocks: [foundation-spec, reporting-spec, billing-spec]

- id: AGT-D-15
  topic: irreversible-action-policy
  decision: aucune action irréversible en mode autonome au MVP (posting, send externe, close period); workflow-typed avec checkpoint humain obligatoire
  status: proposed
  owner: program-decision-pack
  blocks: [billing-spec, crm-spec]
```

