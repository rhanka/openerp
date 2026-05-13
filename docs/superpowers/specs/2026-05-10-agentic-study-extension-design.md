# OpenERP Agentic Study Extension Design

Date: 2026-05-10
Status: Approved design, pending user review before execution planning
Target license for the future product: MIT
Agent runtime base: `@sentropic` MIT (TypeScript, Node + Svelte compatible, queue-based, alpha)

## 1. Purpose

This extension adds an agentic domain to the existing OpenERP study. It is a
complement to the ERP/CRM/back-office and collaboration research, not a pivot
toward an agent platform product or a generic AI assistant.

The extension studies how specialized business agents and small publishable
agent modules ("mini-modules") can be added to OpenERP for service companies,
small and medium manufacturers, and back-office teams under 2B revenue, while
keeping the same research discipline used in the previous waves: evidence-backed
fiches, controlled corpus, license posture, dated deep research sources,
functional maps, anti-copy boundaries, and a single final synthesis update.

The extension's directing principle is functional-first: deliverables lead with
the concrete operational value an agent brings to ERP/CRM/back-office workflows.
Runtime, governance, marketplace, and interop primitives are documented as
enablers in support of that value.

## 2. Product Positioning

Agents in OpenERP must strengthen the existing ERP/CRM flow rather than become a
separate AI assistant product:

- conversational agents help users perform ERP/CRM operations (quote drafting,
  customer follow-up, expense triage, report drafting) under human supervision;
- autonomous event-driven and scheduled agents react to domain events (overdue
  invoice, contract approaching renewal, anomaly in a journal entry, time entry
  needing approval) under tenant-level policy and audit;
- workflow-typed agents extend the OpenERP typed automation layer with judgment
  or reasoning where a deterministic rule is insufficient.

Agent modules can be authored as internal extensions governed by the OpenERP
publisher and the tenant. The study also covers a publishable mini-module model
(private, partner, and community tiers) as a documented design space, while the
agentic MVP posture remains internal-governed only.

Manufacturing, MES, WMS, payroll, and procurement remain vertical packs at the
surface of the agentic extension, not deep study targets, consistent with the
service-company-first product boundary.

## 3. Approved Study Approach

The approved approach is a phased study, parallelized inside each phase, with a
single final synthesis. It mirrors the discipline of the previous extensions but
sequences work to keep dependencies clear:

1. Phase 1, Foundations: agentic glossary, `@sentropic` audit, agentic open
   source corpus, deep research on startups and recent agent products, license
   posture for agentic sources.
2. Phase 2, Functional, the headline phase: business agents functional map by
   MVP-aligned family, cross-cutting agent patterns library, thematic deep
   research by use case, candidate business agent fiches, surface vertical pack
   map.
3. Phase 3, Governance and runtime: identity delegation design space,
   business autonomy design space (discovery, selection, configuration,
   authoring, by role and by scope), publish marketplace design space,
   runtime safety functional map, dedicated open source fiches per primitive
   (policy, sandbox, MCP, observability), human supervision design space.
4. Phase 4, Single final synthesis: agentic MVP addendum, agentic anti-copy
   addendum, impacts on existing MVP specs, final Markdown synthesis, final
   PPTX.

Phases run sequentially. Tasks inside each phase may run in parallel when files
are independent. The agentic MVP decision is not made in the study; it is set up
for later implementation planning.

## 4. Scope

The extension covers:

- specialized business agents aligned with the existing OpenERP MVP families
  (CRM, project and service delivery, billing, accounting operations, reporting
  and automation, object-bound collaboration);
- a cross-cutting agent pattern library (extraction, classification,
  reconciliation, anomaly detection, drafting, summarization, decision support,
  multi-tool orchestration, document QA, compliance validation, and similar
  reusable shapes);
- mini-module publication design space across three trust tiers (private to
  tenant, curated partners, public community);
- identity delegation design space (acting-as, service principal, on-behalf-of)
  by agent mode (conversational, autonomous, workflow-typed);
- business autonomy design space across four axes (discovery, selection and
  activation, configuration, authoring) by role and scope, with an MVP
  recommendation priority on the self-service catalog axes and authoring kept
  post-MVP;
