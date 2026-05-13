# Agentic Deep Research By Use Case

## Progress

Fait: thematic agentic use cases are mapped across CRM, project and service delivery, billing, accounting operations, reporting and automation, and object-bound collaboration using the Phase 1 corpus, proprietary references, startup research, and MVP boundary.
À faire: reuse this map as evidence input for the business-agent fiches and final MVP addendum; refine only if maintainers add new dated sources before synthesis.
Attendu: keep the agentic extension functional-first: each use case starts from an operational problem, then maps agent mode, trigger, sources, and anti-copy limits.

## Scope

This file is a thematic research companion for the agentic functional map. It covers recurring use cases that can support the service-company MVP without turning OpenERP into a generic agent platform. The retained families are CRM, project and service delivery, billing, accounting operations, reporting and automation, and object-bound collaboration.

Procurement, MES, WMS, payroll, and manufacturing planning are intentionally not deep-covered here. They remain later vertical packs and should inherit the same supervision, identity, catalog, and anti-copy posture once those packs are specified.

## Method

The open source examples are drawn from `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md`, checked on 2026-05-11. They are used as functional references for agent loops, typed tool calling, durability, observability, and policy integration, not as sources for OpenERP product expression.

The proprietary examples are drawn from `docs/study/04-proprietary-references/agentic-references.md` and `docs/study/12-agentic/startups-deep-research.md`, with dated public sources from 2024 through 2026. They are public benchmark only; do not reuse code, prompts, tool schemas, workflow definitions, screenshots, templates, eval data, marketplace UI, or proprietary product expression.

Each use case below records: business problem, typical agent mode and trigger, dated open source examples observed, dated proprietary examples observed, functional rewording in OpenERP terms, and a use-case-specific anti-copy boundary.

## CRM Use Cases

### Lead Qualification And Routing

- **Business problem**: sales teams need consistent opportunity triage without making the CRM pipeline depend on informal notes or manual memory.
- **Typical agent mode and trigger**: workflow-typed agent triggered when a lead, imported contact, form submission, or customer activity enters the CRM timeline.
- **Dated open source examples observed**: LangGraph, https://github.com/langchain-ai/langgraph, MIT, checked 2026-05-11, stateful multi-step agent orchestration; PydanticAI, https://github.com/pydantic/pydantic-ai, MIT, checked 2026-05-11, typed tool and result validation; Casbin, https://github.com/casbin/casbin, Apache-2.0, checked 2026-05-11, access-control enforcement reference.
- **Dated proprietary examples observed**: HubSpot Breeze Agents, https://www.hubspot.com/products/artificial-intelligence/breeze-ai-agents, product page 2025, public benchmark only; Salesforce Agentforce, https://www.salesforce.com/news/press-releases/2024/09/12/agentforce-announcement/, 2024-09-12, public benchmark only; Gong AI, https://www.prnewswire.com/news-releases/gong-unveils-new-ai-innovations-to-help-revenue-teams-drive-growth-at-scale-302589851.html, 2025-10, public benchmark only.
- **Functional rewording in OpenERP terms**: evaluate lead completeness, industry fit, account history, service interest, language, and next action; propose owner, stage, and required follow-up while leaving final stage movement auditable.
- **Anti-copy boundary**: do not reuse vendor lead criteria, sales playbooks, CRM field labels, agent prompts, pipeline UI, or example qualification conversations.

### Customer Follow-Up Drafting

