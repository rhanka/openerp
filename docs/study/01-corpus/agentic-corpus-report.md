# Agentic Corpus Report

## Progress

Fait: 24 agentic open source candidate projects appended to `docs/study/01-corpus/candidates.csv`; licenses verified via `gh api` and LICENSE file reads on 2026-05-11; all five agentic categories populated; reuse classifications assigned per `docs/study/00-methodology/license-risk-matrix.md`; this report written with all required sections.
À faire: remaining Phase 1 artifacts (proprietary references, startups deep research, license posture); Phase 1 completion at approximately 57%.
Attendu: no decision needed. Next action is Task 4 (agentic proprietary references and startups deep research), which can proceed immediately because it is independent of this file.

## Scope

This report covers the agentic extension to the OpenERP open source corpus, as
specified in section 15 of
`docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`. The
corpus extension focuses on five categories of open source tooling that are
directly relevant to building, governing, and observing specialized business
agents in OpenERP using the `@entropiq` runtime: agent frameworks, policy
engines, sandbox runtimes, MCP interop, and GenAI observability.

The extension does not replace the existing ERP, CRM, and collaboration corpus.
It adds a parallel layer of evidence for the design spaces in Phases 2 and 3 of
the agentic study. Every candidate here is treated as a public evidence source
and benchmark, not as a runtime dependency or a source for code, prompts, tool
schemas, or workflow definitions.

The product filter remains ERP/CRM-first. Candidates are selected for their
relevance to the concrete operational problems OpenERP must address: policy
enforcement on agent tool calls, sandboxing mini-modules at a trust-proportional
boundary, interoperating with external tools via MCP, and providing the trace
and audit coverage required for compliant autonomous and conversational agents.

## Methodology

Candidates were identified from the agentic study extension design specification
(section 7 and 11) and from the known landscape of open source agent tooling as
of the study date. Discovery did not attempt an exhaustive enumeration of the
agent framework ecosystem; it targeted the specific primitives the OpenERP
agentic design requires.

Licenses were verified on 2026-05-11 by querying the GitHub API for each
repository (`gh api repos/<owner>/<repo> -q '.license.spdx_id'`) and, where the
API returned `NOASSERTION` or `Other`, by reading the LICENSE file content
directly (`gh api repos/<owner>/<repo>/contents/LICENSE -q '.content'` and
base64-decoding). Open-core projects were identified by checking for `ee/`
directories with separate license files, consistent with the langfuse and mastra
repository structures observed.

Reuse classifications follow `docs/study/00-methodology/license-risk-matrix.md`:

- MIT, Apache-2.0, ISC: `usable` after obligations are tracked.
- MIT open-core or Apache-2.0 open-core with a proprietary `ee/` layer:
  `cautious inspiration` for the open core only.
- Elastic-2.0: `functional reference only` because the SaaS resale restriction
  is incompatible with an MIT-targeted product.
- Proprietary platform with an open SDK: `functional reference only`.

No candidate is classified `excluded` in this agentic extension because all
selected projects have at least a permissive open-source core or a publicly
accessible specification, making them usable as functional references at minimum.

Date checked for all rows: 2026-05-11.

## Agent Framework Candidates

**LangGraph** (`langchain-ai/langgraph`, MIT, `usable`) is a graph-based
stateful agent orchestration library for Python and JavaScript. Its core
abstraction is a directed graph of agent nodes, with persistent checkpointing
between steps and support for human-in-the-loop approval gates. The graph
topology enables multi-actor workflows where individual nodes communicate via
shared state. For OpenERP, the relevant functional patterns are the
checkpointing model (applicable to the autonomous agent supervision design
space) and the human-approval node pattern (applicable to the conversational
agent mode). The MIT license confirmed on 2026-05-11 makes this `usable` for
functional inspiration after obligations are recorded. No code, graph
definitions, or prompt templates may be copied.

