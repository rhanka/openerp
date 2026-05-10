# OpenERP Agentic Study Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the OpenERP agentic study extension as a phased research effort that delivers business agent families, governance and runtime design spaces, dated deep research, anti-copy controls, and a unified final synthesis on top of the existing OpenERP study.

**Architecture:** This is a research execution plan, not application code. It extends `docs/study/` with a new `docs/study/12-agentic/` directory, keeps raw clones and raw Graphify outputs under ignored `research/sources/` and `research/graphify/`, and converts all findings into OpenERP-written analysis before any later implementation. The agent runtime base for the future product is `@entropiq` (MIT TypeScript SDK owned by the user). External agent frameworks are reference only.

**Tech Stack:** Markdown, CSV, Git, GitHub/web evidence, optional Graphify, shell verification, WebSearch and WebFetch for dated deep-research sources, optional Playwright visual checks for diagrams and PPTX previews, Python or office tooling for PPTX update if needed.

---

## Avancement

Fait: agentic study extension design is approved and pushed as `docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md` (commit `85bab05`).
À faire: execute Foundations, Functional, Governance and runtime, and Single Final Synthesis phases; execution planning is 100% once this file is committed.
Attendu: execute this plan with parallel subagents inside each phase where file ownership is disjoint, because corpus, deep research, business agent fiches, and runtime-safety brick fiches can be researched concurrently before synthesis.

## Progress Reporting Rule

Every checkpoint must use exactly this format:

```text
Fait: completed artifacts and verified facts.
À faire: remaining work and approximate completion percent.
Attendu: decision or action needed, with a recommendation. If no decision is needed, the next action and reason.
```

The percentage is an approximate completion indicator, not a comparative measure.

## Scope Check

This plan executes the agentic study only. It does not implement agentic features in the OpenERP application. It does not implement `@entropiq` changes. It produces written analysis, fiches, design spaces, dated deep research, and synthesis artifacts.

Included:
- agentic glossary, `@entropiq` audit, agentic corpus, dated deep research, license posture (Phase 1);
- business agents functional map by MVP-aligned family, patterns library, thematic deep research, candidate business agent fiches, vertical packs surface map (Phase 2);
- identity delegation, business autonomy, marketplace publication, runtime safety, human supervision design spaces and OSS brick fiches (Phase 3);
- agentic MVP addendum, agentic anti-copy addendum, impacts on existing MVP specs, final Markdown synthesis update, final PPTX update, final verification (Phase 4).

Excluded:
- production code, production prompts, production runtime selection, agentic MVP feature implementation;
- direct reuse of external framework code, prompts, tool schemas, workflow definitions, eval datasets, demos, marketplace UI, agent catalog UI, agent builder UI, or onboarding copy.

## Source Inputs

Use these OpenERP-authored documents as primary inputs:

- `docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`
- `docs/superpowers/specs/2026-05-09-collaboration-study-extension-design.md`
- `docs/superpowers/specs/2026-05-05-openerp-study-design.md` (if present)
- `docs/study/00-methodology/assessment-method.md`
- `docs/study/00-methodology/license-risk-matrix.md`
- `docs/study/00-methodology/progress-reporting.md`
- `docs/study/01-corpus/candidates.csv`
- `docs/study/01-corpus/corpus-report.md`
- `docs/study/03-shortlist/shortlist.md`
- `docs/study/04-proprietary-references/proprietary-reference-map.md`
- `docs/study/05-graphify/README.md`
- `docs/study/06-functional-map/global-functional-map.md`
- `docs/study/06-functional-map/collaboration-functional-map.md`
- `docs/study/07-mvp/mvp-recommendation.md`
- `docs/study/07-mvp/collaboration-mvp-addendum.md`
- `docs/study/08-anti-copy/anti-copy-dossier.md`
- `docs/study/08-anti-copy/collaboration-anti-copy-addendum.md`
- `docs/study/10-mvp-specs/` (all existing module specs)
- `docs/study/11-final-package/final-synthesis.md`
- `docs/study/11-final-package/openerp-final-synthesis.pptx`

External projects are evidence sources only. GPL, AGPL, BSL, Sustainable Use, Elastic, source-available, and proprietary projects must remain functional references or public benchmarks.

## Commit And Push Rule

Each task must end with:

```bash
git status --short --branch
git add <task files>
git commit -m "<imperative task message>"
git push origin main
```

Atomic commits. Independent tasks must not be combined unless a later synthesis task explicitly depends on multiple artifacts.

**Commit message discipline — absolute and non-negotiable for this repo:**

- subject + body only. No trailing footer.
- no `Co-Authored-By:` line of any kind, regardless of the author named.
- no AI assistant attribution: no assistant name, no assistant product line, no assistant model family or model identifier, no assistant company name, no assistant `noreply@` email, anywhere in the message.
- no generated-by / made-with banner that references an AI assistant or AI tooling.

If a session template or hook tries to inject one, override it. If a commit slips through with offending content, soft-reset and recommit before pushing. The same hygiene rule applies to pull request descriptions, code comments, and documentation files committed to this repo.

## File Structure

Create or modify these paths during execution:

- `docs/study/12-agentic/glossary.md`
- `docs/study/12-agentic/entropiq-audit.md`
- `docs/study/12-agentic/license-posture.md`
- `docs/study/12-agentic/startups-deep-research.md`
- `docs/study/12-agentic/patterns-library.md`
- `docs/study/12-agentic/agents-by-use-case.md`
- `docs/study/12-agentic/vertical-packs-surface-map.md`
- `docs/study/12-agentic/identity-design-space.md`
- `docs/study/12-agentic/business-autonomy-design-space.md`
- `docs/study/12-agentic/marketplace-design-space.md`
- `docs/study/12-agentic/runtime-safety-functional-map.md`
- `docs/study/12-agentic/human-supervision-design-space.md`
- `docs/study/01-corpus/candidates.csv` (append agentic corpus rows)
- `docs/study/01-corpus/agentic-corpus-report.md`
- `docs/study/04-proprietary-references/agentic-references.md`
- `docs/study/06-functional-map/agentic-functional-map.md`
- `docs/study/06-functional-map/global-functional-map.md` (link to new map)
- `docs/study/02-fiches/agentic-<family>-<agent>.md` (business agents)
- `docs/study/02-fiches/agentic-policy-<project>.md`
- `docs/study/02-fiches/agentic-sandbox-<project>.md`
- `docs/study/02-fiches/agentic-mcp-<project>.md`
- `docs/study/02-fiches/agentic-observability-<project>.md`
- `docs/study/07-mvp/agentic-mvp-addendum.md`
- `docs/study/07-mvp/mvp-recommendation.md` (link to addendum)
- `docs/study/08-anti-copy/agentic-anti-copy-addendum.md`
- `docs/study/08-anti-copy/anti-copy-dossier.md` (link to addendum)
- `docs/study/10-mvp-specs/agentic-impacts.md`
- `docs/study/10-mvp-specs/foundation-security-i18n.md` (link to impacts)
- `docs/study/10-mvp-specs/crm-customer-timeline.md` (link to impacts)
- `docs/study/10-mvp-specs/project-time-to-invoice.md` (link to impacts)
- `docs/study/10-mvp-specs/billing-accounting.md` (link to impacts)
- `docs/study/10-mvp-specs/reporting-automation.md` (link to impacts)
- `docs/study/11-final-package/final-synthesis.md`
- `docs/study/11-final-package/openerp-final-synthesis.pptx`
- `research/sources/` (ignored)
- `research/graphify/` (ignored)

## Parallelization Map

Phases run sequentially. Inside each phase, tasks with disjoint file ownership may run in parallel.

Phase 1, parallel-safe set:
- Task 1 Glossary, Task 2 `@entropiq` Audit, Task 3 Agentic Corpus, Task 4 Startups Deep Research, Task 5 License Posture.