- **Business problem**: customer-facing replies and next-step reminders are inconsistent when sales, delivery, and finance context live in separate objects.
- **Typical agent mode and trigger**: conversational agent launched by a sales lead or project manager from the customer timeline; workflow-typed draft generation can also trigger after a meeting note or overdue activity.
- **Dated open source examples observed**: OpenAI Agents SDK, https://github.com/openai/openai-agents-python, MIT, checked 2026-05-11, handoff and guardrail reference; Vercel AI SDK, https://github.com/vercel/ai, Apache-2.0, checked 2026-05-11, streaming and tool-calling reference; Helicone, https://github.com/Helicone/helicone, Apache-2.0, checked 2026-05-11, LLM request observability reference.
- **Dated proprietary examples observed**: Sierra, https://sierra.ai/blog/agents-as-a-service, 2024, public benchmark only; Decagon, https://decagon.ai/resources/series-b, 2024, public benchmark only; HubSpot Breeze customer agent, https://www.hubspot.com/company-news/build-your-ai-team, 2025, public benchmark only.
- **Functional rewording in OpenERP terms**: generate bilingual draft emails or portal messages from customer history, open quotes, project status, invoice status, and the user's chosen tone; require human send approval.
- **Anti-copy boundary**: do not reuse proprietary reply templates, customer service scripts, agent persona text, screenshots, or escalation wording from any benchmark.

### Contact Enrichment And Timeline Hygiene

- **Business problem**: CRM records decay when contact details, roles, related companies, and recent interactions are not normalized.
- **Typical agent mode and trigger**: workflow-typed agent triggered by import, duplicate detection, email capture, or manual enrichment request; conversational mode supports user review.
- **Dated open source examples observed**: BAML, https://github.com/BoundaryML/baml, Apache-2.0, checked 2026-05-11, structured extraction reference only; PydanticAI, https://github.com/pydantic/pydantic-ai, MIT, checked 2026-05-11, typed result validation; OpenInference, https://github.com/Arize-ai/openinference, Apache-2.0, checked 2026-05-11, trace attribute reference.
- **Dated proprietary examples observed**: Findem, https://www.prnewswire.com/news-releases/findem-raises-51-million-to-transform-how-companies-hire-with-the-worlds-largest-expert-labeled-talent-dataset-302589634.html, 2025-10, public benchmark only; Glean Agents, https://www.cnbc.com/2025/06/10/glean-gen-ai-search-startup-raises-150-million-at-7-billion-value.html, 2025-06-10, public benchmark only; Gong AI data extraction, https://www.gong.io/press/gong-unveils-new-ai-innovations-to-help-revenue-teams-drive-growth-at-scale, 2025, public benchmark only.
- **Functional rewording in OpenERP terms**: propose normalized contact fields, relationship links, duplicate merge candidates, language preference, and missing required fields with source evidence and user approval.
- **Anti-copy boundary**: do not reuse external enrichment field catalogs, example data, matching heuristics, or UI flows; express all fields from OpenERP's account/contact model.

## Project And Service Delivery Use Cases

### Project Status Coaching

- **Business problem**: project managers need early visibility into blocked tasks, missed customer updates, and unclear delivery ownership.
- **Typical agent mode and trigger**: conversational agent launched from a project, plus scheduled autonomous review for stale status and overdue customer-visible updates.
- **Dated open source examples observed**: LangGraph, https://github.com/langchain-ai/langgraph, MIT, checked 2026-05-11, state checkpoint reference; Inngest Agent Kit, https://github.com/inngest/agent-kit, Apache-2.0, checked 2026-05-11, durable event-driven reference; Langfuse, https://github.com/langfuse/langfuse, MIT open-core, checked 2026-05-11, cautious inspiration for trace review.
- **Dated proprietary examples observed**: Glean Agents, https://aibusiness.com/agentic-ai/glean-s-model-aims-redefine-enterprise-search-with-ai, 2025, public benchmark only; Notion Custom Agents, https://www.notion.com/releases/2026-02-24, 2026-02-24, public benchmark only; Workato AI, https://www.businesswire.com/news/home/20250819305476/en/Workato-Supercharges-ONE-The-Agentic-Core-for-AI-Ready-Enterprises, 2025-08-19, public benchmark only.
- **Functional rewording in OpenERP terms**: summarize project health from tasks, milestones, time entries, comments, decisions, files, and customer commitments; propose actions without changing assignments unless approved.
- **Anti-copy boundary**: do not reuse external project-management status labels, workspace templates, prompt patterns, or automation recipes.

### Timesheet Classification

