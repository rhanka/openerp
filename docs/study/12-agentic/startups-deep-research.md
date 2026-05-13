# Agentic Startups Deep Research

## Progress

Fait: 50 target companies researched via public web sources (WebSearch and WebFetch); dated sources obtained for 47 companies; 3 entries (Capchase AI as AI agent, Fairmatic, Levity) retained with limited agent-specific documentation noted; companion reference file `docs/study/04-proprietary-references/agentic-references.md` complete with per-company entries; all required sections present in both files.
À faire: Phase 2 thematic mapping (`agents-by-use-case.md`) expands the thematic analysis begun in the Themes Observed section; update funding and maturity signals if material changes occur before Phase 4 synthesis.
Attendu: No decision needed. This document feeds Phase 2 functional mapping and Phase 4 synthesis. Next action is Phase 2 task planning.

## Method

Research was conducted via public web search and web fetch on 2026-05-09 through 2026-05-11. For each company in the target list, at least one dated public source published between 2024-01-01 and 2026-05-11 was retrieved (press releases, product announcements, funding news, official blog posts, and recognized technology publications). Where a company had no documented agent product within scope, the entry was retained with a note explaining the limitation. No sources were invented or inferred; every URL and date in `agentic-references.md` corresponds to a retrieved document.

Companies were retained based on the following criteria:
- publicly documented agent product or agentic feature set;
- relevance to ERP, finance, CRM, procurement, operations, MES, or agent platform infrastructure;
- dated evidence within the 2024–2026 time horizon.

Companies that failed all criteria were dropped. No companies outside the target list were added to this pass; additional verified companies may be added in the Phase 2 functional mapping if better evidence is found during use-case-level research.

The source horizon is 2024-01-01 through 2026-05-11. All 50 target companies were researched; the full per-company record is in `docs/study/04-proprietary-references/agentic-references.md`.

## Time Horizon

- Primary: 2024-01-01 through 2026-05-11.
- Earliest dated source retrieved: Adept acqui-hire and Fuyu-Heavy model announcement, June–December 2024.
- Latest dated source retrieved: Notion Custom Agents GA, February 24, 2026; Basis $100M Series B, February 24, 2026; Workday/Sana Self-Service Agent, March 2026.
- Funding events after 2026-05-11 are not included; the study is a point-in-time snapshot as of 2026-05-11.

## Coverage Map

Coverage is organized by primary domain. A company may appear in multiple domains if its product spans them.

### Finance and Accounting Operations
Auditoria (AP/AR agents), Basis (accounting firm agents), Brex AI (expense and accounting agents), Campfire (AI-native ERP), Digits (autonomous general ledger and accounting agents), Klarity (contract and invoice review), Ramp AI (expense policy enforcement and AP automation), Anrok (tax compliance), Bench (SMB bookkeeping, cautionary signal).

### CRM and Revenue Operations
Gong AI (revenue intelligence agents), HubSpot AI Breeze (CRM agent platform and marketplace), Salesforce Agentforce (CRM agent platform, the most widely deployed benchmark), Sierra (customer service agent OS), Highspot AI (sales enablement agents), Rilla (in-person sales coaching agents), Decagon (customer support agents), Pylon (B2B support agents), Cassidy AI (CRM workflow automation), Lindy (no-code CRM agent builder), Tome / Lightfield (sales research and CRM agents after pivot).

### ERP and Enterprise Operations
Campfire (AI-native ERP replacement), UiPath Agents (RPA-to-agentic hybrid and process orchestration), Workato AI (iPaaS with agentic orchestration and enterprise MCP), Sana (knowledge agents for HR and finance, acquired by Workday), Glean Agents (enterprise knowledge graph and search agents), Microsoft Copilot Studio (enterprise agent authoring platform with Dynamics 365 integration).

### Document Intelligence and Contract Review
Hebbia (finance and legal document analysis), Klarity (contract review, AP reconciliation), Inscribe (fraud detection via document analysis), Anrok (tax document extraction).

