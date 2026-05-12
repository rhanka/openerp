# Agentic Marketplace Publication Design Space

## Progress

Fait: Task 14 rédigée selon la structure imposée avec les trois niveaux, les primitives requises,
synthèse par niveau, path de montée en maturité, et notes anti-copy alignées avec la cible MIT.
À faire: confirmer les seuils de signatures, de révocation, et de CI communautaire avec sécurité
et compliance.
Attendu: cette section sert de cadre de conception, pas d'implémentation.

## Purpose

OpenERP doit permettre des mini-modules d'agents utilisables en interne puis dans un cadre de
distribution élargi, tout en gardant un périmètre de confiance propre à chaque niveau.

Le document formalise comment un module passe d'une publication privée à tenant vers une
publication curatée par partenaires, puis vers une offre communautaire.
Il fixe les contrôles minimaux de publication, les limites de visibilité, et les obligations de preuve :
contrôle d'identité éditeur, signatures vérifiables, registre de modules, anti-copy et licence,
sandbox d'exécution, verrouillage de version, révocation, et piste d'observabilité.

L'orientation cible reste **MVP private tenant/internal-governed only**, avec extension vers les niveaux
supérieurs uniquement après validation des contrôles d'identité, de gouvernance, de supervision, de coût et
de conformité.

## Three Tiers

### Private To Tenant

Posture privée au tenant. Les mini-modules sont créés et consommés sous gouvernance locale,
avec visibilité limitée au tenant concerné.

Le contrôle principal repose sur l'administrateur du tenant, une attribution claire des actions aux
patterns d'identité existants (`acting-as` pour usage conversationnel, `on-behalf-of` pour délégations
bornées, `service principal` pour jobs autonomes), et une validation d'activation basée sur la politique
OpenERP et la portée d'objet.

Le catalogue et le cycle de vie y sont courts: découverte, installation interne, ajustement de configuration,
désactivation, archivage.

### Curated Partners

Posture intermédiaire. Des éditeurs extérieurs soumis à une revue OpenERP peuvent diffuser des mini-modules
dans un contexte cross-tenant.

La distribution exige une identité éditeur enregistrée, une signature vérifiable, une revue de conformité
par tenant, et un registre de publication dédié aux profils partenaires.
L'activation cross-tenant est conditionnée à un modèle de confiance explicite, au contrôle de version,
et à la capacité de révocation rapide par OpenERP.

Ce niveau conserve une contrainte forte de visibilité, de gouvernance juridique, et d'audit.

### Public Community

Posture ouverte. Les mini-modules communautaires sont visibles publiquement selon les signaux de confiance
et les règles de publication de la marketplace OpenERP.

Le niveau communautaire requiert des contrôles renforcés : publication avec vérification automatisée,
contrôles anti-copy/licence préventifs, réseau de sandbox renforcé, preuves de provenance publiées,
traçabilité immuable par lot, et politiques de révocation applicables à grande échelle.

Cette posture n'est pas dans le MVP.

## Required Primitives Per Tier

### Publisher Identity

La source de confiance d'un éditeur doit être liée à une identité technique distincte, à un tenant d'enrôlement,
et à un périmètre de publication déclaré.

## Primitive: Publisher Identity

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Auteur du mini-module est un acteur locatif du tenant, identique au profil déjà géré par OpenERP. |
| Curated Partners | Compte éditeur vérifié, métadonnées d'identité persistées, certificat de publication et clé de signature associée. |
| Public Community | Identité éditeur publique vérifiée + journal de certification + historique de révocation lisible par API et UI d'administration. |

### Signing

La signature porte sur le manifeste et sur la chaîne de construction du mini-module, sans imposer de
protocole propriétaire.

## Primitive: Signing

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Signature recommandée en phase d'activation; le tenant peut forcer le mode signature pour réduire l'usure opérationnelle. |
| Curated Partners | Signature obligatoire avec validation cryptographique lors d'import, de mise à jour, et de réactivation. |
| Public Community | Signature double: signature de manifeste + signature d'intégrité des artefacts, avec rejet automatique en cas d'écart. |