Phase 2, parallel-safe set:
- Task 6 Patterns Library, Task 7 Agentic Functional Map (touches `global-functional-map.md` last), Task 8 Thematic Deep Research, Task 9 Vertical Packs Surface Map, Task 10 Business Agent Fiches Group A (CRM and project), Task 11 Business Agent Fiches Group B (billing, accounting, reporting, collaboration).

Phase 3, parallel-safe set:
- Task 12 Identity Design Space, Task 13 Business Autonomy Design Space, Task 14 Marketplace Design Space, Task 15 Runtime Safety Functional Map, Task 16 Brick Fiches Group A (policy and sandbox), Task 17 Brick Fiches Group B (MCP and observability), Task 18 Human Supervision Design Space.

Phase 4, sequential:
- Task 19 Agentic MVP Addendum, Task 20 Agentic Anti-Copy Addendum, Task 21 Impacts on Existing MVP Specs, Task 22 Final Synthesis Markdown, Task 23 PPTX Update, Task 24 Final Verification.

A single subagent may own multiple tasks but two subagents must not edit the same file concurrently. Shared files (`candidates.csv`, `global-functional-map.md`, `mvp-recommendation.md`, `anti-copy-dossier.md`, individual MVP spec files, `final-synthesis.md`, `openerp-final-synthesis.pptx`) are touched by exactly one task each in this plan.

## Phase 1 — Foundations

### Task 1: Agentic Glossary

**Files:**
- Create: `docs/study/12-agentic/glossary.md`

- [ ] **Step 1: Create directory**

Run:

```bash
mkdir -p docs/study/12-agentic
```

Expected: directory exists.

- [ ] **Step 2: Write glossary**

Create `docs/study/12-agentic/glossary.md` with these sections in order:

```markdown
# Agentic Glossary

## Progress

## Purpose

## Terms

### Agent

### Agent Mode

### Mini-Module

### Tool

### Policy

### Identity Delegation

### Marketplace Tier

### Business Autonomy

### Supervision

### MCP

### Sandbox

### GenAI Observability

### Eval Dataset

## Cross-References
```

For each term in the `## Terms` section, write a 3 to 6 line OpenERP-original definition. Agent modes must list conversational, autonomous event-driven or scheduled, and workflow-typed. Identity delegation must list acting-as, service principal, and on-behalf-of. Marketplace tier must list private to tenant, curated partners, and public community. Business autonomy must list discovery, selection and activation, configuration, and authoring.

The `## Cross-References` section must link to:

- `docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`
- `docs/study/06-functional-map/global-functional-map.md`
- `docs/study/07-mvp/mvp-recommendation.md`
- `docs/study/08-anti-copy/anti-copy-dossier.md`

- [ ] **Step 3: Verify glossary**

Run:

```bash
rg -n "## Terms|Agent Mode|Mini-Module|Identity Delegation|Marketplace Tier|Business Autonomy|MCP|Sandbox" docs/study/12-agentic/glossary.md
```

Expected: every required heading is present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/glossary.md
git commit -m "Add agentic glossary"
git push origin main
```

### Task 2: `@entropiq` Audit

**Files:**
- Create: `docs/study/12-agentic/entropiq-audit.md`

- [ ] **Step 1: Collect factual evidence**

For `@entropiq`, retrieve and record:

- repository URL (ask the user or check public GitHub for the rhanka organization);
- npm package name and registry status;
- declared license (expected MIT);
- HEAD commit or release tag checked, with date;
- top-level file/directory layout (overview only, no copied content);
- declared capabilities: LLM client, typed tool calling, agent loop, conversational memory, durability, streaming, multi-agent or supervision primitives, queue-based execution;
- gaps relative to OpenERP needs: MCP (client and server), policy hooks, multi-tenant identity primitives, marketplace publication primitives, supervision integration points;
- explicit hosting posture statement (Vercel as a possible initial host).

Do not copy or paraphrase any source file content; describe capabilities in OpenERP wording.

- [ ] **Step 2: Write audit**

Create `docs/study/12-agentic/entropiq-audit.md` with these sections:

```markdown
# `@entropiq` Audit

## Progress

## Purpose

## Evidence

## Declared License

## Capabilities Present

## Capabilities Missing For OpenERP

## Multi-Tenant Implications

## Marketplace Implications

## Supervision Implications

## Anti-Copy Notes

## OpenERP Takeaways
```

Each section must be at least one paragraph. `Anti-Copy Notes` must state that no `@entropiq` source code, prompts, tool schemas, or examples may be copied into the OpenERP product; only functional descriptions in OpenERP wording are permitted.

- [ ] **Step 3: Verify audit**

Run:

```bash
rg -n "Declared License|Capabilities Present|Capabilities Missing For OpenERP|Anti-Copy Notes|OpenERP Takeaways" docs/study/12-agentic/entropiq-audit.md
```

Expected: every required heading is present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/entropiq-audit.md
git commit -m "Add @entropiq audit"
git push origin main
```

### Task 3: Agentic Open Source Corpus

**Files:**
- Modify: `docs/study/01-corpus/candidates.csv`
- Create: `docs/study/01-corpus/agentic-corpus-report.md`

- [ ] **Step 1: Record current corpus header**

Run:

```bash
head -n 1 docs/study/01-corpus/candidates.csv
```

Expected: output includes the existing controlled columns. Note the controlled column set for use in Step 2.

- [ ] **Step 2: Append agentic candidate rows**

Append rows to `candidates.csv` for these candidate slugs. Use `Unknown` only when license evidence has not yet been verified.

```text
langgraph
crewai
autogen
openai-agents-sdk
mastra
vercel-ai-sdk
genkit
inngest-agent-kit
baml
pydantic-ai
opa
cedar
casbin
e2b
modal
isolate-vm
gvisor
mcp-spec
mcp-registry
langfuse
phoenix-arize
helicone
traceloop
openinference
```

Use these controlled category values:

```text
Agent framework
Policy engine
Sandbox runtime
MCP interop
GenAI observability
```

Use these reuse classifications (matching the existing controlled set):

```text
usable
cautious inspiration
functional reference only
excluded
Unknown
```

- [ ] **Step 3: Write agentic corpus narrative**

Create `docs/study/01-corpus/agentic-corpus-report.md` with these sections:

```markdown
# Agentic Corpus Report

## Progress

## Scope

## Methodology

## Agent Framework Candidates

## Policy Engine Candidates

## Sandbox Runtime Candidates

## MCP Interop Candidates

## GenAI Observability Candidates

## License Posture Summary

## Anti-Copy Notes

## OpenERP Takeaways
```

For each candidate listed in Step 2, the corresponding category section must include one paragraph describing its functional role, declared license at the date checked, and the reuse classification chosen. Anti-Copy Notes must explicitly state that prompts, tool schemas, workflow definitions, demos, and eval datasets from these projects must not be copied.

- [ ] **Step 4: Verify corpus extension**

Run:

```bash
rg -n "langgraph|crewai|autogen|openai-agents-sdk|mastra|vercel-ai-sdk|genkit|inngest-agent-kit|baml|pydantic-ai|opa|cedar|casbin|e2b|modal|isolate-vm|gvisor|mcp-spec|mcp-registry|langfuse|phoenix-arize|helicone|traceloop|openinference" docs/study/01-corpus/candidates.csv
rg -n "Agent Framework Candidates|Policy Engine Candidates|Sandbox Runtime Candidates|MCP Interop Candidates|GenAI Observability Candidates|Anti-Copy Notes" docs/study/01-corpus/agentic-corpus-report.md
```

Expected: every slug appears in the CSV and every required heading appears in the report.

