# MVP Spec: Reporting And Typed Automation

## Progress

Fait: spec drafted + enrichissement 2026-05-12 (14 décisions YAML, 13 écrans originaux, 7 axes techno). Posture Apache (Superset, Node-RED) explicitement notice-conditionnée, pas de copy canvas/explorer.
À faire: arbitrage porteur produit (R-1 à R-6 + PG-10 BI stack + PG-11 PDF), assouplir scope dashboards en team-scope (désaccord reviewer : admin-curated only trop strict), aligner sur queue PG-04.
Attendu: figer après foundation (RBAC objet-level utilisé pour row-level reporting) + après billing (subscription/recurring schedule share pgmq).

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

## Enrichment 2026-05-12

### Functional Depth

User stories:

- As a Finance user, I want to open the invoice-aging report, filter by overdue bucket and customer segment, and export the result to XLSX so that I can drive a collections meeting without asking IT for a custom query.
- As a Sales manager, I want a saved CRM pipeline view that shows opportunities by stage and owner, with drill-down into the opportunity detail, so that I can run a weekly forecast review.
- As an Operations manager, I want to schedule a weekly project profitability report delivered every Monday at 07:00 to my team mailing list in French so that we start the week with a shared baseline.
- As an Admin, I want to define a typed workflow that triggers when `invoice.issued` fires and sends a customer notification plus a sales internal task so that follow-up does not depend on manual reminders.
- As an Auditor, I want a read-only view of every export, scheduled delivery, workflow activation, and webhook delivery so that I can reconstruct who saw what and what fired when.

Golden path:

1. Sales manager opens the curated "CRM pipeline by stage and owner" dashboard.
2. Manager drills into the "Stage = Negotiation" tile, lands on the opportunity list filtered to that stage, and opens one opportunity detail to confirm a deal.
3. Manager exports the filtered opportunity list to PDF for a steering committee.
4. Manager creates a scheduled delivery of the same saved view to the steering distribution list every Monday at 08:00, FR locale.
5. Admin links a workflow: when `payment.registered` fires for an invoice originating from a Won opportunity, the workflow posts a webhook to the team chat channel and creates a "thank-you follow-up" task on the related project.
6. Steering committee receives the Monday email; chat channel and project list show the post-event automation results; auditor sees the export, schedule, workflow run, and webhook delivery in the audit log.

Edge cases:

- Large dataset over worker timeout: a report run targeting a 5M-row table must fail with a clear `error_code` (for example `report.timeout`) and surface a hint to narrow filters; partial outputs are not saved as `completed`.
- Row-level permission tightening between schedule creation and execution: a recipient that lost access to a region must be skipped or downgraded to a summary; the delivery record must mark this recipient as `skipped_permission` rather than silently leaking rows.
- FR/EN label drift on a dashboard widget: a widget whose underlying report has no FR translation must render the EN label with a tagged fallback, not an empty header, and must surface a translation gap in the dashboard editor.
- Automation infinite loop: a workflow whose action triggers its own trigger (for example, an action creating a record that re-fires the trigger) must be detected by an event-chain depth limit and stop with an `error_code` like `automation.loop_detected`.
- Webhook side-effect retry idempotency: retries of `webhook.delivery` must carry a stable `delivery_id` and `event_id` so that downstream consumers can deduplicate; a 5xx response must trigger retry with backoff, a 4xx must not retry indefinitely.
- Locale mismatch on scheduled delivery: when a recipient has no preferred language, fallback order is delivery-configured locale, organization default, then EN.

Acceptance criteria:

- Every user story above has at least one acceptance test mirroring an entry in `## Acceptance Tests` (saved view persistence, permission enforcement, audit event creation, FR/EN labels).
- Each edge case has an `error_code` enumerated in the report/workflow run status payload and a documented operator response.
- Golden-path coverage requires end-to-end verification across saved view, drill-down, export, scheduled delivery, and typed automation linked to a domain event.

### Cross-ERP Benchmark