### Developer and Knowledge Infrastructure
LangChain Cloud and LangSmith (agent observability, deployment, and evaluation platform), Mastra Cloud (TypeScript agent framework), Vercel Agents (TypeScript agent SDK and runtime), Inngest (agent orchestration with durable step functions), Vellum (LLM workflow, evals, and observability), Stack AI (no-code enterprise agent builder), Inkeep (documentation and support agents), Mendable (documentation AI search agents), Cohere North (enterprise-secure agent platform), Replit Agents (natural-language-to-application agent), Fixie / Ultravox (voice agent infrastructure), You.com Agents (research and search agents), Zapier Agents (automation-to-agent bridge, 9,000+ integrations).

### Specialized Verticals
Findem (talent acquisition agents, HR vertical), Fairmatic (AI-powered fleet insurance, operations risk vertical), Tavus (video agent infrastructure, customer engagement vertical), Rilla (in-person field sales coaching, operations vertical), SuperAGI (open-source agent framework, pivoted to AI SDR commercial product).

### Customer Experience
Sierra, Decagon, Pylon, HubSpot Breeze Customer Agent, Salesforce Agentforce Service Agent, Cassidy AI, Lindy, You.com ARI.

### Workflow Automation Platforms
Zapier Agents, Workato AI, Inngest, Cassidy AI, Lindy, Levity (logistics automation, limited agent documentation).

### Analytics and Reporting
ThoughtSpot Sage / Spotter (analytics agents), Glean Agents (knowledge and search), You.com ARI (multi-source research synthesis), Gong AI (revenue conversation analytics).

### Notion AI Agents
Classified separately as a workspace-native agent platform combining knowledge management with autonomous task execution; relevant to ERP-attached collaboration and project management agents.

### OpenAI Agents SDK
Classified as an infrastructure and primitives benchmark; the Agents SDK (Python, TypeScript) and the Apps SDK (MCP plus UI) are referenced across all platform-level design spaces.

## Themes Observed

The following recurring product themes appear across multiple companies in the research set. These themes are described functionally; they feed the Phase 2 use-case mapping in `docs/study/12-agentic/agents-by-use-case.md`.

### Theme 1: Autonomous Finance Operations (AP/AR Reconciliation, Expense Enforcement, Tax Compliance)

Multiple companies offer agents that take over structured, rule-bound financial workflows entirely: Auditoria (SmartVendor for AP, SmartCustomer for AR), Ramp AI (expense policy enforcement agents, AP invoice automation), Brex AI (expense memo, receipt, and approval agents), Anrok (Atlas for tax compliance), Klarity (PO-to-invoice reconciliation, vendor contract compliance), and Digits (Bookkeeping Agent, Finance Agent). The pattern is: agent reads structured financial documents, applies policy or classification rules, routes exceptions to a human reviewer, and posts approved items to the ERP or general ledger. Accuracy targets above 97%, latency measured in seconds, and cost measured against human labor are standard performance claims.

OpenERP relevance: directly maps to the billing, accounting operations, and procurement agent use cases. The exception-routing and audit-trail primitives observed here are essential inputs to the OpenERP supervision and policy design spaces.

### Theme 2: AI-Native General Ledger and Accounting Close Automation

A distinct subset of finance agents targets the close cycle itself rather than transaction-level automation: Campfire (Ember AI for close management and revenue automation), Digits (Autonomous General Ledger with Bookkeeping Agent, Finance Agent, Reporting Agent), Basis (end-to-end accounting workflow agents for accounting firms). These products position the general ledger itself as the agent runtime substrate, so the AI agent has full contextual access to all transactions and can reason across the entire period rather than per-document.

OpenERP relevance: the Autonomous General Ledger pattern is the most architecturally significant agentic ERP development observed. It suggests that a future OpenERP accounting agent should be designed with full ledger context rather than per-document routing only.

### Theme 3: Contract and Document Intelligence (Due Diligence, Fraud Detection, Compliance Validation)

Hebbia (Matrix agent-swarm for M&A due diligence, earnings analysis), Klarity (contract clause compliance, NDA/MSA review), Inscribe (document fraud detection, 73% escalation reduction), Anrok (tax document extraction via vision and LLM), Capchase (payment term extraction from contract PDFs). The shared pattern is: multi-page or multi-document corpus, LLM or agent-swarm extraction, structured output with source citations, and confidence-calibrated human review routing.

