# Agentic Impacts On MVP Specs

## Progress

Fait: spec enrichie + 15 décisions AGT-D-XX arbitrées 2026-05-14. AGT-D-01 (sandbox) revoked vers @sentropic. AGT-D-04 (identity) étendu RFC 8693 + SPIFFE. AGT-D-12 (évolution @sentropic) reformulé en PR processus normal.
À faire: PR @sentropic ouverte via ~/src/entropiq (MCP + OTel + policy hooks + identity + marketplace + sandbox API), foundation impl (RFC 8693 token exchange + ApprovalRequest + AuditEvent étendu), supervision banner imposée dans toutes les UI métier.
Attendu: agentic est dépendant de @sentropic + foundation. PR @sentropic ouverte, autre agent continue dev. Impl agentic OpenERP démarre après ces deux dépendances.

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

> **Update 2026-05-14**: 14 décisions agentiques arbitrées. AGT-D-01 (sandbox) revoked → responsabilité @sentropic. AGT-D-04 (identity) étendu RFC 8693 + SPIFFE. AGT-D-12 (évolution @sentropic) reformulé : capabilities dans main via PR processus normal.

Cette passe d'enrichissement consolide les décisions agentiques transverses qui contraignent les 5 specs MVP (foundation, CRM, project, billing, reporting). Elle remplace la couche `Functional Depth` standard par une `Functional Surface` agentique, ajoute un benchmark cross-framework pour situer `@sentropic` dans le paysage, et matérialise les choix techniques transverses encore ouverts en un registre de décision destiné au decision-pack programme. La spec garde sa nature d'addendum: elle ne décrit pas un module MVP mais les invariants techniques qui doivent être pris en compte par chaque domaine.

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

Comparatif fonctionnel des frameworks référencés en `startups-deep-research.md` vs `@sentropic` (base agent runtime du projet, MIT interne sous évaluation cf. `license-posture.md`). Les frameworks externes sont en `cautious inspiration` ou `functional reference only` selon licence; aucun code, prompt, tool schema ou workflow definition n'est repris.

| Capability | @sentropic (current) | LangGraph | CrewAI | AutoGen | Posture MVP |
| --- | --- | --- | --- | --- | --- |
| Agent runtime (loop + state) | Présent (queue durable, états explicites) | Présent (state graph, MIT core) | Présent (crew/task, MIT) | Présent (conversation, MIT) | Required @sentropic, gap zero |
| Tool registry typed | Présent (internal TS, pas de discovery) | Présent | Présent | Présent | Required @sentropic, OK |
| MCP support (client + serveur) | Absent | Adapter présent | Adapter présent | Adapter présent | Gap à combler @sentropic (client puis serveur) |
| Policy hooks pre/post call | Absent | Absent (deferred to host) | Absent | Absent | Gap à combler @sentropic (différenciation OpenERP) |
| Sandbox integration | Absent | Absent | Absent | Absent | Gap à combler @sentropic (via couche externe E2B/gvisor/isolated-vm) |
| Observability hooks | Trace par tour, base existante | LangSmith natif (BSL hosted) | Native limitée | Native limitée | Required @sentropic, à étendre OTel via OpenInference/OpenLLMetry |
| Supervision API (pause/resume/approve) | Structure d'état, surface explicite absente | Interrupt/checkpoint présent | Limité | Limité | Gap à combler @sentropic (typed checkpoints OpenERP) |
| Multi-agent orchestration | Présent (task-graph) | Présent (graph) | Présent (crew) | Présent (conversation) | Required @sentropic, OK pour MVP (mono-agent par defaut) |

Lecture clé: `@sentropic` a le noyau (runtime + tool + multi-agent + traces base), les gaps sont MCP, policy, sandbox, supervision API. Les frameworks externes ne sont supérieurs sur aucune capability stratégique sauf adapter MCP déjà cablé (à reconstruire OpenERP-native). Skip explicite: pas de reuse code framework externe, contribution upstream MCP éventuelle uniquement.

### Tech Layer Options

Huit décisions techniques agentiques transverses qui contraignent l'implémentation des 5 specs MVP. Chaque option garde dépendance explicite vers les specs concernées.

