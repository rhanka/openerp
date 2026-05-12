# Agentic Functional Map

## Progress

Fait: Task 7 functional map drafted for six MVP-aligned agent families, with links to the patterns library and vertical-pack surface map.
À faire: use this map as input for thematic use-case research, business-agent fiches, governance design spaces, and the later MVP addendum.
Attendu: no product decision is required here; this file defines candidate business surfaces for study only.

## Product Boundary

The agentic extension supports the existing OpenERP ERP, CRM, billing,
accounting, reporting, automation, and collaboration domains. It does not
replace those domains, and it does not introduce a separate generic assistant
product. Each agent must be attached to a concrete business object, workflow,
permission boundary, and audit trail already expected in the global functional
map.

The initial surface is service-company first: CRM, service delivery,
time-to-invoice, billing, accounting operations, operational reporting, typed
automation, and object-bound collaboration. Agents for procurement, MES, WMS,
payroll, and manufacturing planning remain later vertical packs, referenced
from the surface map only.

All candidate agents are study outputs. They describe business outcomes,
triggers, tools, supervision, handoff, and measurement needs in OpenERP wording.
They are not production prompts, tool contracts, workflow definitions, or
implementation specs.

## Family: CRM Agents

### Customer Follow-Up Agent

- business outcome: increase timely customer response and reduce missed sales or renewal activity.
- typical trigger: lead inactivity, opportunity stage change, upcoming renewal date, or customer email needing a reply.
- typical tools: CRM account and contact lookup, opportunity history, activity creation, email draft creation, notification, audit log.
- agent mode: conversational for drafting and review; autonomous event-driven for reminders; workflow-typed when attached to a renewal workflow.
- supervision posture: human review before any customer-facing message is sent; autonomous reminders are limited to internal users.
- expected human handoff: sales lead approves, edits, or rejects the draft and owns the next customer action.
- success metrics: follow-up latency, overdue activity count, accepted draft rate, renewal touch completion, customer response rate.
- anti-copy notes: do not reuse vendor outreach scripts, email templates, agent personas, or CRM automation examples; write OpenERP-specific communication patterns.

### Lead Intake And Qualification Agent

- business outcome: turn inbound demand into clean account, contact, lead, and next-activity records with less manual triage.
- typical trigger: web form submission, inbound email, imported lead list, event attendee list, or customer portal request.
- typical tools: import parser, duplicate detection, CRM object search, field normalization, task creation, assignment notification.
- agent mode: workflow-typed for structured imports; conversational when a user reviews ambiguous records.
- supervision posture: automatic creation is allowed only for low-risk draft records; merge, reassignment, and deletion require human approval.
- expected human handoff: sales operations or account owner resolves ambiguous matches and approves the first outreach task.
- success metrics: intake cycle time, duplicate reduction, required-field completion, first-response latency, manual correction count.
- anti-copy notes: do not copy external lead taxonomies, qualification checklists, or field layouts; define OpenERP fields and labels independently.

### Quote Readiness Agent

- business outcome: help sales prepare service offers that have complete customer, scope, price, tax, and approval context before finance review.
- typical trigger: opportunity moved to proposal stage, quote draft opened, missing price list, or required approval absent.
- typical tools: customer and contract lookup, service catalog, price list, tax abstraction, approval state, document QA, notification.
- agent mode: conversational for sales preparation; workflow-typed for quote review gates.
- supervision posture: agent can propose corrections and missing items; it cannot approve price, legal, tax, or margin decisions.
- expected human handoff: sales lead completes commercial terms; finance or manager approves exceptions.
- success metrics: quote rework count, missing-field count, approval turnaround, accepted quote rate, cycle time from opportunity to quote.
- anti-copy notes: do not copy CPQ flows, quote layouts, approval wording, or commercial playbooks from external systems.

## Family: Project And Service Delivery Agents

### Project Kickoff Agent