- runtime safety: policy engine, sandboxing, MCP, observability, secrets
  scoping, budgets, human supervision;
- deep research on startups and recent agent products in ERP, finance, CRM,
  procurement, operations, and MES, plus general agent platforms relevant to
  the design;
- impacts on the existing MVP specs (foundation/security/i18n, CRM,
  project/time-to-invoice, billing/accounting, reporting/automation);
- agentic-specific anti-copy posture covering prompts, tool schemas, workflow
  definitions, eval datasets, demos, marketplace and registry expression;
- a single final synthesis update in Markdown and PPTX.

The extension excludes:

- implementation, production code, production prompts, production runtime
  selection;
- final agentic MVP selection, which belongs to later implementation planning
  once the study recommendation in section 15 is reviewed;
- direct reuse of external framework code, prompts, tool schemas, workflow
  definitions, eval datasets, demos, marketplace UI, or onboarding copy;
- deep coverage of procurement, MES, WMS, payroll, and manufacturing planning
  agents, which remain surface-mapped as later vertical packs.

## 5. Agent Modes

Three agent modes must be distinguished across the entire extension because
they drive different identity, supervision, runtime, and audit requirements:

- conversational agents, synchronous, human-in-the-loop by default;
- autonomous event-driven or scheduled agents, governed by policy and audit
  rather than by an active human;
- workflow-typed agents attached to an existing OpenERP typed automation step,
  extending it with reasoning while preserving the typed contract.

Each functional, governance, and runtime deliverable must explicitly call out
which modes it covers and how the design space differs across modes.

## 6. Functional-First Orientation

The functional value an agent brings to a business workflow is the leading axis
of the study. Every fiche, functional map, MVP recommendation, and synthesis
section must lead with the business outcome (revenue capture, margin
protection, time-to-cash reduction, compliance support, risk reduction, customer
satisfaction, operator productivity) before describing tools, prompts, runtime,
or interop details.

Runtime safety, identity, marketplace, MCP, observability, and supervision
primitives are documented as enablers and constraints supporting the functional
value, not as headline content.

## 7. Runtime Base: `@sentropic`

The OpenERP agent runtime base for the future product is the user-owned MIT
TypeScript SDK named `@sentropic`. The kernel already provides an LLM client,
typed tool calling, an agent loop, conversational memory, durability,
streaming, and multi-agent supervision, with a queue rather than dedicated
workers. The SDK is in alpha. Hosting can start on Vercel.

The agentic extension must:

- record current capabilities, dependencies, license, and verified revision in
  an `@sentropic` audit document;
- document the gaps relative to OpenERP needs, primarily MCP support and
  policy hooks, plus multi-tenant identity primitives, marketplace publication
  primitives, and supervision integration points;
- treat external agent frameworks (LangGraph, CrewAI, AutoGen, OpenAI Agents
  SDK, Mastra, Vercel AI SDK, Genkit, Inngest Agent Kit, BAML, and similar) as
  functional reference and inspiration only, never as a runtime base or as
  source for code, prompts, tool schemas, or workflow definitions.

## 8. Marketplace Posture

Mini-module publication is studied as a three-tier design space:

- private to tenant, the MVP-safe baseline for governed extensions;
- curated partners, with verified publishers, signed modules, OpenERP-reviewed
  approval, and cross-tenant visibility;
- public community, with broader trust signals, automated checks, signature,
  registry-level controls, and published license and provenance.

The MVP recommendation should remain internal-governed (private tier). The
study documents the required primitives for each tier (publisher identity,
signing, registry, approval workflow, anti-copy and license scanning, sandbox
CI, version pinning, revocation, observability) and a phasing path from
internal-governed to partners to community.

The study does not pick a marketplace technology stack; it documents the
functional and governance requirements for each tier.

## 9. Identity Delegation Posture

Three identity patterns must be documented and recommended by agent mode:

- acting-as: the agent acts under the calling user's session and permissions,
  with audit attribution to that user. Suitable in tightly scoped, supervised
  workflow-typed contexts.
- service principal: the agent has a dedicated identity with explicit scopes
  granted by the tenant administrator, independent of any human session.
  Suitable for autonomous event-driven or scheduled agents.
