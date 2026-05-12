# MVP Spec: Project, Time, And Invoice Proposal

## Progress

Fait: Project/time-to-invoice MVP spec drafted for service projects, tasks, activities, assignments, time entries, approval, billing rules, invoice proposal, and traceability.
À faire: Draft billing/accounting and reporting/automation specs; module-spec package is about 60% complete.
Attendu: Use this spec to connect CRM wins to billable delivery and to feed the billing/accounting spec with approved invoice proposal lines.

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
| `ServiceActivity` | id, organization_id, name, description, billable_default, default_rate_id, active, fr_label, en_label. |
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