- [ ] **Step 5: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/01-corpus/candidates.csv docs/study/01-corpus/agentic-corpus-report.md
git commit -m "Extend corpus with agentic candidates"
git push origin main
```

### Task 4: Startups Deep Research

**Files:**
- Create: `docs/study/04-proprietary-references/agentic-references.md`
- Create: `docs/study/12-agentic/startups-deep-research.md`

- [ ] **Step 1: Collect dated public sources**

For each company below, retrieve at least one dated public source between 2024 and 2026 using WebSearch and WebFetch. Record source URL, publication date, and a one-line excerpt or summary. If WebSearch is unavailable for a company, mark its evidence as `pending` and continue; do not invent sources.

Companies to research (public benchmark only, in alphabetical order):

```text
Adept
Anrok
Auditoria
Basis
Bench (AI bookkeeping)
Brex AI
Campfire (AI accounting)
Capchase AI
Cassidy AI
Cohere agents
Crew AI Enterprise
Decagon
Digits
Fairmatic
Findem
Fixie
Glean Agents
Gong AI
Hebbia
Highspot AI
HubSpot AI Breeze
Inscribe
Inkeep
Inngest agent platform
Klarity
LangChain Cloud and LangSmith
Levity
Lindy
Mastra Cloud
Mendable
Microsoft Copilot Studio
Notion AI agents
OpenAI Agents and GPT Store
Pylon
Ramp AI
Replit Agents
Rilla
Salesforce Agentforce
Sana
Sierra
Stack AI
SuperAGI
Tavus
ThoughtSpot Sage
Tome
UiPath agents
Vellum
Vercel Agents
Workato AI
You.com agents
Zapier Agents
```

This list is the suggested baseline. Drop any company that does not have an agent product publicly documented at the time of research, and add any newly verified company in the same dated, public-benchmark format. Coverage must remain bounded to ERP, finance, CRM, procurement, operations, MES, and agent platform infrastructure.

- [ ] **Step 2: Write proprietary references update**

Create `docs/study/04-proprietary-references/agentic-references.md` with these sections:

```markdown
# Agentic Proprietary References

## Progress

## Scope

## Per-Company Entries
```

The `## Per-Company Entries` section must have one subsection per researched company. Each subsection must include:

- public role and product surface;
- agent capabilities to observe;
- ERP, CRM, finance, procurement, operations, or MES relevance;
- date checked and source URLs;
- the sentence: "This reference is a public benchmark only; do not reuse code, prompts, tool schemas, workflow definitions, screenshots, templates, eval data, marketplace UI, or proprietary product expression."

Companies that remain `pending` after Step 1 must still appear with the dated-source field marked `pending`.

- [ ] **Step 3: Write long-form startups deep research**

Create `docs/study/12-agentic/startups-deep-research.md` with these sections:

```markdown
# Agentic Startups Deep Research

## Progress

## Method

## Time Horizon

## Coverage Map

## Themes Observed

## Funding And Maturity Signals

## License And Trust Signals

## Anti-Copy Notes

## OpenERP Takeaways
```

`Themes Observed` must identify at least five recurring product themes (for example: AR reconciliation automation, contract intelligence, expense triage, customer-facing copilots, internal knowledge agents). `License And Trust Signals` must record open-core, BSL, source-available, or proprietary postures encountered. `Anti-Copy Notes` must repeat the public-benchmark-only sentence.

- [ ] **Step 4: Verify research artifacts**

Run:

```bash
rg -n "Per-Company Entries|public benchmark only" docs/study/04-proprietary-references/agentic-references.md
rg -n "Themes Observed|Coverage Map|Time Horizon|License And Trust Signals|Anti-Copy Notes" docs/study/12-agentic/startups-deep-research.md
```

Expected: required sections are present and the public-benchmark-only sentence is repeated.

- [ ] **Step 5: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/04-proprietary-references/agentic-references.md docs/study/12-agentic/startups-deep-research.md
git commit -m "Add agentic startups deep research"
git push origin main
```

### Task 5: License Posture For Agentic Sources

**Files:**
- Create: `docs/study/12-agentic/license-posture.md`

- [ ] **Step 1: Cross-check existing license matrix**

Read `docs/study/00-methodology/license-risk-matrix.md` and identify the controlled license families already used in the OpenERP study. Reuse those names exactly; do not invent new categories unless a candidate license is missing from the matrix.

- [ ] **Step 2: Write agentic license posture**

Create `docs/study/12-agentic/license-posture.md` with these sections:

```markdown
# Agentic License Posture

## Progress

## Target License

## Family Treatment

## Agentic-Specific Risks

## Prompts And Tool Schemas

## Workflow Definitions

## Eval Datasets And Demos

## Marketplace And Catalog UI

## Sandbox And Policy Configuration

## Reuse Classification Recipes

## Anti-Copy Checklist
```

`Target License` must state MIT. `Family Treatment` must reproduce the existing posture: MIT, Apache-2.0, BSD eligible for inspiration with attribution tracking; MPL, LGPL, EPL cautious; GPL and AGPL functional reference only; BSL, Sustainable Use, Elastic, source-available, and proprietary as public benchmark or functional reference only. `Reuse Classification Recipes` must give one paragraph per agentic candidate category (framework, policy, sandbox, MCP, observability) explaining how to assign `usable`, `cautious inspiration`, `functional reference only`, `excluded`, or `Unknown`. `Anti-Copy Checklist` must be a bullet list covering prompts, tool schemas, workflow definitions, eval data, demos, marketplace UI, agent catalog UI, agent builder UI, policy DSL surface syntax, sandbox configuration, and MCP server schemas.

- [ ] **Step 3: Verify license posture**

Run:

```bash
rg -n "Target License|Family Treatment|Reuse Classification Recipes|Anti-Copy Checklist|MIT|Apache|AGPL|BSL|public benchmark" docs/study/12-agentic/license-posture.md
```

Expected: required sections and license families are present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/license-posture.md
git commit -m "Add agentic license posture"
git push origin main
```

## Phase 2 — Functional

### Task 6: Cross-Cutting Patterns Library

**Files:**
- Create: `docs/study/12-agentic/patterns-library.md`

- [ ] **Step 1: Write patterns library**

Create `docs/study/12-agentic/patterns-library.md` with these sections:

```markdown
# Agentic Patterns Library

## Progress

## Purpose

## Patterns

### Extraction

### Classification

### Reconciliation

### Anomaly Detection

### Drafting

### Summarization

### Decision Support

### Multi-Tool Orchestration

### Document QA

### Compliance Validation

### Notification And Escalation

### Customer Communication

## Pattern To MVP Family Mapping

## Pattern To Agent Mode

## Anti-Copy Notes

## OpenERP Takeaways
```

Each pattern subsection must include: business outcome, typical input, typical output, typical tools required, supervision posture, anti-copy risk in OpenERP wording. `Pattern To MVP Family Mapping` must explicitly map each pattern to at least one of CRM, project and service delivery, billing, accounting operations, reporting and automation, object-bound collaboration. `Pattern To Agent Mode` must classify each pattern as primarily conversational, autonomous, or workflow-typed (or a combination).

- [ ] **Step 2: Verify patterns library**

Run:

```bash
rg -n "Extraction|Classification|Reconciliation|Anomaly Detection|Drafting|Summarization|Decision Support|Multi-Tool Orchestration|Document QA|Compliance Validation|Pattern To MVP Family Mapping|Pattern To Agent Mode" docs/study/12-agentic/patterns-library.md
```

Expected: every pattern and mapping section is present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/patterns-library.md
git commit -m "Add agentic patterns library"
git push origin main
```

### Task 7: Agentic Functional Map

**Files:**
- Create: `docs/study/06-functional-map/agentic-functional-map.md`
- Modify: `docs/study/06-functional-map/global-functional-map.md`

- [ ] **Step 1: Create agentic functional map**

Create `docs/study/06-functional-map/agentic-functional-map.md` with these sections:

```markdown
# Agentic Functional Map

