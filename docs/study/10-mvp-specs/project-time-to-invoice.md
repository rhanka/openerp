# MVP Spec: Project, Time, And Invoice Proposal

## Progress

Fait: spec enrichie + décisions PT-D-XX arbitrées 2026-05-14. Status RESOLVED gravé. Correction PG-05 : ServiceActivity utilise TranslationKey (drop fr_label/en_label colonnes SQL).
À faire: impl après foundation (Money + ApprovalRequest + Idempotency-Key + ProjectTask canon).
Attendu: bloque sur foundation + CRM (lien projet ↔ opportunité). Démarrage impl project quand foundation et CRM exposent leurs primitives.

## Objective

Create the service delivery module for companies whose revenue comes from projects, retainers, implementation work, support work, and recurring services.

The module must:

- create projects from accepted CRM opportunities or manually;
- manage tasks, activities, assignments, and delivery status;
- capture time entries with billable state and rate source;
- support approval before invoice proposal;
- generate traceable invoice proposal lines;
- provide basic service margin and utilization reporting inputs;
- keep payroll-prep export separate from native payroll.

## Roles

| Role | Responsibilities |
| --- | --- |
| Project manager | Creates projects/tasks, assigns work, approves time, monitors delivery and invoice proposal readiness. |
| Consultant/employee | Logs time, updates tasks, submits entries, and sees assigned work. |
| Sales lead | Reads delivery status for owned customers and handoff context. |
| Finance user | Reviews invoice proposal lines and billing readiness. |
| Manager | Reviews team workload, approvals, and delivery exceptions. |
| External customer user | Optional future view of project status and approved documents only. |

## Data Entities

| Entity | Required Fields |
| --- | --- |
| `Project` | id, organization_id, company_id, opportunity_id, contract_id, name, status, billing_mode, owner_user_id, manager_user_id, start_date, end_date, currency, budget_amount, budget_hours, created_at, updated_at. |
| `Task` | id, organization_id, project_id, parent_task_id, name, status, priority, assignee_user_id, due_date, estimated_hours, billable_default, created_at, updated_at. |
| `ServiceActivity` | id, organization_id, name, description, billable_default, default_rate_id, active, label_translation_key_id (TranslationKey FK vers table TranslationKey foundation, PG-05 ICU JSON nested FR-CA/EN-CA — anciennes colonnes SQL `fr_label`/`en_label` retirées per PG-05). |
| `Assignment` | id, organization_id, project_id, user_id, role_label, allocation_percent, start_date, end_date, billable_rate_id. |
| `TimeEntry` | id, organization_id, project_id, task_id, activity_id, user_id, work_date, duration_minutes, description, billable, approval_status, billing_status, rate_source, created_at, updated_at. |
| `TimeApproval` | id, organization_id, approver_user_id, time_entry_id, status, decision_reason, decided_at. |
| `ProjectBillingRule` | id, organization_id, project_id, billing_method, rate_source, fixed_amount, milestone_name, active. |
| `Rate` | id, organization_id, name, currency, amount, unit, applies_to, active, effective_from, effective_to. |
| `InvoiceProposal` | id, organization_id, project_id, company_id, status, currency, period_start, period_end, created_by, approved_by, created_at, approved_at. |
| `InvoiceProposalLine` | id, organization_id, invoice_proposal_id, source_type, source_id, description_key, quantity, unit_price, amount, currency, tax_category_id, trace_payload. |
| `DeliveryTimelineEntry` | id, organization_id, project_id, task_id, actor_user_id, entry_type, payload, occurred_at. |

## States

### Project Status

| State | Meaning |
| --- | --- |
| `draft` | Created but not active for time entry. |
| `active` | Work can be planned and logged. |
| `on_hold` | Work paused; time entry can be restricted by setting. |
| `completed` | Delivery complete; final billing review can occur. |
| `cancelled` | Stopped without completion; retained for audit. |

### Task Status

| State | Meaning |
| --- | --- |
| `not_started` | Not started. |
| `in_progress` | Work is active. |
| `blocked` | Work cannot continue without dependency resolution. |
| `done` | Delivery work complete. |
| `cancelled` | No longer required. |

### Time Approval Status