- **Business problem**: finance and project leads need billable, non-billable, internal, warranty, and support time classified consistently before invoicing.
- **Typical agent mode and trigger**: workflow-typed agent triggered on submitted time entries, with human approval before invoice eligibility changes.
- **Dated open source examples observed**: PydanticAI, https://github.com/pydantic/pydantic-ai, MIT, checked 2026-05-11, typed classification reference; BAML, https://github.com/BoundaryML/baml, Apache-2.0, checked 2026-05-11, structured output reference only; OPA, https://github.com/open-policy-agent/opa, Apache-2.0, checked 2026-05-11, policy gate reference.
- **Dated proprietary examples observed**: Brex AI, https://www.brex.com/platform/intelligent-finance, January 2024 GA noted, public benchmark only; UiPath agents, https://www.uipath.com/newsroom/uipath-unveils-vision-for-future-agentic-automation, 2024-10, public benchmark only; Workato AI, https://www.businesswire.com/news/home/20250819305476/en/Workato-Supercharges-ONE-The-Agentic-Core-for-AI-Ready-Enterprises, 2025-08-19, public benchmark only.
- **Functional rewording in OpenERP terms**: classify time against project contract rules, service catalog items, customer visibility, and margin reporting; present exceptions for manager review.
- **Anti-copy boundary**: do not reuse external classification labels, approval forms, workflow definitions, policy examples, or demo entries.

### Margin And Delivery Alerting

- **Business problem**: service projects lose margin when overruns, unapproved time, scope drift, and delayed invoicing are detected too late.
- **Typical agent mode and trigger**: autonomous scheduled agent with service-principal identity for read-heavy checks; human handoff before customer-facing or accounting action.
- **Dated open source examples observed**: Inngest Agent Kit, https://github.com/inngest/agent-kit, Apache-2.0, checked 2026-05-11, scheduled durable agent reference; OpenInference, https://github.com/Arize-ai/openinference, Apache-2.0, checked 2026-05-11, observability convention reference; Cedar, https://github.com/cedar-policy/cedar, Apache-2.0, checked 2026-05-11, entity authorization reference.
- **Dated proprietary examples observed**: Campfire, https://techcrunch.com/2025/06/30/tiny-ai-erp-startup-campfire-is-winning-so-many-startups-from-netsuite-accel-led-a-35m-series-a/, 2025-06-30, public benchmark only; Auditoria, https://www.businesswire.com/news/home/20250826339157/en/Auditoria.AI-Accelerates-Autonomous-Finance-Push-with-new-AI-Agents-ERP-Deals-and-Series-B-Momentum, 2025-08-26, public benchmark only; ThoughtSpot Sage and Spotter, https://www.thoughtspot.com/product/agents, product page 2025, public benchmark only.
- **Functional rewording in OpenERP terms**: detect margin risk from approved time, estimated effort, contract terms, invoice status, and unresolved blockers; create an internal alert or approval request.
- **Anti-copy boundary**: do not reuse proprietary finance dashboards, alert thresholds, naming, examples, or analytical copy.

## Billing Use Cases

### Invoice Draft Preparation

- **Business problem**: invoice drafts require careful assembly from contracts, milestones, approved time, expenses, and billing schedules.
- **Typical agent mode and trigger**: workflow-typed agent triggered by invoice proposal generation, with finance review before issue.
- **Dated open source examples observed**: Vercel AI SDK, https://github.com/vercel/ai, Apache-2.0, checked 2026-05-11, tool-call streaming reference; PydanticAI, https://github.com/pydantic/pydantic-ai, MIT, checked 2026-05-11, typed output validation; OPA, https://github.com/open-policy-agent/opa, Apache-2.0, checked 2026-05-11, policy decision reference.
- **Dated proprietary examples observed**: Campfire Ember AI, https://campfire.ai/blog/campfire-raises-35m-series-a-from-accel, 2025-06-30, public benchmark only; Digits AI Agents, https://www.globenewswire.com/news-release/2025/06/23/3103524/0/en/Digits-Launches-First-AI-Agents-for-Accounting-Workflows-Built-on-Digits-Autonomous-General-Ledger.html, 2025-06-23, public benchmark only; Auditoria finance agents, https://www.businesswire.com/news/home/20250826339157/en/Auditoria.AI-Accelerates-Autonomous-Finance-Push-with-new-AI-Agents-ERP-Deals-and-Series-B-Momentum, 2025-08-26, public benchmark only.
- **Functional rewording in OpenERP terms**: assemble draft invoice lines with source references, missing approval warnings, bilingual customer notes, and accounting posting readiness.
- **Anti-copy boundary**: do not reuse vendor invoice screens, finance prompts, line-item examples, template language, or accounting workflow names.

