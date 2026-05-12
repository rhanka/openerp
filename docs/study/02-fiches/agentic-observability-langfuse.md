# Langfuse

## Evidence

- Repository URL: `https://github.com/langfuse/langfuse`.
- Official site: `https://langfuse.com/docs`.
- Corpus check date: 2026-05-11.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: repository root `LICENSE` for the core, with enterprise directories separately constrained as recorded in the corpus.
- Declared license: MIT open-core; enterprise directories under a proprietary Enterprise License.
- Reuse classification: cautious inspiration.
- Role: self-hostable GenAI observability platform for traces, prompt versions, eval workflows, and dataset management.

## License And Reuse

Langfuse core is compatible with the MIT target at the license-family level, but the open-core boundary requires caution. Only the MIT core can inform OpenERP design; enterprise directories and commercial features are outside the reuse path.

The permitted posture is cautious inspiration for observability shape, not source import or product expression. OpenERP should author its own trace model, audit wording, and review surfaces.

## Functional Role

Langfuse shows the shape of a self-hosted observability plane for LLM and agent work: capture execution traces, keep prompt versions, attach eval runs, and support later review.

For OpenERP, the relevant role is trace review for agent actions that touch CRM, billing, accounting, projects, and customer communication.

## Integration Suitability With `@entropiq`

Suitability is partial. The `@entropiq` audit notes existing chat trace services, so the runtime has a starting point. Missing pieces include explicit eval hooks, tenant-facing audit records, rollback hooks, and governance links from trace records to policy decisions.

An OpenERP integration should emit trace events from the existing agent loop, tool calls, and policy decisions, then store audit-relevant facts in OpenERP-owned tables. Langfuse should not dictate the trace object names or review UI.

## OpenERP Trust Tier Fit

Langfuse-style observability belongs to the core platform layer. It should cover private-to-tenant, curated partner, and public community agents with increasing retention, review, and escalation requirements.

Private agents need trace review and tenant admin visibility. Partner and community agents need additional audit trails, release-linked trace comparison, and rollback evidence.

## Architecture Notes

- Traces: supported by the candidate as a core capability; OpenERP should emit traces for agent turns, model calls, tool calls, policy decisions, and human decisions.
- Evals: supported by the candidate through eval workflows and datasets; OpenERP must define its own eval criteria and data shape.
- Audit trails: trace history can inform audit review, but OpenERP needs a separate tenant audit record with durable business references.
- Rollback hooks: prompt versioning suggests a version-aware rollback path, but concrete hook behavior is pending - to be confirmed by maintainer.

## Self-Hosted And Kubernetes

The corpus records Langfuse as self-hostable. Exact Kubernetes artifacts and supported production topology are pending - to be confirmed by maintainer.

For OpenERP, self-hosting should preserve tenant data residency, encrypted secrets, export controls, and operational separation between observability storage and customer-facing ERP workloads.

## Anti-Copy Notes

MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals are forbidden reuse surfaces. No trace field wording, eval dataset shape, prompt review wording, dashboard layout, or enterprise feature expression may be copied.

OpenERP observability must use OpenERP business object names, tenant audit language, and bilingual review text.

## OpenERP Takeaways

- Use Langfuse only as cautious inspiration for self-hosted trace review and eval lifecycle.
- Keep enterprise directories out of the reuse path.
- Connect traces to OpenERP audit records, policy decisions, and rollback evidence.
- Build OpenERP-native review wording instead of borrowing observability product language.