| State | Meaning |
| --- | --- |
| `draft` | User is still editing. |
| `submitted` | Waiting for approval. |
| `approved` | Ready for billing/payroll-prep use. |
| `rejected` | Returned with reason. |
| `locked` | Included in invoice proposal or closed period. |

### Time Billing Status

| State | Meaning |
| --- | --- |
| `not_billable` | Internal or non-chargeable work. |
| `billable_pending` | Billable but not yet proposed. |
| `proposed` | Included in invoice proposal draft. |
| `invoiced` | Linked to issued invoice. |
| `written_off` | Approved as not billed despite being billable. |

## Permission Model

Required permissions:

- `project.project.read.own|team|organization`
- `project.project.write.own|team|organization`
- `project.task.write.own|team|organization`
- `project.time.write.own|team|organization`
- `project.time.approve.team|organization`
- `project.invoice_proposal.create.team|organization`
- `project.invoice_proposal.approve.organization`
- `project.rate.manage.organization`
- `project.report.read.team|organization`

Rules:

- users can edit their own draft time entries until submitted;
- approved or locked time entries require controlled correction;
- project managers can approve team/project time when permissioned;
- finance permission is required to approve invoice proposals for billing handoff;
- rates are admin/finance-managed, not ordinary user-managed.

## Workflows

### CRM Win To Project

1. CRM emits won opportunity and quote handoff.
2. Project manager creates project from handoff.
3. System copies customer, opportunity reference, service summary, language, currency, and billing assumptions.
4. Project manager selects billing mode: time-and-materials, milestone, recurring service, or fixed fee (pending - to be confirmed by maintainer).
5. Project becomes active after required fields and manager assignment are complete.

### Task And Assignment Planning

1. Project manager creates tasks and activities.
2. Assigns team members and optional allocation.
3. Sets billable defaults, estimates, due dates, and priority.
4. System emits project timeline entries.

### Time Entry Submission

1. User logs time against project/task/activity.
2. System applies billable default and rate source.
3. User saves draft or submits.
4. Manager approves or rejects with reason.
5. Approved billable entries become eligible for invoice proposal.

### Invoice Proposal Generation

1. Finance/project manager selects project and period.
2. System gathers approved billable entries and milestone/fixed fee rules.
3. System creates invoice proposal draft with traceable source lines.
4. Reviewer can exclude, write off, or adjust proposed lines with reason.
5. Approved proposal becomes billing input for invoice generation in billing/accounting module.
6. Source time entries move to `proposed`, then `invoiced` after invoice issue.

## Business Rules

- Time cannot be proposed for invoicing unless approved.
- Time entries must have user, work date, duration, project, and activity.
- Duration must be positive and fit tenant rounding rules.
- Time entry work date cannot be edited after approval without correction flow.
- Invoice proposal lines must retain source references to time entries, milestones, or rules.
- Non-billable time remains visible for project margin and utilization reporting.
- Rate changes are effective-dated; historical invoice proposals use source-time rate snapshot.
- Project language/customer language flows into invoice proposal text, but final invoice wording belongs to billing module.
- Payroll-prep export can consume approved time, but this module does not calculate payroll.

## API Expectations

Initial API surface:

- `GET /projects`
- `POST /projects`
- `GET /projects/{id}`
- `PATCH /projects/{id}`
- `GET /projects/{id}/timeline`
- `POST /projects/{id}/tasks`
- `PATCH /tasks/{id}`
- `GET /time-entries`
- `POST /time-entries`
- `PATCH /time-entries/{id}`
- `POST /time-entries/{id}/submit`
- `POST /time-entries/{id}/approve`
- `POST /time-entries/{id}/reject`
- `GET /rates`
- `POST /rates`
- `GET /invoice-proposals`
- `POST /invoice-proposals`
- `PATCH /invoice-proposals/{id}`
- `POST /invoice-proposals/{id}/approve`
- `POST /invoice-proposals/{id}/handoff-to-billing`

API rules:

- time-entry writes validate project status and user assignment policy;
- invoice proposal generation is idempotent by project, period, and requested source set;
- all approval actions require actor, timestamp, reason where applicable, and audit event;
- handoff to billing emits immutable source links.

## Events

Required domain events:

- `project.created_from_crm`
- `project.created`
- `project.status_changed`
- `task.created`
- `task.status_changed`
- `assignment.created`
- `time_entry.created`
- `time_entry.submitted`
- `time_entry.approved`
- `time_entry.rejected`
- `time_entry.corrected`
- `invoice_proposal.created`
- `invoice_proposal.approved`
- `invoice_proposal.handoff_to_billing`

## Localization Requirements

- Project/task/activity status labels require FR/EN.
- Activity catalog requires FR/EN labels.
- Time-entry validation messages require FR/EN.
- Invoice proposal line descriptions must use translation keys and structured payloads.
- Customer preferred language is carried from CRM into project and proposal context.
- Date, duration, currency, and decimal formatting must respect user locale while stored values remain normalized.

## Reporting Requirements

MVP project reporting should include:

- billable hours by project, user, activity, and period;
- non-billable hours by project and activity;
- approved but not proposed time;
- proposed but not invoiced time;
- project budget hours versus actual hours;
- overdue tasks;
- rejected time entries;
- delivery timeline by customer/project.

## Acceptance Tests

- Accepted CRM handoff can create a project with linked company and opportunity.
- Project cannot become active without manager, customer, currency, and billing mode.
- User can create draft time entry for assigned active project.
- User cannot approve own time unless explicitly granted by policy.
- Rejected time requires reason and returns to editable state.
- Approved time cannot be edited without correction flow.
- Invoice proposal excludes unapproved time.
- Invoice proposal line links back to original time entry.
- Changing a rate after time approval does not alter existing proposal line snapshot.
- Non-billable time never creates invoice proposal line.
- Handoff to billing emits event and locks proposal lines.
- FR and EN labels exist for status, activity, and validation messages.

## Non-Goals

- No payroll calculation.
- No full resource capacity planning.
- No customer portal in this MVP slice, only future-safe data visibility.
- No advanced project portfolio management.
- No copied Kimai entities, controllers, invoice renderers, API routes, templates, or report layouts.
- No copied Odoo project/task/timesheet schemas, XML views, reports, or workflow text.

## Agentic Impacts

Agentic support adds timesheet classification suggestions, project status coaching, margin alerts, invoice-proposal preparation, typed checkpoints and audit-visible manager approval before finance impact; the consolidated impact map is in [`docs/study/10-mvp-specs/agentic-impacts.md`](agentic-impacts.md).

## Enrichment 2026-05-12

This block extends the MVP spec with functional depth, cross-ERP benchmark, UI inventory, technical option set, and recorded decisions. Existing sections above remain authoritative; this block adds resolution and context for the maintainer review pass. All wording is original, FR-CA prioritaire with EN-CA parité, and no third-party identifiers (table names, controller names, UI strings) are copied.

### Functional Depth

#### User Stories

- US-PT-01 — As a project manager, when a CRM opportunity is marked won, I want to create a delivery project with one click that carries customer, language, currency, opportunity reference, and proposed billing assumptions, so I can start planning without re-keying handoff data.
- US-PT-02 — As a consultant, I want to log time against an assigned project, task, and service activity, with a billable default I can override, so my hours feed both delivery reporting and invoicing without manual reclassification.
- US-PT-03 — As a project manager, I want to review and approve a week of team time entries in one queue, filtered by project and submission state, so I can release billable hours quickly while keeping non-billable hours visible for margin.
- US-PT-04 — As a finance user, I want to generate an invoice proposal draft for a project and period, see proposed lines grouped by activity and resource with rate snapshot, and exclude or write off lines with a reason, so finance keeps control while delivery prepares.
- US-PT-05 — As a manager, I want to see, per project, approved-but-not-proposed hours, budget-vs-actual hours, and overdue tasks, so I can act on revenue risk and delivery slippage before month-end.

#### Golden Path

Opportunity won (CRM) → project created from handoff with copied customer/currency/language → manager confirms billing mode and rate source → tasks and service activities created with estimates and billable defaults → assignments with allocation and applicable rate → consultants log time entries (draft → submitted) → manager approves entries in batch (approved) → finance generates invoice proposal for project + period → reviewer accepts proposed lines (rate snapshot frozen) → proposal approved → handoff event emitted to billing/accounting module → time entry billing status moves to `proposed` then `invoiced` once billing module issues the invoice → delivery timeline reflects the closed billing loop.

#### Edge Cases

