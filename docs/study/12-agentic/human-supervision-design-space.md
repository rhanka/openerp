# Agentic Human Supervision Design Space

## Progress

Fait: supervision patterns are defined for conversational, autonomous, and workflow-typed agents, with approval gates, escalation rules, bilingual notification requirements, and cross-references to identity, marketplace, and business autonomy.
À faire: reuse this design space in the agentic MVP addendum and existing MVP spec impacts; implementation planning must convert these controls into typed product requirements.
Attendu: keep human supervision as a business control surface, not an afterthought in runtime implementation.

## Purpose

OpenERP agents support operational work, but they must not blur ownership of customer-facing, financial, regulated, or tenant-wide actions. Human supervision defines who reviews, approves, takes over, rolls back, or closes an agent action, and how that decision is recorded.

The design space distinguishes three modes: conversational agents with approval-in-the-loop and human takeover, autonomous event-driven or scheduled agents with canary mini-modules and rollback, and workflow-typed agents with typed checkpoints. Each mode needs different identity, audit, notification, and escalation treatment.

## Supervision Patterns By Mode

### Conversational: Approval-In-The-Loop And Human Takeover

Use this pattern when a user asks an agent to draft, summarize, classify, explain, or prepare a next action inside an object such as a lead, customer, project, invoice, journal entry, report, or decision thread. The agent acts within the user's current context and should prefer acting-as or bounded on-behalf-of delegation depending on the action scope.

The expected human action is review, edit, approve, reject, or take over. Customer-facing messages, invoice wording, decision records, project scope updates, and finance explanations remain drafts until the user accepts them. Human takeover must be immediate: the user can stop the agent, discard the draft, or continue manually without losing the object trail.

Escalation triggers include customer-facing send, financial amount above tenant threshold, permission mismatch, missing source evidence, regulated or HR-sensitive content, ambiguous identity delegation, and conflict with an existing approval state. The audit trail records the requesting user, object, agent mode, source context summary, draft output reference, human decision, final action, language, and timestamp.

Bilingual requirements apply to both the agent output and the supervision UI. Approval prompts, draft labels, rejection reasons, and audit messages must be available in French and English, with object language or user preference determining the default.

### Autonomous: Canary Mini-Modules And Rollback

Use this pattern for event-driven or scheduled agents that monitor overdue invoices, renewal windows, project margin risk, failed automation runs, close checklist drift, or other background conditions. The default identity is a service principal scoped by tenant policy, schedule window, object class, action type, and budget.

The expected human action is configure, enable, observe, approve escalation, pause, disable, or roll back. Autonomous agents should first run as canary mini-modules: limited tenant scope, limited object subset, internal-only actions, explicit run summaries, and clear owner assignment. A tenant administrator or delegated power user approves expansion only after reviewing audit evidence and error handling.

Escalation triggers include high financial exposure, repeated failed runs, off-hours action attempt, new external destination, policy denial, unexpected tool result, missing source object, sensitive data access, or output that would affect a customer, supplier, employee, or accounting record. Rollback is required when an autonomous agent creates internal tasks, notifications, draft records, or configuration changes that prove incorrect; irreversible actions should not be autonomous in the MVP.

Audit attribution must distinguish the service principal, mini-module identifier, tenant owner, enabling administrator, policy version, trigger event, tool calls, budget consumption, run status, canary scope, human intervention, rollback action, and notification language. FR/EN run summaries must be readable by administrators and business owners.

### Workflow-Typed: Typed Checkpoints

Use this pattern when an agent is embedded in a typed workflow step such as lead intake, timesheet classification, invoice draft preparation, AP triage, AR reconciliation, journal entry review, decision capture, or operational report delivery. The agent extends a deterministic workflow with reasoning while preserving typed input, typed output, validation, and approval gates.

The expected human action is approve the checkpoint, request correction, choose an exception path, or return the object to the prior workflow state. The agent may prepare a structured proposal, but workflow state changes such as issue invoice, post journal entry, approve time, save customer-visible decision, activate automation, or send external message remain gated by role and policy.

Escalation triggers include invalid typed output, low evidence quality, missing required field, policy denial, unusual amount, closed period, customer visibility, mismatch between user permission and workflow action, or conflicting object state. The checkpoint records the typed contract version, input object IDs, validation outcome, policy result, proposed output, human decision, and final workflow transition.

Bilingual treatment includes checkpoint prompts, validation errors, exception reasons, approval request text, and audit event wording. The saved business object should preserve the language used for customer-facing content while audit metadata remains queryable across languages.