OpenERP relevance: maps to procurement contract review agents, vendor onboarding document validation agents, and compliance checking agents. The source-citation and explainability pattern is essential for user trust in finance-facing agents.

### Theme 4: Customer-Facing Conversational Agents (CRM, Support, Sales Coaching)

The largest category by company count: Sierra, Decagon, Pylon, HubSpot Breeze Customer Agent, Salesforce Agentforce Service Agent, Gong AI, Highspot AI, Rilla, Cassidy AI, Findem, Lindy, Tavus. These agents handle inbound support, outbound prospecting, sales coaching, qualification, and onboarding. Deflection rates of 40–70% are commonly reported; CSAT improvement and cost-per-conversation reduction are the primary metrics. The multi-channel pattern (chat, SMS, WhatsApp, email, voice, video) appears in several products (Sierra, Decagon).

OpenERP relevance: directly maps to the CRM customer follow-up, quote drafting, and support routing agent families. The multi-channel deployment model (chat first, voice and SMS later) is the recommended phasing for OpenERP CRM agent channels. AOP-style configuration (Decagon) and Agent Studio-style authoring (Sierra) are the primary references for the OpenERP agent configuration and authoring autonomy axes.

### Theme 5: Internal Knowledge and Enterprise Search Agents

Glean Agents, Sana Agents, Mendable, Inkeep, Notion AI Agents, LangSmith Fleet, Microsoft Copilot Studio (M365 Copilot extension). These agents expose an organization's internal knowledge corpus through natural language, with permissions-aware retrieval, cross-tool search (Glean: 100+ tools, Sana: 100+ industrial connectors), and autonomous task execution over connected data sources. The Notion 3.0 memory pattern (storing agent state in pages and databases) and Glean's Enterprise Graph (mapping how knowledge elements relate) illustrate two different substrate approaches for agent memory.

OpenERP relevance: maps to the ERP documentation agent, project and delivery knowledge agent, and internal SOP agent use cases. The permissions-aware retrieval pattern is directly relevant to the identity and delegation design space: agents must inherit the calling user's data permissions when searching across ERP records.

### Theme 6: Agent Platform Infrastructure (Orchestration, Observability, Evaluation, Marketplace)

LangChain and LangSmith, Mastra Cloud, Vercel Agents, Inngest, Vellum, Stack AI, Inkeep, OpenAI Agents SDK. These products do not build vertical business agents themselves; they provide the primitives for building them: workflow orchestration with durability (Inngest, Vercel durable workflow), agent evaluation and observability (LangSmith, Vellum), no-code agent authoring (Stack AI, Inkeep, LangSmith Fleet), and agent distribution (LangSmith Deployment, Mastra Platform Agent Editor). The convergence toward MCP as the interop standard is visible across all agent platform entrants by late 2025.

OpenERP relevance: this theme provides the primary input for the Phase 3 runtime safety, observability, MCP, and marketplace design spaces. Mastra Cloud is the highest-priority TypeScript framework benchmark for `@sentropic` gap analysis. Vellum is the highest-priority observability and eval benchmark.

### Theme 7: Autonomous Orchestration over Legacy Business Systems (RPA-to-Agentic)

UiPath Agents and Maestro, Workato AI Enterprise MCP, Microsoft Copilot Studio, Zapier Agents (9,000+ app integrations). These products are evolving from deterministic integration or RPA to agentic orchestration: UiPath combines AI reasoning with deterministic RPA robots under Maestro's process-intelligence layer; Workato converts its 1,400-app iPaaS into an enterprise MCP hub so AI agents can call any integrated system; Zapier converts its automation layer into an agent runtime that reasons over automation actions.

OpenERP relevance: the RPA-to-agentic hybrid (UiPath Maestro) is the most relevant reference for the OpenERP workflow-typed agent mode, where an agent extends a deterministic automation step with reasoning while preserving the typed downstream contract. Workato Enterprise MCP is the primary reference for OpenERP's MCP server posture when exposing ERP tools to external agents.

