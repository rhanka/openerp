# Agentic License Posture

## Progress

Fait: license posture document created covering all required sections — target
license, family treatment, agentic-specific risks, five anti-copy categories
(prompts and tool schemas, workflow definitions, eval datasets and demos,
marketplace and catalog UI, sandbox and policy configuration), reuse
classification recipes by agentic candidate category, and anti-copy checklist;
`@sentropic` custom license reality addressed with non-commercial path, commercial
authorization requirement, and alignment recommendation.
À faire: remaining Phase 1 artifacts (corpus update, proprietary references,
startups deep research); Phase 1 completion at approximately 43%.
Attendu: no decision needed from the user at this step. The commercial-use
alignment item flagged in the `@sentropic` section requires attention before
implementation planning begins, consistent with the finding in
`docs/study/12-agentic/entropiq-audit.md`. Next action is Task 6 (corpus
update), which is independent of this file.

## Target License

The future OpenERP product is targeted for release under the **MIT License**.
This is the directing license constraint for all reuse decisions across the
agentic extension. It means that any technical material incorporated into the
product must be compatible with MIT distribution — no copyleft obligations, no
commercial-use restrictions, no additional attribution requirements beyond
preserving copyright notices and license text where explicitly required. Study
outputs that are purely functional analysis and independently authored
specifications are not constrained by the upstream license of the studied
material; only technical reuse of protected expression is constrained.

The MIT target applies to the OpenERP codebase. It does not change the license
of `@sentropic` or any other upstream project. It establishes the standard against
which every reuse decision is assessed throughout this study.

## Family Treatment

The following posture applies to all agentic extension candidates and is
consistent with `docs/study/00-methodology/license-risk-matrix.md` and the
source-family table in `docs/study/08-anti-copy/anti-copy-dossier.md`.

**MIT, Apache-2.0, BSD.** These families are eligible for deeper inspiration
when the relevant files are confirmed under the declared license and attribution
and notice obligations are tracked. MIT carries low risk for an MIT target,
subject to preserving copyright notices. Apache-2.0 carries low to moderate risk
because notice, attribution, and patent clauses must be understood and recorded.
BSD risk depends on the exact variant (BSD-2-Clause, BSD-3-Clause, or other);
the variant and attribution obligations must be recorded. For all three families,
the repository URL, checked revision, license file path, and any required
attribution obligations must be captured in the fiche before any deeper
inspiration is attempted.

**MPL, LGPL, EPL, and mixed open-core projects.** These families require
cautious inspiration only. File-level or weak copyleft provisions may affect
files that are copied or closely adapted. LGPL linking assumptions must be
documented if integration involves library-level dependency rather than
independent reimplementation. MPL covered files cannot be incorporated without
explicit file-level review. EPL has patent-termination clauses and reciprocal
obligations that require review before any reuse beyond functional study. None of
these families may be used for technical reuse without an explicit documented
review finding a permissive path.

**GPL and AGPL.** These families are functional reference only. They may inform
product behavior, domain concepts, workflows, integration needs, and high-level
architecture, expressed as independently authored functional specifications. No
source code, UI text, distinctive schema structure, migration, query, test, demo
data, fixture, or closely adapted implementation expression may flow from GPL or
AGPL sources into any OpenERP study artifact or future implementation. AGPL
carries an additional concern for networked software: if any protected expression
is copied, the network-copyleft obligation could attach to the OpenERP product as
a whole. The separation between studying behavior and copying expression must be
maintained with particular discipline for AGPL candidates.

**BSL (Business Source License), Sustainable Use, Elastic License,
source-available licenses, and proprietary.** These are treated as public
benchmark or functional reference only. No technical reuse is permitted. Public
product behavior, published pricing, public documentation, and published
integration expectations may be used as benchmarks. Non-public materials, closed
documentation, internal schemas, proprietary prompts, proprietary tool catalogs,
and proprietary workflow templates are excluded entirely. Agentic products in
this family are especially relevant as public benchmarks for capability mapping
and market positioning; they are never sources for system prompts, tool
definitions, agent personas, or workflow recipes.

## Agentic-Specific Risks

Agentic products carry a distinctively elevated anti-copy risk compared to
conventional ERP software. The risk elevation arises from the nature of agentic
product expression: the most valuable and differentiating parts of an agentic
product are often directly visible in text and structured data artifacts that
are much easier to copy than compiled code.

**System prompts and agent personas.** A product's system prompt encodes its
reasoning style, its domain expertise, its constraint set, and its interaction
character. Copying a system prompt is copying the product's core expression, not
merely its mechanism. Even when a prompt is not publicly disclosed in a
repository, it may be partially reconstructable from public documentation,
examples, and demos. Any text that reads as derived from another product's prompt
is a protected expression violation regardless of the upstream license.

