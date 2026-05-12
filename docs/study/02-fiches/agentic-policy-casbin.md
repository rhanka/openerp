# Casbin

## Evidence

- Repository URL: https://github.com/casbin/casbin.
- Official site: https://casbin.org.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: pending - to be confirmed by maintainer; `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md` record Apache-2.0 confirmed through GitHub API on 2026-05-11, with the official Apache Software Foundation repository noted as `apache/casbin`.
- Declared license: Apache-2.0.
- Reuse classification: corpus `usable`; OpenERP posture `cautious inspiration` for policy primitive design under `docs/study/12-agentic/license-posture.md`.
- Primary role: multi-language access control framework for role-based, attribute-based, and model-driven authorization patterns.

## License And Reuse

Apache-2.0 is compatible with the MIT-targeted OpenERP direction when notice and patent obligations are tracked. Casbin can inform the functional separation between an enforcement adapter, a tenant-specific model, and policy data. Casbin model files, policy templates, enforcer API shapes, examples, and configuration expression are excluded from reuse.

## Functional Role

Casbin is relevant to OpenERP as a compact access-control reference for RBAC and ABAC style policy. The OpenERP need is not to copy its model format, but to understand how tenant policy, actor attributes, object attributes, and requested actions can be evaluated consistently across modules and agent tool calls.

## Integration Suitability With `@entropiq`

Integration Suitability With @entropiq: strong at the product boundary.
The fit is strong at the product boundary because `@entropiq` is TypeScript and Casbin has broad language support, including JavaScript ecosystem relevance noted by the corpus. `@entropiq` would still need a new pre-call and post-call policy hook, a tenant-aware policy store, and audit output. OpenERP should own the adapter contract and avoid exposing external model terminology in user-facing configuration.

## OpenERP Trust Tier Fit

Casbin maps well to private-to-tenant and curated partner tiers where tenant and publisher rules must be configurable and auditable. Public community modules would still need additional sandboxing, signing, provenance, and review primitives around the policy layer. Casbin is a policy component candidate, not an isolation boundary.

## Architecture Notes

The corpus describes Casbin as a framework that separates model from policy data and supports multiple authorization models. In OpenERP architecture terms, that suggests a split between a stable enforcement point in the agent loop, tenant-owned policy data, and module metadata describing which actions are possible. OpenERP should define those structures in its own vocabulary.

## Self-Hosted And Kubernetes

The corpus records strong self-hosted and Kubernetes relevance for Casbin. Because it is a framework rather than a hosted service, OpenERP can evaluate it inside the application service or a policy side service. Exact checked deployment evidence is pending - to be confirmed by maintainer.

## Anti-Copy Notes

no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording. Casbin model files, policy rows, matcher expression, role examples, enforcer examples, and adapter examples must not be copied or closely adapted.

## OpenERP Takeaways

Casbin is a practical reference for tenant policy storage and enforcement adapters. The OpenERP design should keep the user-facing policy model tied to ERP actions, tenant roles, delegated identities, and approval gates, rather than importing external model wording or file structure.