**CrewAI** (`crewAIInc/crewAI`, MIT, `usable`) is a Python framework for
role-based multi-agent collaboration. Its model assigns each agent a role, a
goal, and a backstory, and organizes them into crews executing a sequence or
hierarchy of tasks. For OpenERP, the relevant patterns are role-scoped tool
assignment (each agent receives only the tools its role requires) and the
crew-as-bounded-context model (which maps naturally to mini-module scope).
The MIT license confirmed on 2026-05-11 makes this `usable`. No role
definitions, task configurations, or workflow templates may be copied.

**AutoGen** (`microsoft/autogen`, MIT for code, `usable`) is a Microsoft
framework for conversational multi-agent systems supporting group chat
patterns, code execution, and human feedback integration. The top-level
LICENSE file is CC-BY-4.0 (documentation); the source code is under
LICENSE-CODE, which is MIT, confirmed on 2026-05-11. The functional relevance
for OpenERP lies in its event-driven multi-agent architecture (applicable to
the autonomous event-driven mode) and its human feedback integration pattern
(applicable to the conversational mode escalation path). No code, agent
configurations, or group-chat templates may be copied.

**OpenAI Agents SDK** (`openai/openai-agents-python`, MIT, `usable`) is a
lightweight Python SDK for building agents with handoffs, guardrails, and
built-in tracing. Its handoff mechanism — where one agent transfers control to
another within a typed contract — is directly relevant to the workflow-typed
agent mode in OpenERP. The guardrails primitive, which intercepts inputs and
outputs to enforce constraints, is functionally adjacent to the policy hook
design space. The MIT license confirmed on 2026-05-11 makes this `usable`. No
system prompts, guardrail definitions, or handoff schemas may be copied.

**Mastra** (`mastra-ai/mastra`, Apache-2.0 open-core, `cautious inspiration`)
is a TypeScript agent framework with built-in workflow definitions, memory,
RAG integration, and tool binding. The open core under Apache-2.0 is the
relevant study surface. The `ee/` directory under a proprietary Enterprise
License covers authentication and advanced features not relevant to this study.
The TypeScript-native design is directly relevant because `@entropiq` is also
TypeScript. For OpenERP, the relevant functional patterns are the workflow
definition model and the memory management approach. Classification is
`cautious inspiration` because of the mixed license structure; only the
Apache-2.0 core may inform study findings. No workflow definitions, agent
configurations, or memory schemas may be copied.

**Vercel AI SDK** (`vercel/ai`, Apache-2.0, `usable`) is a TypeScript SDK for
building AI-powered applications with streaming text generation, tool calling,
and multi-step agent loops across multiple model providers. It is TypeScript-
native and provider-agnostic, making it functionally adjacent to the
`@entropiq` runtime. For OpenERP, the relevant patterns are the provider-
agnostic tool-call abstraction and the streaming agent loop model. The
Apache-2.0 license confirmed on 2026-05-11 makes this `usable`. No tool
schemas, prompt templates, or streaming protocol expressions may be copied.

**Genkit** (`genkit-ai/genkit`, Apache-2.0, `usable`) is a TypeScript and Go
framework for building typed AI flows, with built-in evaluation, tracing, and
a Firebase-backed deployment option. Its flow abstraction — a typed,
observable unit of AI work — is relevant to the workflow-typed agent mode in
OpenERP. The evaluation framework is relevant to the eval dataset design space.
The Apache-2.0 license confirmed on 2026-05-11 makes this `usable`. No flow
definitions, evaluation prompts, or trace schema expressions may be copied.

**Inngest Agent Kit** (`inngest/agent-kit`, Apache-2.0, `usable`) is a
TypeScript agent framework built on Inngest's durable function infrastructure.
Networks of agents execute as event-driven durable functions, with built-in
retry, step-level persistence, and tool routing. The durable-by-default
execution model is directly relevant to the OpenERP autonomous event-driven
agent mode, where job persistence and retry semantics are required. The
Apache-2.0 license confirmed on 2026-05-11 makes this `usable`. No agent
network definitions, tool routing configurations, or event schema expressions
may be copied.