- EC-PT-01 — Overlapping time entries: two entries by the same user with overlapping start/duration windows. MVP rule: duration-based logging without start/stop overlap detection is allowed; if timer mode is enabled, the new timer auto-stops the previous one. Validation message must be FR/EN.
- EC-PT-02 — Project reassignment mid-period: a project is moved to a different customer or billing mode while approved-but-not-proposed hours exist. Rule: those hours retain their original project snapshot for billing; new entries follow the new billing rule. Audit event `project.reassigned` is emitted.
- EC-PT-03 — Rate change mid-period: an effective-dated rate change happens between work date and approval/proposal. Rule: rate source resolves by work date, not by approval date; proposal line carries the resolved rate snapshot.
- EC-PT-04 — FR/EN language mismatch: project customer language is FR-CA but the consultant operates in EN-CA. Rule: proposal line description uses translation keys; rendered text follows customer language; internal UI follows user language.
- EC-PT-05 — Billing handoff retry: a `handoff_to_billing` event is delivered but the billing module returns a transient failure. Rule: proposal stays `approved`, lines remain locked, handoff is idempotent by proposal id, and re-emission produces no duplicate billing artifact.
- EC-PT-06 — Late correction on approved time: an approved entry needs adjustment after lock. Rule: a controlled correction creates a paired adjustment entry referencing the original; the original stays locked; both entries reconcile in delivery timeline.

#### Acceptance Criteria

- A project cannot be activated without manager, customer, currency, and a billing mode (consistent with existing acceptance tests above).
- Time entries cannot move to `submitted` without a project assignment that is active on the work date.
- Approval action requires a different actor than the entry author unless an explicit self-approval policy is granted at organization level.
- Invoice proposal generation is idempotent on (project_id, period_start, period_end, source_set_hash).
- Rate snapshot on proposal line equals the rate resolved at time-entry work date, not at proposal generation date.
- Every approval, rejection, correction, and proposal action emits a domain event with actor, timestamp, and reason where applicable.
- FR-CA and EN-CA labels exist for every status enum, validation message, and translation key used in proposal line descriptions.

### Cross-ERP Benchmark

License posture: Odoo entries describe abstracted observations only; Kimai/OpenProject/ERPNext entries are functional reference only. No vendor identifiers, table names, or UI strings are reused.

| Capability | Odoo | Kimai | OpenProject | ERPNext | Posture |
| --- | --- | --- | --- | --- | --- |
| Project hierarchy | Project with sub-projects and grouped tasks observable in the suite. | Customer → project → activity, flat hierarchy. | Project with sub-projects, portfolios, programs, and work-package hierarchy. | Project with parent/child projects and tasks. | MVP: single project with flat sub-tasks under each task at most one level. |
| Task model | Tasks with sub-tasks, stages, assignees, dependencies. | Activities at customer/project/global level, not full task model. | Work packages with rich types, status, custom fields, dependencies. | Tasks with status, dependencies, and timesheets. | MVP: tasks with status, assignee, estimate, optional parent (one level). |
| Time tracking | Timesheet entries with hours and project/task/activity. | Strong timesheet with duration and rich filters/reports. | Spent time on work packages with module-level tracking. | Timesheets with activity and project links. | MVP: time entry on project + task + service activity, duration-based. |
| Timer | Live timer integrated with timesheet. | First-class running timer with start/stop. | Time tracker on work packages. | Timer present alongside manual entry. | MVP: manual duration first; optional timer behind a tenant setting. |
| Approval workflow | Period-based timesheet submit/approve flow observable. | Lock/unlock and approval flows present. | Approval modules exist; project-level configuration. | Timesheet submit/approve with manager flow. | MVP: per-entry approval queue grouped by project + week. |
| Billable flag | Billable default propagates from project/activity. | Billable flag on activity, project, and entry. | Billable annotation limited; cost tracking via custom fields/plugins. | Billable flag on timesheet and project. | MVP: billable default cascades project → activity → assignment → entry, overridable. |
| Hourly rate | Rate per employee/project/customer with effective dates observed. | Rates per user, customer, project, activity with hourly/fixed. | Cost rates via custom fields/plugins. | Activity-type and employee billing/cost rate. | MVP: rate with effective-dated snapshot, resolution by work date. |
| Milestones | Milestone billing supported in service flows. | Fixed-rate items on invoices. | Versions/milestones on work packages. | Project milestones and deliverables. | MVP: milestone billing rule on project, manual trigger. |
| Invoice generation | Service invoicing from timesheet and milestone observable. | Invoice templates from approved time, multiple renderers. | No native invoicing. | Sales invoice from delivered service or timesheet. | MVP: invoice proposal draft → handoff to billing/accounting module; this module does not render final invoice. |
| Capacity planning | Forecast/capacity in service modules. | Not present. | Capacity views and team planner. | Resource allocation per project. | MVP: out-of-scope, only allocation percent on assignment is captured. |
| Gantt | Gantt in project app. | Not present. | Gantt-style timeline mature. | Gantt available on tasks. | MVP: out-of-scope, list and board only. |
| Time-off integration | Tight integration with leave. | None native. | Non-working time and working hours on user. | HR module separate; leave integration. | MVP: time-off lives in the HR module; project time entries simply exclude leave days from billable utilization counts. |

