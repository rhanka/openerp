# MVP Recommendation

## Progress

Fait: MVP recommendation drafted from the global functional map, shortlist, and Graphify anchor syntheses.
À faire: Write module-level implementation specs for the selected MVP slices and finish anti-copy plus Canada/Quebec statutory dossiers; overall study is about 98% complete.
Attendu: Start implementation planning from this MVP boundary, not from a full ERP clone, because the first product must be narrow enough to build and broad enough to prove service-company value.

## Recommendation

Build the MVP as a bilingual service-company operating platform:

- CRM and customer timeline;
- sales offers, contracts, and subscriptions;
- project/service delivery with time tracking;
- billing and conservative accounting operations;
- basic HR employee records tied to time capture;
- native operational reporting;
- narrow domain-safe automation;
- self-hosted Kubernetes distribution with integrated update policy.

Manufacturing should remain a named vertical pack, not part of the first core build. The MVP should still keep product catalog, accounting, inventory-ready objects, and extensibility boundaries clean enough that manufacturing can attach later without redesigning the core.

## Included Modules

| Module | Build In MVP | Deferred From MVP |
| --- | --- | --- |
| Foundation | Tenant/org, user, role, permission, audit log, settings, FR/EN locale, files, comments, notifications. | Full marketplace/plugin runtime. |
| CRM | Companies, contacts, leads/opportunities, activities, tasks, timeline, pipeline stages, simple imports. | Marketing automation, campaigns, complex forecasting. |
| Sales/contracts | Quotes/offers, service catalog, price lists, contract/subscription terms, renewal reminders. | CPQ complexity, usage entitlement engine depth. |
| Project/time | Projects, tasks, assignments, time entries, billable flags, approvals, project margin basics. | Portfolio management and advanced resource planning. |
| Billing | Invoice draft/proposal, recurring billing schedules, time-based billing, milestone billing, payments status, dunning hooks. | Full Kill Bill-class subscription lifecycle, complex usage rating, wallet/prepaid balance. |
| Accounting operations | Chart of accounts, journals, journal entries, AR/AP basics, payment registration, reconciliation worklists, period close checklist, tax abstraction. | Native statutory filings, complex consolidation, payroll remittance automation. |
| HR basics | Employee profile, team, manager, employment status, document references, permission separation. | Full HRIS, recruitment, performance, benefits administration. |
| Payroll path | Payroll-prep export and integration hooks. | Native Quebec/Canada payroll engine until official-source statutory specs are complete. |
| Reporting | Saved views, operational report definitions, dashboard widgets, exports, scheduled delivery, role-aware filters. | Full BI authoring, SQL Lab, arbitrary dataset exploration. |
| Automation | Typed triggers/actions for approvals, notifications, scheduled jobs, webhooks, and import/export processing. | General-purpose Node-RED-style visual programming. |
| Deployment | SaaS baseline, self-hosted Kubernetes manifests/Helm path, backup/update hooks, version-support windows. | Marketplace hosting, complex multi-region active/active operations. |

## Deferred Modules

| Module | Deferred Scope | Reason |
| --- | --- | --- |
| Native payroll | Quebec/Canada payroll engine, statutory remittances, slips, and employer records. | Official-source statutory specs are not complete yet. |
| Manufacturing/MES | Planning, BOM/routing, production orders, work orders, quality, maintenance, shop-floor execution. | Important vertical pack, but not the horizontal service-company core. |
| Full WMS | Barcode-heavy receiving, put-away, picking, packing, cycle count, and bin/location optimization. | Strong later fit for manufacturing/distribution pilots. |
| Advanced BI | SQL Lab, arbitrary semantic datasets, BI authoring, rich chart exploration. | Superset-style capability is better handled as an integration boundary. |
| General visual automation | Full node palette, flow canvas, arbitrary plugin installation, generic node runtime. | Node-RED-style breadth raises security, tenancy, and support complexity. |
| Complex usage rating | High-volume event metering, entitlements, prepaid wallet, complex subscription amendments. | OpenMeter/Kill Bill evidence supports later design; MVP billing can stay narrower. |

## Collaboration Addendum

Collaboration is documented in
`docs/study/07-mvp/collaboration-mvp-addendum.md`. The MVP-safe posture is
object-bound collaboration: comments, mentions, files, activity timeline,
structured decisions, lightweight tasks, customer/project pages, notifications,
and permission-aware search. Generic chat, generic workspace databases,
advanced whiteboards, and full portfolio management remain later or
integration-first.

## Integration-First Modules

| Module | Integration-First Direction |
| --- | --- |
| Payroll | Export payroll-prep data and connect to regional payroll systems until native Quebec/Canada payroll is specified. |
| Advanced BI | Provide governed data exports/connectors and later embedded dashboards instead of cloning Superset. |
| Advanced automation | Provide webhooks/events and later optional Node-RED-style isolated runtime integration. |
| Payments | Start with payment status and provider webhooks; add deeper provider-specific reconciliation later. |
| Accounting statutory filing | Export audit-ready accounting data and add regional filing packs only after official-source requirements are written. |

## First User Roles

| Role | Needs |
| --- | --- |
| Owner/admin | Configure organization, users, permissions, billing/accounting settings, update policy, and integrations. |
| Sales lead | Manage pipeline, customer contacts, offers, contracts, renewals, and activity follow-up. |
| Project manager | Plan service delivery, assign work, approve time/expenses, monitor project profitability. |
| Consultant/employee | Log time, update tasks, submit expenses, view assignments, request leave if enabled. |
| Finance user | Review invoices, payments, journal entries, reconciliation, exports, and close checklist. |
| HR user | Maintain employee records and access sensitive employee data within narrow permissions. |
| External customer user | Optional portal access for project status, invoices, documents, and approvals. |