- on-behalf-of: a human or admin issues a signed delegation token granting the
  agent a bounded subset of rights, for a bounded duration, with
  agent-level audit traceable back to the issuing identity. Suitable for
  conversational agents and for cross-tenant marketplace mini-modules.

The study documents the design space and recommends combinations by agent
mode. It does not pick the MVP identity; that decision belongs to later
implementation planning.

## 10. Business Autonomy Posture

A central functional question for OpenERP is how much autonomy a business user,
team, tenant, or partner has to discover, select, configure, create, and
publish their own agents without going through OpenERP-publisher engineering.
The extension studies this as an explicit design space because it directly
drives functional value: an agent that requires three engineering tickets to
adapt is not really usable by a sales lead, a finance user, or a project
manager.

The design space is documented across four autonomy axes, by role and by
scope:

- discovery autonomy: where and how a user finds available agents — built-in
  OpenERP catalog, tenant private catalog, partner-curated catalog, public
  community catalog (each tier reflecting section 8 marketplace);
- selection and activation autonomy: who can install or enable an agent in
  which scope (personal, team, tenant, cross-tenant), with which approval
  trail and which budget controls;
- configuration autonomy: who can adjust an installed agent's parameters
  (object scope, supervision rules, escalation thresholds, schedule, budgets,
  tool subset, output destinations) without rewriting its prompts, tools, or
  code;