1. Sandbox runtime
   - Contexte: aucun sandbox dans `@sentropic` aujourd'hui; les mini-modules MVP sont internes et signés, mais l'isolation reste nécessaire pour limiter blast radius et préparer trust tiers ultérieurs.
   - Options: (a) E2B cloud sandbox (Apache-2.0, self-hosting evidence pending); (b) gVisor self-host (Apache-2.0, OCI compatible, lourd ops); (c) Modal cloud (proprietary platform, exclu pour self-host); (d) isolated-vm in-process (ISC, lightweight, fit TS natif `@sentropic`); (e) hybride isolated-vm pour interne + gVisor pour tiers tiers post-MVP.
   - Reco: option (e) hybride. MVP démarre sur isolated-vm pour mini-modules privés tenant signés; gVisor cible explicite pour la roadmap curated/public.
   - **Revoked 2026-05-14**. Sandbox responsabilité @sentropic. OpenERP exige API sandbox + capability manifest exposés par @sentropic. Drop isolated-vm/gVisor/Modal/E2B du scope OpenERP MVP. Si manquant côté @sentropic → feature request via PR sur @sentropic (cf. AGT-D-12).
   - Dépendances: foundation (loader + manifest), billing/project (modules sensibles doivent rester internes au MVP).

2. Policy engine
   - Contexte: `@sentropic` n'a aucun policy hook; OpenERP doit gater chaque tool call avant et après exécution.
   - Options: (a) OPA Rego DSL externe (Apache-2.0, sidecar mature); (b) Cedar entity-based (Apache-2.0, Rust, formal verification, intégration TS via service); (c) Casbin multi-model (Apache-2.0, biblio JS native); (d) native TS code OpenERP (zero DSL externe, vocabulaire ERP direct).
   - Reco: option (d) native TS au MVP pour vitesse + alignement vocabulaire OpenERP, avec abstraction `PolicyDecisionPoint` permettant de basculer vers Cedar ou OPA post-MVP si la complexité de règles explose.
   - Dépendances: foundation (point d'application + audit), billing (gates posting/close), CRM (gate envoi externe).

3. Observability backend
   - Contexte: traces base présentes `@sentropic`, mais corrélation policy/budget/supervision absente; OpenERP doit rester portable.
   - Options: (a) Langfuse self-host (MIT open-core); (b) Helicone proxy (Apache-2.0, capture transport); (c) Phoenix Arize (Elastic-2.0, functional reference only); (d) OpenInference conventions (Apache-2.0, OTel-native); (e) Traceloop OpenLLMetry SDK (Apache-2.0, OTel-native).
   - Reco: combinaison (d)+(e). Convention OpenInference pour semantic + SDK OpenLLMetry pour emission OTel; backend Langfuse self-host en option opérateur, sans dépendance OpenERP sur Langfuse.
   - Dépendances: foundation (event log central), reporting (vues de relecture agent).

4. Agent identity
   - Contexte: `@sentropic` lie sessions à humains via passkey, pas de service principal ni d'on-behalf-of.
   - Options: (a) SPIFFE/SVID (workload identity standard, lourd ops); (b) JWT signé avec delegation chain claim (léger, OpenERP-native); (c) OIDC subject claim avec `acting_for` extension (réutilise IdP existant tenant); (d) RFC 8693 OAuth 2.0 Token Exchange avec claims `act`/`may_act` (standard IETF, sémantique délégation native).
   - Reco: **Updated 2026-05-14** — RFC 8693 token exchange au MVP avec claims `act` (acting principal) + `may_act` (delegation chain) + cookie session humain + JWT signé agent. `User.actor_type = human | agent | system`. Chaîne de délégation : `human → agent_definition → tool_call`. ApprovalRequest matérialise l'issuance du JWT agent. AuditEvent étendu (`acting_principal`, `on_behalf_of`, `policy_decision_id`, `approval_request_id`). Évolution post-MVP vers SPIFFE/SVID via abstraction `IdentityProvider` (cf. PG-09) pour workloads multi-cluster.
   - Dépendances: foundation (provisioning + rotation + IdentityProvider abstraction), toutes specs (audit attribution).

5. MCP registry
   - Contexte: `@sentropic` absent côté MCP client et serveur; OpenERP doit décider tôt comment exposer ses outils ERP et consommer outils externes.
   - Options: (a) registry interne native OpenERP (table + service, contrôle total tenant); (b) registry public Anthropic/MCP officiel (Apache-2.0, discovery cross-vendor); (c) hybride registry interne + miroir vers public optionnel.
   - Reco: option (a) registry interne native au MVP, scope tenant-privé. Pas d'exposition publique avant signing + provenance + revocation + sandbox tier en place (post-MVP).
   - Dépendances: foundation (catalog), reporting (binding typed triggers vers tools approuvés).

6. Supervision UI
   - Contexte: pas de surface explicite pause/resume/approve dans `@sentropic`; supervision est Required MVP.
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
  reco: hybride isolated-vm (MVP interne) + gVisor (roadmap tiers)
  resolution: 2026-05-14, status: RESOLVED, chosen: SANDBOX = RESPONSABILITÉ @sentropic. Drop isolated-vm/gVisor/Modal/E2B du scope OpenERP MVP. OpenERP EXIGE de @sentropic : API sandbox + capability manifest. Si manquant côté @sentropic → feature request via PR sur @sentropic. Revert de la décision initiale isolated-vm
  status: RESOLVED
  owner: foundation-spec
  blocks: [billing-spec, project-spec]

- id: AGT-D-02
  topic: policy-engine
  decision: native TS OpenERP avec abstraction PolicyDecisionPoint
  reco: native TS OpenERP avec abstraction PolicyDecisionPoint
  resolution: 2026-05-14, status: RESOLVED, chosen: native TS MVP (hooks pre/post tool call), Cedar ou OPA en pack post-MVP
  status: RESOLVED
  owner: foundation-spec
  blocks: [billing-spec, crm-spec, reporting-spec]

- id: AGT-D-03
  topic: observability-backend
  decision: OpenInference conventions + OpenLLMetry SDK + Langfuse self-host optionnel
  reco: OpenInference conventions + OpenLLMetry SDK + Langfuse self-host optionnel
  resolution: 2026-05-14, status: RESOLVED, chosen: OpenInference + OpenLLMetry MVP, abstraction pour Langfuse/Helicone/Phoenix swappable post-MVP
  status: RESOLVED
  owner: foundation-spec
  blocks: [reporting-spec]

- id: AGT-D-04
  topic: agent-identity
  decision: JWT signé OpenERP-native avec claims tenant_id/agent_id/acting_as/acting_for/delegation_id/scope/exp
  reco: RFC 8693 token exchange MVP (act + may_act claims) + SPIFFE/SVID post-MVP via abstraction IdentityProvider (PG-09); cookie humains + JWT signé agents; User.actor_type = human | agent | system; chaîne délégation human → agent_definition → tool_call; ApprovalRequest comme issuance du JWT agent; AuditEvent étendu (acting_principal + on_behalf_of + policy_decision_id + approval_request_id)
  resolution: 2026-05-14, status: RESOLVED, chosen: RFC 8693 token exchange MVP (act + may_act claims) + SPIFFE/SVID post-MVP via abstraction IdentityProvider (PG-09). Cookie humains + JWT signé agents. User.actor_type = human | agent | system. Chaîne délégation : human → agent_definition → tool_call. ApprovalRequest comme issuance du JWT agent. AuditEvent étendu (acting_principal + on_behalf_of + policy_decision_id + approval_request_id)
  status: RESOLVED
  owner: foundation-spec
  blocks: [all-specs]

- id: AGT-D-05
  topic: mcp-registry
  decision: registry interne native OpenERP, tenant-privé au MVP, pas d'expo publique avant post-MVP
  reco: registry interne native OpenERP, tenant-privé au MVP, pas d'expo publique avant post-MVP
  resolution: 2026-05-14, status: RESOLVED, chosen: interne native MVP, public registry (Anthropic) post-MVP
  status: RESOLVED
  owner: foundation-spec
  blocks: [reporting-spec]

- id: AGT-D-06
  topic: supervision-ui
  decision: hybride inline (conversationnel) + panneau /supervision central (autonome + workflow-typed)
  reco: hybride inline (conversationnel) + panneau /supervision central (autonome + workflow-typed)
  resolution: 2026-05-14, status: RESOLVED, chosen: hybride inline + panneau /supervision. CONTRAINTE TRANSVERSE : tout écran métier réserve zone "supervision banner" (cf. CRM, project, billing, reporting)
  status: RESOLVED
  owner: foundation-spec
  blocks: [crm-spec, billing-spec, project-spec]

- id: AGT-D-07
  topic: sandbox-snapshot-restore
  decision: rollback niveau objet métier au MVP; snapshot sandbox post-MVP
  reco: rollback niveau objet métier au MVP; snapshot sandbox post-MVP
  resolution: 2026-05-14, status: RESOLVED, chosen: rollback niveau objet métier au MVP; snapshot sandbox post-MVP
  status: RESOLVED
  owner: foundation-spec
  blocks: [billing-spec, project-spec]

- id: AGT-D-08
  topic: audit-mcp-calls
  decision: audit unifié foundation avec champ source [human|agent|system]
  reco: audit unifié foundation avec champ source [human|agent|system]
  resolution: 2026-05-14, status: RESOLVED, chosen: unifié dans AuditEvent foundation avec colonnes optionnelles agentiques (source, agent_id, tool_call_id, policy_decision_id, delegation_id) — cf. PG-09 stack identité
  status: RESOLVED
  owner: foundation-spec
  blocks: [reporting-spec]

- id: AGT-D-09
  topic: approval-threshold-default
  decision: hybride par rôle (default) + override par tool (escalation rule) + override par tenant policy
  reco: hybride par rôle (default) + override par tool (escalation rule) + override par tenant policy
  resolution: 2026-05-14, status: RESOLVED, chosen: hybride rôle + tool + tenant. Configurable via ApprovalPolicy {tenant_id, subject_type, threshold_amount, approvers} foundation (PG-07)
  status: RESOLVED
  owner: program-decision-pack
  blocks: [billing-spec, crm-spec, project-spec]

- id: AGT-D-10
  topic: rate-limit-agent
  decision: triplet [par tenant (budget global), par user (Acting-As), par agent definition (Service Principal)]
  reco: triplet [par tenant (budget global), par user (Acting-As), par agent definition (Service Principal)]
  resolution: 2026-05-14, status: RESOLVED, chosen: tenant + user + agent_definition. Foundation expose RateLimit primitive
  status: RESOLVED
  owner: program-decision-pack
  blocks: [foundation-spec, reporting-spec]

- id: AGT-D-11
  topic: bilingual-supervision-notification
  decision: FR-CA prioritaire dès MVP, EN en parallèle obligatoire, pas de fallback unilingue
  reco: FR-CA prioritaire dès MVP, EN en parallèle obligatoire, pas de fallback unilingue
  resolution: 2026-05-14, status: RESOLVED, chosen: FR-CA prioritaire dès MVP, EN en parallèle obligatoire, pas de fallback unilingue
  status: RESOLVED
  owner: foundation-spec
  blocks: [all-specs]

- id: AGT-D-12
  topic: sentropic-evolution
  decision: TOUTES capabilities OpenERP (MCP + OTel + policy hooks + multi-tenant identity primitives + marketplace primitives + sandbox API) intégrées dans @sentropic main via PR processus normal depuis ~/src/entropiq, en respect du plan @sentropic. Wording "fork interne + best-effort upstream" SUPPRIMÉ : l'utilisateur est upstream, il n'y a pas de fork.
  reco: TOUTES capabilities OpenERP (MCP + OTel + policy hooks + multi-tenant identity primitives + marketplace primitives + sandbox API) dans @sentropic main. PR ouverte via ~/src/entropiq en respect du plan @sentropic. Pas de push direct main, processus PR normal. L'autre agent (codex) continue le dev process.
  resolution: 2026-05-14, status: RESOLVED, chosen: TOUTES capabilities OpenERP (MCP + OTel + policy hooks + multi-tenant identity primitives + marketplace primitives + sandbox API) dans @sentropic main. PR ouverte via ~/src/entropiq en respect du plan @sentropic. Pas de push direct main, processus PR normal. L'autre agent (codex) continue le dev process. Wording "fork interne + best-effort upstream" SUPPRIMÉ (n'a pas de sens : utilisateur est upstream)
  status: RESOLVED
  owner: program-decision-pack
  blocks: [foundation-spec, all-specs]