**BAML** (`BoundaryML/baml`, Apache-2.0, `usable`) is a domain-specific
language for defining structured LLM function interfaces with type-safe inputs
and outputs, and a code generator that produces typed bindings for multiple
languages. Its approach to treating LLM calls as typed functions is relevant
to the tool definition model in `@entropiq`. For OpenERP, the relevant insight
is the separation between prompt structure and calling convention as a typed
contract. The Apache-2.0 license confirmed on 2026-05-11 makes this `usable`.
The DSL surface syntax, prompt templates, and generated function signatures
must not be copied.

**PydanticAI** (`pydantic/pydantic-ai`, MIT, `usable`) is a Python agent
framework using Pydantic for type-safe tool and result definitions, with
dependency injection for test and production configurations and multi-model
support. Its emphasis on typed outputs and dependency injection maps well to
the OpenERP need for deterministic, testable tool results in workflow-typed
agents. The MIT license confirmed on 2026-05-11 makes this `usable`. No tool
definitions, result validators, or injection configurations may be copied.

## Policy Engine Candidates

**Open Policy Agent** (`open-policy-agent/opa`, Apache-2.0, `usable`) is a
general-purpose declarative policy engine using the Rego policy language. It
supports pre- and post-decision authorization, is embeddable as a library or
sidecar, and produces structured audit decisions. For OpenERP, OPA is the most
widely deployed reference for declarative per-tool-call policy enforcement —
the primary capability gap identified in the `@entropiq` audit. The Apache-2.0
license confirmed on 2026-05-11 makes this `usable`. The Rego DSL syntax,
policy example libraries, and built-in function signatures must not be copied;
only the enforcement model and decision log structure may inform the OpenERP
policy design space.

**Cedar** (`cedar-policy/cedar`, Apache-2.0, `usable`) is a policy language
and evaluation engine developed by AWS, designed for entity-based
authorization with formal verification properties. Its PARC (Principal,
Action, Resource, Context) authorization model and static analysis guarantees
are relevant to the OpenERP identity delegation design space, particularly the
on-behalf-of and service principal patterns. The Apache-2.0 license confirmed
on 2026-05-11 makes this `usable`. No policy definitions, entity schemas, or
evaluation API shapes may be copied.

**Casbin** (`casbin/casbin`, Apache-2.0, `usable`) is a multi-language access
control framework supporting RBAC, ABAC, and other models through a
configurable PERM (Policy, Effect, Request, Matchers) metamodel. Its broad
language support (Go, JavaScript, Rust, Python, Java) and the separation of
model from policy data are relevant to the OpenERP multi-tenant policy design
space, where the same enforcement model must work across tenant boundaries.
The Apache-2.0 license confirmed on 2026-05-11 makes this `usable`. The
official repository is at `apache/casbin` under the Apache Software
Foundation. No model files, policy templates, or enforcer API shapes may be
copied.

## Sandbox Runtime Candidates

**E2B** (`e2b-dev/E2B`, Apache-2.0, `usable`) is a cloud sandbox runtime for
AI agents providing isolated container environments with filesystem, process,
and network access, accessible via a Python or TypeScript SDK. For OpenERP,
E2B's sandboxed code execution model is the primary functional reference for
agent tool isolation when a mini-module must execute arbitrary code within a
controlled boundary. The Apache-2.0 license confirmed on 2026-05-11 makes this
`usable`. No SDK configuration expressions, container specification templates,
or example agent workflows may be copied.

**Modal** (`modal-labs/modal-client`, proprietary platform / Apache-2.0 SDK,
`functional reference only`) is a serverless cloud platform for AI and compute
workloads. The client Python SDK is Apache-2.0, but the platform infrastructure
is proprietary and cloud-only, with no self-hosted option. For OpenERP, the
Modal platform is a functional reference for how serverless execution
boundaries and GPU-backed containers can be provided as a managed sandbox
layer. Classification is `functional reference only` because the platform
dependency is incompatible with the OpenERP self-hosted deployment posture.
No SDK configuration, deployment definitions, or platform-specific constructs
may be copied.

