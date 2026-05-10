# Global Functional Map

## Progress

Fait: Global functional map drafted from corpus fiches, shortlist, and twenty-nine Graphify runs across ERP, CRM, billing, HR/time, manufacturing/WMS, BI, and automation anchors.
À faire: Convert selected MVP domains into deeper implementation-ready module specs, then complete anti-copy and Canada/Quebec statutory dossiers; overall study is about 98% complete.
Attendu: Use this map as the product boundary for MVP decisions, with service companies first and manufacturing as an optional vertical pack.

## Product Boundary

The product is a bilingual French/English business platform for companies below 2B revenue. It is not manufacturing-only. The primary core is service-company ERP plus CRM plus finance operations, with recurring-service billing and project/time delivery as first-class workflows. Manufacturing, WMS, planning, MES, quality, and maintenance are vertical packs connected to the same core.

The future implementation target remains:

- frontend: Svelte and TypeScript;
- backend: TypeScript for product and API services;
- Rust where useful for high-integrity or compute-heavy services such as import validation, reporting export workers, ledger consistency checks, scheduling/planning engines, or data transformation pipelines;
- deployment: SaaS first, plus self-hosted Kubernetes with explicit update windows.

## Cross-Cutting Requirements

| Requirement | Product Rule |
| --- | --- |
| Bilingual French/English | FR/EN must be present in UI, documents, emails, validation messages, and admin workflows from the first implementation slice. |
| Multi-country architecture | Country and province/state behavior must be modeled as configuration or regional packs, not hard-coded into base entities. |
| Quebec/Canada priority | Accounting, payroll, HR, tax, documents, and recordkeeping must prioritize Quebec/Canada research, but native statutory claims require official-source specs. |
| SaaS multi-tenant | Tenant isolation, permissions, audit logging, billing settings, and data export must be designed before launch. |
| Self-hosted Kubernetes | The product must support self-hosted Kubernetes deployments, backup hooks, secrets, migrations, and observable background workers. |
| Update support windows | Self-hosted instances under 12 months behind get normal support; 12-24 months get guided catch-up; beyond 24 months is unsupported or exceptional support. |
| MIT target license | The future codebase targets MIT, with Apache-2.0 only as a fallback if legal review recommends it. |
| Written-spec recoding model | Implementation must start from rewritten specs, not copied source, UI text, schemas, docs, examples, or generated clients. |
| Services and recurring services core | The horizontal core is services, project delivery, billing, contracts, subscriptions, CRM, and back office operations. |
| Manufacturing/MES vertical pack | Manufacturing, WMS, planning, MES, quality, and maintenance attach later as a vertical pack. |
| BI/reporting and workflow automation | Native reporting and typed automation are MVP platform services; full BI and generic flow automation are integration boundaries. |

## Domains

