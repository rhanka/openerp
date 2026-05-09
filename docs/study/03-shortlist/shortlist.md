# Shortlist V1

## Progress

Fait: 27/27 candidate fiches are complete; this shortlist translates the corpus into depth decisions for clone and Graphify work without numeric ordering.
À faire: Clone selected repositories, run Graphify on scoped modules, reconcile proprietary benchmark signals, write the functional map, MVP recommendation, and anti-copy dossier; overall study is about 70% complete.
Attendu: Start Graphify wave A with mandatory anchors and permissive or high-gap domain anchors, because functional breadth is now documented and deeper structural analysis should be selective.

## Decision Rules

- License gate first: permissive projects can inform technical architecture after notice review; LGPL/EPL/mixed projects stay cautious; GPL/AGPL projects are functional references only.
- Mandatory seeds stay in scope: Odoo and Twenty remain mandatory even when license posture blocks technical reuse.
- Canada/Quebec compliance is not inferred from generic localization. French UI or Canadian language files do not prove payroll, tax, CNESST, Revenu Quebec, CRA, or RL-slip coverage.
- Manufacturing is a vertical pack, not the only market. Core service-company workflows stay first-class.
- This shortlist is qualitative. It is not a numerical comparison and does not create a mechanical priority formula.

## Graphify Wave A

These projects should be cloned first and analyzed with Graphify in scoped modules only.

| Domain | Projects | Why They Stay In Wave A | Reuse Boundary |
| --- | --- | --- | --- |
| Core ERP and cross-module flows | Odoo, ERPNext, Dolibarr, Aureus ERP | Odoo and ERPNext are the broadest ERP references; Dolibarr is strong for service-company ERP and Canada-adjacent accounting; Aureus is the main MIT ERP candidate despite maturity questions. | Odoo is cautious LGPL; ERPNext and Dolibarr are functional-only GPL; Aureus is usable MIT with attribution and anti-copy hygiene. |
| CRM and extensibility | Twenty | Mandatory CRM seed with modern TypeScript architecture, workflow, object metadata, SDK, and self-host/Kubernetes evidence. | Functional-only because AGPL and enterprise-file boundaries block source reuse for the MIT target. |
| Billing, usage, and subscription layer | Kill Bill, OpenMeter | Kill Bill covers mature subscription billing; OpenMeter covers event metering and self-host/Kubernetes relevance. Together they reduce the need to infer billing from ERP suites alone. | Both are usable Apache-2.0 candidates after notice and dependency review. |
| HR, time, and payroll specification input | Frappe HR, Kimai | Frappe HR covers HR/payroll breadth; Kimai covers time tracking for service billing. They give functional detail while Canada/Quebec payroll remains a statutory gap. | Functional-only for GPL/AGPL. Do not copy implementation, doctypes, workflows, UI text, or API structures. |
| Manufacturing planning and WMS | frePPLe, OpenBoxes | frePPLe is the strongest MRP/APS reference; OpenBoxes is strong for inventory, shipments, requisitions, and distributed stock. | frePPLe is cautious despite MIT text because of dual-license wording and SPDX NOASSERTION; OpenBoxes is cautious EPL. |
| Reporting and automation | Apache Superset, Node-RED | Superset informs BI/reporting architecture; Node-RED informs workflow automation and integration UX. | Both are usable Apache-2.0 candidates, but product fit may favor integration over rewrite. |

## Graphify Wave B

These stay available if wave A exposes gaps.

