# Agentic Glossary

## Progress

Fait: glossary file created with all required sections and cross-references; directory `docs/study/12-agentic/` initialized.
À faire: remaining Phase 1 artifacts (entropiq-audit, corpus update, proprietary references, startups deep research, license posture); Phase 1 completion at approximately 14%.
Attendu: no decision needed. Next action is Task 2 (`@entropiq` audit), which can proceed immediately because it is independent of any other Phase 1 file.

## Purpose

This glossary is the shared terminology anchor for the OpenERP agentic study
extension. Every Phase 1 through Phase 4 artifact must use these definitions
without modification. When a term needs clarification within a specific
artifact, a local note may be added, but the base definition here is
authoritative. The glossary covers only the agentic extension vocabulary;
ERP and CRM terms follow the existing OpenERP study conventions.

## Terms

### Agent

An agent is a software component that perceives ERP or CRM inputs, reasons
over them using a language model, and executes a sequence of actions via bound
tools within scope, budget, and policy limits set by the tenant or publisher.
It is purposefully scoped to a business domain such as accounts receivable or
compliance verification. Its actions are auditable, its identity is bounded,
and its outputs stay within the OpenERP data perimeter unless a cross-boundary tool is authorized.

### Agent Mode

Agent mode describes the interaction pattern and supervision posture of a
deployed agent. Three modes are recognized in the OpenERP agentic extension:

- **Conversational**: the agent responds synchronously to a user request inside
  an OpenERP session. The human is actively in the loop and can accept, reject,
  or redirect the agent's output at each step. Suitable for drafting, triage,
  and decision support where a human finalizes every action.
- **Autonomous event-driven or scheduled**: the agent executes without an
  active human session, triggered by a domain event (an overdue invoice, a
  contract reaching renewal threshold, an anomaly in a journal entry) or by a
  schedule (weekly payables summary, nightly time-entry validation). Governed by
  tenant-level policy and audit rather than by real-time human oversight.
- **Workflow-typed**: the agent is embedded as a step in an existing OpenERP
  typed automation workflow, extending one deterministic step with reasoning or
  judgment where a fixed rule is insufficient, while preserving the typed
  contract and downstream determinism.

Each mode has distinct identity, supervision, runtime, and audit requirements
documented in the corresponding Phase 3 design spaces.

### Mini-Module

A mini-module is a self-contained, publishable agent extension for OpenERP
consisting of tool definitions, a policy declaration, an identity scope, and a
versioned manifest — the publication unit for the agent marketplace. It may be
scoped to a single agent family (e.g., AR dunning) or to a cross-cutting
pattern (e.g., document QA). Its trust tier at publication time determines the
review, signing, and approval requirements before it becomes visible to tenants.

### Tool

A tool is a typed, callable operation an agent invokes during its reasoning
loop — bound in OpenERP to specific ERP or CRM actions such as reading a
customer balance, creating a draft invoice, or posting a journal entry. Each
tool carries an explicit permission scope, a usage budget, and an audit event.
Tools are declared in a mini-module manifest or the built-in agent catalog and
granted to a specific agent identity based on its mode and delegation pattern.

### Policy

A policy is a declarative rule set evaluated before and after each tool call,
enforcing tenant-defined constraints such as maximum transaction amounts,
allowed resource types, schedule windows, and prohibited action classes. It is
the primary mechanism for keeping autonomous and workflow-typed agents within
safe bounds without per-action human approval. A violation produces an audit
event and either blocks the action, triggers escalation, or rolls back the operation.

### Identity Delegation

Identity delegation defines how an agent's actions are attributed and
authorized within the OpenERP security model. Three patterns are used:

- **Acting-as**: the agent acts under the calling user's current session and
  inherits that user's permissions for the duration of the interaction. Audit
  entries are attributed to the human user. Applied in tightly supervised,
  conversational or workflow-typed contexts where the user is present and
  accountable.
- **Service principal**: the agent operates under a dedicated non-human
  identity with explicit, administrator-granted scopes that are independent of
  any human session. Audit entries are attributed to the service principal.
  Applied for autonomous event-driven or scheduled agents that run without an
  active user.
- **On-behalf-of**: a human user or tenant administrator issues a bounded
  delegation token granting the agent a scoped, time-limited subset of rights.
  Audit entries are attributable back to both the issuing identity and the
  agent. Applied for conversational agents that need elevated scope beyond the
  calling user's ambient session, and for cross-tenant marketplace mini-modules.