### Registry

Le registre pilote la découverte, la visibilité, les métadonnées, la provenance, et l'historique de changements.

## Primitive: Registry

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Index local au tenant, filtré par rôle et scope, référençant les versions publiées au sein du tenant. |
| Curated Partners | Registre partagé entre tenants autorisés avec règles de publication partenaires, métadonnées de provenance, et état de revue. |
| Public Community | Registre public contrôlé, catalogue consultable, flux d'événements de publication, historique de signatures et de révocations. |

### Approval Workflow

Chaque activation suit un flux de validation adapté au risque commercial, financier, et réglementaire.

## Primitive: Approval Workflow

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Approbation admin tenant ou délégation locale selon `tenant`, `team`, `personal` scope; trace d'autorisation et mode de supervision conservé. |
| Curated Partners | Validation OpenERP + revue éditeur + preuve de conformité (politique, licence, anti-copy) avant exposition initiale. |
| Public Community | Validation multi-contrôles: revue éditoriale, contrôle conformité automatisé, et fenêtre de gouvernance avant activation élargie. |

### Anti-Copy And License Scanning

Contrôle automatique des traces à risque avant diffusion: expressions interdites, métadonnées non conformes, licences
non compatibles MIT, et dépendances incompatibles avec la politique.

## Primitive: Anti-Copy And License Scanning

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Scan léger: license check, anti-copy sur descriptions, paramètres, et schémas proposés; mode opt-in pour profils bas risque. |
| Curated Partners | Scan complet préalable au passage en cross-tenant, avec marqueurs de conformité persistés et refus sur anomalies. |
| Public Community | Scan continu, politique de blocage préventif et re-scan post-revues de versions dans le registre communautaire. |

### Sandbox CI

Le sandbox CI valide le comportement exécutable d'un mini-module avant mise à disposition et pendant sa
durée de vie active.

## Primitive: Sandbox CI

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Test de contraintes par tenant: ressources, réseau autorisé, durée d'exécution, quotas minimes. |
| Curated Partners | Vérification stricte par job: isolation réseau, contrôles de dépendances, détection de fuite d'objets sensibles, quotas renforcés. |
| Public Community | CI communautaire exigeant: exécutions canaris, simulation d'erreur, anti-abus de ressources, règles de suppression automatique en cas d'écart. |

### Version Pinning

Chaque tenant doit contrôler la version consommée et la relation entre version, manifeste, et registre.

## Primitive: Version Pinning

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Référence explicite à la version demandée; retour en version antérieure possible via contrôle tenant. |
| Curated Partners | Verrouillage sur version avec dépendances validées; politique de montée de version encadrée. |
| Public Community | Version lock obligatoire via manifeste signé; politique de migration progressive et compatibilité binaire définie. |

### Revocation

La révocation peut être planifiée ou immédiate, et doit être lisible pour audit interne et conformité.

## Primitive: Revocation

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Désactivation de lot, quarantaine tenant, et purge des sessions associées après révocation. |
| Curated Partners | Mécanisme de retrait ciblé par tenant et par partenaire, avec propagation contrôlée vers les mini-modules déjà actifs. |
| Public Community | Retrait global sur registre, diffusion d'un signal de retrait, et rétractation automatique des mini-modules installés selon catégorie de risque. |

### Observability And Audit

Chaque publication et exécution doit rester inspectable sans exposer des données propriétaires.

## Primitive: Observability And Audit

| Tier | Exigence OpenERP |
| --- | --- |
| Private To Tenant | Journal d'activation, exécutions, erreurs, approbations, annulations, actions de révocation et durée de vie par mini-module. |
| Curated Partners | Journal enrichi tenant + éditeur + marketplace avec preuve de revue, empreintes de scan, et état d'intégrité. |
| Public Community | Traces homogènes consommables en dashboard d'audit, export pour contrôle, et indicateurs de conformité par version et par tenant. |