| Domain | Projects | Trigger For Deeper Study | Reuse Boundary |
| --- | --- | --- | --- |
| CRM alternatives | SuiteCRM, EspoCRM, Frappe CRM | Use if Twenty's modern CRM model misses classic CRM workflows such as cases, quotes, campaigns, or mature REST patterns. | Functional-only AGPL. |
| Accounting/invoicing alternatives | FacturaScripts, InvoicePlane, Crater | Use if Odoo/Dolibarr/Aureus do not yield enough small-business invoicing, quote, payment, tax, or customer portal detail. | FacturaScripts and InvoicePlane are cautious; Crater is functional-only AGPL. |
| HR alternative | OrangeHRM | Use if Frappe HR leaves HRIS, recruitment, performance, leave, or attendance gaps. | Functional-only GPL. |
| Project/service delivery | OpenProject | Use if Odoo/Dolibarr/Kimai do not cover enough project workflow, work-package, portfolio, and service delivery detail. | Functional-only GPL. |
| WMS/MFC architecture | OpenWMS | Use if OpenBoxes does not cover material-flow control or microservice WMS architecture sufficiently. | Cautious because root Apache-2.0 does not cover every referenced component equally. |
| Asset lifecycle | Ralph | Use if the product roadmap adds equipment, asset assignment, support contracts, or CMDB/EAM-adjacent scope before MVP. | Usable Apache-2.0 with notice review. |
| Shop-floor transport | OpenTCS | Use only if AGV/material-flow control becomes part of the manufacturing pack. | Cautious because source, docs, assets, and third-party files use mixed file-level licenses. |

## Deferred Or Low-Depth References

| Project | Reason |
| --- | --- |
| IDURAR | Useful as a simple MERN ERP/CRM comparison, but AGPL and narrower domain depth make it less urgent than Twenty, Odoo, Dolibarr, and Aureus. |
| Lago | Strong usage-billing reference, but AGPL and overlap with OpenMeter/Kill Bill make it wave B unless billing requirements need wallet or entitlement detail beyond the permissive projects. |
| metasfresh | Broad ERP/manufacturing reference, but GPL-2.0 and architecture mismatch make it less efficient than Odoo, ERPNext, Dolibarr, and frePPLe for the next Graphify pass. |
| OpenTCS | Valuable for AGV control, but too specialized for the broad service-company core and not necessary unless the MES pack includes vehicle routing. |

## Collaboration Extension

The collaboration extension adds a focused shortlist for docs/wiki, workspace,
work management, database workspace, and async communication. The product
filter remains ERP/CRM first: collaboration is useful when it attaches to
customers, opportunities, quotes, contracts, projects, tasks, time entries,
invoices, support cases, assets, work orders, files, decisions, notifications,
and audit events.

### Collaboration Candidates For Deeper Technical Study

| Area | Candidate | Why It Stays In Scope | Reuse Boundary |
| --- | --- | --- | --- |
| Knowledge base | BookStack | MIT candidate with simple self-hosted wiki architecture, mature permissions, search, export/import, API, and content hierarchy useful for customer/project knowledge. | Potentially usable after notice, dependency, and asset review; avoid copying UI text, docs, hierarchy wording, examples, or API examples. |
| Database workspace | Baserow | Best permissive-adjacent candidate for table/view/form/API patterns that can inform configurable operational views around ERP/CRM records. | Cautious because premium and enterprise boundaries must be isolated; only non-premium MIT-covered areas can inform technical study. |
| Async communication | Zulip | Apache-2.0 candidate with durable topics, APIs, webhooks, imports/exports, self-hosting, and Kubernetes packaging evidence. Useful for object-linked async discussion. | Potentially usable after notice, dependency, and asset review; do not copy stream/topic product model or endpoint/schema details. |
| Team communication packaging | Rocket.Chat | MIT community-core evidence and self-hosted communication breadth make it useful to inspect cautiously for deployment and integration patterns. | Cautious open-core boundary; block source reuse by default until `ee`, marketplace, premium, trademark, and bundled dependency boundaries are reviewed. |

### Collaboration Functional Reference Only