### Dunning And Payment Follow-Up

- **Business problem**: overdue invoices require consistent, courteous follow-up while respecting customer history, language, and escalation limits.
- **Typical agent mode and trigger**: autonomous scheduled agent for internal draft creation, conversational review for finance users, human approval before sending.
- **Dated open source examples observed**: Inngest Agent Kit, https://github.com/inngest/agent-kit, Apache-2.0, checked 2026-05-11, scheduled workflow reference; Helicone, https://github.com/Helicone/helicone, Apache-2.0, checked 2026-05-11, cost and trace reference; Casbin, https://github.com/casbin/casbin, Apache-2.0, checked 2026-05-11, role and attribute access control reference.
- **Dated proprietary examples observed**: Capchase Collect, https://www.capchase.com/blog/capchase-pay-2024-milestones-and-top-feature-releases, 2024, public benchmark only; Auditoria AI, https://www.pymnts.com/artificial-intelligence-2/2025/auditoria-ai-adds-new-ai-agent-for-financial-planning-and-analysis/, 2025, public benchmark only; Ramp AI, https://www.prnewswire.com/news-releases/ramp-introduces-ai-agents-to-automate-finance-operations-302502154.html, 2025-07-10, public benchmark only.
- **Functional rewording in OpenERP terms**: propose payment reminder drafts based on due date, amount, customer language, prior follow-up, disputed status, and escalation threshold.
- **Anti-copy boundary**: do not reuse proprietary collection scripts, email templates, cadence names, UI layouts, or examples.

### Renewal Watch

- **Business problem**: recurring service contracts and subscriptions can renew late or without adequate customer preparation.
- **Typical agent mode and trigger**: autonomous scheduled agent for approaching renewal dates; conversational assistant for account-owner review.
- **Dated open source examples observed**: LangGraph, https://github.com/langchain-ai/langgraph, MIT, checked 2026-05-11, stateful review reference; Inngest Agent Kit, https://github.com/inngest/agent-kit, Apache-2.0, checked 2026-05-11, durable scheduling reference; OpenInference, https://github.com/Arize-ai/openinference, Apache-2.0, checked 2026-05-11, trace reference.
- **Dated proprietary examples observed**: HubSpot Breeze, https://www.hubspot.com/products/artificial-intelligence/breeze-ai-agents, product page 2025, public benchmark only; Gong AI, https://www.prnewswire.com/news-releases/gong-unveils-new-ai-innovations-to-help-revenue-teams-drive-growth-at-scale-302589851.html, 2025-10, public benchmark only; Workato AI, https://www.businesswire.com/news/home/20250819305476/en/Workato-Supercharges-ONE-The-Agentic-Core-for-AI-Ready-Enterprises, 2025-08-19, public benchmark only.
- **Functional rewording in OpenERP terms**: identify contracts nearing renewal, summarize usage and service delivery history, propose internal next actions, and prepare bilingual customer drafts.
- **Anti-copy boundary**: do not reuse external renewal playbooks, notification copy, sales scripts, or lifecycle terminology.

## Accounting Operations Use Cases

### Accounts Receivable Reconciliation

