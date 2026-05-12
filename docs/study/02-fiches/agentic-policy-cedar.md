# Cedar

## Evidence

- Repository URL: https://github.com/cedar-policy/cedar.
- Official site: https://www.cedarpolicy.com.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: pending - to be confirmed by maintainer; `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md` record Apache-2.0 confirmed through GitHub API on 2026-05-11.
- Declared license: Apache-2.0.
- Reuse classification: corpus `usable`; OpenERP posture `cautious inspiration` for policy primitive design under `docs/study/12-agentic/license-posture.md`.
- Primary role: entity-based authorization policy language and evaluation engine with static analysis relevance.

## License And Reuse

Apache-2.0 is compatible with the MIT-targeted OpenERP direction when notice and patent obligations are tracked. Cedar can inform functional thinking about principal, action, resource, and context separation in a tenant-aware authorization system. Cedar policies, entity schemas, examples, analysis output wording, API shapes, and configuration expression are excluded from reuse.

## Functional Role

Cedar is most relevant to OpenERP as an entity-typed policy reference. Its useful functional lesson is that policy evaluation should know who is acting, which action is requested, which business object is affected, and which contextual facts constrain the action. That maps to OpenERP agent modes such as acting-as, service principal, and on-behalf-of delegation.

## Integration Suitability With `@entropiq`

Integration Suitability With @entropiq: partial to strong.
The fit is partial to strong. `@entropiq` is TypeScript and currently has no policy hook, while Cedar is recorded as a Rust policy language and engine. OpenERP could still use Cedar concepts through a service boundary or a separate policy layer, but the integration cost is higher than a native TypeScript library. The useful input for `@entropiq` is the typed authorization envelope, not the Cedar syntax.

## OpenERP Trust Tier Fit

Cedar fits trust-tier design where authorization must be explicit and explainable. Private-to-tenant modules can use entity-scoped rules for local actions. Curated partner and public community modules need additional publisher, module, and tenant separation. Cedar's entity orientation is especially relevant where agent identity and business object scope must be audited together.

## Architecture Notes

The corpus records Cedar as an AWS-developed Rust engine for entity-based authorization with formal verification properties and a principal-action-resource-context model. In OpenERP architecture, the parallel requirement is an authorization graph that includes tenant, user, service principal, module publisher, business object, action, and runtime context as separate facts.

## Self-Hosted And Kubernetes

The corpus records partial self-hosted and Kubernetes relevance for Cedar. OpenERP should treat Cedar as a policy-engine library or service candidate pending deeper evidence. Exact checked deployment evidence is pending - to be confirmed by maintainer.

## Anti-Copy Notes

no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording. Cedar policy files, entity schemas, validation examples, authorization examples, API expression, and documentation examples must not be copied or closely adapted.

## OpenERP Takeaways

Cedar is useful for clarifying OpenERP's authorization vocabulary: actor, delegated actor, action, object, tenant, and context must be first-class policy facts. It should not drive OpenERP wording or syntax. The near-term design value is a cleaner identity and policy data model for `@entropiq` tool-call gating.