## Funding And Maturity Signals

The following observations are drawn from publicly announced funding rounds and milestones retrieved during research. They are presented as market signals, not as a comparative evaluation.

### Large Enterprise Benchmark Deployments
- Salesforce Agentforce: 12,000 customers by October 2025; 40% of Fortune 50 served by Sierra.
- Microsoft Copilot Studio: embedded in Microsoft 365 and Dynamics 365 enterprise stack; broadest enterprise reach by deployment volume.
- HubSpot AI Breeze: 20+ agents across the HubSpot customer base; Customer Agent at 8,000+ activations.
- UiPath Agents: seventh consecutive Gartner RPA Magic Quadrant Leader; TIME Best Invention of 2025.

### Unicorn and Near-Unicorn Finance/Accounting Agents
- Ramp AI: $32B valuation as of November 2025; $1B annualized revenue.
- Sierra: $10B valuation, $350M Series C (September 2025); $100M ARR reached in seven quarters.
- Basis: $1.15B valuation, $100M Series B (February 2026); 30% of Top 25 accounting firms.
- Anrok: $100M+ total funding (Series C October 2025); public customer references include AI, workspace, and developer-tool companies.
- Decagon: $1.5B valuation, $131M Series C (June 2025).
- Glean: $7.2B valuation, $150M Series F (June 2025); $100M ARR (February 2025).
- Campfire: $100M+ total funding (Series A June 2025 + Series B 12 weeks later); 10x YTD revenue growth.
- Digits: $100M total funding; 11x revenue growth in 2024.
- Findem: $105M total funding, $51M Series C (October 2025); 3x YoY growth.

### Early-Stage and Seed
- Cassidy AI: $10M Series A (September 2025); 20,000+ teams, 4.8M workflow automations.
- Stack AI: $16M (May 2025).
- Mastra: $13M seed (October 2025); 22,000+ GitHub stars.
- Inkeep: YC-backed; public customer references include AI product, developer-tooling, and product-analytics companies.
- Pylon: $51M total ($31M Series B); 750+ B2B companies.
- Inscribe: no recent funding noted; production AI Fraud Analyst with fivefold weekly usage growth since July 2024.
- Rilla: 2,000+ customers including Fortune 50 reached in 3.5 years; funding details not publicly disclosed in retrieved sources.
- Fixie / Ultravox: seed-stage voice infrastructure; Hexaware enterprise integration June 2025.
- Levity: $10M total; narrowly focused logistics automation with limited agent documentation.

### Pivots and Discontinuations
- Adept: acqui-hired by Amazon (June 2024); technology licensed; founding team now at Amazon AGI SF Lab; Adept as an independent product no longer active.
- Bench: shutdown December 27, 2024; acquired and relaunched by Employer.com January 2025; structural profitability model not resolved post-relaunch.
- Tome: presentation product sunset April 30, 2025; relaunched as Lightfield (AI-native CRM/sales automation).
- SuperAGI open-source framework: unmaintained since January 2024; commercial product pivot to AI SDR SaaS.

### Acquisitions
- Sana acquired by Workday for $1.1B (completed November 4, 2025).
- Capchase acquired Vartana (June 2025) for vendor finance market expansion.
- Hebbia acquired FlashDocs (June 26, 2025) for document generation expansion.
- Findem acquired Getro (2025) to launch Intelligent Job Posts.

### Market-Level Signal
The funding concentration in finance/accounting AI agents (Ramp, Brex, Basis, Campfire, Digits, Auditoria) and enterprise customer service agents (Sierra, Decagon, HubSpot Breeze, Salesforce Agentforce) reflects the two highest-conviction agentic business categories as of 2026. Agent platform infrastructure (LangSmith, Mastra, Vellum, Inngest, Vercel AI SDK) is experiencing rapid iteration and consolidation around MCP as the interop standard. The convergence of formerly separate automation platforms (Zapier, Workato, UiPath) toward agentic orchestration confirms that agent capabilities are now a competitive requirement in the automation market.

## License And Trust Signals

The following license postures were observed for companies with publicly documented open-source components in this research set:

### Open Source (MIT or Apache-2.0)
- **Mastra**: open-source TypeScript agent framework, MIT license (confirmed at GitHub: mastra-ai/mastra).
- **Vercel AI SDK**: open-source TypeScript SDK (Apache-2.0; confirm exact file at github.com/vercel/ai).
- **Inngest**: open-source workflow orchestration platform (Apache-2.0 at github.com/inngest/inngest; confirm).
- **SuperAGI** (open-source framework): MIT license (GitHub: TransformerOptimus/SuperAGI); unmaintained since January 2024 with unpatched security vulnerabilities; do not reuse for production.
- **OpenAI Agents SDK**: MIT license for Python SDK (github.com/openai/openai-agents-python); Apache-2.0 for TypeScript variant; confirm before reuse.
- **LangChain / LangGraph**: MIT license for the core framework; LangSmith and LangGraph Platform are commercial SaaS with BSL or proprietary license on hosted components; reuse eligibility requires file-by-file review.
- **Inkeep**: GitHub repository at github.com/inkeep/agents is publicly available; license not confirmed in retrieved sources; verify before reuse consideration.
- **Fixie / Ultravox**: GitHub at github.com/fixie-ai/ultravox; license not confirmed in retrieved sources; verify before any reuse.

### Proprietary or Source-Available (Functional Reference Only)
All other companies in the research set (Salesforce Agentforce, HubSpot Breeze, Microsoft Copilot Studio, Cohere North, Sierra, Decagon, Ramp AI, Brex AI, Campfire, Digits, Basis, Auditoria, Gong AI, Hebbia, Highspot AI, Klarity, Inscribe, Glean, Workato, UiPath, Sana, Stack AI, Vellum, You.com, Zapier, Anrok, Capchase, Findem, Fairmatic, Rilla, Pylon, Cassidy AI, Lindy, Mendable, Tavus, ThoughtSpot, Tome / Lightfield, Bench, Adept, Replit, Notion AI) deliver proprietary products. No code, prompts, tool schemas, workflow definitions, eval datasets, or proprietary product expression from these sources may be reused. They are public benchmarks only.

### Trust Signals
- SOC 2 Type II or ISO 27001 is documented for: Cohere North, Sana (ISO 27001, SOC 2 Type 2, GDPR), Inkeep (SOC 2 Type II), Mendable (SOC 2 Type II), LangSmith (managed cloud with compliance options).
- GDPR, CCPA, and enterprise data residency claims are documented for: Cohere North (on-premise and air-gapped), Sana (single-tenant deployment, AES-256, permission mirroring), HubSpot Breeze (within HubSpot enterprise tier controls).
- Permissive open-source with good governance signals: Mastra (MIT, active 22,000+ stars, $13M seed, 1.0 release), Vercel AI SDK (Apache-2.0, maintained by Vercel), Inngest (Apache-2.0, $21M Series A).

## Anti-Copy Notes

This reference is a public benchmark only; do not reuse code, prompts, tool schemas, workflow definitions, screenshots, templates, eval data, marketplace UI, or proprietary product expression.

The agentic domain carries heightened anti-copy risk because product expression is highly visible in agent systems:

- System prompts, agent personas, tool definitions, tool schemas, function signatures, parameter documentation, and examples specific to any product listed in this document must not be copied or closely adapted.
- Workflow definitions, agent graph topology files, recipe templates, demo prompts, demo tasks, demo screenshots, and golden traces from any source in this research set are excluded from reuse.
- Eval datasets, eval prompts, prompt-engineering exemplars, and acceptance criteria drawn from specific product documentation must not be reused.
- MCP server names, MCP server tool catalogs, MCP registry UI, authentication flow expression, and MCP tool identifier namespaces must not be copied.
- Marketplace UI, registry UI, onboarding copy, partner program UI, agent catalog category labels, and agent store UI from Salesforce AgentExchange, HubSpot Breeze Marketplace, Microsoft Copilot Studio marketplace, Zapier agent library, Workato Genies catalog, or any other listed product must not be reproduced.
- Agent catalog UI, agent configuration UI, agent builder UI, no-code agent composer UI, prompt builder UI, and natural-language agent description flows from any product in this research set must not be copied.

