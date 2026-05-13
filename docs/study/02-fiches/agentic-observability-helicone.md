# Helicone

## Evidence

- Repository URL: `https://github.com/Helicone/helicone`.
- Official site: `https://www.helicone.ai`.
- Corpus check date: 2026-05-11.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: repository root `LICENSE`, as recorded in the corpus.
- Declared license: Apache-2.0.
- Reuse classification: usable.
- Role: LLM observability proxy for request logging, cost tracking, prompt templates, experiments, and self-hosted deployment.

## License And Reuse

Helicone is usable under Apache-2.0, with notice obligations if code is ever imported. Because OpenERP targets MIT, this fiche treats Helicone as a functional design reference rather than a source import path.

The most relevant reusable idea is proxy-based capture: observing LLM traffic near the transport layer while keeping the agent loop clean.

## Functional Role

Helicone sits between an application and LLM providers, recording request and response activity, cost information, prompt variants, and experiment context.

For OpenERP, this role is relevant where `@sentropic` calls multiple model providers and needs consistent per-tenant visibility without adding custom tracing code to every provider adapter.

## Integration Suitability With `@sentropic`

Suitability is strong as an architectural option. `@sentropic` already has provider adapters and chat trace services; a proxy-inspired layer could capture model calls consistently across providers while the runtime emits richer agent and tool events internally.

The OpenERP design should decide whether transport capture, in-loop trace emission, or a hybrid posture fits tenant isolation, policy decisions, and rollback evidence.

## OpenERP Trust Tier Fit

Helicone-style capture is a core platform feature, not a mini-module. It should apply across all trust tiers, with stricter retention and review requirements for partner and community agents.

Private-to-tenant deployments can begin with tenant-visible request records and cost controls. Partner and community paths require trace linkage to module version, publisher identity, policy decision, and rollback status.

## Architecture Notes

- Traces: proxy request records can supply model-call traces; OpenERP still needs agent-turn, tool-call, and policy-decision traces.
- Evals: explicit eval workflow support is pending - to be confirmed by maintainer.
- Audit trails: request logs can support audit review, but OpenERP must maintain tenant audit records with business object links.
- Rollback hooks: prompt or experiment version fallback behavior is pending - to be confirmed by maintainer.

## Self-Hosted And Kubernetes

The corpus records Helicone as self-hostable. Exact Kubernetes production posture is pending - to be confirmed by maintainer.

For OpenERP, a self-hosted proxy or proxy-inspired component must enforce tenant separation, provider secret isolation, request redaction, and controlled export to the observability backend.

## Anti-Copy Notes

MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals are forbidden reuse surfaces. No request logging schema, cost expression, prompt template wording, experiment configuration, dashboard text, or UI flow may be copied.

OpenERP must define its own model-call record, tenant cost view, and bilingual audit wording.

## OpenERP Takeaways

- Consider a proxy-inspired layer for consistent multi-provider LLM capture.
- Keep business audit records separate from raw request logs.
- Pair transport observability with in-loop traces for tool calls, policy decisions, and human supervision.
- Use Apache-2.0 material only with explicit notice handling if any source import is later approved.