- id: AGT-D-13
  topic: sentropic-license-alignment
  decision: amender license @sentropic vers MIT pur OU émettre waiver écrit commercial avant déploiement production OpenERP
  reco: plain MIT adopted, name @sentropic
  resolution: 2026-05-14, status: RESOLVED, chosen: plain MIT adopted, name @sentropic (déjà résolu 2026-05-12, confirmé 2026-05-14)
  status: RESOLVED
  owner: program-decision-pack
  blocks: [all-specs]

- id: AGT-D-14
  topic: agent-execution-budget-default
  decision: budget par tenant (cap absolu) + budget par agent_definition (cap relatif) + circuit breaker sur dépassement
  reco: budget par tenant (cap absolu) + budget par agent_definition (cap relatif) + circuit breaker sur dépassement
  resolution: 2026-05-14, status: RESOLVED, chosen: cap tenant + cap agent + circuit breaker. Liaisons billing + reporting
  status: RESOLVED
  owner: program-decision-pack
  blocks: [foundation-spec, reporting-spec, billing-spec]

- id: AGT-D-15
  topic: irreversible-action-policy
  decision: aucune action irréversible en mode autonome au MVP (posting, send externe, close period); workflow-typed avec checkpoint humain obligatoire
  reco: aucune action irréversible en mode autonome au MVP (posting, send externe, close period); workflow-typed avec checkpoint humain obligatoire
  resolution: 2026-05-14, status: RESOLVED, chosen: zéro action irréversible autonome MVP (posting, send externe, close, void). ApprovalRequest humain obligatoire (PG-07). Contrainte transverse billing + CRM
  status: RESOLVED
  owner: program-decision-pack
  blocks: [billing-spec, crm-spec]