### UI Screen Inventory

Internal names use the project's convention `delivery.<screen>`; FR-CA and EN-CA labels resolve via translation keys.

| Screen | Internal id | Purpose | Key surfaces |
| --- | --- | --- | --- |
| Project list | `delivery.project.list` | Filterable index of active and historical projects per scope. | Filters by status, customer, manager, billing mode; columns include name, customer, status, budget vs actual hours, billable hours pending. |
| Project detail | `delivery.project.detail` | Single project overview with delivery, billing readiness, and team. | Tabs: overview, tasks, time entries, billing rules, proposals, timeline. |
| Task board | `delivery.task.board` | Kanban-style status flow for tasks of a project. | Columns map to task statuses; cards show estimate, assignee, due date, billable default. |
| Time entry composer | `delivery.time.compose` | Create or edit a time entry with optional running timer. | Fields: project, task, activity, work date, duration, billable, description; timer start/stop controls behind tenant setting. |
| My time week | `delivery.time.week` | Personal weekly grid of own entries with submit action. | Rows per project/task/activity, columns per weekday, totals, submit selected. |
| Time approval queue | `delivery.time.approval` | Manager queue of submitted entries grouped by project and week. | Bulk approve/reject with reason; filter by submitter, project, date range. |
| Invoice proposal preview | `delivery.proposal.preview` | Draft invoice proposal with traceable source lines. | Grouping by activity/resource; exclude, write-off, adjust actions; rate snapshot column; approve/handoff buttons. |
| Milestone tracker | `delivery.milestone.tracker` | Project milestones with billing readiness. | Status, planned/actual completion, billing rule, triggered proposals. |
| Capacity view (read-only MVP) | `delivery.capacity.view` | Per-user allocation across active projects within a period. | Allocation percent vs available hours; surfaces over-allocation flags only, no scheduler. |
| Delivery timeline | `delivery.timeline` | Audit feed of project events for delivery review. | Chronological list of typed events with actor, payload summary, and links to source entities. |

### Tech Layer Options

Each axis records the MVP choice and the rejected alternatives with rationale.

1. Time entry mode
   - Options: timer + manuel; manuel seul; timer only.
   - MVP choice: manuel seul as the default; timer optional behind a per-tenant setting.
   - Rationale: covers consulting and back-office logging without imposing timer discipline; timer remains available for service teams that already work that way.

2. Approval workflow
   - Options: per-entry; per-week; per-project; aucune en MVP.
   - MVP choice: per-entry approval surfaced through a manager queue that supports per-week bulk approval as a UI convenience.
   - Rationale: per-entry granularity protects billing accuracy; bulk UI gives weekly-rhythm teams a fast path.

3. Invoice trigger
   - Options: manuel; milestone; récurrent; mix.
   - MVP choice: manuel + milestone mix; récurrent moved to post-MVP via the billing/accounting module.
   - Rationale: T&M and milestone cover the majority of service-company billing; recurring belongs in billing/subscription scope, not in delivery.

4. Task hierarchy
   - Options: flat; parent-enfant un niveau; portfolio (programme > projet > tâche).
   - MVP choice: parent-enfant un niveau, with portfolio deferred.
   - Rationale: enough structure for implementation work breakdowns without portfolio complexity.