- business outcome: convert accepted work into an actionable project setup with tasks, responsibilities, and customer-visible expectations.
- typical trigger: accepted quote, signed contract, subscription activation, or manual project creation.
- typical tools: contract and quote reader, project template selector, task creation, file attachment, customer-visible page draft, notification.
- agent mode: workflow-typed for project creation; conversational for manager review.
- supervision posture: agent prepares a project draft; project manager confirms scope, assignments, and customer publication.
- expected human handoff: project manager approves project structure and assigns owners before the kickoff is visible to the customer.
- success metrics: kickoff latency, missing assignment count, customer kickoff completion, setup rework count, first task start time.
- anti-copy notes: do not reuse project templates, onboarding copy, or workflow recipes from project-management products.

### Time Entry Review Agent

- business outcome: protect billing accuracy and project margin by finding incomplete, inconsistent, or late time entries before invoice preparation.
- typical trigger: submitted time entry, weekly review window, project milestone, or invoice draft generation.
- typical tools: timesheet reader, project task context, billable rule lookup, approval queue, correction request, audit log.
- agent mode: workflow-typed for review gates; autonomous scheduled for weekly exception detection.
- supervision posture: agent can request clarification and mark entries for review; approval remains with the project manager or finance user.
- expected human handoff: project manager confirms corrections and billing eligibility.
- success metrics: late-entry count, correction cycle time, billable-entry approval latency, invoice-blocking exception count, margin adjustment frequency.
- anti-copy notes: do not copy time policy examples, approval labels, or exception flows from time-tracking products.

### Delivery Status Summary Agent

- business outcome: give project managers and customers a concise, auditable view of status, risks, decisions, and next actions.
- typical trigger: weekly project update, milestone change, customer portal publication, or executive reporting request.
- typical tools: project and task history, comments, decisions, files, time entries, report formatter, notification.
- agent mode: conversational for ad hoc summaries; workflow-typed for recurring status publication.
- supervision posture: internal summaries can be generated automatically; customer-visible summaries require manager approval.
- expected human handoff: project manager edits the summary, chooses visibility, and owns customer communication.
- success metrics: summary preparation time, decision capture completeness, customer update cadence, edit rate, overdue action count.
- anti-copy notes: do not imitate external status report formats, customer update wording, or project health labels.

## Family: Billing Agents

### Invoice Draft Preparation Agent

- business outcome: reduce invoice preparation time while preserving traceability from contract, milestone, time entry, or recurring schedule.
- typical trigger: billing period close, approved billable time, completed milestone, recurring invoice date, or manual finance request.
- typical tools: contract schedule, approved time entries, milestone records, service catalog, invoice draft, tax abstraction, audit log.
- agent mode: workflow-typed for invoice draft assembly; conversational for finance review.
- supervision posture: agent prepares and explains draft lines; finance user reviews before issue and posting.
- expected human handoff: finance user validates amounts, tax treatment, and customer-ready document text.
- success metrics: invoice draft cycle time, line correction count, source trace completeness, issue delay, disputed-line count.
- anti-copy notes: do not copy invoice layouts, billing scripts, rate logic, or external product line naming.

### Dunning And Payment Follow-Up Agent

- business outcome: improve cash collection by producing timely, policy-aware follow-up on overdue invoices without harming customer relationships.
- typical trigger: invoice overdue date, failed payment webhook, promise-to-pay missed, or customer dispute note.
- typical tools: invoice aging, payment status, customer contact history, communication draft, task creation, escalation queue.
- agent mode: autonomous event-driven for internal reminders; conversational for customer-facing messages; workflow-typed for dispute escalation.
- supervision posture: low-risk internal reminders can run automatically; customer-facing collection messages require human approval.
- expected human handoff: finance user or account owner approves customer message and chooses collection path.
- success metrics: days to payment, overdue balance movement, approved follow-up count, dispute resolution time, promise-to-pay completion.
- anti-copy notes: do not copy collection scripts, reminder cadences, or tone guides from finance platforms.

### Subscription Renewal And Billing Change Agent