| Capability | Superset (Apache-2.0) | Node-RED (Apache-2.0) | Odoo Reports (LGPL) | Metabase (proprietary benchmark) | OpenERP Posture |
| --- | --- | --- | --- | --- | --- |
| Interactive dashboard | Mature dashboard authoring with filters, cross-filters, tabs | Not applicable (workflow editor, not BI) | Lighter dashboards in `spreadsheet`/dashboard modules | Mature dashboard product | MVP: admin-curated dashboards composed from approved widgets, no free-form dashboard authoring; original SvelteKit UI, no Superset chart controls copied. |
| Drill-down | Filter-driven drill plus URL parameters | Not applicable | Action-based navigation to record forms | Click-through to underlying question | MVP: widget click navigates to the underlying saved view filtered by the clicked dimension; no SQL exploration UI. |
| Export CSV/PDF/XLSX | CSV/XLSX exports plus PDF via report headless rendering | Not applicable in core | CSV/XLSX/PDF (QWeb templates) | CSV/XLSX/JSON, PDF via dashboard subscription | MVP: CSV, XLSX, PDF; JSON post-MVP. PDF via server-side templating, no Superset/Selenium-based screenshotting reused. |
| Scheduled reports | Native scheduler with email/Slack | Cron node-based, manually wired | Scheduled actions, email templates | Subscription/alert scheduler | MVP: `ScheduledDelivery` with cron-style frequency and event-driven hooks. |
| Visual automation workflow | Not applicable | Flow canvas, palette, node graph | Server actions/automation rules + Studio | Limited (alerts) | MVP: no visual canvas; typed workflow form (trigger + actions). Post-MVP exploration of canvas-style editor. |
| Automation DSL/code-as-config | Not applicable | JSON flow + JavaScript function nodes | Python automation rules | Limited | MVP: typed YAML/TS-shaped action config with schema validation, no arbitrary code execution. |
| Webhook integration | Outbound alerts via webhooks | First-class, broad integration | `base_webhook`, `mail_webhook` | Outbound via integrations | MVP: typed `WebhookEndpoint`, signed payload, retry policy. |
| Row-level security | Native row-level security via SQL templating | Not applicable | Record rules, `ir.rule` | Sandboxed permissions | MVP: reuse foundation RBAC, no dedicated reporting RLS engine; queries always run as caller. |
| Alerting | Native SQL/dataset alerts | Time-based and condition-based | Activity reminders, exception alerts | Native threshold alerts | MVP: typed alerts via automation triggers on domain events; no SQL-condition alert authoring. |
| Multi-source data | Many SQL/NoSQL connectors | Many integration nodes | Single primary DB | Many connectors | MVP: primary DB only; external sources (Stripe, Plaid) deferred. |
| Versioning/history | Dashboard JSON in DB, no full history | Flow versions on disk | Studio versions limited | Limited | MVP: published snapshot per dashboard/workflow definition; full history post-MVP. |
| Audit trail | Roles, action log | Audit limited | `mail.thread`, audit log | Audit Enterprise only | MVP: every export, schedule, workflow activation, webhook config emits an audit event. |

Apache reuse from Superset and Node-RED requires NOTICE preservation, attribution, dependency-license review, and zero copy of UI text, chart configuration schemas, flow JSON conventions, or node palette names. LGPL Odoo material remains functional inspiration only.

### UI Screen Inventory

1. Dashboard gallery: list of dashboards visible to the caller, filtered by ownership and team, with last-refresh timestamp and quick actions (view, duplicate metadata, archive).
2. Dashboard view: grid of widgets with drill-down affordances, refresh control, locale toggle, export-snapshot button.
3. Dashboard editor (admin-curated MVP): add/remove approved widgets, position, set visibility and refresh policy; no free-form chart authoring.
4. Widget configuration: choose report definition or saved view as source, configure parameters and labels (FR/EN), preview with current user permissions.
5. Saved view list: per resource type (opportunities, projects, time entries, invoices, workflow runs) with visibility tags.
6. Report run history: list of runs with status, requested-by, parameters summary, output file, error code; filterable for auditor view.
7. Scheduled delivery admin: list and edit `ScheduledDelivery` records, recipients, frequency, locale, next run.
8. Automation workflow list: workflow definitions with status (`draft`, `active`, `paused`, `archived`), trigger type, last-run summary.
9. Automation workflow editor: typed form for trigger selection, optional condition fields, typed action sequence with parameter validation; no node graph canvas in MVP.
10. Workflow run history: list of `WorkflowRun` with status, input/output summary, attempts, error code; drill-down to single run detail with audit trail.
11. Webhook endpoint admin: list and edit endpoints, secret rotation (write-only), allowed event types, delivery health summary.
12. Webhook delivery log: list of `WebhookDelivery` with attempt count, response code, next retry, signed payload preview (sanitized).
13. Alert configuration (lightweight MVP): map of domain events to notification/internal-comment/task actions; piggybacks on automation editor.

No Superset chart explorer or Node-RED flow canvas is rebuilt. UI text and screen names are original.

### Tech Layer Options

1. BI engine
   - Option A: Embed Superset via iframe with guest tokens. Pros: zero rewrite, mature charts. Cons: heavy ops, dashboard UX foreign to ERP shell, security surface (SQL Lab, guest tokens), Apache notice surfaces. Apache reuse: license-compatible but product fit weak.
   - Option B: Superset embed via SDK. Pros: tighter shell integration. Cons: still operationally heavy, still imports Superset UX/wording risk; anti-copy guardrails must isolate.
   - Option C: Native SvelteKit dashboard component over a small server-side query engine. Pros: aligned UX, smaller surface, original code. Cons: must build scheduling, alerting, drill-down ourselves.
   - Option D (recommended MVP): Native dashboard with admin-curated widgets backed by `ReportDefinition`. Reserve Superset for post-MVP self-service BI as a separate optional pack.

2. Automation engine
   - Option A: Embed Node-RED runtime. Pros: mature event runtime. Cons: copies node palette UX, dependency surface, conflicts with typed-only guardrail.
   - Option B (recommended MVP): Native typed DSL (YAML config + typed action handlers in TS). Pros: bounded surface, fits guardrail forbidding arbitrary code; aligns with agentic guardrails. Cons: less flexible than free-form node graph.
   - Option C: Hybrid (typed DSL in MVP, expose a Node-RED-style visual editor only for an explicit advanced pack post-MVP). Apache reuse possible with NOTICE, but only after a Graphify pass confirms a clean module boundary.