## Progress

## Product Boundary

## Family: CRM Agents

## Family: Project And Service Delivery Agents

## Family: Billing Agents

## Family: Accounting Operations Agents

## Family: Reporting And Automation Agents

## Family: Object-Bound Collaboration Agents

## Cross-Family Patterns Reference

## Vertical Pack Surface Reference

## Localization Requirements

## Integration Points

## Non-Copy Implementation Rule
```

Each `Family:` section must list candidate agents with: business outcome, typical trigger, typical tools, agent mode (conversational, autonomous, workflow-typed), supervision posture, expected human handoff, success metrics, and anti-copy notes. `Cross-Family Patterns Reference` must link to `docs/study/12-agentic/patterns-library.md`. `Vertical Pack Surface Reference` must link to `docs/study/12-agentic/vertical-packs-surface-map.md`. `Localization Requirements` must explicitly mention bilingual FR/EN for prompts, notifications, document drafts, and audit messages. `Non-Copy Implementation Rule` must repeat the rewriting model.

- [ ] **Step 2: Link from global functional map**

Append a subsection to `docs/study/06-functional-map/global-functional-map.md` titled `## Agentic Extension` that:

- briefly describes how the agentic extension supports CRM, project, billing, accounting operations, reporting, automation, and collaboration domains without replacing them;
- links to `docs/study/06-functional-map/agentic-functional-map.md`;
- explicitly states that procurement, MES, WMS, payroll, and manufacturing planning agents remain surface-mapped as later vertical packs.

- [ ] **Step 3: Verify functional map**

Run:

```bash
rg -n "Family: CRM Agents|Family: Project And Service Delivery Agents|Family: Billing Agents|Family: Accounting Operations Agents|Family: Reporting And Automation Agents|Family: Object-Bound Collaboration Agents|Vertical Pack Surface Reference|Non-Copy Implementation Rule" docs/study/06-functional-map/agentic-functional-map.md
rg -n "Agentic Extension|agentic-functional-map" docs/study/06-functional-map/global-functional-map.md
```

Expected: every family and link is present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/06-functional-map/agentic-functional-map.md docs/study/06-functional-map/global-functional-map.md
git commit -m "Add agentic functional map"
git push origin main
```

### Task 8: Thematic Deep Research By Use Case

**Files:**
- Create: `docs/study/12-agentic/agents-by-use-case.md`

- [ ] **Step 1: Compile use cases per family**

For each agent family (CRM, project and service delivery, billing, accounting operations, reporting and automation, object-bound collaboration), identify three to five recurring use cases that the agentic functional map (Task 7) introduced. Use cases must be expressed in OpenERP wording, not in vendor wording.

- [ ] **Step 2: Write thematic deep research**

Create `docs/study/12-agentic/agents-by-use-case.md` with these sections:

```markdown
# Agentic Deep Research By Use Case

## Progress

## Scope

## Method

## CRM Use Cases

## Project And Service Delivery Use Cases

## Billing Use Cases

## Accounting Operations Use Cases

## Reporting And Automation Use Cases

## Object-Bound Collaboration Use Cases

## Cross-Cutting Observations

## License And Trust Signals

## Anti-Copy Notes

## OpenERP Takeaways
```

For each use case subsection under a family, list:

- business problem (one sentence);
- typical agent mode and trigger;
- dated open source examples observed (URL, license, date, one-line description);
- dated proprietary examples observed (URL, public benchmark only, date);
- functional rewording in OpenERP terms;
- anti-copy boundary specific to this use case.

When no dated source is available for a use case, write the entry with `pending` instead of inventing one.

- [ ] **Step 3: Verify thematic deep research**

Run:

```bash
rg -n "CRM Use Cases|Project And Service Delivery Use Cases|Billing Use Cases|Accounting Operations Use Cases|Reporting And Automation Use Cases|Object-Bound Collaboration Use Cases|Anti-Copy Notes" docs/study/12-agentic/agents-by-use-case.md
```

Expected: every family use-case section is present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/agents-by-use-case.md
git commit -m "Add thematic agentic deep research"
git push origin main
```

### Task 9: Vertical Packs Surface Map

**Files:**
- Create: `docs/study/12-agentic/vertical-packs-surface-map.md`

- [ ] **Step 1: Write surface map**

Create `docs/study/12-agentic/vertical-packs-surface-map.md` with these sections:

```markdown
# Agentic Vertical Packs Surface Map

## Progress

## Scope

## Procurement Surface

## MES Surface

## WMS Surface

## Payroll Surface

## Manufacturing Planning Surface

## Reuse Of Patterns Library

## Reuse Of MVP Identity And Marketplace Design Spaces

## Anti-Copy Notes

## OpenERP Takeaways
```

Each surface section must include a short list of candidate agents (no deep coverage), the dependencies on existing OpenERP domains, and the explicit statement that the surface is `later vertical pack, not part of the agentic MVP`. `Reuse Of Patterns Library` must reference `docs/study/12-agentic/patterns-library.md`.

- [ ] **Step 2: Verify surface map**

Run:

```bash
rg -n "Procurement Surface|MES Surface|WMS Surface|Payroll Surface|Manufacturing Planning Surface|later vertical pack" docs/study/12-agentic/vertical-packs-surface-map.md
```

Expected: every surface section and the vertical-pack disclaimer are present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/vertical-packs-surface-map.md
git commit -m "Add agentic vertical packs surface map"
git push origin main
```

### Task 10: Business Agent Fiches Group A (CRM And Project)

**Files:**
- Create: `docs/study/02-fiches/agentic-crm-lead-qualification.md`
- Create: `docs/study/02-fiches/agentic-crm-customer-followup.md`
- Create: `docs/study/02-fiches/agentic-crm-contact-enrichment.md`
- Create: `docs/study/02-fiches/agentic-project-status-coaching.md`
- Create: `docs/study/02-fiches/agentic-project-timesheet-classification.md`
- Create: `docs/study/02-fiches/agentic-project-margin-alerts.md`

- [ ] **Step 1: Collect evidence per agent**

For each fiche, collect from the agentic functional map (Task 7), patterns library (Task 6), thematic deep research (Task 8), and dated public sources:

- business outcome (revenue, margin, time-to-cash, risk, satisfaction);
- agent mode (conversational, autonomous, workflow-typed);
- trigger (event or human interaction);
- tools required, expressed as typed contract concepts in OpenERP wording;
- supervision posture and human handoff rule;
- bilingual FR/EN expectation;
- success metrics in business terms;
- anti-copy notes covering prompts, examples, demos, and screenshots.

- [ ] **Step 2: Write fiches**

Each fiche must follow this section list:

```markdown
# <Agent Name>

## Evidence

## Business Outcome

## Agent Mode

## Trigger

## Tools Required (Concept Level)

## Supervision And Human Handoff

## Bilingual FR EN Requirements

## Success Metrics

## Risks

## Anti-Copy Notes

## OpenERP Takeaways
```

The names of agents in this group are:

- CRM Lead Qualification Agent;
- CRM Customer Follow-Up Agent;
- CRM Contact Enrichment Agent;
- Project Status Coaching Agent;
- Project Timesheet Classification Agent;
- Project Margin Alerts Agent.

- [ ] **Step 3: Verify fiches**

Run:

```bash
rg -n "Business Outcome|Agent Mode|Tools Required|Supervision And Human Handoff|Bilingual FR EN Requirements|Anti-Copy Notes|OpenERP Takeaways" docs/study/02-fiches/agentic-crm-lead-qualification.md docs/study/02-fiches/agentic-crm-customer-followup.md docs/study/02-fiches/agentic-crm-contact-enrichment.md docs/study/02-fiches/agentic-project-status-coaching.md docs/study/02-fiches/agentic-project-timesheet-classification.md docs/study/02-fiches/agentic-project-margin-alerts.md
```

Expected: required sections appear in every fiche.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/02-fiches/agentic-crm-lead-qualification.md docs/study/02-fiches/agentic-crm-customer-followup.md docs/study/02-fiches/agentic-crm-contact-enrichment.md docs/study/02-fiches/agentic-project-status-coaching.md docs/study/02-fiches/agentic-project-timesheet-classification.md docs/study/02-fiches/agentic-project-margin-alerts.md
git commit -m "Add agentic CRM and project agent fiches"
git push origin main
```