- business outcome: catch renewal, price, entitlement, and billing-change work before revenue leakage or customer confusion occurs.
- typical trigger: renewal window approaching, contract amendment, paused subscription, usage threshold event, or price list update.
- typical tools: contract and subscription reader, billing schedule, customer timeline, approval task, renewal draft, notification.
- agent mode: workflow-typed for renewal preparation; autonomous scheduled for upcoming events; conversational for customer message drafting.
- supervision posture: agent can detect and prepare changes; commercial terms and customer notice require owner approval.
- expected human handoff: sales lead confirms renewal terms; finance confirms billing schedule updates.
- success metrics: renewal preparation latency, missed renewal count, billing-change correction count, customer-notice completion, revenue leakage incidents.
- anti-copy notes: do not copy subscription lifecycle flows, entitlement terminology, or renewal playbooks from external billing systems.

## Family: Accounting Operations Agents

### Reconciliation Worklist Agent

- business outcome: accelerate AR/AP close work by grouping likely matches and surfacing exceptions with clear evidence.
- typical trigger: payment import, bank statement import, posted invoice, journal entry batch, or period close review.
- typical tools: ledger reader, invoice and payment lookup, bank import records, match simulation, exception queue, audit log.
- agent mode: workflow-typed for reconciliation review; conversational for finance explanation.
- supervision posture: agent suggests matches and reasons; posting, write-off, reversal, and correction require finance approval.
- expected human handoff: finance user accepts match, requests correction, or escalates accounting treatment.
- success metrics: unmatched item count, reconciliation cycle time, manual correction count, accepted match rate, close delay.
- anti-copy notes: do not copy reconciliation rules, ledger labels, exception wording, or accounting workflows from studied systems.

### Journal Entry Review Agent

- business outcome: reduce posting errors by checking balance, account selection, attachments, tax context, and period constraints before approval.
- typical trigger: manual journal draft, import batch, correcting entry, period close window, or unusual account movement.
- typical tools: chart of accounts, journal entry reader, period status, attachment check, tax abstraction, approval queue.
- agent mode: workflow-typed at posting gate; conversational when finance asks for explanation.
- supervision posture: agent blocks incomplete drafts and requests review; it cannot post high-impact entries on its own.
- expected human handoff: finance user confirms treatment; controller or admin approves sensitive entries.
- success metrics: blocked incomplete entries, correction count after review, approval latency, period-close interruption count, attachment completeness.
- anti-copy notes: do not copy account review checklists, statutory templates, or journal approval flows from external sources.

### Close Checklist Agent

- business outcome: make month-end close visible, repeatable, and auditable for small finance teams.
- typical trigger: close period opened, required checklist step due, unresolved reconciliation item, or export requested.
- typical tools: close task list, ledger status, reconciliation worklist, export generator, approval tracker, notification.
- agent mode: autonomous scheduled for reminders; workflow-typed for close gates; conversational for status explanation.
- supervision posture: agent tracks readiness and requests evidence; formal close and lock decisions remain human-controlled.
- expected human handoff: finance lead resolves exceptions and approves close milestones.
- success metrics: close cycle duration, incomplete task count, late evidence count, reopened period count, export completion.
- anti-copy notes: do not copy close checklists, controller templates, or public accounting playbooks from other products.

## Family: Reporting And Automation Agents

### Operational Report Draft Agent

- business outcome: help managers get reliable CRM, project, billing, and finance summaries without manual report assembly.
- typical trigger: saved view requested, weekly management packet, customer review, project margin review, or finance close update.
- typical tools: saved views, report definitions, dashboard widgets, export formatter, role-aware filter, audit log.
- agent mode: conversational for ad hoc report drafting; workflow-typed for scheduled delivery.
- supervision posture: agent can prepare draft reports; publication to broad audiences requires owner approval and permission checks.
- expected human handoff: manager validates interpretation and distribution list.
- success metrics: report preparation time, data-filter correction count, delivery cadence, user follow-up count, export completion.
- anti-copy notes: do not copy BI dashboard layouts, chart labels, insight phrasing, or report templates from external products.