- **Business problem**: payments, invoices, credits, and customer references often need assisted matching before finance can close AR worklists.
- **Typical agent mode and trigger**: workflow-typed agent triggered by bank import, payment webhook, or manual finance review; finance user confirms matches.
- **Dated open source examples observed**: PydanticAI, https://github.com/pydantic/pydantic-ai, MIT, checked 2026-05-11, typed matching result reference; OPA, https://github.com/open-policy-agent/opa, Apache-2.0, checked 2026-05-11, policy gate reference; OpenInference, https://github.com/Arize-ai/openinference, Apache-2.0, checked 2026-05-11, audit trace reference.
- **Dated proprietary examples observed**: Auditoria, https://www.businesswire.com/news/home/20250826339157/en/Auditoria.AI-Accelerates-Autonomous-Finance-Push-with-new-AI-Agents-ERP-Deals-and-Series-B-Momentum, 2025-08-26, public benchmark only; Brex AI, https://www.brex.com/platform/intelligent-finance, January 2024 GA noted, public benchmark only; Digits Autonomous General Ledger, https://www.globenewswire.com/news-release/2025/03/10/3039814/0/en/AI-Startup-Digits-Takes-on-QuickBooks-with-the-World-s-First-Autonomous-General-Ledger-for-Accounting-Xero-Co-founder-Craig-Walker-Joins-Digits.html, 2025-03-10, public benchmark only.
- **Functional rewording in OpenERP terms**: propose reconciliations with source references, confidence explanation in plain language, exception reasons, and required approval before posting.
- **Anti-copy boundary**: do not reuse proprietary reconciliation screens, matching rules, journal examples, or finance workflow copy.

### Accounts Payable Triage

- **Business problem**: supplier invoices and attachments need routing, duplicate checks, tax field capture, and approval assignment before payment.
- **Typical agent mode and trigger**: workflow-typed agent triggered by uploaded supplier invoice or mailbox ingestion; human approval before accounting entry.
- **Dated open source examples observed**: BAML, https://github.com/BoundaryML/baml, Apache-2.0, checked 2026-05-11, structured extraction reference only; PydanticAI, https://github.com/pydantic/pydantic-ai, MIT, checked 2026-05-11, validation reference; Cedar, https://github.com/cedar-policy/cedar, Apache-2.0, checked 2026-05-11, entity permission reference.
- **Dated proprietary examples observed**: Klarity, https://www.klarity.ai/post/how-klarity-works-extract-key-data, 2025, public benchmark only; Ramp AI, https://www.prnewswire.com/news-releases/ramp-launches-agents-for-ap-to-automate-accounts-payable-302576975.html, 2025-10, public benchmark only; Brex AI, https://www.brex.com/platform/intelligent-finance, January 2024 GA noted, public benchmark only.
- **Functional rewording in OpenERP terms**: extract invoice facts, detect duplicates, propose project or cost allocation, identify approver, and hold payment-sensitive actions for finance review.
- **Anti-copy boundary**: do not reuse extraction prompts, supplier invoice demos, approval workflows, or document review UI from benchmarks.

### Accounting Anomaly Detection

- **Business problem**: unusual journal entries, tax fields, account mappings, or period-close changes can create audit and close risk.
- **Typical agent mode and trigger**: autonomous scheduled agent over accounting operations, with workflow-typed checkpoints before any correction.
- **Dated open source examples observed**: LangGraph, https://github.com/langchain-ai/langgraph, MIT, checked 2026-05-11, multi-step review reference; Langfuse, https://github.com/langfuse/langfuse, MIT open-core, checked 2026-05-11, cautious inspiration for trace review; OPA, https://github.com/open-policy-agent/opa, Apache-2.0, checked 2026-05-11, policy enforcement reference.
- **Dated proprietary examples observed**: Digits AI Agents, https://www.globenewswire.com/news-release/2025/06/23/3103524/0/en/Digits-Launches-First-AI-Agents-for-Accounting-Workflows-Built-on-Digits-Autonomous-General-Ledger.html, 2025-06-23, public benchmark only; Campfire, https://campfire.ai/blog/campfire-raises-35m-series-a-from-accel, 2025-06-30, public benchmark only; Auditoria AI, https://www.businesswire.com/news/home/20250826339157/en/Auditoria.AI-Accelerates-Autonomous-Finance-Push-with-new-AI-Agents-ERP-Deals-and-Series-B-Momentum, 2025-08-26, public benchmark only.
- **Functional rewording in OpenERP terms**: surface unusual postings, stale approvals, missing source documents, period-close blockers, and tax-field inconsistencies as finance review items.
- **Anti-copy boundary**: do not reuse proprietary anomaly taxonomies, product labels, examples, report layouts, or finance automation copy.