5. Project ↔ opportunity link
   - Options: 1:1; 1:N; référence floue.
   - MVP choice: 1:N from opportunity to projects, with one canonical opportunity per project (back-reference single-valued).
   - Rationale: an opportunity can split into multiple delivery projects; each project still answers to one win event for traceability.

6. Per-project billing mode
   - Options: T&M; fixed-price; hybride (cap + T&M).
   - MVP choice: T&M and fixed-price as first-class; hybride (cap + T&M) supported through a project-level cap rule that converts T&M to non-billable once reached.
   - Rationale: the cap pattern is common in implementation contracts and can be expressed without a separate billing engine.

7. Resource allocation
   - Options: capacity per user; capacity per role; aucune en MVP.
   - MVP choice: allocation percent per user assignment, with no aggregated capacity view beyond a read-only surface.
   - Rationale: provides input to utilization reporting without a scheduling product.

8. Time entry rounding
   - Options: aucun; 15 min; configurable.
   - MVP choice: configurable per tenant with default `none`; allowed values `none`, `5min`, `6min`, `15min`, `30min`.
   - Rationale: many shops bill in 15-minute units while others want exact durations; one tenant-level setting avoids per-user friction.

### Decision Register

```yaml
decisions:
  - id: PT-D-01
    topic: time_entry_mode
    choice: manual_with_optional_timer
    scope: mvp
    rationale: duration-based logging suits consulting; timer optional via tenant flag.
    resolution: 2026-05-14, status: RESOLVED, chosen: manual + timer optionnel (timer non bloquant MVP, codex réserve mais on garde optionnel)

  - id: PT-D-02
    topic: approval_workflow
    choice: per_entry_with_bulk_weekly_ui
    scope: mvp
    rationale: granular control with a weekly bulk path in the approval queue.
    resolution: 2026-05-14, status: RESOLVED, chosen: per-week (per-entry trop granulaire, per-project trop coarse)

  - id: PT-D-03
    topic: invoice_trigger
    choice: manual_and_milestone_mix
    scope: mvp
    rationale: recurring billing handled by billing/accounting module post-MVP.
    resolution: 2026-05-14, status: RESOLVED, chosen: mix manuel + milestone MVP, récurrent post-MVP

  - id: PT-D-04
    topic: task_hierarchy
    choice: parent_child_one_level
    scope: mvp
    rationale: enough structure without portfolio overhead.
    resolution: 2026-05-14, status: RESOLVED, chosen: parent-enfant 1 niveau MVP, portfolio post-MVP

  - id: PT-D-05
    topic: project_opportunity_link
    choice: one_to_many_opportunity_to_projects
    scope: mvp
    rationale: traceable single source opportunity per project.
    resolution: 2026-05-14, status: RESOLVED, chosen: 1:N (un projet peut consommer plusieurs opportunités)

  - id: PT-D-06
    topic: per_project_billing_mode
    choice: tm_and_fixed_with_cap_rule
    scope: mvp
    rationale: cap+T&M expressed as a project-level rule.
    resolution: 2026-05-14, status: RESOLVED, chosen: tm_and_fixed_with_cap_rule

  - id: PT-D-07
    topic: resource_allocation
    choice: allocation_percent_per_user_readonly_view
    scope: mvp
    rationale: feeds utilization reporting without a scheduler.
    resolution: 2026-05-14, status: RESOLVED, chosen: allocation_percent_per_user_readonly_view

  - id: PT-D-08
    topic: time_entry_rounding
    choice: tenant_configurable_default_none
    scope: mvp
    rationale: support 15-min billing shops and exact-duration shops with one setting.
    resolution: 2026-05-14, status: RESOLVED, chosen: tenant_configurable_default_none

  - id: PT-D-09
    topic: multi_currency_per_project
    choice: yes
    scope: mvp
    rationale: project currency is set at creation and used for proposal lines; FX handled in billing/accounting module.
    resolution: 2026-05-14, status: RESOLVED, chosen: yes (project currency at creation, FX handled in billing/accounting)

  - id: PT-D-10
    topic: subcontracted_time_with_vendor_bill
    choice: post_mvp
    scope: post_mvp
    rationale: vendor bill association handled by billing/accounting; MVP captures subcontractor time as non-billable-to-customer when needed.
    resolution: 2026-05-14, status: RESOLVED, chosen: post_mvp

  - id: PT-D-11
    topic: time_off_integration
    choice: external_via_hr_module
    scope: mvp
    rationale: HR module owns leave; project module reads non-working days for utilization calculations only.
    resolution: 2026-05-14, status: RESOLVED, chosen: external_via_hr_module

  - id: PT-D-12
    topic: mobile_time_entry
    choice: responsive_web_only
    scope: mvp
    rationale: responsive composer screen for phone use; no native mobile app in MVP.
    resolution: 2026-05-14, status: RESOLVED, chosen: responsive_web_only

  - id: PT-D-13
    topic: approval_delegation
    choice: post_mvp
    scope: post_mvp
    rationale: per-policy delegation deferred; MVP allows reassigning approver per project as a workaround.
    resolution: 2026-05-14, status: RESOLVED, chosen: post_mvp

  - id: PT-D-14
    topic: self_approval_policy
    choice: org_level_flag_default_false
    scope: mvp
    rationale: small teams need to enable self-approval; default forbids it to protect controls.
    resolution: 2026-05-14, status: RESOLVED, chosen: org_level_flag_default_false

  - id: PT-D-15
    topic: idempotency_proposal_generation
    choice: hash_of_project_period_source_set
    scope: mvp
    rationale: avoid duplicate proposals when generation is retried.
    resolution: 2026-05-14, status: RESOLVED, chosen: hash_of_project_period_source_set (Idempotency-Key sur POST /invoice-proposals per PG-08)
```