**isolated-vm** (`laverdet/isolated-vm`, ISC, `usable`) is a Node.js native
addon that provides V8 isolate-based sandboxing with strict memory and CPU
limits and inter-isolate message passing. Because `@entropiq` is TypeScript on
Node.js, isolated-vm is the most directly applicable candidate for in-process
isolation of agent mini-modules at the private-to-tenant marketplace tier,
where a full container boundary may be disproportionate. The ISC license
confirmed on 2026-05-11 makes this `usable`. No isolate configuration
templates or inter-isolate communication schemas may be copied.

**gVisor** (`google/gvisor`, Apache-2.0, `usable`) is a Linux kernel
emulation sandbox by Google providing OCI-compatible container security through
syscall interception rather than hardware virtualization. It is the reference
implementation for OS-level isolation of untrusted container workloads. For
OpenERP, gVisor is the functional reference for the strictest sandbox tier —
public-community mini-modules requiring a full OS isolation boundary. The
Apache-2.0 license confirmed on 2026-05-11 makes this `usable`. No sandbox
configuration files, runsc flags, or policy expression templates may be copied.

## MCP Interop Candidates

**MCP Specification** (`modelcontextprotocol/modelcontextprotocol`,
Apache-2.0 transitioning from MIT, `usable`) is the canonical specification
for the Model Context Protocol, the open interoperability standard for tool
discovery, invocation, and authentication between agents and external tool
servers. As identified in the `@entropiq` audit, MCP support is the most
significant technical gap in the current runtime relative to OpenERP needs.
The specification defines the wire protocol, capability negotiation, and server
and client posture that any OpenERP MCP implementation must follow. The
license confirmed on 2026-05-11 is undergoing a transition: new contributions
are Apache-2.0; contributions from original MIT authors not yet relicensed
remain MIT. The study treats the specification as `usable` for protocol
design reference. No server names, tool catalog definitions, authentication
flow expressions, or registry UI patterns from reference implementations may
be copied.

**MCP Registry** (`modelcontextprotocol/registry`, Apache-2.0 transitioning
from MIT, `usable`) is the reference implementation of a community registry
for listing and discovering MCP servers. For OpenERP, the MCP registry is
relevant to the marketplace design space: the public-community mini-module
tier requires a registry-level discovery and signing protocol compatible with
the broader MCP ecosystem. The license status mirrors the MCP specification
transition, confirmed on 2026-05-11. Classification is `usable` for protocol
and data-model reference only. Registry UI copy, onboarding flow expressions,
and server catalog category labels must not be copied.

## GenAI Observability Candidates

**Langfuse** (`langfuse/langfuse`, MIT open-core, `cautious inspiration`) is a
self-hostable LLM observability platform covering trace capture, prompt
versioning, evaluation pipelines, and dataset management. The open core is MIT;
the `ee/` directory contains enterprise features under a proprietary Enterprise
License, confirmed on 2026-05-11. For OpenERP, the core trace data model and
the self-hosted deployment pattern are the relevant functional references for
the GenAI observability design space. Classification is `cautious inspiration`
for the MIT core only; the enterprise layer must not be studied as a reuse
source. No trace schema expressions, eval dataset formats, or prompt versioning
UI patterns may be copied.

**Phoenix by Arize** (`Arize-ai/phoenix`, Elastic-2.0, `functional reference
only`) is an LLM and agent observability platform providing traces, spans,
evaluation pipelines, hallucination detection, and embedding visualization.
The Elastic License 2.0 confirmed on 2026-05-11 prohibits providing the
software to third parties as a hosted or managed service, which is incompatible
with the OpenERP multi-tenant deployment model. Classification is `functional
reference only`: the published trace and evaluation design patterns may inform
the OpenERP observability design space, but no code, schema, or expression from
the project may be reused or adapted.