## Reporting And Automation Use Cases

### Operational Summary Drafting

- **Business problem**: leaders need periodic summaries of sales, delivery, billing, AR, and project risk without manually stitching reports.
- **Typical agent mode and trigger**: scheduled autonomous draft creation with human review before distribution; conversational drill-down by authorized users.
- **Dated open source examples observed**: Vercel AI SDK, https://github.com/vercel/ai, Apache-2.0, checked 2026-05-11, streaming response reference; LangGraph, https://github.com/langchain-ai/langgraph, MIT, checked 2026-05-11, stateful synthesis reference; Helicone, https://github.com/Helicone/helicone, Apache-2.0, checked 2026-05-11, request observability reference.
- **Dated proprietary examples observed**: ThoughtSpot Spotter, https://www.thoughtspot.com/product/agents, product page 2025, public benchmark only; Glean Agents, https://www.cnbc.com/2025/06/10/glean-gen-ai-search-startup-raises-150-million-at-7-billion-value.html, 2025-06-10, public benchmark only; You.com Agents, https://you.com/agents, product page 2025, public benchmark only.
- **Functional rewording in OpenERP terms**: draft role-aware weekly or month-end summaries with links back to underlying reports, exceptions, and action items.
- **Anti-copy boundary**: do not reuse external analytics UI, report prose, chart examples, or natural-language query copy.

### Typed Automation Copilot

- **Business problem**: administrators need help composing safe triggers and actions without opening the platform to arbitrary automation.
- **Typical agent mode and trigger**: conversational assistant inside the typed automation configuration flow, with workflow-typed validation before activation.
- **Dated open source examples observed**: Inngest Agent Kit, https://github.com/inngest/agent-kit, Apache-2.0, checked 2026-05-11, durable trigger/action reference; OPA, https://github.com/open-policy-agent/opa, Apache-2.0, checked 2026-05-11, policy reference; gVisor, https://github.com/google/gvisor, Apache-2.0, checked 2026-05-11, isolation reference for later tiers.
- **Dated proprietary examples observed**: Zapier Agents, https://zapier.com/blog/zapier-agents-guide/, 2024 beta launch noted, public benchmark only; Workato AI, https://www.businesswire.com/news/home/20250819305476/en/Workato-Supercharges-ONE-The-Agentic-Core-for-AI-Ready-Enterprises, 2025-08-19, public benchmark only; UiPath agents, https://www.uipath.com/newsroom/uipath-unveils-vision-for-future-agentic-automation, 2024-10, public benchmark only.
- **Functional rewording in OpenERP terms**: translate an admin's intended business rule into a constrained OpenERP trigger/action proposal, show affected objects and permissions, and require explicit activation.
- **Anti-copy boundary**: do not reuse automation recipe libraries, node palettes, builder UI, integration directory labels, or workflow examples.

### Exception Notification And Escalation