## Implementation-Ready MVP Workflows

### CRM To Contract

- Create or import company/contact.
- Create lead or opportunity with owner, stage, expected service, expected value, and next activity.
- Log calls/emails/notes manually in MVP; connected-account sync can come later.
- Create quote/offer from opportunity.
- Accept quote and create contract/subscription and project as needed.
- Emit audit events for stage changes, quote approval, contract creation, and ownership changes.

Acceptance checks:

- A user with CRM write permission can create and move an opportunity through configured stages.
- A user without finance permission cannot view accounting-only fields.
- Accepted quote creates linked contract/project records without duplicating customer identity.
- Every stage change is visible in the customer timeline.

### Project Time To Invoice

- Create project from accepted service contract or manually.
- Create tasks and assign employees.
- Log time against project/task/activity with billable flag, rate source, and approval status.
- Finance or project manager reviews approved billable time.
- Generate invoice draft from approved time and milestones.
- Issue invoice and create accounting posting draft or final journal entry according to finance settings.

Acceptance checks:

- Time entry cannot be invoiced until approved.
- Non-billable time appears in margin reports but not invoice lines.
- Invoice draft preserves traceability back to time entries and project.
- Accounting posting cannot bypass configured approval rules.

### Recurring Billing

- Define service catalog item and recurring billing term.
- Attach item to contract/subscription.
- Generate billing schedule.
- Create invoice draft for due period.
- Register payment status manually or through provider webhook.
- Emit renewal and failed-payment notifications.

Acceptance checks:

- Billing schedule is previewable before activation.
- A paused or ended contract does not generate new invoice drafts.
- Invoice lines retain source contract and schedule references.
- Payment status changes are auditable.

### Finance Close Basics

- Review posted invoices, payments, manual journal entries, and reconciliation worklist.
- Lock or close period after required checks.
- Export ledger, AR aging, sales tax workpapers, and audit trail.
- Keep statutory filings outside MVP unless a regional pack is specified.

Acceptance checks:

- Closed periods block ordinary edits and require controlled corrections.
- Journal entries are balanced before posting.
- Finance exports include organization, period, currency, account, source document, and audit metadata.
- Tax logic is configurable but does not claim statutory completeness without a regional pack.

### Typed Automation

- Admin creates workflow from approved trigger catalog.
- Trigger examples: opportunity stage changed, invoice overdue, time entry approved, contract renewal approaching, import failed.
- Action examples: send notification, create task, call webhook, schedule export, request approval.
- Each run records actor/system source, payload summary, status, retry count, and resulting changes.

Acceptance checks:

- Automation cannot perform actions outside the creator's allowed permission scope unless explicitly configured by an admin.
- Failed runs are visible and retryable or dismissible.
- Secrets are never exposed in workflow logs.
- Workflow activation/deactivation is audited.

## Architecture Boundary

| Layer | MVP Direction |
| --- | --- |
| Frontend | Svelte/TypeScript app with dense operational screens, FR/EN from first sprint, role-aware navigation, saved views, and accessible forms. |
| API | TypeScript backend with typed domain modules, REST/JSON or GraphQL decision left to implementation planning, event emission, and OpenAPI-style contract documentation. |
| Workers | Separate workers for billing generation, imports, exports, reporting, notifications, and automation runs. Rust can be used for high-integrity worker components where justified. |
| Data | PostgreSQL first; tenant isolation strategy must be explicit before SaaS launch. Search/analytics stores are optional later. |
| Events | Domain events for audit, automation, integrations, reporting refresh, and external webhooks. |
| Deployment | Docker images and Kubernetes manifests/Helm path; upgrades tested across supported version windows. |

## Self-Hosted Update Policy

The product should encode the user-approved policy:

- normal support when self-hosted instance is less than 12 months behind current supported version;
- guided catch-up when 12-24 months behind;
- unsupported or exceptional support when more than 24 months behind.

Functional requirements:

- admin sees current version, available version, support window, and required migration path;
- upgrades run preflight checks for database, storage, background jobs, and incompatible plugins/integrations;
- backup/export must be possible before migration;
- migrations are resumable or provide a documented recovery path;
- release notes are bilingual for admin-impacting changes.

## Explicit Non-MVP Decisions

- Do not build native Quebec/Canada payroll until official statutory specs are complete.
- Do not build a full BI clone; provide native operational reporting and keep Superset-style integration as a later adapter.
- Do not build a full Node-RED clone; provide typed ERP automation and keep advanced flow automation as an optional isolated integration.
- Do not make manufacturing the MVP center; keep manufacturing pack design ready but separate.
- Do not copy Odoo/Twenty/Kill Bill/OpenMeter/Frappe HR/Kimai/frePPLe/OpenBoxes/Superset/Node-RED source, UI, schemas, APIs, examples, or docs.

## First Implementation Spec Candidates

1. Foundation/security/i18n module spec.
2. CRM and customer timeline module spec.
3. Project/time-to-invoice module spec.
4. Billing/accounting operations module spec.
5. Typed automation and reporting module spec.
6. Anti-copy dossier and Canada/Quebec statutory research plan.

## Agentic Addendum

The agentic MVP posture is documented in
[`docs/study/07-mvp/agentic-mvp-addendum.md`](agentic-mvp-addendum.md). It keeps agents inside the existing service-company MVP flow: lead qualification, customer follow-up, timesheet classification, project status support, invoice preparation, dunning preparation, AR/AP assistance, reporting synthesis, and object-bound decision summaries.

The runtime recommendation is `@sentropic` plus MCP client/server support and policy hooks before product use. Marketplace exposure stays internal-governed private tier only; business autonomy starts with a self-service catalog; authoring, partner/community publication, large-scope autonomy, and vertical-pack agents remain post-MVP.