**Tool definitions and schemas.** A product's tool catalog — the names,
parameter shapes, descriptions, and behavioral contracts of the tools it exposes
to the agent loop — encodes a significant amount of design judgment about domain
coverage, permission scoping, and operational safety. These schemas are product
expression, not neutral technical infrastructure. Copying tool names, parameter
names, parameter descriptions, or the overall selection and grouping of tools is
copying protected product design.

**Workflow definitions and agent graph topology.** Many agentic frameworks use
graph-based or JSON-serialized workflow representations (LangGraph state graphs,
CrewAI crew YAML, AutoGen conversation patterns, Inngest workflow JSON, and
similar). These are not neutral configuration; they encode the product's
execution model, its state machine, its error-handling philosophy, and its
orchestration design. They are directly copyable artifacts and are therefore
excluded from any reuse path.

**Eval datasets, golden traces, and demo prompts.** A product's evaluation
dataset represents accumulated knowledge about correct agent behavior in domain
situations. Golden traces encode which reasoning steps and tool invocations
produce good outcomes. Demo prompts are curated examples of product capability.
All three are highly valuable and distinctive protected expression. Their
appearance in study output or future implementation would constitute direct
copying regardless of the permissiveness of the upstream license.

**Marketplace UI, catalog labels, and registry expression.** The category
taxonomy, partner program onboarding flow, catalog search interface, agent detail
page copy, and store layout of an agentic marketplace are product expression in
the UX layer. Distinctive label choices, onboarding copy, category naming
conventions, and partner program terms are recognizable protected expression.

The net effect is that the agentic domain requires the study to maintain
anti-copy discipline at every layer — text, schema, graph, dataset, UI — not
only at the source-code layer where conventional ERP study controls are strongest.
The permitted output at every layer remains the same: independently authored
functional analysis, business outcome descriptions, integration requirements, and
acceptance criteria expressed in OpenERP wording.

## Prompts And Tool Schemas

Copying system prompts, agent personas, instruction sets, tool definitions, tool
names, parameter names, parameter descriptions, behavioral contracts, function
signatures, or example invocations from any external source is **forbidden**,
regardless of the upstream license of that source.

This restriction applies without exception to MIT-licensed, Apache-2.0-licensed,
and BSD-licensed agentic projects as much as to GPL, AGPL, proprietary, and
source-available ones. The license of the source does not authorize copying
product expression into OpenERP's prompts or tool schemas. A permissive license
grants the right to incorporate code under certain conditions; it does not grant
the right to copy a competitor's prompt-engineering investment or tool-catalog
design into a new product and present it as original.

The required practice is full rewriting in OpenERP wording. The process is:

1. Study the external agent's functional behavior — what it does, what domain
   inputs it accepts, what outputs it produces, what tools it visibly invokes,
   what constraints it imposes on those tools.
2. Write a functional description of that behavior in neutral OpenERP terms,
   recording business outcomes, integration points, and acceptance criteria.
3. Design OpenERP tool names, parameter names, parameter descriptions, and prompt
   instructions from the functional description alone, using OpenERP's own domain
   vocabulary, consistent with the terminology in
   `docs/study/12-agentic/glossary.md`.
4. Do not look at the external source's prompt or tool schema while writing
   OpenERP's version.

This discipline must be applied to every agentic framework and product studied
in the extension, including LangGraph, CrewAI, AutoGen, OpenAI Agents SDK,
Mastra, Vercel AI SDK, Genkit, Inngest Agent Kit, BAML, and any startup product
examined in Phase 2 deep research.

## Workflow Definitions

Copying agent graph topology files, workflow JSON, recipe templates, state
machine definitions, crew YAML files, pipeline configuration files, orchestration
scripts, or any serialized representation of agent execution flow from any
external source is **forbidden**, regardless of the upstream license.

Workflow definitions are structured product expression. Even when serialized as
JSON, YAML, or another neutral format, the specific topology — which nodes exist,
how they connect, what decisions live at each branching point, how errors are
handled, how parallel paths are merged — encodes the product's judgment about
the domain problem. That judgment is the protected expression, and it does not
become freely copyable because it is serialized as a structured file rather than
prose.

This restriction covers:

- agent graph topology files such as LangGraph `StateGraph` definitions;
- CrewAI crew and task YAML or Python configuration files;
- AutoGen conversation topology definitions;
- Inngest workflow step function JSON or TypeScript definitions;
- Temporal workflow definition files;
- recipe template libraries, integration playbook JSON, and automation recipe
  libraries from any agentic or RPA platform;