Permitted output from studying these products is rewritten functional analysis: capabilities, business outcomes, workflows, integration needs, permission and audit expectations, and acceptance criteria expressed in OpenERP wording aligned with the glossary at `docs/study/12-agentic/glossary.md`.

## OpenERP Takeaways

The following takeaways are grounded in the research findings above. They are functional observations for the OpenERP study, not implementation decisions.

### Finance and Accounting Agent Families Are the Highest-Conviction Targets

The concentration of funded, deployed, and measurably effective products in AP automation (Auditoria SmartVendor, Ramp Agents for AP, Klarity), AR automation (Auditoria SmartCustomer), expense enforcement (Ramp Agents for Controllers, Brex AI), and accounting close (Campfire Ember AI, Digits Autonomous General Ledger, Basis) confirms that finance and accounting operations agents have clear, measurable ROI for the business users who adopt them. These are the highest-priority agent families for OpenERP's billing and accounting operations module.

### CRM Customer-Facing Agents Are the Second-Priority Family

The scale of Salesforce Agentforce, HubSpot Breeze, Sierra, and Decagon deployments confirms that customer-facing conversational agents in CRM contexts are well-understood and accepted by enterprise buyers. Deflection rates, CSAT, and cost-per-conversation are the standard success metrics. For OpenERP CRM, the customer follow-up agent and support routing agent are the primary targets.

### The Exception-Routing Pattern Is Universal

Across all vertical finance agent products, the design is: autonomous execution for clear-cut cases, escalation queue with rationale for ambiguous or high-value cases, human approval or correction, and re-training or policy update from the correction. This pattern maps directly to the OpenERP supervision design space: conversational agents use approval-in-the-loop; autonomous agents use escalation queues and canary deployment.

### Agent Configuration Without Code Is a Competitive Requirement

Decagon's Agent Operating Procedures, Sierra's Agent Studio, Ramp's policy-from-PDF reasoning graph, and HubSpot Breeze Studio all demonstrate that business users must be able to configure, tune, and understand agent behavior without writing code. The OpenERP business autonomy design space (configuration axis) must support this pattern at MVP.

### MCP Has Become the Interop Standard

By late 2025, MCP integration is present or announced across OpenAI Agents SDK, Vercel AI SDK 6, LangSmith, Mastra, Inngest, Workato Enterprise MCP, Cohere North, Notion 3.0, Inkeep, Zapier (ZapConnect 2025), and Vellum Agent Node. The `@sentropic` MCP gap identified in the entropiq audit is confirmed as a broadly adopted standard, not a niche choice.

### TypeScript Agent Frameworks for Vercel-Hosted Apps Converge on a Short List

For OpenERP's TypeScript and Node.js stack, the directly relevant framework benchmarks are: Mastra (MIT, TypeScript, workflows plus agents plus RAG, Agent Editor for no-code adjustments), Vercel AI SDK 6 (Apache-2.0, Agent abstraction, durable workflows, MCP, DevTools), and Inngest (Apache-2.0, queue-based durable step functions, event-driven and scheduled triggers). These three together with `@sentropic` define the functional gap surface for Phase 3 runtime safety work.

### The Autonomous General Ledger Pattern Reframes ERP Accounting Agent Architecture

Campfire and Digits treat the general ledger as the agent's native data substrate rather than an external system the agent must call via tools. This architectural posture — where the agent has full, real-time ledger context rather than per-transaction snippets — is the most functionally significant architectural signal in the research set for OpenERP's accounting agent design. It does not dictate an implementation choice; it identifies the design question that the Phase 2 functional mapping must address.

### License Posture Constrains Reuse to Four Frameworks

From the full research set, only Mastra (MIT), Vercel AI SDK (Apache-2.0, confirm), Inngest (Apache-2.0, confirm), and OpenAI Agents SDK (MIT for Python, Apache-2.0 for TypeScript) are in the permissive open-source tier eligible for deeper inspiration under the study's license risk matrix. All other sources are functional reference or public benchmark only.
