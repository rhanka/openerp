# MVP Spec: Reporting And Typed Automation

## Progress

Fait: Reporting/automation MVP spec drafted for saved views, operational reports, dashboards, exports, scheduled delivery, typed triggers/actions, workflow runs, and webhook delivery.
À faire: Review the full MVP spec package for cross-module consistency and produce final package synthesis; module-spec package is about 100% complete.
Attendu: Use this spec to deliver operational visibility and controlled automation without rebuilding Superset or Node-RED inside the ERP core.

## Objective

Create MVP reporting and automation as platform services that support CRM, project delivery, billing, accounting, and foundation modules.

The MVP must:

- provide saved views and operational reports over first-party ERP entities;
- support dashboard widgets for operational KPIs;
- export data with audit trail;
- schedule reports for internal recipients;
- define typed automation triggers and typed actions;
- record workflow runs and failures;
- support outbound webhooks with retry and secret handling;
- avoid full BI authoring and general-purpose visual flow programming.

## Roles

| Role | Responsibilities |
| --- | --- |
| Admin | Configures report visibility, workflow catalog, webhook endpoints, and organization-level automation settings. |
| Manager | Creates team saved views, reviews dashboards, receives scheduled reports, and activates allowed workflows. |
| Finance user | Uses finance reports and exports with finance permissions. |
| Sales/project user | Uses CRM/project views and workflow notifications within assigned scope. |
| Auditor/read-only user | Reviews reports, exports, workflow runs, and audit logs without changing behavior. |
| System operator | Observes worker health and delivery failures without ordinary tenant data access. |

## Data Entities

| Entity | Required Fields |
| --- | --- |
| `SavedView` | id, organization_id, owner_user_id, resource_type, name, filters, columns, sort_order, visibility, created_at, updated_at. |
| `ReportDefinition` | id, organization_id, report_type, name, description, resource_type, parameters_schema, required_permissions, active. |
| `ReportRun` | id, organization_id, report_definition_id, requested_by, parameters, status, started_at, completed_at, file_id, error_code. |
| `Dashboard` | id, organization_id, name, owner_user_id, visibility, layout, created_at, updated_at. |
| `DashboardWidget` | id, organization_id, dashboard_id, widget_type, report_definition_id, saved_view_id, configuration, position, active. |
| `ExportJob` | id, organization_id, source_type, source_id, format, filters, status, requested_by, file_id, created_at, completed_at. |
| `ScheduledDelivery` | id, organization_id, report_definition_id, saved_view_id, recipients, frequency, next_run_at, locale, status. |
| `WorkflowDefinition` | id, organization_id, name, status, trigger_type, trigger_config, action_config, created_by, activated_by, activated_at. |
| `WorkflowRun` | id, organization_id, workflow_definition_id, trigger_event_id, status, input_summary, output_summary, attempts, started_at, completed_at, error_code. |
| `WebhookEndpoint` | id, organization_id, name, url, secret_ref, event_types, status, created_by, created_at. |
| `WebhookDelivery` | id, organization_id, endpoint_id, event_type, status, attempt_count, next_retry_at, response_code, created_at, completed_at. |

## States

### Report/Export Status

| State | Meaning |
| --- | --- |
| `queued` | Waiting for worker. |
| `running` | Worker is producing report/export. |
| `completed` | Output file is ready. |
| `failed` | Failed with error code and retry/diagnostic visibility. |
| `cancelled` | Cancelled before completion. |

### Workflow Status

| State | Meaning |
| --- | --- |
| `draft` | Defined but inactive. |
| `active` | Triggerable. |
| `paused` | Temporarily disabled. |
| `archived` | Retained for audit but not triggerable. |

### Workflow Run Status

| State | Meaning |
| --- | --- |
| `queued` | Trigger accepted. |
| `running` | Actions are executing. |
| `succeeded` | Actions completed. |
| `failed` | Actions failed after retries or validation. |
| `skipped` | Trigger matched but guard conditions prevented action. |

## Permission Model

Required permissions:

- `report.saved_view.read.own|team|organization`
- `report.saved_view.write.own|team|organization`
- `report.dashboard.read.own|team|organization`
- `report.dashboard.write.own|team|organization`
- `report.export.organization`
- `report.schedule.manage.team|organization`
- `automation.workflow.read.team|organization`
- `automation.workflow.write.team|organization`
- `automation.workflow.activate.organization`
- `automation.run.read.team|organization`
- `automation.webhook.manage.organization`

Rules:

- reports never bypass underlying resource permissions;
- dashboards inherit data permissions from each widget source;
- exports require explicit export permission and audit event;
- workflow actions cannot exceed configured actor/admin scope;
- webhooks require organization-level manage permission;
- secrets are never returned by API.

## Workflows

### Saved View

1. User filters a resource list such as opportunities, projects, time entries, invoices, or workflow runs.
2. User saves selected filters, columns, and sorting.
3. System validates visibility and permissions.
4. Saved view becomes available according to own/team/organization visibility.

### Operational Report Run

1. User selects report definition and parameters.
2. System validates permissions and parameter schema.
3. Worker runs report asynchronously.
4. System stores output file and report run metadata.
5. Audit event records actor, parameters summary, and output file id.

### Dashboard Widget

1. User creates dashboard.
2. User adds widget from approved report or saved view source.
3. System validates underlying permissions.
4. Widget refreshes using cached or live data according to widget policy.

### Scheduled Delivery

1. Manager creates schedule for report or saved view.
2. System validates recipients and permissions.
3. Worker generates report at scheduled time.
4. System sends localized notification/email with file link or summary.
5. Delivery status is recorded.