3. Scheduled reports
   - Option A: Cron-style, human-defined schedules only. Simple, predictable, works for operational reports.
   - Option B: Event-driven only. Powerful but harder for non-technical users to reason about.
   - Option C (recommended MVP): Both, but with cron-style as default UX. Event-driven schedules are surfaced as a "trigger" inside the automation editor, reusing typed triggers.

4. Export formats
   - MVP priority: CSV (operational pivot), XLSX (finance), PDF (steering and external delivery).
   - Deferred: JSON (developer-facing), Parquet (analytics).
   - Rationale: CSV/XLSX/PDF cover all internal scheduled-delivery and audit-trail flows; JSON arrives once external integrations are first-class.

5. Drill-down strategy
   - Option A: Live SQL on primary DB. Risk: large tables degrade UX and may hit timeout.
   - Option B: Materialized views refreshed on schedule or on event. Faster, costs storage, requires invalidation logic.
   - Option C: OLAP cube (post-MVP).
   - Recommendation MVP: Live SQL with mandatory filter defaults and result-size caps; materialized views introduced selectively for the heaviest curated reports.

6. Reporting permissions
   - Option A: Reuse foundation RBAC end-to-end; every report runs as caller; no separate reporting role engine.
   - Option B: Dedicated reporting-layer ACLs.
   - Recommendation MVP: Option A. Dashboards and exports must never bypass underlying resource permissions; row-level enforcement is the responsibility of the resource module, not the reporting layer.

7. Dashboard authoring scope
   - Option A: User-authored dashboards in MVP.
   - Option B (recommended MVP): Admin-curated dashboards only; users can save personal views but cannot compose new dashboard layouts. Limits scope and prevents accidental Superset-like authoring UI.

### Decision Register

```yaml
decisions:
  - id: rep-001
    topic: bi_engine
    decision: native_svelte_dashboard_curated
    rationale: original UX, smaller surface, defers Superset integration to optional post-MVP pack
    reuse_posture: superset_apache_functional_inspiration_only
    notice_required_if_reused: true
    revisit_when: self_service_bi_demand_validated

  - id: rep-002
    topic: automation_engine
    decision: typed_dsl_yaml_plus_ts_handlers
    rationale: aligns with typed-only guardrail and agentic supervision; no arbitrary code
    reuse_posture: node_red_apache_pattern_inspiration_only
    notice_required_if_reused: true
    revisit_when: advanced_pack_planned

  - id: rep-003
    topic: scheduled_reports
    decision: cron_default_plus_event_driven_via_automation
    rationale: covers operational rhythm and reactive integrations without two UIs

  - id: rep-004
    topic: export_formats_mvp
    decision: csv_xlsx_pdf
    deferred: [json, parquet]

  - id: rep-005
    topic: drill_down_strategy
    decision: live_sql_with_filter_defaults_and_caps
    fallback: selective_materialized_views_for_heavy_reports
    deferred: olap_cube

  - id: rep-006
    topic: reporting_permissions
    decision: reuse_foundation_rbac
    rationale: queries run as caller; no parallel ACL surface

  - id: rep-007
    topic: dashboard_authoring_scope
    decision: admin_curated_dashboards_user_saved_views
    rationale: prevents superset_like_authoring_creep

  - id: rep-008
    topic: multi_source_data_mvp
    decision: primary_db_only
    deferred: [stripe, plaid, generic_warehouse_connector]

  - id: rep-009
    topic: alerting_channels_mvp
    decision: email_plus_generic_webhook
    deferred: [slack_first_class, ms_teams_first_class]
    rationale: slack/teams reachable today via webhook action

  - id: rep-010
    topic: automation_rate_limit
    decision: configurable_per_organization_with_safe_default
    safe_default_per_minute: 60
    rationale: avoids hardcoded throttles surprising tenants

  - id: rep-011
    topic: dashboard_workflow_versioning
    decision: published_snapshot_per_definition
    rationale: workflow_run already references definition_version; full edit history is post-MVP

  - id: rep-012
    topic: report_read_audit_trail
    decision: log_exports_schedules_workflow_activations_webhook_changes
    deferred: read_event_for_every_dashboard_view
    rationale: bounded audit volume; revisit if compliance demands view-level trail

  - id: rep-013
    topic: workflow_loop_protection
    decision: hard_event_chain_depth_limit_plus_error_code
    error_code: automation.loop_detected

  - id: rep-014
    topic: pdf_rendering
    decision: server_side_template_engine_no_headless_browser_in_mvp
    rationale: avoid superset_screenshot_dependency_surface
```

Apache reuse from Superset and Node-RED requires NOTICE inclusion, dependency-license review, and zero copy of UI text, chart configuration schemas, flow JSON conventions, or node palette names. LGPL Odoo reporting material remains functional inspiration only.
