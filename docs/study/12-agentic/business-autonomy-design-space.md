# Agentic Business Autonomy Design Space

## Progress

Fait: section rédigée pour Task 13 selon la structure imposée.
À faire: confirmer les seuils d'approbation par module avec conformité, finance, et sécurité.
Attendu: aucun engagement technique; cette section fixe uniquement le cadre d'autonomie métier.

## Purpose

OpenERP doit rendre l'exploitation d'agents accessible sans enlever le controle commercial,
juridique, ou financier. Cette section definit le niveau d'autonomie d'une equipe ou d'un
tenant selon quatre axes: ce qui est possible de découvrir, d'activer, de configurer, et de
créer. Le cadre relie chaque combinaison à un mode d'identité, à un niveau marketplace, à une
porte d'approbation humaine, et à des contraintes de sécurité à l'exécution.

## Four Autonomy Axes

### Discovery

La découverte couvre la visibilité des agents disponibles, le filtrage par périmètre métier et la
compréhension de leur usage. Elle reste un mode de consultation contrôlé: pas d'effet de bord, mais
une exigence de traçabilité complète sur les vues, filtres, et catalogues consultés.

### Selection And Activation

La sélection et activation couvrent l'installation, l'activation, la désactivation, et la rotation des
versions. Le cadre distingue la portée personnelle/team/tenant/cross-tenant, car la même action peut
exiger une chaîne de supervision différente dès qu'un résultat touche des objets partagés.

### Configuration

La configuration couvre les réglages applicatifs de l'agent (plages d'objets, seuils
d'escalade, planification, outils autorisés, canaux, journaux attendus). Le réglage change le
comportement opérationnel de l'agent, donc il exige une preuve d'approbation plus solide que la simple
découverte.

### Authoring

L'authoring couvre la création d'agents par techniques manuelles, par modèles de patterns, ou par
description non-technique. Il est plus sensible aux risques de gouvernance, d'évasion de politique, et
d'harmonisation de la supervision que les axes precedents.

## Roles

### Tenant Administrator

Tenant Administrator détient l'autorité interne de gouvernance locale. Il valide l'entrée et la portée des
agents, définit les délégués, et décide de la frontière entre usage interne, partenaire, et communauté.

### Power User With Delegated Agent Administration

Ce profil agit sur la base d'une délégation explicite. Il peut piloter des agents utiles en service
courant (CRM, facturation, projet, support) dans des périmètres autorisés, mais ne décide pas du
gouvernement global du tenant.

### Standard Business User

Standard Business User exploite des agents pour améliorer son travail quotidien dans un périmètre
opérationnel. Il peut bénéficier d'une autosélection guidée tant que la portée reste personnelle ou team
et que les garde-fous humains restent en place.

### External Customer User Or Guest

Ce rôle agit depuis des surfaces collaboratives externes. Son objectif est la coopération client,
pas la gouvernance globale du cycle de vie des agents.

## Scopes

### Personal Scope

Personal Scope limite l'action à l'espace fonctionnel direct de l'utilisateur et aux objets dont il a la
propriété ou la responsabilité principale.

### Team Scope

Team Scope regroupe les équipes métiers et partages opérationnels. Les actions y touchent la cohérence de
l'equipe plutot que celle de tout le tenant.

### Tenant Scope

Tenant Scope couvre l'ensemble interne d'un tenant, avec visibilite et impacts transverses.

### Cross-Tenant Scope

Cross-Tenant Scope concerne les mini-modules partenaires ou communautaires, la reutilisation de modeles,
et les surfaces de visibilite entre tenants regulees par trust tiers.

## Matrix: Axis x Role x Scope

### Discovery