- authoring autonomy: who can create new agents and how — from scratch
  (technical), from patterns in the cross-cutting pattern library produced
  in Phase 2, from a natural-language description ("draft me an agent that
  follows up on invoices overdue more than thirty days, autonomous mode,
  human escalation above five thousand euros"), or from a tenant-shareable
  template.

Roles considered:

- tenant administrator;
- power user with delegated agent administration;
- standard business user (sales lead, project manager, finance user, HR user,
  consultant, operator);
- external customer user or guest, where applicable.

Scopes considered:

- personal scope (the user's own workflow only);
- team scope;
- tenant scope (cross-team, internal);
- cross-tenant scope (partner-shared or community-shared mini-modules).

The study connects each combination of axis × role × scope to:

- the identity pattern required (section 9: acting-as, service principal,
  on-behalf-of);
- the marketplace tier required (section 8: private, partners, community);
- the OpenERP supervision and approval gate required;
- the runtime safety and policy constraints (section 11).

MVP recommendation posture: a self-service catalog of installable, configurable
agents (axes discovery + selection + activation + configuration) is the MVP
priority because it produces functional value with bounded risk. Authoring
autonomy — particularly a no-code or natural-language agent builder — is
documented as a design space but stays post-MVP because of supervision,
anti-copy, evaluation, and audit maturity considerations. The final agentic
MVP selection is made later, in line with the rest of the extension.

The autonomy posture must be cross-referenced from section 8 (marketplace) and
section 9 (identity) so that the design spaces remain consistent.

## 11. Runtime Safety, MCP, and Observability

The runtime safety bloc is studied through both a corpus angle (one fiche per
notable open source candidate) and a functional map angle (the unified set of
primitives OpenERP and `@sentropic` need together).

The primitives covered:

- policy engine, with declarative pre and post tool-call enforcement;
- sandboxing, isolating mini-modules at a level proportional to their trust
  tier;
- MCP, as the interop standard for tools, including client and server
  posture, registry expectations, and signing posture;
- GenAI observability, including traces, evals, audit trails, and rollback
  hooks;
- secrets and credentials scoping per agent and per delegation, with rotation
  posture;
- budgets for tokens, latency, cost, and retries;
- human supervision patterns by agent mode (approval-in-the-loop and human
  takeover for conversational, canary mini-modules and rollback for
  autonomous, typed checkpoints for workflow-typed).

The fiches inventory candidate open source projects under permissive-first
license preference. The functional map presents the OpenERP need
independently of any chosen project.

## 12. Deep Research

Deep research must combine company inventory and thematic mapping:

- company inventory: startups and recent products in agent-specialized
  ERP/finance/CRM/procurement/operations/MES, plus agent platforms relevant to
  identity, marketplace, observability, MCP, sandbox, policy, and runtime
  decisions. Time horizon is primarily 2024 through 2026. Sources must be
  dated, retrieved through web tooling, attributed, and kept as public
  benchmark only;
- thematic mapping: by agent use case (for example AR reconciliation, dunning,
  contract renewal, anomaly detection in journal entries, procurement copilot,
  MES copilot, customer follow-up drafting, compliance validation), with both
  open source and proprietary examples cited, dated, and bounded by anti-copy
  rules.

The output of company inventory goes to
`docs/study/04-proprietary-references/agentic-references.md` and a long-form
companion in `docs/study/12-agentic/startups-deep-research.md`. The thematic
mapping goes to `docs/study/12-agentic/agents-by-use-case.md`.

## 13. License And Anti-Copy Policy

The future product remains MIT-targeted. The extension favors permissive open
source projects (MIT, Apache-2.0, BSD) for any reuse-eligible decision and
treats other licenses with stricter postures.

Family treatment:

- MIT, Apache-2.0, BSD: eligible for deeper inspiration when relevant files are
  covered and attribution and notice obligations are tracked;
- MPL, LGPL, EPL, mixed open-core projects: cautious inspiration only after
  explicit license review;
- GPL and AGPL: functional reference only;
- BSL, Sustainable Use, Elastic, source-available, proprietary: public
  benchmark or functional reference only, no technical reuse.

The agentic domain has a distinctive anti-copy risk because product expression
is highly visible in agentic systems. The extension must not copy or closely
adapt:

- system prompts, agent personas, tool definitions, tool schemas, function
  signatures, parameter docs, or examples specific to a product;
- workflow definitions, agent graph topology files, recipe templates, demo
  prompts, demo tasks, demo screenshots;
- eval datasets, eval prompts, prompt-engineering exemplars, golden traces;
- MCP server names, MCP server tool catalogs, MCP registry UI, authentication
  flow expression;
- policy DSL surface syntax, policy example libraries, sandbox configuration
  templates;
- marketplace UI, registry UI, onboarding copy, partner program UI, store
  catalog category labels;
- agent catalog UI, agent configuration UI, agent builder UI, no-code agent
  composer UI, prompt builder UI, and natural-language agent description
  flows;
- automation recipe libraries, plugin galleries, integration directories.

Permitted output is rewritten functional analysis: capabilities, business
outcomes, workflows, integration needs, permission and audit expectations, and
acceptance criteria expressed in OpenERP wording.

## 14. Visual Companion Use

Use the visual companion only where a visual genuinely helps:

- agents functional map by MVP-aligned family;
- identity design space by agent mode;
- marketplace tier and phasing diagram;
- runtime safety functional map;
- PPTX preview and layout checks;
- mock screens that help arbitrate scope decisions.

Decisions that are textual remain in terminal messages. Durable visual
artifacts are committed; ephemeral previews are ignored by git.

## 15. Expected Deliverables

The extension must deliver, organized by phase. Paths use the existing
`docs/study/` layout and a new `docs/study/12-agentic/` directory for
extension-specific artifacts.

Phase 1, Foundations:

- `docs/study/12-agentic/glossary.md`
- `docs/study/12-agentic/entropiq-audit.md`
- `docs/study/01-corpus/candidates.csv` updated for agentic candidates
- `docs/study/01-corpus/agentic-corpus-report.md`
- `docs/study/04-proprietary-references/agentic-references.md`
- `docs/study/12-agentic/startups-deep-research.md`
- `docs/study/12-agentic/license-posture.md`

Phase 2, Functional:

- `docs/study/06-functional-map/agentic-functional-map.md` linked from
  `docs/study/06-functional-map/global-functional-map.md`
- `docs/study/12-agentic/patterns-library.md`
- `docs/study/12-agentic/agents-by-use-case.md`
- `docs/study/02-fiches/agentic-<family>-<agent>.md` per retained candidate
  business agent
- `docs/study/12-agentic/vertical-packs-surface-map.md`

Phase 3, Governance and runtime:

- `docs/study/12-agentic/identity-design-space.md`
- `docs/study/12-agentic/business-autonomy-design-space.md`
- `docs/study/12-agentic/marketplace-design-space.md`
- `docs/study/12-agentic/runtime-safety-functional-map.md`
- `docs/study/02-fiches/agentic-policy-*.md`
- `docs/study/02-fiches/agentic-sandbox-*.md`
- `docs/study/02-fiches/agentic-mcp-*.md`
- `docs/study/02-fiches/agentic-observability-*.md`
- `docs/study/12-agentic/human-supervision-design-space.md`

Phase 4, Final synthesis:

- `docs/study/07-mvp/agentic-mvp-addendum.md` with a pointer added to
  `docs/study/07-mvp/mvp-recommendation.md`
- `docs/study/08-anti-copy/agentic-anti-copy-addendum.md` with a pointer added
  to `docs/study/08-anti-copy/anti-copy-dossier.md`
- `docs/study/10-mvp-specs/agentic-impacts.md` referenced from each existing
  MVP spec
- `docs/study/11-final-package/final-synthesis.md` updated with an Agentic
  Extension section, ordered functional-first
- `docs/study/11-final-package/openerp-final-synthesis.pptx` updated with
  agentic slides

Working directories that remain ignored by git:

- `research/sources/<candidate-slug>/` for raw clones
- `research/graphify/<candidate-scope>/` for raw Graphify outputs

## 16. Reporting Format

Every progress checkpoint must use this exact format:

```text
Fait: completed artifacts and verified facts.
À faire: remaining work and approximate completion percent.
Attendu: decision or action needed, with a recommendation. If no decision is
needed, state the next action and the reason.
```

The completion percent is an approximate indicator for the current extension,
not a formula and not a comparative measure across artifacts.

## 17. Verification Before Completion

Before claiming the extension complete, the following must be true:

- every path listed in section 15 exists and is non-empty;
- the agentic artifacts contain no incomplete markers and no draft language
  awaiting later edits;
- the agentic artifacts contain no comparative point system, no weighting
  expressions, and no comparative ordering of candidates, consistent with
  the established study methodology;
- every cited startup or recent product carries a dated source and a verified
  link;
- every open source fiche records its license file path, declared license,
  reuse classification, and checked revision or release;
- raw clones and raw Graphify outputs are not staged;
- the final synthesis Markdown contains an Agentic Extension section that
  leads with functional value;
- the PPTX file exists and can be opened or inspected programmatically.

The execution plan defines the exact text-pattern checks that operationalize
these verifications.

## 18. Commit And Push Rule

Each task must end with:

```bash
git status --short --branch
git add <task files>
git commit -m "<imperative task message>"
git push origin main
```

Atomic commits. Independent tasks must not be combined except where a later
synthesis task explicitly depends on multiple artifacts.

## 19. Glossary Anchor

A short OpenERP-authored agentic glossary lives at
`docs/study/12-agentic/glossary.md` and is referenced by every other agentic
artifact. It defines: agent, mini-module, tool, policy, identity (acting-as,
service principal, on-behalf-of), marketplace tier (private, partners,
community), supervision, MCP, sandbox, GenAI observability, eval dataset.

The glossary is the source of truth for terminology used across phases.

## 20. Execution Guardrails

The execution plan must keep the extension as a study only; it does not
implement agentic features. Before any final extension claim, the verification
checks in section 17 must succeed.

The execution plan must enable parallelization inside each phase by assigning
disjoint files or fiches to subagents, and must hold the synthesis phase as a
single sequential pass.

## 21. Reference Documents

The extension must cite, where relevant:

- `docs/study/00-methodology/assessment-method.md`
- `docs/study/00-methodology/license-risk-matrix.md`
- `docs/study/00-methodology/progress-reporting.md`
- `docs/study/06-functional-map/global-functional-map.md`
- `docs/study/06-functional-map/collaboration-functional-map.md`
- `docs/study/07-mvp/mvp-recommendation.md`
- `docs/study/07-mvp/collaboration-mvp-addendum.md`
- `docs/study/08-anti-copy/anti-copy-dossier.md`
- `docs/study/08-anti-copy/collaboration-anti-copy-addendum.md`
- `docs/study/11-final-package/final-synthesis.md`
- `docs/superpowers/specs/2026-05-09-collaboration-study-extension-design.md`

External projects are evidence sources only. The license posture in section 13
applies to every external citation.