### Task 11: Business Agent Fiches Group B (Billing, Accounting, Reporting, Collaboration)

**Files:**
- Create: `docs/study/02-fiches/agentic-billing-invoice-draft.md`
- Create: `docs/study/02-fiches/agentic-billing-dunning.md`
- Create: `docs/study/02-fiches/agentic-billing-renewal-watch.md`
- Create: `docs/study/02-fiches/agentic-accounting-ar-reconciliation.md`
- Create: `docs/study/02-fiches/agentic-accounting-ap-triage.md`
- Create: `docs/study/02-fiches/agentic-accounting-anomaly-detection.md`
- Create: `docs/study/02-fiches/agentic-reporting-summary-drafting.md`
- Create: `docs/study/02-fiches/agentic-automation-copilot.md`
- Create: `docs/study/02-fiches/agentic-collaboration-note-drafting.md`
- Create: `docs/study/02-fiches/agentic-collaboration-decision-summarization.md`

- [ ] **Step 1: Collect evidence per agent**

Same field list as Task 10, Step 1.

- [ ] **Step 2: Write fiches**

Each fiche must follow the same section list as Task 10. The agents in this group are:

- Billing Invoice Draft Agent;
- Billing Dunning Agent;
- Billing Renewal Watch Agent;
- Accounting AR Reconciliation Agent;
- Accounting AP Triage Agent;
- Accounting Anomaly Detection Agent;
- Reporting Summary Drafting Agent;
- Automation Copilot Agent;
- Collaboration Note Drafting Agent;
- Collaboration Decision Summarization Agent.

- [ ] **Step 3: Verify fiches**

Run:

```bash
rg -n "Business Outcome|Agent Mode|Tools Required|Supervision And Human Handoff|Bilingual FR EN Requirements|Anti-Copy Notes|OpenERP Takeaways" docs/study/02-fiches/agentic-billing-invoice-draft.md docs/study/02-fiches/agentic-billing-dunning.md docs/study/02-fiches/agentic-billing-renewal-watch.md docs/study/02-fiches/agentic-accounting-ar-reconciliation.md docs/study/02-fiches/agentic-accounting-ap-triage.md docs/study/02-fiches/agentic-accounting-anomaly-detection.md docs/study/02-fiches/agentic-reporting-summary-drafting.md docs/study/02-fiches/agentic-automation-copilot.md docs/study/02-fiches/agentic-collaboration-note-drafting.md docs/study/02-fiches/agentic-collaboration-decision-summarization.md
```

Expected: required sections appear in every fiche.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/02-fiches/agentic-billing-invoice-draft.md docs/study/02-fiches/agentic-billing-dunning.md docs/study/02-fiches/agentic-billing-renewal-watch.md docs/study/02-fiches/agentic-accounting-ar-reconciliation.md docs/study/02-fiches/agentic-accounting-ap-triage.md docs/study/02-fiches/agentic-accounting-anomaly-detection.md docs/study/02-fiches/agentic-reporting-summary-drafting.md docs/study/02-fiches/agentic-automation-copilot.md docs/study/02-fiches/agentic-collaboration-note-drafting.md docs/study/02-fiches/agentic-collaboration-decision-summarization.md
git commit -m "Add agentic billing, accounting, reporting, and collaboration agent fiches"
git push origin main
```

## Phase 3 — Governance And Runtime

### Task 12: Identity Delegation Design Space

**Files:**
- Create: `docs/study/12-agentic/identity-design-space.md`

- [ ] **Step 1: Write identity design space**

Create `docs/study/12-agentic/identity-design-space.md` with these sections:

```markdown
# Agentic Identity Delegation Design Space

## Progress

## Purpose

## Three Identity Patterns

### Acting-As

### Service Principal

### On-Behalf-Of

## Recommendations By Agent Mode

### Conversational

### Autonomous Event-Driven Or Scheduled

### Workflow-Typed

## Audit Implications

## Revocation And Rotation

## Cross-References To Section 8 (Marketplace) And Section 10 (Business Autonomy)

## Anti-Copy Notes

## OpenERP Takeaways
```

`Three Identity Patterns` must give one paragraph per pattern covering scope of permissions, audit attribution, lifecycle, and example use cases in OpenERP wording. `Recommendations By Agent Mode` must explicitly suggest a default identity per mode. The cross-references section must point to the marketplace and business autonomy design space files.

- [ ] **Step 2: Verify identity design space**

Run:

```bash
rg -n "Acting-As|Service Principal|On-Behalf-Of|Conversational|Autonomous Event-Driven Or Scheduled|Workflow-Typed|Revocation And Rotation" docs/study/12-agentic/identity-design-space.md
```

Expected: every pattern and mode subsection is present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/identity-design-space.md
git commit -m "Add agentic identity delegation design space"
git push origin main
```

### Task 13: Business Autonomy Design Space

**Files:**
- Create: `docs/study/12-agentic/business-autonomy-design-space.md`

- [ ] **Step 1: Write business autonomy design space**

Create `docs/study/12-agentic/business-autonomy-design-space.md` with these sections:

```markdown
# Agentic Business Autonomy Design Space

## Progress

## Purpose

## Four Autonomy Axes

### Discovery

### Selection And Activation

### Configuration

### Authoring

## Roles

### Tenant Administrator

### Power User With Delegated Agent Administration

### Standard Business User

### External Customer User Or Guest

## Scopes

### Personal Scope

### Team Scope

### Tenant Scope

### Cross-Tenant Scope

## Matrix: Axis x Role x Scope

## MVP Recommendation

## Cross-References To Identity And Marketplace

## Anti-Copy Notes

## OpenERP Takeaways
```

`Matrix: Axis x Role x Scope` must be a markdown table or a structured list mapping each combination to: the identity pattern required (acting-as, service principal, on-behalf-of), the marketplace tier required (private, partners, community), the supervision and approval gate required, and the runtime safety constraints. `MVP Recommendation` must explicitly state: self-service catalog (discovery, selection and activation, configuration) prioritized for MVP, authoring (including no-code or natural-language builder) kept post-MVP. `Anti-Copy Notes` must explicitly mention agent catalog UI, agent configuration UI, prompt builder UI, and natural-language description flows as forbidden reuse surfaces.

- [ ] **Step 2: Verify autonomy design space**

Run:

```bash
rg -n "Four Autonomy Axes|Discovery|Selection And Activation|Configuration|Authoring|Matrix: Axis x Role x Scope|MVP Recommendation|Anti-Copy Notes" docs/study/12-agentic/business-autonomy-design-space.md
```

Expected: every axis, role, and recommendation section is present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/business-autonomy-design-space.md
git commit -m "Add agentic business autonomy design space"
git push origin main
```

### Task 14: Marketplace Publication Design Space

**Files:**
- Create: `docs/study/12-agentic/marketplace-design-space.md`

- [ ] **Step 1: Write marketplace design space**

Create `docs/study/12-agentic/marketplace-design-space.md` with these sections:

```markdown
# Agentic Marketplace Publication Design Space

## Progress

## Purpose

## Three Tiers

### Private To Tenant

### Curated Partners

### Public Community

## Required Primitives Per Tier

### Publisher Identity

### Signing