- orchestration flow files from any no-code or low-code agent builder;
- any workflow example, starter template, or sample workflow published by a
  framework or product.

The permitted output is a functional description of what the workflow accomplishes,
what agent modes it uses, what tools it invokes, what approval points it requires,
and what business outcomes it is designed to produce — expressed as an OpenERP
workflow requirement in OpenERP wording. OpenERP workflow definitions are then
authored from those requirements independently.

## Eval Datasets And Demos

Copying golden traces, eval test cases, eval prompts, demo prompts, demo tasks,
demo conversation histories, sample inputs, sample outputs, or benchmark datasets
from any external source is **forbidden**, regardless of the upstream license.

Eval datasets are operational assets representing accumulated knowledge about
correct agent behavior. They are the product of significant domain-specific work
— identifying representative situations, determining correct agent responses,
encoding failure modes, and maintaining the dataset over model and policy
updates. This accumulated work is protected expression even when the individual
examples are short or resemble common business scenarios, because the selection
and construction of the dataset as a whole reflects editorial judgment.

Demo prompts and demo conversation histories published by a product to illustrate
its capabilities are curated product expression. They are selected to show the
product in a favorable light and to communicate its value proposition. Copying
them into OpenERP demos or onboarding flows would constitute copying product
marketing expression.

The permitted practice for OpenERP evals is to construct eval datasets from
OpenERP's own domain requirements, using the business scenarios documented in the
functional maps and fiches produced in this study. Acceptance criteria come from
OpenERP specs. Test inputs come from representative OpenERP business situations.
Golden trace structure follows the OpenERP agent execution model as defined in
the glossary.

## Marketplace And Catalog UI

Copying registry UI layouts, catalog category labels, agent detail page copy,
partner program onboarding flows, store category taxonomy, agent store search
interface text, partner tier names, approval flow UX copy, or any distinctive
marketplace interface expression from any external source is **forbidden**,
regardless of the upstream license.

Marketplace and catalog UI is product expression at the UX layer. Category
taxonomy choices, label wording, onboarding step descriptions, and partner
program tier names are as protected as prose in a document. An agent marketplace
that borrows its category labels, onboarding language, and catalog layout from
another product's marketplace is a product that expresses itself in someone
else's words.

Agentic marketplaces studied as public benchmarks — whether from ERP vendors,
general-purpose agent platforms, or AI tool directories — may inform the
functional analysis: what categories are needed, what information a catalog entry
must convey, what approval gates a partner tier requires, what trust signals an
end user needs to see. That functional analysis, rewritten in OpenERP wording, is
the permitted output. OpenERP's catalog category labels, partner tier names,
approval flow UX, and onboarding copy must be authored independently.

## Sandbox And Policy Configuration

Copying policy DSL surface syntax, policy example libraries, sandbox configuration
templates, security profile YAML, policy rule examples, configuration schema
shapes, or any distinctive expression of a policy or sandbox configuration
language from any external source is **forbidden**, regardless of the upstream
license.

Policy DSL surface syntax is a form of API design and language design. Even when
a policy rule looks like a simple data structure, the choice of keywords, the
structure of conditions and actions, the naming of resource types, and the
conventions for expressing limits and escalations encode the product's security
model as expressed text. This surface syntax is protected expression. OpenERP's
policy DSL, if one is designed, must be designed from OpenERP's own security
model and business requirements.

Sandbox configuration templates — files that define resource limits, network
allow-lists, system call filters, execution duration limits, and isolation
profiles for agent mini-modules — carry the same restriction. They encode
security engineering judgment in a directly copyable form. The functional
requirements those templates serve (what resources a public-community-tier module
must be prevented from accessing, what network targets are permitted, what
execution duration is acceptable) are the permitted study output, expressed as
OpenERP sandbox requirements independent of any external template's syntax.

## Reuse Classification Recipes

This section provides one paragraph per agentic candidate category explaining
how to assign a reuse classification from `docs/study/00-methodology/license-risk-matrix.md`.
The five classifications used throughout the extension are: `usable`, `cautious
inspiration`, `functional reference only`, `excluded`, and `Unknown`. The `Unknown`
classification applies when license evidence is insufficient to make a
determination and the fiche must be paused pending additional evidence.