### Marketplace Tier

The OpenERP agent marketplace is organized into three trust tiers that
determine review depth, visibility, and the governance primitives required
from a publisher:

- **Private to tenant**: agent extensions authored or configured by the tenant
  itself, visible only within that tenant's instance. The MVP-safe baseline for
  governed, internal extensions. No external review gate; governed by the
  tenant administrator.
- **Curated partners**: mini-modules submitted by verified publishers who have
  passed an OpenERP publisher review. Modules are signed, scanned for
  anti-copy and license compliance, and gain cross-tenant visibility within the
  partner program. Approval is granted by the OpenERP publisher.
- **Public community**: mini-modules listed in the public registry with broader
  community trust signals, automated compliance checks, signature verification,
  and published license and provenance records. Available to any tenant; subject
  to registry-level controls and periodic audit.

### Business Autonomy

Business autonomy describes the degree to which a business user, team, or
tenant administrator can independently act on agents — from finding them to
creating new ones — without engaging OpenERP-publisher engineering. Four axes
define the design space:

- **Discovery**: the ability of a user to find available agents through the
  OpenERP built-in catalog, a tenant private catalog, a partner-curated catalog,
  or the public community catalog, matching the marketplace tier structure.
- **Selection and activation**: the ability to install or enable an agent for a
  personal, team, tenant, or cross-tenant scope, subject to an approval trail
  and budget controls appropriate to that scope.
- **Configuration**: the ability to adjust an installed agent's operating
  parameters — supervision rules, escalation thresholds, schedule, tool subset,
  output destinations, object scope — without modifying the agent's prompt,
  tools, or code.
- **Authoring**: the ability to create new agents from scratch (technical path),
  from cross-cutting patterns in the patterns library (guided path), or from a
  natural-language description (no-code path). Authoring is documented as a
  design space in Phase 3 and is post-MVP given the supervision, anti-copy,
  evaluation, and audit maturity it requires.

### Supervision

Supervision is the set of mechanisms by which a human or tenant policy retains
meaningful control over agent actions with financial, compliance, or
customer-facing consequences. Patterns vary by mode: conversational agents use
approval-in-the-loop and human takeover; autonomous agents use canary
deployment, rollback hooks, and escalation queues; workflow-typed agents use
typed checkpoints. Supervision state and outcomes are always recorded in the audit trail.

### MCP

MCP (Model Context Protocol) is an open interoperability protocol that
standardizes how agents discover, invoke, and authenticate to tools exposed by
external servers. In the OpenERP agentic extension, MCP is the primary tool
interop standard between the `@entropiq` runtime and tool providers. The study
covers client posture (agent calling an MCP server), server posture (OpenERP
exposing ERP tools as an MCP server), and registry and signing expectations.

### Sandbox

A sandbox is an isolation boundary that limits the resources, system calls,
network targets, and execution duration of a mini-module at runtime. Depth is
proportional to trust tier: private-to-tenant modules use tool-level policy
enforcement; curated-partner modules add a process boundary and network
allow-list; public-community modules apply the strictest isolation. Sandboxing
is treated as a functional requirement and design space, not a specific runtime selection.

### GenAI Observability

GenAI observability is the instrumentation, trace capture, evaluation, and
audit-trail layer applied to agent executions in OpenERP, covering the full
agent turn: input context, model invocation, tool calls, policy decisions,
output, latency, token cost, and rollback or escalation events. Traces are the
primary artifact for debugging and compliance demonstration. Eval hooks enable
periodic re-evaluation against an eval dataset for regression detection without a live deployment.

### Eval Dataset

An eval dataset is a tenant- or publisher-maintained collection of
representative agent inputs paired with expected outputs or acceptance
criteria, used to verify correct agent behavior as its model, tools, or policy
are updated. In OpenERP, eval datasets are internal operational assets within
the scope of the anti-copy policy and are not shared externally. The study
covers the design space for maintaining and running evals without prescribing a specific framework.

## Cross-References

- Design specification: [`docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`](../../superpowers/specs/2026-05-10-agentic-study-extension-design.md)
- Global functional map: [`docs/study/06-functional-map/global-functional-map.md`](../06-functional-map/global-functional-map.md)
- MVP recommendation: [`docs/study/07-mvp/mvp-recommendation.md`](../07-mvp/mvp-recommendation.md)
- Anti-copy dossier: [`docs/study/08-anti-copy/anti-copy-dossier.md`](../08-anti-copy/anti-copy-dossier.md)