### Registry

### Approval Workflow

### Anti-Copy And License Scanning

### Sandbox CI

### Version Pinning

### Revocation

### Observability And Audit

## Phasing Path

## Cross-References To Identity And Business Autonomy

## Anti-Copy Notes

## OpenERP Takeaways
```

`Required Primitives Per Tier` must include a table or structured list comparing each primitive across tiers (yes, conditional, required, with notes in OpenERP wording). `Phasing Path` must explicitly state the order private to partners to community as the recommended MVP-to-future evolution.

- [ ] **Step 2: Verify marketplace design space**

Run:

```bash
rg -n "Three Tiers|Private To Tenant|Curated Partners|Public Community|Required Primitives Per Tier|Phasing Path" docs/study/12-agentic/marketplace-design-space.md
```

Expected: every tier and primitives section is present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/marketplace-design-space.md
git commit -m "Add agentic marketplace publication design space"
git push origin main
```

### Task 15: Runtime Safety Functional Map

**Files:**
- Create: `docs/study/12-agentic/runtime-safety-functional-map.md`

- [ ] **Step 1: Write runtime safety functional map**

Create `docs/study/12-agentic/runtime-safety-functional-map.md` with these sections:

```markdown
# Agentic Runtime Safety Functional Map

## Progress

## Purpose

## Primitives

### Policy Engine

### Sandboxing

### MCP Interop

### GenAI Observability

### Secrets And Credentials

### Budgets

### Human Supervision

## Mapping To `@entropiq` Gaps

## Mapping To Trust Tier And Identity

## Anti-Copy Notes

## OpenERP Takeaways
```

Each primitive subsection must state: functional purpose in OpenERP wording, integration points with `@entropiq`, dependency on identity (Task 12), dependency on marketplace tier (Task 14), bilingual FR/EN considerations where applicable. `Mapping To @entropiq Gaps` must explicitly list which primitives are missing today and which are partially present.

- [ ] **Step 2: Verify runtime safety map**

Run:

```bash
rg -n "Policy Engine|Sandboxing|MCP Interop|GenAI Observability|Secrets And Credentials|Budgets|Human Supervision|Mapping To .entropiq" docs/study/12-agentic/runtime-safety-functional-map.md
```

Expected: every primitive subsection and the `@entropiq` mapping are present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/runtime-safety-functional-map.md
git commit -m "Add agentic runtime safety functional map"
git push origin main
```

### Task 16: Runtime Safety Brick Fiches — Policy And Sandbox

**Files:**
- Create: `docs/study/02-fiches/agentic-policy-opa.md`
- Create: `docs/study/02-fiches/agentic-policy-cedar.md`
- Create: `docs/study/02-fiches/agentic-policy-casbin.md`
- Create: `docs/study/02-fiches/agentic-sandbox-e2b.md`
- Create: `docs/study/02-fiches/agentic-sandbox-modal.md`
- Create: `docs/study/02-fiches/agentic-sandbox-isolate-vm.md`
- Create: `docs/study/02-fiches/agentic-sandbox-gvisor.md`

- [ ] **Step 1: Collect evidence per project**

For each project, collect: repository URL, official site, checked branch/tag/commit, license evidence path, declared license, reuse classification, primary functional role, integration suitability with `@entropiq`, anti-copy notes (especially policy DSL surface syntax, sandbox configuration templates, example libraries).

- [ ] **Step 2: Write fiches**

Each fiche must follow this section list:

```markdown
# <Project Name>

## Evidence

## License And Reuse

## Functional Role

## Integration Suitability With `@entropiq`

## OpenERP Trust Tier Fit

## Architecture Notes

## Self-Hosted And Kubernetes

## Anti-Copy Notes

## OpenERP Takeaways
```

`Anti-Copy Notes` must repeat that no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording are permitted.

- [ ] **Step 3: Verify fiches**

Run:

```bash
rg -n "License And Reuse|Functional Role|Integration Suitability With .entropiq|Anti-Copy Notes|OpenERP Takeaways" docs/study/02-fiches/agentic-policy-opa.md docs/study/02-fiches/agentic-policy-cedar.md docs/study/02-fiches/agentic-policy-casbin.md docs/study/02-fiches/agentic-sandbox-e2b.md docs/study/02-fiches/agentic-sandbox-modal.md docs/study/02-fiches/agentic-sandbox-isolate-vm.md docs/study/02-fiches/agentic-sandbox-gvisor.md
```

Expected: required sections appear in every fiche.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/02-fiches/agentic-policy-opa.md docs/study/02-fiches/agentic-policy-cedar.md docs/study/02-fiches/agentic-policy-casbin.md docs/study/02-fiches/agentic-sandbox-e2b.md docs/study/02-fiches/agentic-sandbox-modal.md docs/study/02-fiches/agentic-sandbox-isolate-vm.md docs/study/02-fiches/agentic-sandbox-gvisor.md
git commit -m "Add agentic policy and sandbox brick fiches"
git push origin main
```

### Task 17: Runtime Safety Brick Fiches — MCP And Observability

**Files:**
- Create: `docs/study/02-fiches/agentic-mcp-spec.md`
- Create: `docs/study/02-fiches/agentic-mcp-registry.md`
- Create: `docs/study/02-fiches/agentic-observability-langfuse.md`
- Create: `docs/study/02-fiches/agentic-observability-phoenix.md`
- Create: `docs/study/02-fiches/agentic-observability-helicone.md`
- Create: `docs/study/02-fiches/agentic-observability-traceloop.md`
- Create: `docs/study/02-fiches/agentic-observability-openinference.md`

- [ ] **Step 1: Collect evidence per project**

Same field list as Task 16, Step 1, adapted to MCP and observability. For MCP, also record the MCP specification version and the registry posture (signing, identity, discoverability). For observability, record support for traces, evals, audit trails, and rollback hooks.

- [ ] **Step 2: Write fiches**

Each fiche must follow the section list from Task 16, Step 2. Anti-copy notes must explicitly mention MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals as forbidden reuse surfaces.

- [ ] **Step 3: Verify fiches**

Run:

```bash
rg -n "License And Reuse|Functional Role|Integration Suitability With .entropiq|Anti-Copy Notes|OpenERP Takeaways" docs/study/02-fiches/agentic-mcp-spec.md docs/study/02-fiches/agentic-mcp-registry.md docs/study/02-fiches/agentic-observability-langfuse.md docs/study/02-fiches/agentic-observability-phoenix.md docs/study/02-fiches/agentic-observability-helicone.md docs/study/02-fiches/agentic-observability-traceloop.md docs/study/02-fiches/agentic-observability-openinference.md
```

Expected: required sections appear in every fiche.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/02-fiches/agentic-mcp-spec.md docs/study/02-fiches/agentic-mcp-registry.md docs/study/02-fiches/agentic-observability-langfuse.md docs/study/02-fiches/agentic-observability-phoenix.md docs/study/02-fiches/agentic-observability-helicone.md docs/study/02-fiches/agentic-observability-traceloop.md docs/study/02-fiches/agentic-observability-openinference.md
git commit -m "Add agentic MCP and observability brick fiches"
git push origin main
```

### Task 18: Human Supervision Design Space

**Files:**
- Create: `docs/study/12-agentic/human-supervision-design-space.md`

- [ ] **Step 1: Write human supervision design space**

Create `docs/study/12-agentic/human-supervision-design-space.md` with these sections:

```markdown
# Agentic Human Supervision Design Space

## Progress

## Purpose

## Supervision Patterns By Mode

### Conversational: Approval-In-The-Loop And Human Takeover

### Autonomous: Canary Mini-Modules And Rollback

### Workflow-Typed: Typed Checkpoints

## Approval Gates

## Escalation Rules

## Bilingual FR EN Notification And Audit Requirements