- **Business problem**: invoices, approvals, imports, automations, and customer commitments need timely escalation without creating alert fatigue.
- **Typical agent mode and trigger**: autonomous event-driven or scheduled agent; escalation thresholds are configured by tenant administrators.
- **Dated open source examples observed**: Inngest Agent Kit, https://github.com/inngest/agent-kit, Apache-2.0, checked 2026-05-11, event processing reference; Casbin, https://github.com/casbin/casbin, Apache-2.0, checked 2026-05-11, permission reference; OpenInference, https://github.com/Arize-ai/openinference, Apache-2.0, checked 2026-05-11, trace metadata reference.
- **Dated proprietary examples observed**: Workato AI, https://www.businesswire.com/news/home/20250819305476/en/Workato-Supercharges-ONE-The-Agentic-Core-for-AI-Ready-Enterprises, 2025-08-19, public benchmark only; Zapier Agents, https://help.zapier.com/hc/en-us/articles/36713413544845-Big-changes-to-Zapier-Agents-and-planned-maintenance, 2025-05, public benchmark only; UiPath agents, https://www.uipath.com/newsroom/uipath-accelerates-ai-transformation-with-agentic-automation-and-orchestration, 2025, public benchmark only.
- **Functional rewording in OpenERP terms**: create role-aware internal alerts for overdue approvals, failed imports, failed automation runs, payment risk, and customer-facing deadlines.
- **Anti-copy boundary**: do not reuse proprietary alert names, escalation cadences, product flows, or notification copy.

## Object-Bound Collaboration Use Cases

### Note Drafting On Business Objects

- **Business problem**: users need concise project, customer, invoice, and task notes that preserve context without replacing the human record owner.
- **Typical agent mode and trigger**: conversational agent launched from an object timeline; human user chooses whether to save the draft.
- **Dated open source examples observed**: OpenAI Agents SDK, https://github.com/openai/openai-agents-python, MIT, checked 2026-05-11, conversational handoff reference; Vercel AI SDK, https://github.com/vercel/ai, Apache-2.0, checked 2026-05-11, streaming UI reference; Langfuse, https://github.com/langfuse/langfuse, MIT open-core, checked 2026-05-11, cautious inspiration for trace review.
- **Dated proprietary examples observed**: Notion Custom Agents, https://www.notion.com/releases/2026-02-24, 2026-02-24, public benchmark only; Inkeep, https://inkeep.com/enterprise, product page 2025, public benchmark only; Glean Agents, https://www.cnbc.com/2025/06/10/glean-gen-ai-search-startup-raises-150-million-at-7-billion-value.html, 2025-06-10, public benchmark only.
- **Functional rewording in OpenERP terms**: draft object-bound notes from selected comments, files, tasks, meetings, and decisions, with FR/EN output controlled by the object language.
- **Anti-copy boundary**: do not reuse workspace note templates, assistant personas, editor UI, or onboarding copy.

### Decision Summarization

- **Business problem**: decisions made across comments, files, and approvals must be captured as structured business records.
- **Typical agent mode and trigger**: workflow-typed agent triggered when a user asks to summarize an object thread or close an approval discussion.
- **Dated open source examples observed**: LangGraph, https://github.com/langchain-ai/langgraph, MIT, checked 2026-05-11, multi-step state reference; BAML, https://github.com/BoundaryML/baml, Apache-2.0, checked 2026-05-11, structured output reference only; OpenInference, https://github.com/Arize-ai/openinference, Apache-2.0, checked 2026-05-11, trace reference.
- **Dated proprietary examples observed**: Glean Agents, https://www.cnbc.com/2025/06/10/glean-gen-ai-search-startup-raises-150-million-at-7-billion-value.html, 2025-06-10, public benchmark only; Notion Custom Agents, https://www.notion.com/releases/2026-02-24, 2026-02-24, public benchmark only; Sana, https://newsroom.workday.com/2025-11-04-Workday-Completes-Acquisition-of-Sana, 2025-11-04, public benchmark only.
- **Functional rewording in OpenERP terms**: extract decision, owner, date, impacted object, required follow-up, and dissent or uncertainty notes from a bounded object thread.
- **Anti-copy boundary**: do not reuse external decision templates, collaboration labels, prompt examples, or workspace UI.

### Document QA For Object Context