### Required Primitives Summary

| Primitive | Private To Tenant | Curated Partners | Public Community |
| --- | --- | --- | --- |
| Publisher Identity | Identité locale liée au tenant | Éditeur vérifié + identité publiée | Identité éditeur certifiée et historique ouvert |
| Signing | Signature recommandée, mode strict local | Signature obligatoire + validation | Signature double + validation réseau et artefacts |
| Registry | Index local tenant | Registre partagé avec règles de revue | Registre public ouvert avec historique complet |
| Approval Workflow | Approbation admin/porteuse locale | Revue OpenERP + validation partenaire | Revue multi-contrôle + blocage préventif |
| Anti-Copy And License Scanning | Scan pré-activation minimum | Scan complet avant visibilité cross-tenant | Scan continu, blocage systématique d'anomalies |
| Sandbox CI | Isolation de base, quotas | Isolation renforcée + dépendances | CI communautaire étendue + simulation large |
| Version Pinning | Contrôle version par tenant | Version validée et migration pilotée | Verrouillage par manifeste signé et politique globale |
| Revocation | Quarantaine tenant + retrait local | Retrait ciblé tenant/éditeur | Retrait global + propagation de signal |
| Observability And Audit | Traçabilité locale détaillée | Traçabilité tenant + éditeur + marketplace | Traçabilité communautaire consolidée |

## Phasing Path

La trajectoire recommandée est: **Private To Tenant → Curated Partners → Public Community**.

Le premier palier est la base contrôlée interne, avec modules propres au tenant et visibilité limitée.
Le second palier ouvre la distribution à des éditeurs validés, en ajoutant revue et signatures obligatoires.
Le dernier palier ouvre la communauté publique avec surveillance continue, scanning renforcé, et mécanismes de retrait global.

Le passage d'un niveau à l'autre se fait seulement si tous les résultats de la table de primitives sont vérifiés,
l'audit est propre, et les contrôles anti-copy/licence sont passés en revue avec la direction produit.

## Cross-References To Identity And Business Autonomy

- Identity: [`docs/study/12-agentic/identity-design-space.md`](identity-design-space.md)
- Business autonomy: [`docs/study/12-agentic/business-autonomy-design-space.md`](business-autonomy-design-space.md)
- Glossary: [`docs/study/12-agentic/glossary.md`](glossary.md)
- License posture: [`docs/study/12-agentic/license-posture.md`](license-posture.md)
- Enveloppe fonctionnelle globale: [`docs/study/06-functional-map/agentic-functional-map.md`](../06-functional-map/agentic-functional-map.md)
- Gaps runtime connus: [`docs/study/12-agentic/entropiq-audit.md`](entropiq-audit.md)

## Anti-Copy Notes

OpenERP ne doit copier aucun élément de marketplace ou registre externe: labels de catégories,
parcours d'intégration, écrans de publication, lexique de revendeur, modèles de formulaire, ni
flux de confiance visuel.

Le traitement anti-copy s'applique aussi aux descriptions de mini-modules, aux noms d'outil, aux
paramètres de configuration exposés, aux schémas de politique et aux configurations de sandbox.

## OpenERP Takeaways

- Le MVP doit rester strictement **private tenant/internal-governed only**.
- La phase d'ouverture partenaires et communauté peut démarrer seulement après preuve des primitives:
  identité éditeur, signatures, registry, anti-copy/licence, sandbox, version lock, révocation, audit.
- Les contrôles de publication ne préjugent pas d'un choix de runtime: ils sont des prérequis opérationnels
  et juridiques pour tous les implémentations OpenERP futures.
- La sécurité, la revocation et l'observabilité doivent être conçues comme des primitives transverses,
  pas comme des options.
