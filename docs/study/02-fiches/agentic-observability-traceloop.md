# OpenLLMetry

## Evidence

- Repository URL: `https://github.com/traceloop/openllmetry`.
- Official site: `https://www.traceloop.com/openllmetry`.
- Corpus check date: 2026-05-11.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: repository root `LICENSE`, as recorded in the corpus.
- Declared license: Apache-2.0.
- Reuse classification: usable.
- Role: OpenTelemetry-based SDK for LLM observability, traces, spans, provider instrumentation, and vendor-neutral export.

## License And Reuse

OpenLLMetry is usable under Apache-2.0, with notice obligations if source is imported. For an MIT-target OpenERP core, the preferred posture is to learn from the OTel-native integration shape and author OpenERP instrumentation independently.

The project is most valuable as a reference for using standard telemetry plumbing rather than creating a proprietary trace format.

## Functional Role

OpenLLMetry instruments LLM provider calls and agent frameworks so traces and spans can be sent to OpenTelemetry-compatible backends.

For OpenERP, the functional role is to keep agent observability portable: `@sentropic` should emit standard telemetry events that can reach the backend chosen by an OpenERP operator.

## Integration Suitability With `@sentropic`

Suitability is strong for instrumentation design. `@sentropic` has model providers, tool orchestration, queue-backed execution, streaming, and chat traces. Those events can be mapped into OTel spans without binding OpenERP to one observability product.

The integration should separate telemetry emission from audit persistence. OTel traces help operations and debugging; OpenERP audit records remain the legal and business record.

## OpenERP Trust Tier Fit

OpenLLMetry-style instrumentation belongs in the platform runtime and should apply to all trust tiers. Partner and community agents need additional trace dimensions for publisher identity, module version, policy decision, sandbox boundary, and rollback path.

Private-to-tenant deployments can start with core agent traces and model-call traces, then expand toward full marketplace evidence.

## Architecture Notes

- Traces: supported through OpenTelemetry spans and export.
- Evals: eval workflow support is pending - to be confirmed by maintainer.
- Audit trails: traces can carry audit context, but durable audit records must remain OpenERP-owned.
- Rollback hooks: pending - to be confirmed by maintainer.

OpenERP should define an internal event map for model calls, tool calls, policy decisions, human approvals, failures, and rollback actions, then emit those events through standard telemetry.

## Self-Hosted And Kubernetes

OpenLLMetry is an SDK rather than a full OpenERP observability service. Self-hosting depends on the selected collector and backend.

In Kubernetes, OpenERP can run telemetry collectors and route spans to the chosen backend while keeping tenant secrets and raw business payloads controlled by OpenERP policy.

## Anti-Copy Notes

MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals are forbidden reuse surfaces. No instrumentation patch configuration, attribute enumeration, example pipeline, backend setup text, or trace naming pattern may be copied.

OpenERP must author its own telemetry event names and redaction rules in OpenERP wording.

## OpenERP Takeaways

- Prefer OTel-native observability for portability across backends.
- Keep telemetry and legal audit records as related but separate concerns.
- Instrument `@sentropic` model calls, tool calls, policy decisions, and supervision outcomes.
- Use the SDK as a design reference unless a later legal review approves source import.