- **Business problem**: users need answers from quotes, contracts, invoices, project documents, and policies without bypassing permissions or audit.
- **Typical agent mode and trigger**: conversational agent with on-behalf-of delegation from the current user; workflow-typed source citation requirement for saved answers.
- **Dated open source examples observed**: LangGraph, https://github.com/langchain-ai/langgraph, MIT, checked 2026-05-11, retrieval workflow reference; PydanticAI, https://github.com/pydantic/pydantic-ai, MIT, checked 2026-05-11, typed answer validation; MCP Specification, https://github.com/modelcontextprotocol/modelcontextprotocol, Apache-2.0 transition from MIT, checked 2026-05-11, tool interop reference.
- **Dated proprietary examples observed**: Hebbia, https://www.businesswire.com/news/home/20250626540795/en/Hebbia-Acquires-FlashDocs-to-Extend-AI-Workflow-Automation, 2025-06-26, public benchmark only; Glean Agents, https://www.cnbc.com/2025/06/10/glean-gen-ai-search-startup-raises-150-million-at-7-billion-value.html, 2025-06-10, public benchmark only; You.com Agents, https://you.com/agents, product page 2025, public benchmark only.
- **Functional rewording in OpenERP terms**: answer bounded questions using only documents attached to the current customer, project, invoice, or policy scope, returning citations and permission-aware refusal when needed.
- **Anti-copy boundary**: do not reuse proprietary document QA prompts, citations UI, datasets, demo files, or answer style.

## Cross-Cutting Observations

Finance, CRM, customer support, and automation products show a visible 2024-2026 public movement from generic copilots toward specialized agents with object context, tool access, and audit. The OpenERP fit is not a general assistant, but a set of small agents attached to CRM, project, billing, accounting, reporting, automation, and collaboration objects.

The open source corpus provides reusable implementation primitives under permissive-first licenses: typed tool calling, durable agent loops, policy checks, MCP interop, sandbox isolation, and observability. These primitives should be integrated through OpenERP-written contracts and `@sentropic` extension points rather than by copying framework examples.

The proprietary research repeatedly shows catalog, builder, and marketplace surfaces. Those are useful to understand business expectations, but they are high-risk expression surfaces. OpenERP should prioritize a private self-service catalog of governed, configurable agents before any authoring or marketplace publication surface.

## License And Trust Signals

MIT and Apache-2.0 projects in the corpus are eligible for deeper inspiration when attribution and notice obligations are tracked. Examples checked on 2026-05-11 include LangGraph (MIT), PydanticAI (MIT), OpenAI Agents SDK (MIT), Vercel AI SDK (Apache-2.0), Inngest Agent Kit (Apache-2.0), OPA (Apache-2.0), Casbin (Apache-2.0), gVisor (Apache-2.0), Helicone (Apache-2.0), Traceloop OpenLLMetry (Apache-2.0), and OpenInference (Apache-2.0).

Open-core, source-available, Elastic-licensed, and proprietary projects remain constrained. Mastra core is Apache-2.0 but enterprise directories require caution. Langfuse core is MIT with enterprise directories. Phoenix by Arize is Elastic-2.0 and therefore functional reference only. Proprietary products in the Phase 1 research are public benchmark only.

GPL and AGPL sources remain functional reference only. No use case in this file grants permission to copy source code, prompts, tool schemas, workflow definitions, eval data, screenshots, UI expression, examples, or documentation text.

## Anti-Copy Notes

This file is a rewritten thematic map in OpenERP wording. It is not a prompt catalog, tool schema catalog, workflow recipe library, marketplace design, agent builder design, policy DSL, sandbox configuration, or eval dataset.

For every use case, future implementation must begin from OpenERP-owned specs: domain objects, typed tool contracts, permission checks, audit events, supervision gates, bilingual FR/EN output rules, and tenant configuration. External products remain evidence sources only.

## OpenERP Takeaways

OpenERP's first agentic value should be object-bound and workflow-aware: qualify leads, draft customer follow-ups, classify time, prepare invoice drafts, assist AR/AP reconciliation, draft operational summaries, and summarize object-bound collaboration decisions.

The MVP posture should combine `@sentropic` with added MCP and policy hooks, a private tenant catalog, human approval for customer-facing and accounting actions, and bilingual FR/EN drafts and audit messages. Authoring autonomy, partner publication, public community modules, and vertical pack agents should remain post-MVP.