### Automation Exception Agent

- business outcome: reduce silent workflow failure by explaining failed automation runs and proposing safe next actions.
- typical trigger: workflow run failed, webhook retry exhausted, import job failed, scheduled job delayed, or approval action blocked.
- typical tools: automation run log, webhook status, import validation report, retry control, task creation, notification.
- agent mode: autonomous event-driven for detection; conversational for diagnosis; workflow-typed for controlled retry.
- supervision posture: agent can explain, group, and propose actions; destructive or external side effects need admin approval.
- expected human handoff: admin or workflow owner chooses retry, data correction, deactivation, or escalation.
- success metrics: mean time to diagnosis, repeat failure count, retry success rate, silent failure count, admin intervention time.
- anti-copy notes: do not copy automation recipe libraries, node labels, run-state names, or error copy from external automation tools.

### KPI Narrative Agent

- business outcome: translate operational indicators into short, role-aware narratives that explain what changed and what needs action.
- typical trigger: dashboard opened, scheduled management review, anomaly event, or executive summary request.
- typical tools: dashboard metrics, saved views, trend history, object drill-down, comment and task creation, notification.
- agent mode: conversational for exploration; workflow-typed for recurring narratives; autonomous for anomaly notifications.
- supervision posture: agent may publish internal narrative drafts; customer-visible or board-level use requires owner approval.
- expected human handoff: manager confirms interpretation and assigns follow-up tasks.
- success metrics: narrative preparation time, action creation count, correction count, recurring review completion, unanswered follow-up count.
- anti-copy notes: do not copy analytics assistant wording, dashboard narratives, or public benchmark language.

## Family: Object-Bound Collaboration Agents

### Object Thread Summary Agent

- business outcome: reduce context switching by summarizing object-linked comments, decisions, files, and activity history.
- typical trigger: user opens a customer, opportunity, project, invoice, support case, or audit event with substantial history.
- typical tools: object timeline, comments, decisions, files, activity history, permissions, summary formatter.
- agent mode: conversational for on-demand summaries; workflow-typed for recurring handoff summaries.
- supervision posture: internal summaries can be generated on demand; customer-visible text requires explicit approval.
- expected human handoff: object owner confirms accuracy, visibility, and next action.
- success metrics: time to context, edit rate, missed decision count, handoff completion, customer-visible approval completion.
- anti-copy notes: do not copy workspace summary formats, collaboration labels, or assistant conversation styles from external products.

### Decision Capture Agent

- business outcome: turn informal comments into structured, auditable decisions tied to the correct business object.
- typical trigger: approval phrase in a thread, meeting note added, comment marked for decision, or workflow gate awaiting evidence.
- typical tools: comment reader, decision object writer, approval state, file attachment, audit log, notification.
- agent mode: conversational for confirmation; workflow-typed when a decision unlocks a business process.
- supervision posture: agent drafts the decision record; a human confirms authority, wording, visibility, and effect.
- expected human handoff: requester or approver validates the decision and records final responsibility.
- success metrics: decision capture completeness, approval latency, missing evidence count, reopened decision count, audit export readiness.
- anti-copy notes: do not copy decision templates, approval copy, or governance wording from collaboration platforms.

### Customer Portal Reply Assistant

- business outcome: help teams answer customer-visible portal threads with correct context, tone, language, and object references.
- typical trigger: customer reply on project, quote, invoice, support case, or handover document.
- typical tools: portal thread reader, object context, file reference, FR/EN language support, reply draft, approval task.
- agent mode: conversational by default; workflow-typed for standard acknowledgements that require approval before send.
- supervision posture: customer-visible replies always require human approval unless limited to pre-approved acknowledgement patterns.
- expected human handoff: object owner edits and sends the reply or escalates internally.
- success metrics: customer response latency, approved draft rate, escalation count, reopened thread count, language correction count.
- anti-copy notes: do not copy portal message templates, helpdesk macros, or customer-support conversation patterns from external products.