| Axis | Role | Scope | Identity Pattern | Marketplace Tier | Supervision and Approval Gate | Runtime Safety Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| Discovery | Tenant Administrator | Personal Scope | acting-as | private | no manual approval, tenant-admin action trace | tenant-scoped catalog visibility, FR/EN preference, audit event for each list query |
| Discovery | Tenant Administrator | Team Scope | acting-as | private | no manual approval, team policy check | team visibility filter, policy rule version, audit event |
| Discovery | Tenant Administrator | Tenant Scope | acting-as | private | no manual approval, tenant policy snapshot | cross-object guard, signed metadata index, manifest checksum validation |
| Discovery | Tenant Administrator | Cross-Tenant Scope | on-behalf-of | community | admin delegation required | approved publisher allow-list, community metadata hash validation, replay and consent logging |
| Discovery | Power User With Delegated Agent Administration | Personal Scope | acting-as | private | delegated profile confirmation | per-user scope token, policy inheritance, immutable audit |
| Discovery | Power User With Delegated Agent Administration | Team Scope | acting-as | private | delegated profile confirmation | team boundary checks, visibility logs, bilingual result metadata |
| Discovery | Power User With Delegated Agent Administration | Tenant Scope | on-behalf-of | partners | admin approval for tenant-shared discovery profiles | tenant_id and role filters, curated index sync, audit by delegator |
| Discovery | Power User With Delegated Agent Administration | Cross-Tenant Scope | on-behalf-of | partners | delegator approval + admin exception trail | partner allow-list, risk tag filtering, anti-copy compliance marker |
| Discovery | Standard Business User | Personal Scope | acting-as | private | no manual approval | only approved personal catalog subset, action logger |
| Discovery | Standard Business User | Team Scope | acting-as | private | team lead notice for curated items | team boundary filter, access policy, event logging |
| Discovery | Standard Business User | Tenant Scope | on-behalf-of | partners | two-step view authorization for sensitive modules | tenant policy guard, signed index only, evidence retention |
| Discovery | Standard Business User | Cross-Tenant Scope | on-behalf-of | community | no direct enablement; read-only visibility under tenant policy | tenant-curated allow-list, consent artifact stored, audit of external catalog pulls |
| Discovery | External Customer User Or Guest | Personal Scope | acting-as | private | portal scope check on each query | tenant-specific portal session, object-level mask, activity log |
| Discovery | External Customer User Or Guest | Team Scope | N/A (not authorized) | private | unavailable by role design | pending - to be confirmed by maintainer; no capability currently exposed |
| Discovery | External Customer User Or Guest | Tenant Scope | N/A (not authorized) | private | unavailable by role design | pending - to be confirmed by maintainer; no capability currently exposed |
| Discovery | External Customer User Or Guest | Cross-Tenant Scope | N/A (not authorized) | private | unavailable by role design | pending - to be confirmed by maintainer; no capability currently exposed |

### Selection And Activation

| Axis | Role | Scope | Identity Pattern | Marketplace Tier | Supervision and Approval Gate | Runtime Safety Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| Selection And Activation | Tenant Administrator | Personal Scope | acting-as | private | admin self-approval with audit note | signed manifest required, policy pre-check, budget checks |
| Selection And Activation | Tenant Administrator | Team Scope | acting-as | private | manager confirmation + tenant policy check | team boundary enforcement, staged rollout, immutable action log |
| Selection And Activation | Tenant Administrator | Tenant Scope | on-behalf-of | private | admin approval queue before activation | tenant-wide impact simulation, rollback token, dependency blocking |
| Selection And Activation | Tenant Administrator | Cross-Tenant Scope | service principal | partners | admin + publisher review gate | release gating, publisher signature, trust-level sandbox |
| Selection And Activation | Power User With Delegated Agent Administration | Personal Scope | on-behalf-of | private | delegated approval chain | delegated scope token, bounded action scope, audit for each activation |
| Selection And Activation | Power User With Delegated Agent Administration | Team Scope | on-behalf-of | private | team lead approval then delegated action | policy version pinning, change request record, budget limit check |
| Selection And Activation | Power User With Delegated Agent Administration | Tenant Scope | on-behalf-of | private | requires tenant-admin co-approval | co-approval marker, tenant policy override lock, dependency policy |
| Selection And Activation | Power User With Delegated Agent Administration | Cross-Tenant Scope | N/A (not authorized) | partners | unavailable by role design | pending - to be confirmed by maintainer; capability likely restricted |
| Selection And Activation | Standard Business User | Personal Scope | acting-as | private | manager-style approval for sensitive actions | activation requires explicit justification flag, budget cap |
| Selection And Activation | Standard Business User | Team Scope | acting-as | private | team approver for enablement | object scope filter, one-action confirmation, audit trace |
| Selection And Activation | Standard Business User | Tenant Scope | N/A (not authorized) | private | unavailable without tenant admin grant | pending - to be confirmed by maintainer; policy-only block today |
| Selection And Activation | Standard Business User | Cross-Tenant Scope | N/A (not authorized) | community | unavailable by role design | pending - to be confirmed by maintainer; no activation rights |
| Selection And Activation | External Customer User Or Guest | Personal Scope | N/A (not authorized) | private | unavailable by role design | no agent lifecycle action on portal context |
| Selection And Activation | External Customer User Or Guest | Team Scope | N/A (not authorized) | private | unavailable by role design | no agent lifecycle action on portal context |
| Selection And Activation | External Customer User Or Guest | Tenant Scope | N/A (not authorized) | private | unavailable by role design | no agent lifecycle action on portal context |
| Selection And Activation | External Customer User Or Guest | Cross-Tenant Scope | N/A (not authorized) | community | unavailable by role design | no agent lifecycle action on portal context |

