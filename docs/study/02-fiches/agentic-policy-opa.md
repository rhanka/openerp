# Open Policy Agent

## Evidence

- Repository URL: https://github.com/open-policy-agent/opa.
- Official site: https://www.openpolicyagent.org.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: pending - to be confirmed by maintainer; `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md` record Apache-2.0 confirmed through GitHub API on 2026-05-11.
- Declared license: Apache-2.0.
- Reuse classification: corpus `usable`; OpenERP posture `cautious inspiration` for policy primitive design under `docs/study/12-agentic/license-posture.md`.
- Primary role: general-purpose declarative policy engine for pre-call and post-call authorization decisions, embeddable as a library or service.

## License And Reuse

Apache-2.0 is compatible with the MIT-targeted OpenERP direction when notice and patent obligations are tracked. OPA can inform the functional shape of a policy decision point, decision audit event, and tool-call enforcement lifecycle. The policy language surface, rule examples, built-in names, test data, examples, and configuration expression are excluded from reuse.

## Functional Role

OPA is the broad policy-engine reference for the runtime safety gap identified in the `@entropiq` audit: no pre-call or post-call policy hook exists today. For OpenERP, the relevant function is a tenant-aware decision layer that receives an attempted agent action, evaluates tenant policy, and returns permit, block, or escalate before the action runs.

## Integration Suitability With `@entropiq`

Integration Suitability With @entropiq: strong at the boundary level.
The fit is strong at the boundary level because `@entropiq` already has typed tool calling and durable agent execution, but lacks an interception point around each tool call. OPA is most relevant as an external or embedded decision component wrapped by OpenERP-authored adapters. The adapter contract, data envelope, and audit vocabulary must be designed from OpenERP tenant identity, service principal, and on-behalf-of requirements.

## OpenERP Trust Tier Fit

OPA maps to all three trust tiers. Private-to-tenant modules need tenant policy and minimal gating. Curated partner modules add publisher checks and policy review gates. Public community modules need registry metadata, periodic review, emergency block, and rollback support. OPA is a policy primitive candidate, not a complete marketplace safety system.

## Architecture Notes

The corpus describes OPA as a declarative policy engine that can run as a library or sidecar and produce structured decisions. In OpenERP architecture terms, the useful pattern is a policy decision point separate from business execution, with explicit input facts from tenant, actor, agent, tool, resource, amount, schedule, and requested effect. The exact OpenERP input and output envelope remains an OpenERP design artifact.

## Self-Hosted And Kubernetes

The corpus records strong self-hosted and Kubernetes relevance for OPA. OpenERP can evaluate it as a self-managed runtime-safety component in a Kubernetes deployment, but no external deployment manifest or policy file may be used as a source artifact. Exact checked deployment evidence is pending - to be confirmed by maintainer.

## Anti-Copy Notes

no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording. OPA policy files, rule examples, built-in function names, evaluation examples, tests, sample data, sidecar examples, and configuration expression must not be copied or closely adapted.

## OpenERP Takeaways

OPA is a broad general reference for the missing policy decision layer, but OpenERP should treat it as an enforcement model reference rather than a language to imitate. The implementation decision should start from OpenERP tenant identity, audit, approval, and action-risk requirements, then choose whether OPA is embedded, called as a service, or replaced by an OpenERP-native policy component.