**Framework candidates** (LangGraph, CrewAI, AutoGen, Mastra, Vercel AI SDK,
Genkit, Inngest Agent Kit, BAML, and similar TypeScript or Python agent
orchestration libraries). Begin by confirming the SPDX license identifier in
the repository's LICENSE file and cross-checking with the npm or PyPI registry.
If the confirmed license is MIT, Apache-2.0, or BSD, and the relevant source
files are covered by that license with no dual-license or commercial rider, the
framework earns `cautious inspiration` — not `usable` — because agentic
frameworks carry prompt and schema anti-copy risk on top of normal code copying
risk. Even for permissive-licensed frameworks, all reuse must pass the
prompts-and-tool-schemas and workflow-definitions restrictions above. If the
license is MPL, LGPL, or EPL, the classification is `cautious inspiration` after
an explicit file-level review that confirms no copyleft-affected file is in scope
for any contemplated reuse. If the license is GPL, AGPL, or a commercial
restriction, the classification is `functional reference only`. If the license is
absent, ambiguous, or contains a BSL or Sustainable Use rider, the classification
is `functional reference only` pending explicit legal review, or `Unknown` if the
evidence is too sparse to classify safely.

**Policy engine candidates** (OPA, Cedar, Casbin, and similar declarative policy
runtimes). Confirm license in both the repository and the package registry, as
these projects sometimes carry dual-license structures. OPA (Apache-2.0) and
Cedar (Apache-2.0) qualify as `cautious inspiration` for policy primitive design,
subject to the sandbox-and-policy-configuration restriction above — specifically,
no copying of policy rule examples, DSL surface syntax, or configuration
templates. Casbin (Apache-2.0) is similarly `cautious inspiration` for the
adapter pattern and model-configuration concept but not for rule set examples.
Any policy candidate whose engine is released under a commercial license or BSL
version is `functional reference only`. If a policy project bundles a rule
library or example policy set under a separate, more restrictive license, those
materials are excluded even if the engine itself is permissive.

**Sandbox candidates** (gVisor, Firecracker, Deno, Bun isolated workers,
WebAssembly runtimes, and similar isolation mechanisms). Apache-2.0 and BSD
licensed sandbox runtimes such as gVisor and Firecracker qualify as `cautious
inspiration` for isolation primitive design. The restriction from the
sandbox-and-policy-configuration section applies: no copying of configuration
templates, security profile YAML, or sandbox configuration schema shapes.
Integration documentation, capability declarations, and performance
characteristics are usable functional reference. WASM-based sandboxing
candidates (WASI, wasmtime) are `cautious inspiration` under Apache-2.0 or MIT
where confirmed. Proprietary or source-available sandbox products are `functional
reference only` for isolation requirement derivation.

**MCP (Model Context Protocol) candidates** (MCP SDK, MCP server libraries,
MCP registry implementations). The MCP specification itself is governed by the
vendor-published specification, which is the functional reference for
interoperability. The TypeScript and Python MCP SDK packages (MIT) are `cautious
inspiration` for client and server integration patterns, subject to the
prompts-and-tool-schemas restriction: no copying of example server tool catalogs,
example tool names, parameter descriptions, or example MCP server prompt
templates. MCP server implementations published by third-party products as
demonstrations of their tool catalog are `functional reference only` — they may
inform OpenERP's understanding of what kinds of tools are useful to expose, but
their specific tool names, parameter designs, and schema shapes must not be
copied. MCP registry UI from any vendor is `functional reference only`.

**Observability candidates** (LangSmith, LangFuse, Arize Phoenix, OpenTelemetry,
Pino, and similar GenAI or general observability libraries). OpenTelemetry (Apache-2.0)
and logging libraries such as Pino (MIT) are `usable` for integration pattern
study, subject to the standard notice-and-attribution tracking. GenAI-specific
observability platforms such as LangSmith and LangFuse require license confirmation:
LangFuse is MIT for its self-hosted core and qualifies as `cautious inspiration`
for trace data model and eval hook design; LangSmith is proprietary for its hosted
service and `functional reference only` for capability benchmarking. Any
observability candidate whose trace schema, eval dataset format, or prompt
playground is a distinctive product expression earns `functional reference only`
for those specific elements even if the broader library license is permissive. No
eval prompt libraries, no golden trace examples, and no dashboard template definitions
may be copied from any observability platform.

## Anti-Copy Checklist

Before any agentic study artifact, implementation specification, or production
artifact is considered complete, the following checklist must be reviewed and
each item confirmed clear:

- **Prompts**: no system prompt text, agent persona text, instruction set wording,
  in-context example, or reasoning chain example has been copied or closely adapted
  from any external agent product, framework, or repository.
- **Tool schemas**: no tool name, parameter name, parameter description, behavioral
  contract description, or function signature has been copied or closely adapted
  from any external agent product, framework, or repository.
