# Phoenix by Arize

## Evidence

- Repository URL: `https://github.com/Arize-ai/phoenix`.
- Official site: `https://arize.com/docs/phoenix`.
- Corpus check date: 2026-05-11.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: repository root `LICENSE`, as recorded in the corpus.
- Declared license: Elastic-2.0.
- Reuse classification: functional reference only.
- Role: GenAI observability platform for traces, spans, eval workflows, hallucination checks, and embedding visualization.

## License And Reuse

Phoenix is constrained by Elastic-2.0. The corpus marks it as functional reference only because hosted or managed-service restrictions are not aligned with the OpenERP multi-tenant deployment model.

OpenERP should not import source, copy schemas, or mirror product expression from Phoenix. The project can only inform the set of observability capabilities that a mature platform may need.

## Functional Role

Phoenix represents a full observability workbench for agent and LLM execution review. Its relevance to OpenERP is conceptual: traces, spans, eval workflows, and investigation views for debugging and compliance review.

The useful lesson is that business agents need more than logs; they need structured execution records tied to model calls, tool calls, evaluation outcomes, and human decisions.

## Integration Suitability With `@entropiq`

Suitability is limited to design comparison. `@entropiq` already records chat traces, but it lacks explicit eval hooks, durable tenant audit trails, and rollback hooks. Phoenix can help frame those missing capabilities, but its license keeps it outside the implementation path.

OpenERP should implement Phoenix-like needs through OpenERP-owned data models and permissive telemetry standards.

## OpenERP Trust Tier Fit

Phoenix is not suitable as a reusable building block for any OpenERP trust tier. It is a functional reference for the core observability expectations that all tiers will need.

Private agents need baseline traces and audit trails. Partner and community agents need additional release correlation, escalation evidence, and rollback records, all implemented in OpenERP wording and data structures.

## Architecture Notes

- Traces: supported by the candidate through traces and spans.
- Evals: supported by the candidate through eval workflows.
- Audit trails: audit-grade retention and tenant audit mapping are pending - to be confirmed by maintainer.
- Rollback hooks: pending - to be confirmed by maintainer.

OpenERP should prefer OpenTelemetry-compatible traces and an OpenERP-owned audit store instead of adopting a Phoenix-specific format.

## Self-Hosted And Kubernetes

Self-hosted and Kubernetes posture for this study is pending - to be confirmed by maintainer. Even if a deployment path exists, the Elastic-2.0 posture keeps Phoenix outside direct reuse for OpenERP.

OpenERP should treat deployment details as benchmark context only.

## Anti-Copy Notes

MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals are forbidden reuse surfaces. No Phoenix trace schema, eval data shape, investigation workflow text, visualization expression, or dashboard wording may be reused.

OpenERP must express observability through its own agent, tenant, policy, and ERP object vocabulary.

## OpenERP Takeaways

- Treat Phoenix as a capability benchmark only.
- Use permissive telemetry conventions and OpenERP-owned audit records for implementation.
- Do not carry over Elastic-licensed code, schemas, UI expression, or documentation wording.
- Ensure every future observability design includes traces, evals, audit trails, and rollback hooks.