| Domain | Core Capabilities | Main Evidence Anchors | MVP Posture |
| --- | --- | --- | --- |
| Foundation | Organizations, tenants, users, roles, permissions, audit log, files, comments, notifications, feature flags, locale/currency/timezone settings. | Twenty metadata/workflow, Odoo security/module structure, Superset permissions, Node-RED runtime governance. | Build in MVP. |
| CRM | Accounts/companies, contacts, leads, opportunities, activities, notes, emails/calendar references, pipeline stages, tasks, customer timeline. | Twenty CRM/object metadata; Odoo CRM/project links. | Build in MVP. |
| Sales and contracts | Quotes, service offers, contracts, subscription terms, renewal dates, product/service catalog, price lists, approval gates. | Odoo sales/project, Kill Bill catalog/subscription, OpenMeter catalog/ratecards. | Build narrow MVP. |
| Project/service delivery | Projects, tasks, milestones, assignments, timesheets, billable/non-billable time, service activity, customer visibility. | Odoo project/timesheet, Kimai time/project, Aureus services. | Build in MVP. |
| Expenses | Employee expense capture, project/customer allocation, approval, reimbursement export, attachment/audit trail. | Odoo HR/services; Frappe HR adjacency. | Build basic MVP or early post-MVP depending on accounting capacity. |
| Billing | Invoices, invoice lines, recurring invoices, usage-based charges, milestone billing, time billing, payments, dunning hooks, billing events. | Kill Bill, OpenMeter, Odoo finance, Kimai invoice. | Build narrow MVP; defer complex rating. |
| Accounting operations | Chart of accounts, journals, journal entries, accounts receivable/payable, payment registration, reconciliation worklists, tax abstraction, period close workflow. | Odoo accounting/localization, Aureus finance, Dolibarr/Odoo fiches. | Build conservative MVP; statutory filings need separate research. |
| HR master data | Employee records, teams, positions, employment status, documents, basic onboarding/offboarding checklist, permissions. | Frappe HR, Odoo HR, Aureus HR. | Build basic MVP. |
| Time and leave | Timesheets, attendance/check-in, shifts, leave requests, approvals, balances, calendars, project linkage. | Frappe HR attendance/leave, Kimai, Odoo HR/time. | Build time tracking in MVP; leave can be early post-MVP. |
| Payroll | Payroll prep, pay components, benefits/deductions model, payroll run, payslip, accounting postings, statutory remittances. | Frappe HR payroll, proprietary public references, statutory sources still pending. | Defer native payroll; build integration/export first. |
| Inventory | Product/service catalog, stock items, locations, warehouses, stock moves, receipts, transfers, adjustments, lots/serials. | Odoo stock, Aureus inventory, OpenBoxes WMS. | Build product catalog in MVP; defer full stock unless first pilots need it. |
| Manufacturing planning | Items, BOMs, routings, resources, calendars, demand, forecast, planning runs, constraints, exceptions. | frePPLe, Odoo MRP. | Vertical pack, not MVP core. |
| Manufacturing execution | Production orders, work orders, shop-floor status, consumption, output, scrap, rework, quality checks, maintenance events. | Odoo MRP/maintenance/repair; MES gap noted in corpus. | Later vertical pack. |
| WMS/logistics | Receiving, put-away, bin/location management, picking, packing, shipment, cycle count, barcode workflows. | OpenBoxes, Odoo stock. | Later vertical pack unless inventory pilot requires it. |
| Reporting | Saved views, operational reports, dashboards, KPI widgets, exports, scheduled delivery, row-level and role-aware access. | Superset backend/frontend, Odoo dashboards/reporting, Kimai reporting. | Build native operational reporting in MVP; advanced BI integration later. |
| Automation | Typed triggers, typed actions, approvals, notifications, scheduled jobs, webhooks, import/export jobs, audit trails. | Twenty workflow, Node-RED runtime/editor, Odoo automation adjacency. | Build narrow domain-safe automation in MVP. |
| Integrations | Webhooks, REST/JSON APIs, import/export, email/calendar connectors, payment provider connectors, accounting/payroll integrations, BI/automation adapters. | Twenty SDK/deployment, Node-RED, OpenMeter API/runtime, Kill Bill APIs. | Build core API and webhook model in MVP. |
| Collaboration | Comments, mentions, files, pages, lightweight tasks, decisions, approvals, async object threads, notifications, permission-aware search, and customer-visible collaboration. | BookStack, Baserow, Zulip Graphify summaries; Huly, Plane, OpenProject, Mattermost, Rocket.Chat, Notion, ClickUp, Airtable, Monday.com, Asana, Slack, and Teams as bounded references. | Add as a transverse ERP/CRM layer; start object-bound, not as a generic workspace or chat clone. |

## Collaboration Extension

The detailed collaboration map is maintained in
`docs/study/06-functional-map/collaboration-functional-map.md`.

Collaboration supports the existing CRM, project, billing, reporting,
automation, HR, and manufacturing domains by attaching pages, comments, files,
tasks, decisions, approvals, async threads, and notifications to business
objects. The early product posture is object-bound collaboration: customers,
opportunities, quotes, contracts, projects, tasks, time entries, invoices,
support cases, assets, work orders, and audit events remain the source of
truth.

The study does not recommend a standalone Notion, ClickUp, Airtable, Slack, or
Teams clone. Generic workspace databases, generic chat, broad whiteboards, and
full portfolio management remain later or integration-first unless pilot
evidence changes the product boundary.

## Cross-Domain Object Spine

These objects should be stable across modules because Graphify repeatedly surfaced them as integration points:

| Object | Why It Matters |
| --- | --- |
| Organization/tenant | SaaS isolation, self-hosted admin boundary, billing entity, locale and tax configuration. |
| User and employee | Permissions, HR data, time entry, approvals, audit trail, assignment. |
| Account/company and contact/person | CRM, sales, billing, projects, support, customer portal. |
| Product/service | Quote lines, subscriptions, invoices, usage charges, inventory/manufacturing expansion. |
| Contract/subscription | Recurring-service operations, renewal, entitlement, billing schedule, service scope. |
| Project/task/activity | Service delivery, time capture, billing, customer reporting, automation triggers. |
| Invoice/payment/journal entry | Billing to accounting bridge, payment registration, reconciliation, audit. |
| Time entry/expense | Service margin, billing, payroll prep, project profitability. |
| Warehouse/location/stock move | Inventory and manufacturing pack bridge into accounting and purchasing. |
| Report/dashboard/saved view | Operational visibility and role-aware access over business objects. |
| Workflow rule/run | Automation traceability, approvals, notifications, integration side effects. |