### Décisions programme impactantes (PG)

- **PG-02 (Identité multi-tenant)** : un consultant peut être `OrganizationMember` de plusieurs projets/orgs ; `Assignment.user_id` et `TimeEntry.user_id` référencent l'identité unique consolidée par PG-02, l'appartenance org/projet est portée par OrganizationMember.
- **PG-03 (RLS)** : Row Level Security activée sur tous les schémas `project.*`, `time_entry.*`, `invoice_proposal.*` ; les policies filtrent par `organization_id` (et par `project_id` quand applicable) en s'appuyant sur le claim de session.
- **PG-04 (pgmq)** : les rappels d'approbation hebdomadaire (per-week reminder consultant + manager) sont déposés dans une queue `pgmq` scheduled, consommée par un worker idempotent.
- **PG-05 (TranslationKey ICU JSON)** : `ServiceActivity` n'a plus de colonnes SQL `fr_label`/`en_label` ; ses libellés référencent une `TranslationKey` (FK vers la table foundation `translation_key`) avec payload ICU JSON nested FR-CA/EN-CA. Anciennes colonnes SQL `fr_label`/`en_label` retirées per PG-05. Les `InvoiceProposalLine.description_key` suivent la même convention.
- **PG-06 article 3 (Canon Activity)** : `Activity` est éclaté en `CrmActivity` (CRM) et `ProjectTask` (delivery). Toute mention historique d'`Activity` sans préfixe dans ce module est renommée `ProjectTask` per PG-06 article 3. `ServiceActivity` reste un catalogue distinct (nature de service facturable, pas une tâche).
- **PG-06 article 1 (Money type)** : `Rate.amount`, `ProjectBillingRule.fixed_amount`, `InvoiceProposal` totaux, `InvoiceProposalLine.unit_price`/`amount` utilisent le type `Money` foundation (decimal + currency code ISO 4217), pas `numeric` nu.
- **PG-07 (ApprovalRequest)** : l'approbation des `TimeEntry` (per-week) et la validation des `InvoiceProposal` passent par l'entité `ApprovalRequest` mutualisée (foundation), pas par des tables ad hoc ; `TimeApproval` devient une vue/projection au-dessus d'`ApprovalRequest`.
- **PG-08 (Idempotency-Key)** : `POST /time-entries` et `POST /invoice-proposals` exigent un header `Idempotency-Key` ; la combinaison `(project_id, period_start, period_end, source_set_hash)` reste la clé fonctionnelle de déduplication pour la génération de proposal, conforme à PT-D-15.
- **PG-12 (anti-copie)** : aucune entité, vue, route API, libellé ou template copié depuis Kimai (timesheet entities, rates UI, invoice renderers) ou OpenProject (work package, planner). Toute ressemblance fonctionnelle est documentée comme convergence, jamais comme dérivation.