**Helicone** (`Helicone/helicone`, Apache-2.0, `usable`) is an LLM
observability proxy that captures and annotates every request and response,
with cost tracking, prompt templates, experiments, and a self-hosted
deployment path. For OpenERP, the proxy-based interception model is relevant
to the observability design: capturing LLM calls at the transport layer
without modifying the `@entropiq` agent loop is an alternative to in-loop
trace instrumentation. The Apache-2.0 license confirmed on 2026-05-11 makes
this `usable`. No request logging schemas, cost model expressions, or prompt
experiment configurations may be copied.

**OpenLLMetry** (`traceloop/openllmetry`, Apache-2.0, `usable`) is an
OpenTelemetry-based LLM observability SDK that instruments LLM provider calls
and agent frameworks to produce OTel-compatible traces and spans. Its vendor-
neutral, OTel-native approach is relevant to the OpenERP observability design
because it allows standard observability backends (Jaeger, Grafana, Honeycomb,
Phoenix) to receive agent traces without proprietary lock-in. The Apache-2.0
license confirmed on 2026-05-11 makes this `usable`. No instrumentation patch
configurations, trace attribute enumerations, or example pipeline definitions
may be copied.

**OpenInference** (`Arize-ai/openinference`, Apache-2.0, `usable`) is an
OpenTelemetry semantic conventions specification for LLM and agent
observability, defining the standard span attributes, event types, and
measurement conventions for AI workloads. For OpenERP, OpenInference is the
primary functional reference for the trace attribute schema that the agent
runtime and policy engine should emit, enabling interoperability with any OTel-
compatible observability backend. The Apache-2.0 license confirmed on 2026-05-11
makes this `usable`. The semantic convention names and attribute identifiers
are study references only; they must not be copied verbatim into the OpenERP
observability specification.

## License Posture Summary

All 24 candidates were verified on 2026-05-11. The breakdown by declared license
and reuse classification:

| License family | Count | Classification assigned |
| --- | --- | --- |
| MIT | 4 | `usable` |
| Apache-2.0 | 13 | `usable` |
| ISC | 1 | `usable` |
| MIT open-core (+ proprietary ee/) | 1 | `cautious inspiration` |
| Apache-2.0 open-core (+ proprietary ee/) | 1 | `cautious inspiration` |
| Apache-2.0 SDK / proprietary platform | 1 | `functional reference only` |
| Elastic-2.0 | 1 | `functional reference only` |
| Apache-2.0 transitioning from MIT | 2 | `usable` |

No candidate received an `Unknown` classification; all licenses were confirmed
by direct evidence (GitHub API response or LICENSE file read). No candidate was
`excluded` because every selected project offers at least a publicly available
permissive open-source core or specification that can serve as a functional
reference.

The open-core pattern (MIT or Apache-2.0 core with a proprietary enterprise
layer) is present in three candidates: Mastra, Langfuse, and — to a lesser
degree — Modal (where the open element is the client SDK rather than an
enterprise tier). Study work on these projects must be confined to the open-core
layer and must not reference enterprise features, configuration templates, or
capability descriptions sourced from the proprietary layer.

## Anti-Copy Notes

All candidate projects in this agentic corpus are evidence and benchmark
sources only, consistent with the posture stated in section 13 of the design
specification and in `docs/study/08-anti-copy/anti-copy-dossier.md`. The
following categories of material from every project in this corpus must not be
copied, closely adapted, or used as the direct basis for any OpenERP artifact,
specification, or implementation:

- **Prompts**: system prompts, agent personas, role descriptions, backstories,
  instruction templates, few-shot examples, chain-of-thought patterns,
  evaluation prompts, and demo prompts from any framework or platform.
- **Tool schemas**: tool definitions, function signatures, parameter
  descriptions, parameter names, JSON Schema tool definitions, BAML function
  definitions, tool examples, and any schema expression that describes an
  agent's callable operations in a project-specific vocabulary.