```

### Décisions programme impactantes (PG)

Les décisions programme transverses suivantes contraignent ou complètent les arbitrages AGT-D-XX ci-dessus. Elles sont gérées au niveau du decision-pack programme, mais référencées ici pour cohérence agentique.

- **PG-01 — Licence @sentropic plain MIT** : résolu 2026-05-12 (cf. AGT-D-13). Plain MIT adopté, nom `@sentropic`, plus aucune restriction commerciale. Confirmé 2026-05-14.
- **PG-02 — UserIdentity humain vs AgentIdentity séparée** : foundation distingue `UserIdentity` (humain, passkey/cookie session) de `AgentIdentity` (agent, JWT signé RFC 8693). `User.actor_type = human | agent | system` pivot ; toute table métier référence l'identité via cette abstraction et non un user_id direct.
- **PG-06 article 3 — AgentRun préfixé et séparé** : `AgentRun` est un objet propre, jamais fusionné avec `CrmActivity`, `ProjectTask`, ou `ServiceActivity`. Liaison via `AuditEvent` + `correlation_id`. Évite pollution sémantique des objets métier humains.
- **PG-06 article 2 — AuditEvent étendu agentic** : `AuditEvent` foundation porte les colonnes optionnelles agentiques (`source`, `agent_id`, `tool_call_id`, `policy_decision_id`, `delegation_id`, `acting_principal`, `on_behalf_of`, `approval_request_id`). Aligne AGT-D-08.
- **PG-07 — ApprovalRequest foundation** : primitive foundation `ApprovalRequest {tenant_id, subject_type, subject_id, requested_by, approver_role, threshold_amount, status, decision_at, decided_by}` couvre approval threshold (AGT-D-09) ET irreversible actions (AGT-D-15). Issuance du JWT agent passe par ApprovalRequest.
- **PG-09 — Stack identité agent (RFC 8693 + SPIFFE)** : aligne AGT-D-04. Abstraction `IdentityProvider` pour permettre swap RFC 8693 token exchange (MVP) → SPIFFE/SVID (post-MVP multi-cluster) sans casse foundation. `act` et `may_act` claims standardisés.
- **PG-12 — Anti-copy frameworks externes** : LangGraph, CrewAI, AutoGen sont `functional reference only` ou `cautious inspiration`. Aucun code, prompt, tool schema, workflow definition, eval dataset, trace, ou config runtime jamais copié. Implémentation OpenERP-native obligatoire, contribution upstream MCP/OTel via @sentropic uniquement.