### Configuration

| Axis | Role | Scope | Identity Pattern | Marketplace Tier | Supervision and Approval Gate | Runtime Safety Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| Configuration | Tenant Administrator | Personal Scope | on-behalf-of | private | admin validation + optional peer review | parameter diff review, audit event for every save, rollback map |
| Configuration | Tenant Administrator | Team Scope | on-behalf-of | private | team policy update then admin confirm | allow-list refresh, policy linting, secret scoping |
| Configuration | Tenant Administrator | Tenant Scope | on-behalf-of | private | admin approval + compliance check if financial data touched | tenant-wide impact simulation, pre/post policy gates |
| Configuration | Tenant Administrator | Cross-Tenant Scope | service principal | partners | publisher-level review + OpenERP registry approval | signed payload, version pinning, tenant trust profile, revocation hooks |
| Configuration | Power User With Delegated Agent Administration | Personal Scope | on-behalf-of | private | delegated admin confirmation | strict field whitelist, bounded scope, change log |
| Configuration | Power User With Delegated Agent Administration | Team Scope | on-behalf-of | private | delegated admin confirmation + team lead review | field-level ACL, policy re-evaluation, alert on unsafe thresholds |
| Configuration | Power User With Delegated Agent Administration | Tenant Scope | on-behalf-of | private | required admin co-validation | tenant policy gate, restricted actions list, audit replay support |
| Configuration | Power User With Delegated Agent Administration | Cross-Tenant Scope | N/A (not authorized) | partners | unavailable by role design | pending - to be confirmed by maintainer; no cross-tenant settings path |
| Configuration | Standard Business User | Personal Scope | acting-as | private | manager validation for critical settings | whitelist of editable parameters only, bounded value ranges |
| Configuration | Standard Business User | Team Scope | acting-as | private | team lead review for high impact | team policy check, one-at-a-time approval for escalations |
| Configuration | Standard Business User | Tenant Scope | N/A (not authorized) | private | unavailable by role design | pending - to be confirmed by maintainer; no tenant-wide changes exposed |
| Configuration | Standard Business User | Cross-Tenant Scope | N/A (not authorized) | private | unavailable by role design | pending - to be confirmed by maintainer; no cross-tenant path |
| Configuration | External Customer User Or Guest | Personal Scope | N/A (not authorized) | private | unavailable by role design | no configuration right in portal context |
| Configuration | External Customer User Or Guest | Team Scope | N/A (not authorized) | private | unavailable by role design | no configuration right in portal context |
| Configuration | External Customer User Or Guest | Tenant Scope | N/A (not authorized) | private | unavailable by role design | no configuration right in portal context |
| Configuration | External Customer User Or Guest | Cross-Tenant Scope | N/A (not authorized) | private | unavailable by role design | no configuration right in portal context |

### Authoring