## Core Workflows

### Lead To Cash

1. Capture company/contact and lead.
2. Qualify opportunity and assign owner/team.
3. Create quote or service offer.
4. Convert accepted quote to contract, subscription, or project.
5. Generate billing schedule from contract terms, milestones, time entries, or usage events.
6. Issue invoice and collect/register payment.
7. Post accounting entries and reconcile.
8. Report revenue, aging, project margin, and renewal risk.

### Service Delivery To Invoice

1. Create project, tasks, activities, and billable rules.
2. Assign employees or teams.
3. Capture time, expense, and delivery status.
4. Approve billable items.
5. Generate invoice proposal.
6. Review, issue, and post invoice.
7. Expose operational report to internal roles and optionally to customer portal users.

### Hire To Time Capture

1. Create employee profile and employment status.
2. Assign role, team, manager, cost center, and permissions.
3. Capture attendance, timesheets, and leave requests.
4. Approve time/leave and feed project billing or payroll-prep exports.
5. Keep HR/payroll-sensitive data behind narrower permissions and audit logs.

### Product To Delivery

1. Define product/service catalog item.
2. Attach pricing, tax category field, contract eligibility, and revenue/accounting mapping.
3. Use item on quotes, contracts, invoices, subscriptions, usage charges, inventory, or manufacturing packs.
4. Keep accounting mapping explicit and reviewable before posting.

### Plan To Fulfill For Manufacturing Pack

1. Capture demand from sales, forecast, project, or manual planning input.
2. Plan materials/resources using items, locations, calendars, resources, routings, and BOMs.
3. Convert plan to purchase, stock transfer, production, or work orders.
4. Execute with stock movement, consumption, production output, quality checks, and exceptions.
5. Feed cost, inventory valuation, and operational reporting back to the core.

## Localization Requirements

The product must be bilingual from the beginning, with French and English treated as product requirements rather than translation afterthoughts.

| Area | Requirement |
| --- | --- |
| Language | FR/EN UI strings, email templates, document templates, import/export labels, errors, validation messages, and help text. |
| Locale | Currency, date/time, number formatting, addresses, provinces/states, phone formats, tax identifiers, and timezone behavior. |
| Accounting | Regional chart templates, tax codes, invoice requirements, period close, audit exports, and statutory reports need country/province packs. |
| Payroll/HR | Quebec/Canada payroll, leaves, remittances, records, slips, and employment standards require official-source research before native implementation. |
| Documents | Quotes, invoices, receipts, statements, purchase orders, timesheet approvals, payroll-prep exports, and customer-facing emails must support FR/EN templates. |
| Privacy/security | HR/payroll records, customer contracts, and financial data require role-aware access, audit logs, retention policies, and export controls. |

## Integration Points

| Integration | Functional Boundary |
| --- | --- |
| Accounting/payroll systems | Export/import and API bridge for payroll and statutory accounting gaps until native regional packs are complete. |
| Payment providers | Payment initiation, webhook status, reconciliation hints, refund/chargeback events, and audit trail. |
| Email/calendar | Activity capture, reminders, customer communication history, and optional connected-account sync. |
| BI | Superset-style external BI connector or embedded dashboards for advanced analytics; native ERP reports remain separate. |
| Automation | Node-RED-style optional external automation boundary for advanced flows; native workflow stays typed and audited. |
| Import/export | CSV/XLSX import, validation reports, preview, idempotency, rollback or correction workflow. |
| Webhooks/API | Domain events, external system sync, integration secrets, retries, dead-letter visibility, and rate limits. |

## Deferred Areas

| Area | Reason For Deferral |
| --- | --- |
| Native Quebec/Canada payroll | Open source anchors provide structure but not enough statutory proof. Start with payroll prep/integration until official-source specs are written. |
| Full MES | Corpus shows MRP/WMS/planning evidence, but not enough complete shop-floor execution, equipment integration, quality, and maintenance depth for MVP. |
| Advanced BI authoring | Superset is a full BI platform; rebuilding it in the ERP core would distract from operational workflows. |
| General-purpose visual automation | Node-RED is broad and security-sensitive. Start with typed ERP automation, then integrate or isolate advanced flows. |
| Deep WMS/barcoding | Valuable for manufacturers/distributors, but not needed for service-company MVP unless pilot requirements demand it. |
| Complex metered billing/rating | OpenMeter supports strong future design, but MVP should begin with recurring, milestone, and time-based billing. |

## Non-Copy Implementation Rule

This map is a rewritten functional synthesis. It must not be used as permission to copy code, UI text, docs, schemas, API shapes, generated clients, examples, tests, demo data, reports, templates, or distinctive internal names from the studied projects.