### Typed Automation

1. Admin or manager creates workflow from approved trigger catalog.
2. User selects typed trigger, optional conditions, and typed actions.
3. System validates permissions and action scope.
4. Workflow is activated by authorized user.
5. Domain event triggers workflow run.
6. Worker executes actions, records result, and exposes failure details.

### Webhook Delivery

1. Admin creates webhook endpoint and allowed event types.
2. System stores secret reference, not secret value.
3. Domain event creates delivery job.
4. Worker sends signed payload.
5. Failure retries according to policy and records final status.

## Trigger Catalog

MVP typed triggers:

- `crm.opportunity.stage_changed`
- `crm.opportunity.won`
- `project.time_entry.approved`
- `project.invoice_proposal.approved`
- `invoice.issued`
- `invoice.overdue`
- `payment.registered`
- `system.import.failed`
- `system.update_preflight_requested`

MVP typed actions:

- send notification;
- create task;
- request approval;
- call webhook;
- schedule export;
- mark follow-up activity;
- pause recurring schedule;
- create internal comment.

## Business Rules

- Reports and dashboards must enforce caller permissions at query time.
- Export jobs include actor, filters, timestamp, file checksum, and source report/view.
- Scheduled delivery must not send records to recipients lacking current permission.
- Workflow activation/deactivation is audited.
- Workflow definitions are versioned; runs reference the definition version used.
- Workflow actions execute with explicit configured scope, not invisible superuser access.
- Webhook payloads include event id, organization id, event type, resource type/id, timestamp, and signature.
- Failed workflow runs and webhook deliveries are visible to authorized admins.
- Secrets are write-only and stored outside ordinary record payloads.
- Automation must be typed. Arbitrary code execution and arbitrary package installation are excluded from MVP.

## API Expectations

Initial API surface:

- `GET /saved-views`
- `POST /saved-views`
- `PATCH /saved-views/{id}`
- `GET /reports/definitions`
- `POST /reports/runs`
- `GET /reports/runs`
- `GET /dashboards`
- `POST /dashboards`
- `PATCH /dashboards/{id}`
- `POST /dashboards/{id}/widgets`
- `POST /exports`
- `GET /exports/{id}`
- `GET /scheduled-deliveries`
- `POST /scheduled-deliveries`
- `PATCH /scheduled-deliveries/{id}`
- `GET /automation/workflows`
- `POST /automation/workflows`
- `PATCH /automation/workflows/{id}`
- `POST /automation/workflows/{id}/activate`
- `POST /automation/workflows/{id}/pause`
- `GET /automation/runs`
- `GET /webhook-endpoints`
- `POST /webhook-endpoints`
- `PATCH /webhook-endpoints/{id}`
- `GET /webhook-deliveries`

API rules:

- report/export endpoints are asynchronous by default;
- workflow activation validates all trigger/action configs;
- webhook secrets are accepted on write and never returned;
- every export, workflow activation, and webhook endpoint change returns audit event id.

## Events

Required platform events:

- `report.saved_view.created`
- `report.run.requested`
- `report.run.completed`
- `report.export.created`
- `report.scheduled_delivery.sent`
- `dashboard.created`
- `automation.workflow.created`
- `automation.workflow.activated`
- `automation.workflow.paused`
- `automation.run.started`
- `automation.run.succeeded`
- `automation.run.failed`
- `webhook.endpoint.created`
- `webhook.delivery.succeeded`
- `webhook.delivery.failed`

## Localization Requirements

- Report titles, parameter labels, column labels, widget titles, export labels, and validation errors require FR/EN.
- Scheduled deliveries use recipient preferred language.
- Workflow trigger/action labels require FR/EN.
- Notification templates for automation actions require FR/EN.
- CSV/XLSX export column headers use selected export language.

## Reporting Requirements

MVP approved reports:

- CRM pipeline by stage and owner;
- overdue CRM activities;
- project approved but unbilled time;
- project hours by user/activity;
- invoice aging;
- payments by period;
- tax liability workpaper;
- workflow failures;
- export history;
- audit event search.

No SQL authoring, arbitrary dataset editor, or chart exploration is required.

## Acceptance Tests

- Saved view preserves filters, columns, sort order, and visibility.
- User cannot see report rows outside underlying resource permission.
- Export job creates file object and audit event.
- Scheduled delivery skips or fails recipients lacking current permission.
- Dashboard widget enforces data permissions.
- Workflow activation fails if action exceeds allowed scope.
- Domain event creates workflow run for active matching workflow.
- Paused workflow does not run.
- Workflow run records input summary, output summary, attempts, and status.
- Webhook delivery signs payload and records attempt result.
- Webhook secret is not returned by read API.
- FR and EN labels exist for report definitions, workflow trigger labels, action labels, and export headers.

## Non-Goals

- No Superset clone, SQL Lab, arbitrary BI semantic dataset editor, or advanced chart authoring in MVP.
- No Node-RED clone, visual flow canvas, arbitrary plugin installation, arbitrary JavaScript execution, or generic node palette in MVP.
- No copied Superset dashboard schemas, chart controls, import/export YAML, UI text, or report templates.
- No copied Node-RED flow JSON, node APIs, editor canvas, palette metadata, credential UI, or built-in node behavior.

## Agentic Impacts

Agentic support extends typed automation with approved mini-module references, bounded input scopes, tool scopes, policy hooks, supervision checkpoints, trace retention, budget caps, FR/EN output settings and reports on agentic runs; the consolidated impact map is in [`docs/study/10-mvp-specs/agentic-impacts.md`](agentic-impacts.md).