- **Workflow definitions**: no agent graph topology, workflow JSON, state machine
  definition, recipe template, crew YAML, pipeline configuration, or orchestration
  script has been copied or closely adapted from any external source.
- **Eval data**: no eval test case, eval prompt, golden trace, benchmark dataset,
  or acceptance-criteria wording derived from a third-party eval suite has been
  incorporated.
- **Demos**: no demo prompt, demo conversation history, demo task description, or
  sample interaction sequence has been copied or closely adapted from any external
  product's demo or onboarding material.
- **Marketplace UI**: no catalog page layout, category label set, store navigation
  structure, or registry interface copy has been copied or closely adapted from
  any external agent marketplace or app store.
- **Agent catalog UI**: no agent listing format, agent detail page copy, agent
  description template, agent capability label set, or catalog search interface
  text has been copied or closely adapted from any external agent catalog.
- **Agent builder UI**: no agent authoring flow step text, natural-language agent
  description template, no-code composer label set, or agent builder onboarding
  copy has been copied or closely adapted from any external agent builder or
  prompt engineering tool.
- **Policy DSL surface syntax**: no policy rule syntax, keyword set, condition
  expression format, action declaration structure, or policy configuration shape
  has been copied or closely adapted from any external policy engine or policy
  product.
- **Sandbox configuration**: no sandbox configuration template, security profile
  YAML, resource limit schema, network allow-list format, or isolation profile
  definition has been copied or closely adapted from any external sandbox product
  or runtime.
- **MCP server schemas**: no MCP server tool catalog, MCP tool name set, MCP
  parameter description set, MCP server prompt template, or MCP authentication
  flow expression has been copied or closely adapted from any external MCP server
  implementation or MCP registry.

## `@sentropic` License Considerations

Note (2026-05-12): license simplifiée à plain MIT, restrictions levées.

The `@sentropic` runtime (`github.com/rhanka/entropiq`, HEAD `ab88a68`) carries a
custom "MIT License with Commercial Use Restrictions." This is not plain MIT. The
license permits unrestricted use for non-profit organizations, public
administrations, and — under an explicit evaluation and testing exception — for
any entity conducting internal testing, proof-of-concept development, or
non-production evaluation. For-profit commercial use requires prior written
permission from the copyright holder (Fabien Antoine).

The full details of this license finding are recorded in
`docs/study/12-agentic/entropiq-audit.md`. The posture consequences for the
agentic study and for the future product are:

**Non-commercial and evaluation path.** For the purposes of this study and for
any non-production evaluation of agentic capabilities, `@sentropic` is treated as
MIT-aligned. The evaluation exception in the license text explicitly covers this
use. The study classifies `@sentropic` as `usable` under the owner's authority for
study purposes, consistent with the owner being the copyright holder.

**Commercial deployment path.** When OpenERP moves from study and evaluation to
commercial deployment — meaning any version of the product offered to paying
tenants or used by for-profit entities in production — explicit written
authorization from the copyright holder is required if the license text is not
first amended to plain MIT. Because the copyright holder and the OpenERP study
owner are the same individual, this authorization is within reach, but it must be
documented formally before any commercial deployment begins. Informal intent is
not sufficient; a license amendment or a standing waiver on record is required.

**Alignment recommendation.** The OpenERP product target license is MIT. The
`@sentropic` runtime license is a commercial-restricted custom license. These are
inconsistent postures for a product that will be offered to for-profit tenants
under MIT terms. Before implementation planning begins, the copyright holder
should resolve the discrepancy by either amending the `@sentropic` license to
plain MIT — eliminating the commercial-use restriction — or by issuing a standing
written waiver that explicitly covers the OpenERP product and its commercial
tenants. A future legal review should confirm that the amended or waived license
is consistent with the MIT product release and with any third-party dependencies
that `@sentropic` itself carries. This alignment is a gate before commercial
deployment, not a blocker for the study.

## Cross-References

- Design specification section 13: [`docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`](../../superpowers/specs/2026-05-10-agentic-study-extension-design.md)
- License risk matrix: [`docs/study/00-methodology/license-risk-matrix.md`](../00-methodology/license-risk-matrix.md)
- Anti-copy dossier: [`docs/study/08-anti-copy/anti-copy-dossier.md`](../08-anti-copy/anti-copy-dossier.md)
- Agentic glossary: [`docs/study/12-agentic/glossary.md`](glossary.md)
- `@sentropic` audit: [`docs/study/12-agentic/entropiq-audit.md`](entropiq-audit.md)