- **Workflow definitions**: agent graph topology files, flow definitions,
  crew configurations, network definitions, recipe templates, automation
  blueprints, and any structured artifact that encodes a multi-step agent
  execution plan.
- **Demos and examples**: demo tasks, example notebooks, tutorial agents,
  example pipelines, golden traces, and onboarding examples packaged with any
  framework or platform.
- **Eval datasets**: evaluation input-output pairs, benchmark datasets, eval
  prompts, golden trace collections, and any dataset used to measure or
  demonstrate framework capability.
- **Policy and sandbox expressions**: Rego policy files, Cedar policy files,
  Casbin model files, sandbox configuration templates, isolate configuration
  scripts, and any declarative artifact encoding project-specific enforcement
  logic.
- **Registry and marketplace expressions**: MCP server names, MCP tool catalog
  structures, registry category labels, marketplace UI copy, onboarding text,
  and partner program descriptions from any registry or marketplace project.

Permitted study output is independently authored functional analysis: the
business capabilities an agent brings to an ERP or CRM workflow, the
enforcement model a policy engine applies, the isolation contract a sandbox
provides, and the trace attributes an observability layer captures — all
expressed in OpenERP's own terminology, rewritten from evidence rather than
transcribed from source.

## OpenERP Takeaways

The agentic open source landscape as of 2026-05-11 is dominated by permissive
licenses (MIT, Apache-2.0, ISC), which places the majority of the corpus in the
`usable` tier for functional inspiration. The open-core pattern is present but
confined to three projects; for each, the open layer is sufficient for the
study's purposes.

The five categories of candidates map directly to the five capability gaps
identified in the `@entropiq` audit: agent frameworks illuminate the design
space for the agent loop and multi-agent coordination; policy engines provide
the functional reference for declarative pre- and post-tool-call enforcement;
sandbox runtimes address the isolation requirement by trust tier; MCP candidates
define the interop protocol the runtime must implement; and observability
candidates provide the trace and eval patterns for the GenAI audit trail.

Of the five categories, MCP interop is the most standardized: the
specification is the single authoritative reference, and the protocol design is
settled enough that OpenERP can design its MCP client and server posture
directly from the specification without needing to study reference
implementations as inspiration sources. Policy engine selection involves the
most design choice: OPA, Cedar, and Casbin represent three different
authorization models (Rego-based, entity-typed, and metamodel-driven), each
with different tradeoffs for a multi-tenant ERP context. Observability tooling
is the most fragmented: the OpenTelemetry-native candidates (OpenLLMetry,
OpenInference) suggest that designing the OpenERP observability layer on OTel
semantics from the start — rather than adopting a proprietary trace format —
maximizes long-term interoperability.

The detailed functional analysis for each category belongs to the Phase 3
fiches: `docs/study/02-fiches/agentic-policy-*.md`,
`docs/study/02-fiches/agentic-sandbox-*.md`,
`docs/study/02-fiches/agentic-mcp-*.md`, and
`docs/study/02-fiches/agentic-observability-*.md`. This corpus report
establishes the license posture and reuse classification that governs how
those fiches may draw on the candidates listed here.

## Cross-References

- Design specification: [`docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`](../../superpowers/specs/2026-05-10-agentic-study-extension-design.md)
- License risk matrix: [`docs/study/00-methodology/license-risk-matrix.md`](../00-methodology/license-risk-matrix.md)
- `@entropiq` audit (capability gaps mapped to corpus): [`docs/study/12-agentic/entropiq-audit.md`](../12-agentic/entropiq-audit.md)
- Agentic glossary (terminology): [`docs/study/12-agentic/glossary.md`](../12-agentic/glossary.md)
- Anti-copy dossier: [`docs/study/08-anti-copy/anti-copy-dossier.md`](../08-anti-copy/anti-copy-dossier.md)
- Full candidate inventory: [`docs/study/01-corpus/candidates.csv`](candidates.csv)
- Existing corpus report: [`docs/study/01-corpus/corpus-report.md`](corpus-report.md)