| Axis | Role | Scope | Identity Pattern | Marketplace Tier | Supervision and Approval Gate | Runtime Safety Constraints |
| --- | --- | --- | --- | --- | --- | --- |
| Authoring | Tenant Administrator | Personal Scope | on-behalf-of | private | tenant-admin approval + editorial check | policy-safe template schema, code-free manifest checks, anti-copy gate |
| Authoring | Tenant Administrator | Team Scope | on-behalf-of | private | team lead review plus admin consent | tool scope contract, output validation tests, change freeze support |
| Authoring | Tenant Administrator | Tenant Scope | on-behalf-of | private | admin policy committee | tenant-wide publication window, dependency checks, revocation workflow |
| Authoring | Tenant Administrator | Cross-Tenant Scope | service principal | partners | publisher review + trust gating | signed manifest, provenance record, sandbox level matching trust tier |
| Authoring | Power User With Delegated Agent Administration | Personal Scope | on-behalf-of | private | delegated creator approval only | no-prompt reuse checks, pattern-only starter pack, audit bundle |
| Authoring | Power User With Delegated Agent Administration | Team Scope | on-behalf-of | private | team lead review + delegated scope | template registry lock, parameter budget cap |
| Authoring | Power User With Delegated Agent Administration | Tenant Scope | N/A (not authorized) | private | unavailable by role design | pending - to be confirmed by maintainer; likely restricted for now |
| Authoring | Power User With Delegated Agent Administration | Cross-Tenant Scope | N/A (not authorized) | partners | unavailable by role design | pending - to be confirmed by maintainer; partner registry risk not mapped |
| Authoring | Standard Business User | Personal Scope | N/A (not authorized) | private | unavailable by role design | no authoring right in current posture |
| Authoring | Standard Business User | Team Scope | N/A (not authorized) | private | unavailable by role design | no authoring right in current posture |
| Authoring | Standard Business User | Tenant Scope | N/A (not authorized) | private | unavailable by role design | no authoring right in current posture |
| Authoring | Standard Business User | Cross-Tenant Scope | N/A (not authorized) | private | unavailable by role design | no authoring right in current posture |
| Authoring | External Customer User Or Guest | Personal Scope | N/A (not authorized) | private | no authoring right in portal context | no authoring right in portal context |
| Authoring | External Customer User Or Guest | Team Scope | N/A (not authorized) | private | no authoring right in portal context | no authoring right in portal context |
| Authoring | External Customer User Or Guest | Tenant Scope | N/A (not authorized) | private | no authoring right in portal context | no authoring right in portal context |
| Authoring | External Customer User Or Guest | Cross-Tenant Scope | N/A (not authorized) | private | no authoring right in portal context | no authoring right in portal context |

## MVP Recommendation

La recommandation MVP reste : self-service catalog (discovery, selection and activation, configuration)
en priorité pour réduire le temps de mise en service, améliorer la cohérence opérationnelle, et garder un
cadre de contrôle auditable. L'authoring, y compris no-code/natural-language builder, doit rester
post-MVP.

## Cross-References To Identity And Marketplace

- Identity posture: [`docs/study/12-agentic/identity-design-space.md`](identity-design-space.md)
- Marketplace posture: [`docs/study/12-agentic/marketplace-design-space.md`](marketplace-design-space.md)
- Runtime safety mapping: [`docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`](../../superpowers/specs/2026-05-10-agentic-study-extension-design.md) (section 11)

## Anti-Copy Notes

Hors périmètre OpenERP, aucun texte, structure de flux, catalogue, ou surface de gestion ne doit être copié.
Les surfaces suivantes sont explicitement interdites de reutilisation: agent catalog UI, agent
configuration UI, prompt builder UI, natural-language description flows.

## OpenERP Takeaways

- La valeur opérationnelle provient d'abord d'une découverte claire, d'une activation pilotée, et d'une
  configuration guidée, toutes trois sous contrôle humain et audit.
- L'autorisation par rôle et par scope doit rester la règle de base, avec une trajectoire de déploiement
  qui commence en privé.
- Les combinaisons à fort impact (tenant et cross-tenant) doivent passer par des délégations
  explicites, des signatures de manifeste, et des garde-fous d'execution alignes sur l'objectif MIT.
- L'authoring est priorisé plus tard car il dépend de maturité supervisionnelle, anti-copy, et
  observabilité complète.
