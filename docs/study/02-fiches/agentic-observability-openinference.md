# OpenInference

## Evidence

- Repository URL: `https://github.com/Arize-ai/openinference`.
- Official site: `https://arize-ai.github.io/openinference/`.
- Corpus check date: 2026-05-11.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: pending - to be confirmed by maintainer; the corpus records Apache-2.0 confirmation through GitHub API.
- Declared license: Apache-2.0.
- Reuse classification: usable.
- Role: OpenTelemetry semantic conventions and instrumentation references for LLM and agent observability.

## License And Reuse

OpenInference is usable under Apache-2.0, with notice obligations if source is imported. Because OpenERP targets MIT, the preferred route is to use the convention family as compatibility guidance while authoring OpenERP-facing names and audit records independently.

The project is a strong reference for interoperable trace semantics, not a source of OpenERP product wording.

## Functional Role

OpenInference defines conventions for representing LLM and agent activity in telemetry. It helps align model calls, tool calls, inputs, outputs, and related events with OpenTelemetry-compatible backends.

For OpenERP, this is relevant because the agent runtime should emit traces that other observability tools can understand without locking OpenERP to one vendor.

## Integration Suitability With `@entropiq`

Suitability is strong for standardizing the telemetry layer. `@entropiq` already has trace-oriented services, but the audit identifies missing eval hooks, audit trail mapping, and rollback hooks. OpenInference can inform the bridge between runtime events and standard telemetry.

OpenERP should keep its business audit model separate from telemetry conventions. The same event can produce a trace for operations and an audit record for tenant review.

## OpenERP Trust Tier Fit

OpenInference-style conventions are platform-level and apply across all trust tiers. Higher-exposure tiers need more complete telemetry around publisher identity, module version, sandbox boundary, policy decision, human approval, and rollback status.

Private-to-tenant use can start with core traces and audit links. Partner and public community use should require complete telemetry before activation.

## Architecture Notes

- Traces: supported through LLM and agent telemetry conventions.
- Evals: eval convention coverage is pending - to be confirmed by maintainer.
- Audit trails: telemetry can carry audit context, but the durable audit trail must use OpenERP-owned records.
- Rollback hooks: pending - to be confirmed by maintainer.

OpenERP should map `@entropiq` events into standard telemetry while keeping tenant data minimization, redaction, and bilingual review language under OpenERP control.

## Self-Hosted And Kubernetes

OpenInference is primarily a convention and instrumentation reference, not a standalone OpenERP service. Self-hosting depends on OpenERP services, collectors, and selected observability backends.

In Kubernetes, the practical work is collector deployment, egress control, secret isolation, and payload redaction around trace export.

## Anti-Copy Notes

MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals are forbidden reuse surfaces. No semantic convention name, attribute identifier, instrumentation example, trace shape, or documentation wording may be copied verbatim into OpenERP product specifications.

OpenERP must express telemetry and audit fields in OpenERP wording, with compatibility mapping kept as an implementation concern.

## OpenERP Takeaways

- Use OpenInference as a compatibility reference for OTel-aligned agent traces.
- Keep OpenERP audit records separate from telemetry export.
- Require traces, eval hooks, audit trails, and rollback hooks before broad marketplace exposure.
- Avoid adopting convention wording as product or user-facing language.