## Approval Gates

Approval gates should be explicit, typed, and visible before the agent acts. MVP gates include customer-facing communication, invoice issue, journal posting, payment follow-up send, time approval, contract renewal notice, decision record save, report distribution beyond the requester's team, automation activation, and marketplace mini-module enablement.

Each gate needs an owner role, required permission, object scope, timeout behavior, escalation recipient, and audit event. The gate should show what the agent proposes, which sources it used, what policy checks passed or failed, and what downstream action will occur if approved.

Approval is not a decorative confirmation. If the action changes finance, customer obligations, access rights, automation behavior, or public-facing content, a human must be able to modify the proposal, reject it, and leave a reason. Rejection reasons feed future configuration and evaluation, but they do not become copied prompt examples.

## Escalation Rules

Financial impact: escalate when an action affects invoice issue, write-off, journal posting, payment follow-up, tax treatment, project margin, renewal terms, or any tenant-configured amount threshold. The first MVP posture is draft-only for finance-changing actions.

Customer-facing action: escalate before sending email, portal reply, renewal notice, dunning message, project status update, quote text, or customer-visible decision. Internal drafts can be generated, but sending needs human approval unless a narrow acknowledgement template is explicitly approved by tenant policy.

Regulated or sensitive data: escalate when HR, payroll, health, legal, tax, payment, identity, or confidential contract data is read, summarized, exported, or included in a draft. The agent must respect object permissions and avoid summarizing content that the approving user cannot access.

Off-hours autonomy: escalate or defer when an autonomous agent attempts a non-read action outside the configured schedule window, during close lock, during deployment maintenance, or after repeated failed runs. Read-only monitoring may continue if policy allows it.

Cross-scope action: escalate when a personal agent wants team scope, a team agent wants tenant scope, or a private mini-module wants cross-tenant publication. Scope expansion requires administrator approval and marketplace or catalog controls.

Policy conflict: block and escalate when policy denies a tool call, required evidence is missing, the typed output fails validation, a budget is exceeded, or an action would bypass a closed workflow state.

## Bilingual FR EN Notification And Audit Requirements

Supervision messages must be bilingual across UI labels, approval prompts, escalation notifications, email or in-app alerts, rejection reasons, run summaries, and audit events. The default language comes from user preference for internal work and object/customer language for customer-facing drafts.

Audit records should retain the language used at execution time and store stable machine-readable fields for actor, service principal, mini-module, object, workflow step, policy result, human decision, final action, and timestamp. This lets English and French administrators inspect the same event without losing the original business wording.

Generated French and English content must be OpenERP-authored. Translations should be reviewed for finance, legal, customer-facing, and HR contexts because a literal translation can change obligation or tone. Region-specific statutory language remains outside this design space until official-source specs exist.

## Cross-References To Identity, Marketplace, And Business Autonomy

Identity: conversational supervision usually starts with acting-as or bounded on-behalf-of delegation; autonomous supervision uses service principals; workflow-typed supervision can combine acting-as for user-triggered steps with service principals for scheduled checks. See `docs/study/12-agentic/identity-design-space.md`.

Marketplace: private tenant mini-modules can start with administrator approval and canary scope. Partner and community tiers need publisher identity, signing, sandbox CI, revocation, observability, and additional review before any autonomous capability. See `docs/study/12-agentic/marketplace-design-space.md`.

Business autonomy: standard users can review and approve their own conversational drafts, delegated power users can configure team agents, and tenant administrators control tenant-wide activation, service principals, budgets, and rollback. Authoring remains post-MVP. See `docs/study/12-agentic/business-autonomy-design-space.md`.

## Anti-Copy Notes

Do not copy external approval flows, agent takeover UI, supervision labels, escalation wording, canary deployment language, rollback flows, catalog controls, policy syntax, demo traces, screenshots, or builder patterns. This document is a functional design space in OpenERP wording only.

Future implementation must define OpenERP-owned typed checkpoints, approval states, rejection reasons, notification text, audit events, and FR/EN strings. External products remain public benchmarks or functional references only.

## OpenERP Takeaways

Human supervision should be part of the agentic MVP from the first slice. The safest starting point is draft-first conversational work, workflow-typed checkpoints for finance and CRM operations, and read-heavy autonomous monitoring with internal alerts only.

The core product decision is not whether agents are allowed to act; it is which object, identity, policy, scope, language, and human owner make the action accountable. That accountability model should be consistent before OpenERP adds authoring autonomy, partner publication, or public community mini-modules.