| Area | Candidates | Why They Stay As Functional References | Reuse Boundary |
| --- | --- | --- | --- |
| Notion-like workspace | AppFlowy, AFFiNE, Anytype, Outline | Strong workspace, page, database, local-first, or knowledge-base product signals, but licenses and source boundaries are not clean enough for direct MIT-target technical reuse in this phase. | Use only rewritten functional observations unless a later file-level review isolates permissive components. |
| Collaborative docs/wiki | Docmost, Logseq | Good collaborative editor, wiki, graph, and local-first behavior signals, but AGPL blocks technical reuse for the MIT target. | Functional reference only. Do not copy source, editor behavior, block names, templates, sync model, UI copy, or schemas. |
| Work management | Plane, Vikunja, Focalboard, Huly, NocoDB, Taiga, OpenProject | Useful task, board, workflow, database, and project-management references; license posture ranges from AGPL/source-available to MPL/EPL/mixed and GPL. | Functional or cautious inspiration only, with no source reuse unless later review names a compatible file set. |
| Team communication | Mattermost | Strong operational collaboration and deployment reference, but source license posture is mixed and high-risk for the MIT target. | Functional reference only by default; only separately licensed deployment artifacts may be considered after review. |

### Collaboration Proprietary Benchmark Only

| Area | References | Use | Reuse Boundary |
| --- | --- | --- | --- |
| Workspace and knowledge | Notion, Airtable | Public expectations for docs, databases, templates, views, and team knowledge. | Public benchmark only; do not reuse product expression, templates, screenshots, schemas, or API shapes. |
| Work management | ClickUp, Monday.com, Asana | Public expectations for tasks, views, status communication, dependencies, approvals, goals, dashboards, and workload surfaces. | Public benchmark only; do not reuse copy, workflows, templates, screenshots, schemas, or product packaging. |
| Team communication | Slack, Microsoft Teams | Public expectations for channels, threads, mentions, files, notifications, integrations, and enterprise controls. | Public benchmark only; do not reuse UI text, app model, proprietary flows, screenshots, assets, or API shapes. |

## Domain Conclusions

- Core product should start as service-company ERP plus CRM plus finance operations, not manufacturing-only.
- Manufacturing should become a vertical pack with planning, inventory/WMS, and later shop-floor execution. frePPLe and OpenBoxes are enough for the next deep pass; OpenTCS is later.
- Canada/Quebec accounting and payroll remain the largest open-source gap. Odoo and Dolibarr provide partial Canada signals, but payroll and Quebec statutory details require public statutory sources and proprietary benchmark review.
- MIT target remains feasible if the implementation is original and the open-source corpus is used for functional study, architecture comparison, and permissive-code inspiration only where licenses allow.

## Next Graphify Scope

Wave A should start with narrow module lists already recorded in the fiches:

- Odoo: `crm`, `account`, `l10n_ca`, `hr`, `hr_attendance`, `hr_holidays`, `hr_timesheet`, `project`, `sale_timesheet`, `mrp`, `stock`, `maintenance`, `repair`, `api_doc`, `rpc`.
- Twenty: server and frontend modules for company, person, opportunity, task, workflow, dashboard, messaging, calendar, object metadata, SDKs, and deployment packages.
- Aureus ERP: accounting, invoices, payments, inventory, products, purchases, sales, contacts, partners, employees, time-off, timesheets, projects, security, and API routes.
- Dolibarr: accounting, contacts, contracts, projects, tickets, interventions, HR/time, MRP/BOM/workstation, inventory/logistics, APIs, and `fr_CA` language paths.
- ERPNext: accounts, CRM, selling, buying, stock, projects, support, manufacturing, quality, maintenance, assets, subcontracting, regional, integrations, and EDI.
- Kill Bill and OpenMeter: catalog, metering, entitlement, invoice, payment, API, and deployment modules.
- Frappe HR and Kimai: employee, leave, attendance, payroll, expenses, time, project, invoice, reporting, and API paths.
- frePPLe and OpenBoxes: MRP/APS models, planning outputs, ERP connectors, inventory, requisition, shipment, stock movement, stock transfer, reports, and API guides.
- Superset and Node-RED: charts, dashboards, datasets, reports, security, SQL Lab, editor API, editor client, runtime, registry, nodes, and tests.