## Cross-Family Patterns Reference

The candidate agents above reuse the OpenERP-authored patterns in
[`docs/study/12-agentic/patterns-library.md`](../12-agentic/patterns-library.md).
The most common cross-family shapes are extraction, classification,
reconciliation, anomaly detection, drafting, summarization, decision support,
multi-tool orchestration, document QA, compliance validation, notification and
escalation, and customer communication.

The patterns library is a vocabulary source, not a library of production
prompts or workflow definitions. Each future agent fiche must select the
relevant patterns, restate the business outcome, and define OpenERP-specific
tools, policy checks, handoff, and audit events.

## Vertical Pack Surface Reference

Procurement, MES, WMS, payroll, and manufacturing planning agents remain
surface-mapped as later vertical packs in
[`docs/study/12-agentic/vertical-packs-surface-map.md`](../12-agentic/vertical-packs-surface-map.md).
They are commercially meaningful, especially for manufacturing-heavy and
distribution-heavy tenants, but they are outside the service-company-first
agentic MVP band.

The core families in this file should still keep shared objects ready for those
future packs: supplier and contract references, inventory-ready product data,
employee and time context, accounting links, work-order adjacency, and
reporting hooks. That preparation is a boundary decision, not permission to
deep-design vertical agents in the current phase.

## Localization Requirements

Agent behavior must be bilingual from the first implementation slice. FR/EN
coverage applies to agent prompts, notifications, document drafts, audit
messages, customer-visible replies, internal summaries, approval requests,
exception explanations, and generated task descriptions.

Language handling must be object-aware. A customer, supplier, employee, tenant,
or document can carry a preferred language, and the agent must use that
preference unless a human explicitly overrides it. Audit messages should retain
the language used at execution time and preserve enough context for later
review in either French or English.

Localization also affects numbers, dates, currency, province/state fields, tax
labels, address formats, and document terminology. Agents may suggest wording
and checks, but statutory claims for Quebec, Canada, or any other region require
separate official-source specifications before native behavior is declared.

## Integration Points

| Integration Point | Agentic Boundary |
| --- | --- |
| OpenERP domain tools | Agents call bounded CRM, project, billing, accounting, reporting, automation, and collaboration tools through permission-aware interfaces. |
| Identity and delegation | Conversational agents usually act within a user session; autonomous agents need service-principal style identities; cross-scope actions need bounded delegation. |
| Policy enforcement | Every high-impact tool call needs pre-action and post-action policy checks covering amount, object type, tenant, schedule window, and approval state. |
| Audit and traces | Agent input, relevant context, proposed action, tool call, policy result, human decision, and final outcome must be recorded. |
| Collaboration | Handoff, clarification, approval, and customer-visible publication flow through object-bound threads and tasks. |
| Notifications | Internal reminders, escalations, and customer-ready drafts use the same FR/EN notification model as the core product. |
| Reporting | Agent activity feeds operational reports on cycle time, exception volume, approval latency, and adoption by role. |
| MCP interop | MCP can be used as the standard tool-interoperability surface, but no external server name, tool catalog, or authentication expression is copied. |
| Marketplace and mini-modules | The first posture is private and tenant-governed; partner and public distribution remain later design spaces with signing, review, and revocation needs. |

## Non-Copy Implementation Rule

This map is an OpenERP-written functional synthesis. It must not be used as
permission to copy external code, prompts, tool schemas, workflow definitions,
eval data, demos, screenshots, marketplace UI, agent catalog UI, agent builder
UI, policy language, sandbox configuration, MCP server names, docs, templates,
or proprietary product expression.

Future implementation must begin from OpenERP-authored requirements, typed
domain objects, permission rules, approval gates, audit events, and FR/EN text.
External products and projects remain functional references or public
benchmarks only, with license posture governed by
[`docs/study/12-agentic/license-posture.md`](../12-agentic/license-posture.md).