## Cross-References To Identity, Marketplace, And Business Autonomy

## Anti-Copy Notes

## OpenERP Takeaways
```

Each subsection under `Supervision Patterns By Mode` must include: when to apply, expected human action, escalation triggers, audit attribution, and bilingual notification requirements. `Escalation Rules` must give example thresholds in OpenERP wording (for example: financial impact, customer-facing action, regulated data, off-hours autonomy).

- [ ] **Step 2: Verify human supervision design space**

Run:

```bash
rg -n "Supervision Patterns By Mode|Approval-In-The-Loop And Human Takeover|Canary Mini-Modules And Rollback|Typed Checkpoints|Escalation Rules|Bilingual FR EN" docs/study/12-agentic/human-supervision-design-space.md
```

Expected: every mode pattern and escalation section is present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/12-agentic/human-supervision-design-space.md
git commit -m "Add agentic human supervision design space"
git push origin main
```

## Phase 4 — Single Final Synthesis (Sequential)

### Task 19: Agentic MVP Addendum

**Files:**
- Create: `docs/study/07-mvp/agentic-mvp-addendum.md`
- Modify: `docs/study/07-mvp/mvp-recommendation.md`

- [ ] **Step 1: Write MVP addendum**

Create `docs/study/07-mvp/agentic-mvp-addendum.md` with these sections:

```markdown
# Agentic MVP Addendum

## Progress

## Purpose

## MVP-Safe Agentic Capabilities

## MVP Agent Families

## MVP Runtime Posture (`@entropiq` Plus MCP And Policy Hooks)

## MVP Identity Posture

## MVP Marketplace Posture (Internal-Governed Tenant Tier)

## MVP Business Autonomy Posture (Self-Service Catalog First)

## MVP Human Supervision Posture

## Post-MVP

## Deferred

## Integration-First

## Acceptance Questions For Later Specs

## Anti-Copy Notes
```

`MVP Agent Families` must select a concrete subset of agents from Task 10 and Task 11 fiches and justify each by business outcome. `MVP Marketplace Posture` must explicitly state internal-governed private tier only. `MVP Business Autonomy Posture` must explicitly state self-service catalog axes first, authoring kept post-MVP. `Deferred` must explicitly list authoring autonomy, partner marketplace, community marketplace, autonomous large-scope agents, and vertical pack agents.

- [ ] **Step 2: Link from MVP recommendation**

Append a short subsection to `docs/study/07-mvp/mvp-recommendation.md` titled `## Agentic Addendum` that summarizes the agentic posture in two paragraphs and links to `docs/study/07-mvp/agentic-mvp-addendum.md`.

- [ ] **Step 3: Verify MVP addendum**

Run:

```bash
rg -n "MVP-Safe Agentic Capabilities|MVP Agent Families|MVP Runtime Posture|MVP Identity Posture|MVP Marketplace Posture|MVP Business Autonomy Posture|MVP Human Supervision Posture|Post-MVP|Deferred" docs/study/07-mvp/agentic-mvp-addendum.md
rg -n "Agentic Addendum|agentic-mvp-addendum" docs/study/07-mvp/mvp-recommendation.md
```

Expected: every MVP posture section and the link from `mvp-recommendation.md` are present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/07-mvp/agentic-mvp-addendum.md docs/study/07-mvp/mvp-recommendation.md
git commit -m "Add agentic MVP addendum"
git push origin main
```

### Task 20: Agentic Anti-Copy Addendum

**Files:**
- Create: `docs/study/08-anti-copy/agentic-anti-copy-addendum.md`
- Modify: `docs/study/08-anti-copy/anti-copy-dossier.md`

- [ ] **Step 1: Write anti-copy addendum**

Create `docs/study/08-anti-copy/agentic-anti-copy-addendum.md` with these sections:

```markdown
# Agentic Anti-Copy Addendum

## Progress

## Purpose

## Agentic-Specific Expression Risks

## Prompts And Personas

## Tool Definitions And Schemas

## Workflow And Agent Graph Definitions

## Eval Datasets And Golden Traces

## Marketplace And Registry UI

## Agent Catalog, Configuration, And Builder UI

## Policy DSL Surface Syntax

## Sandbox And Runtime Configuration Templates

## Pre-Merge Audit Checklist

## Source-Family Posture For Agentic Projects

## Anchor-Specific Notes (`@entropiq` And External Frameworks)
```

`Pre-Merge Audit Checklist` must list at least ten yes/no questions the reviewer answers before merging any agentic-touching PR (for example: which OpenERP spec section is the source of truth, which external projects informed the spec, are any external sources GPL or AGPL with functional-spec-only use confirmed, were prompts or tool schemas copied, were UI surfaces of catalog or builder copied, were eval datasets copied, were demos copied, were translations from another language requested, are FR/EN strings written in OpenERP wording, does the PR description include an anti-copy note).

- [ ] **Step 2: Link from anti-copy dossier**

Append a short subsection to `docs/study/08-anti-copy/anti-copy-dossier.md` titled `## Agentic Addendum` that links to the new addendum.

- [ ] **Step 3: Verify anti-copy addendum**

Run:

```bash
rg -n "Agentic-Specific Expression Risks|Prompts And Personas|Tool Definitions And Schemas|Workflow And Agent Graph Definitions|Eval Datasets And Golden Traces|Agent Catalog, Configuration, And Builder UI|Pre-Merge Audit Checklist" docs/study/08-anti-copy/agentic-anti-copy-addendum.md
rg -n "Agentic Addendum|agentic-anti-copy-addendum" docs/study/08-anti-copy/anti-copy-dossier.md
```

Expected: every required section and the link are present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/08-anti-copy/agentic-anti-copy-addendum.md docs/study/08-anti-copy/anti-copy-dossier.md
git commit -m "Add agentic anti-copy addendum"
git push origin main
```

### Task 21: Impacts On Existing MVP Specs

**Files:**
- Create: `docs/study/10-mvp-specs/agentic-impacts.md`
- Modify: `docs/study/10-mvp-specs/foundation-security-i18n.md`
- Modify: `docs/study/10-mvp-specs/crm-customer-timeline.md`
- Modify: `docs/study/10-mvp-specs/project-time-to-invoice.md`
- Modify: `docs/study/10-mvp-specs/billing-accounting.md`
- Modify: `docs/study/10-mvp-specs/reporting-automation.md`

- [ ] **Step 1: Write agentic impacts**

Create `docs/study/10-mvp-specs/agentic-impacts.md` with these sections:

```markdown
# Agentic Impacts On MVP Specs

## Progress

## Purpose

## Foundation, Security, And I18n

## CRM And Customer Timeline

## Project, Time, And Invoice Proposal

## Billing And Accounting Operations

## Reporting And Typed Automation

## Cross-References

## Anti-Copy Notes
```

Each MVP spec section must describe additions or adjustments expected when agents are introduced: permissions, identity hooks, audit fields, supervision affordances, typed automation extension into agentic workflows, FR/EN bilingual treatment. Each section must end with a pointer to the corresponding MVP spec file.

- [ ] **Step 2: Link from each existing MVP spec**

Append a short subsection to each of the five MVP spec files (`foundation-security-i18n.md`, `crm-customer-timeline.md`, `project-time-to-invoice.md`, `billing-accounting.md`, `reporting-automation.md`) titled `## Agentic Impacts` containing one paragraph that summarizes the agentic-related additions and links to `docs/study/10-mvp-specs/agentic-impacts.md`.

- [ ] **Step 3: Verify impacts**

Run:

```bash
rg -n "Foundation, Security, And I18n|CRM And Customer Timeline|Project, Time, And Invoice Proposal|Billing And Accounting Operations|Reporting And Typed Automation" docs/study/10-mvp-specs/agentic-impacts.md
rg -n "Agentic Impacts|agentic-impacts" docs/study/10-mvp-specs/foundation-security-i18n.md docs/study/10-mvp-specs/crm-customer-timeline.md docs/study/10-mvp-specs/project-time-to-invoice.md docs/study/10-mvp-specs/billing-accounting.md docs/study/10-mvp-specs/reporting-automation.md
```

Expected: every section and every back-link is present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/10-mvp-specs/agentic-impacts.md docs/study/10-mvp-specs/foundation-security-i18n.md docs/study/10-mvp-specs/crm-customer-timeline.md docs/study/10-mvp-specs/project-time-to-invoice.md docs/study/10-mvp-specs/billing-accounting.md docs/study/10-mvp-specs/reporting-automation.md
git commit -m "Add agentic impacts on existing MVP specs"
git push origin main
```

### Task 22: Final Synthesis Markdown Update

**Files:**
- Modify: `docs/study/11-final-package/final-synthesis.md`

- [ ] **Step 1: Update final synthesis**

Add or update these sections in `docs/study/11-final-package/final-synthesis.md`:

```markdown
## Agentic Extension

## Agentic Functional Headline

## Agentic Runtime Base: `@entropiq`

## Agentic Identity And Business Autonomy

## Agentic Marketplace Posture

## Agentic Runtime Safety And Supervision

## Agentic Deep Research Summary

## Agentic License And Anti-Copy

## Agentic MVP Recommendation

## Updated Next Step
```

Section ordering must be functional-first: the headline section must appear before runtime, identity, marketplace, and runtime safety sections. Each section must be no longer than five short paragraphs and must link to its detailed source in `docs/study/12-agentic/`, `docs/study/06-functional-map/`, `docs/study/07-mvp/`, or `docs/study/08-anti-copy/`. `Updated Next Step` must state the post-study transition (implementation planning of the agentic MVP after the existing foundation/security/i18n plan).

- [ ] **Step 2: Verify final synthesis update**

Run:

```bash
rg -n "Agentic Extension|Agentic Functional Headline|Agentic Runtime Base|Agentic Identity And Business Autonomy|Agentic Marketplace Posture|Agentic Runtime Safety And Supervision|Agentic Deep Research Summary|Agentic License And Anti-Copy|Agentic MVP Recommendation|Updated Next Step" docs/study/11-final-package/final-synthesis.md
```

Expected: every new section is present.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/11-final-package/final-synthesis.md
git commit -m "Update final synthesis with agentic extension"
git push origin main
```

### Task 23: PPTX Update

**Files:**
- Modify: `docs/study/11-final-package/openerp-final-synthesis.pptx`

- [ ] **Step 1: Update PPTX with agentic addendum**

Add slides to the existing PPTX deck. The slide order must be functional-first:

1. Agentic scope and positioning;
2. Agentic functional headline (agent families aligned with MVP);
3. Agentic deep research panorama (open source and proprietary, dated);
4. Identity, marketplace, and business autonomy design spaces;
5. Runtime safety primitives (`@entropiq` plus MCP and policy hooks);
6. MVP agentic recommendation;
7. Anti-copy posture.

Reuse the existing visual style. Use the visual companion or Playwright preview only to validate slide layouts; do not commit temporary preview artifacts. If updates require a script, prefer Python `python-pptx` and discard temporary files.

- [ ] **Step 2: Verify PPTX**

Run:

```bash
test -f docs/study/11-final-package/openerp-final-synthesis.pptx
file docs/study/11-final-package/openerp-final-synthesis.pptx
```

Expected: file exists and reports as a Microsoft PowerPoint document.

- [ ] **Step 3: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/11-final-package/openerp-final-synthesis.pptx
git commit -m "Update final PPTX with agentic addendum"
git push origin main
```

### Task 24: Final Verification

**Files:**
- Read: all files changed by this plan.

- [ ] **Step 1: Verify required artifacts**

Run:

```bash
test -f docs/study/12-agentic/glossary.md
test -f docs/study/12-agentic/entropiq-audit.md
test -f docs/study/12-agentic/license-posture.md
test -f docs/study/12-agentic/startups-deep-research.md
test -f docs/study/12-agentic/patterns-library.md
test -f docs/study/12-agentic/agents-by-use-case.md
test -f docs/study/12-agentic/vertical-packs-surface-map.md
test -f docs/study/12-agentic/identity-design-space.md
test -f docs/study/12-agentic/business-autonomy-design-space.md
test -f docs/study/12-agentic/marketplace-design-space.md
test -f docs/study/12-agentic/runtime-safety-functional-map.md
test -f docs/study/12-agentic/human-supervision-design-space.md
test -f docs/study/01-corpus/agentic-corpus-report.md
test -f docs/study/04-proprietary-references/agentic-references.md
test -f docs/study/06-functional-map/agentic-functional-map.md
test -f docs/study/07-mvp/agentic-mvp-addendum.md
test -f docs/study/08-anti-copy/agentic-anti-copy-addendum.md
test -f docs/study/10-mvp-specs/agentic-impacts.md
test -f docs/study/11-final-package/final-synthesis.md
test -f docs/study/11-final-package/openerp-final-synthesis.pptx
```

Expected: every file exists.

- [ ] **Step 2: Verify forbidden terminology guardrail**

Run:

```bash
rg -n "sco""re|sco""ring|wei""ghted|pond[eé]""r|ran""king|ran""ked|ran""kings" docs/study/12-agentic docs/study/07-mvp/agentic-mvp-addendum.md docs/study/08-anti-copy/agentic-anti-copy-addendum.md docs/study/10-mvp-specs/agentic-impacts.md docs/study/11-final-package
```

Expected: no matches. `rg` exit code `1` is acceptable because it means no matches.

- [ ] **Step 3: Verify incomplete-marker guardrail**

Run:

```bash
rg -in "TO""DO|TB""D|FIX""ME|XX""X|place""holder" docs/study/12-agentic docs/study/07-mvp/agentic-mvp-addendum.md docs/study/08-anti-copy/agentic-anti-copy-addendum.md docs/study/10-mvp-specs/agentic-impacts.md
```

Expected: no matches.

- [ ] **Step 4: Verify anti-copy and license posture surfaces**

Run:

```bash
rg -n "functional reference only|public benchmark only|do not reuse|anti-copy|MIT|Apache|AGPL|BSL|source-available" docs/study/02-fiches docs/study/04-proprietary-references/agentic-references.md docs/study/08-anti-copy docs/study/11-final-package/final-synthesis.md docs/study/12-agentic
```

Expected: reuse-boundary terms appear across fiches, proprietary references, anti-copy docs, final synthesis, and agentic dossier.

- [ ] **Step 5: Verify dated sources for proprietary references**

Run:

```bash
rg -n "20(24|25|26)" docs/study/04-proprietary-references/agentic-references.md docs/study/12-agentic/startups-deep-research.md docs/study/12-agentic/agents-by-use-case.md
```

Expected: dated mentions appear in every research file.

- [ ] **Step 6: Verify raw clones and Graphify outputs are not staged**

Run:

```bash
git status --short --ignored research/sources research/graphify
```

Expected: directories may exist but their contents must not appear in the staged or working tree of `git status`.

- [ ] **Step 7: Verify commit message hygiene for this plan's commits**

Run:

```bash
git log --format='%H | %s%n%b---' 85bab05..HEAD | grep -iE 'co-""authored-by:|noreply@|generated with|made with .*assistant'
```

Expected: no output. The grep exit code `1` confirms that no AI assistant attribution was introduced in the agentic execution commits.

- [ ] **Step 8: Verify git state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -12
```

Expected: branch is `main`, aligned with `origin/main`, with the agentic execution commits visible.

- [ ] **Step 9: Push final state**

Run:

```bash
git push origin main
```

Expected: push succeeds or reports everything up to date.
