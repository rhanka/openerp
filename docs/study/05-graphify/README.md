# Graphify Run Index

## Progress

Fait: Graphify wave A is completed for core anchors; Odoo, Twenty, Aureus ERP, Kill Bill, OpenMeter, Frappe HR, Kimai, frePPLe, OpenBoxes, Superset, and Node-RED shallow clones are recorded; twenty-nine TypeScript-runtime graph runs are completed and summarized.
À faire: Consolidate the global functional map, MVP recommendation, anti-copy dossier, and Canada/Quebec statutory research; overall study is about 96% complete.
Attendu: Move from source graphing to functional specification, because BI/reporting and automation now close the last wave A structural gaps.

## Local Source Policy

- Cloned repositories live under ignored `research/sources/` and are not committed.
- Graphify workspaces live under ignored `research/graphify/` and are not committed.
- Only provenance, summaries, and selected generated reports are committed under `docs/study/05-graphify/`.
- GPL/AGPL/LGPL/EPL/mixed projects remain subject to the license gate from `00-methodology/license-risk-matrix.md`.

## Wave A Anchor Refs

| Project | Local Source | Branch | Checked Commit | Clone Type | Initial Graphify Status |
| --- | --- | --- | --- | --- | --- |
| Odoo | `research/sources/odoo` | `19.0` | `af50cb24` | shallow Git clone | first AST run completed for finance/localization |
| Twenty | `research/sources/twenty` | `main` | `83c40bb8` | shallow Git clone | first AST runs completed for CRM core and object metadata |
| Aureus ERP | `research/sources/aureuserp` | `master` | `dd251ac` | shallow Git clone | AST runs completed for finance, commerce/inventory, and HR/services models |
| Kill Bill | `research/sources/killbill` | `master` | `81a24d0c` | shallow Git clone | AST runs completed for catalog/subscription, invoice/payment, and account/API surfaces |
| OpenMeter | `research/sources/openmeter` | `main` | `8d3a5a05` | shallow Git clone | AST runs completed for runtime/deployment, billing/rating, and entitlement/metering/catalog surfaces |
| Frappe HR | `research/sources/frappe-hr` | `develop` | `552c35fd` | shallow Git clone | AST runs completed for attendance/leave, lifecycle/recruitment, and payroll core |
| Kimai | `research/sources/kimai` | `main` | `ebb54e9c` | shallow Git clone | AST runs completed for time/project core and invoice/API/reporting |
| frePPLe | `research/sources/frepple` | `master` | `6d6ed7b7` | shallow Git clone | AST runs completed for planning models and solver/forecast engine |
| OpenBoxes | `research/sources/openboxes` | `develop` | `8a637bd0` | shallow Git clone | projection AST runs completed for inventory domains and services/API |
| Superset | `research/sources/superset` | `master` | `b5186d1c` | shallow Git clone | AST runs completed for BI backend and dashboard/explore frontend |
| Node-RED | `research/sources/node-red` | `master` | `55e6cc9f` | shallow Git clone | AST runs completed for runtime/API and editor/nodes surfaces |

## Scoped Run Plan

| Run | Purpose | Included Source Families | Reason For Split |
| --- | --- | --- | --- |
| `odoo-finance-localization` | Accounting and Canada localization shape. | Odoo root metadata plus `account`, `l10n_ca`, `api_doc`, and `rpc` code families. | Keeps finance/localization distinct from operations and below noisy whole-repo size. |
| `odoo-operations-services` | CRM, HR/time, services, inventory, MRP, repair, and maintenance relationships. | Odoo root metadata plus `crm`, `hr`, `hr_attendance`, `hr_holidays`, `hr_timesheet`, `project`, `sale_timesheet`, `mrp`, `stock`, `maintenance`, and `repair` code families. | Captures broad ERP functional flow without copying the full 47k-file clone. |
| `twenty-crm-core` | CRM entities and customer-facing activity flow. | Twenty root metadata plus server CRM/task/calendar modules and selected frontend companies/people/dashboard modules. | Keeps core CRM separate from platform metadata and workflow engine. |
| `twenty-object-metadata` | Custom object and schema extensibility model. | Twenty root metadata plus frontend object metadata and selected SDK metadata surfaces. | Isolates platform extensibility, a key product-positioning question. |
| `twenty-workflow` | Workflow builder, execution, trigger, and automation architecture. | Twenty root metadata plus selected server and frontend workflow families. | Workflow modules are large; this run will stay conceptual and anti-copy constrained. |
| `aureus-finance-models` | MIT ERP accounting model shape. | Aureus ERP accounting, accounts, invoices, and payments model/policy/enums/settings families. | Checks whether permissive ERP concepts are rich enough to compare with Odoo finance. |
| `aureus-commerce-inventory-models` | MIT ERP commerce and inventory shape. | Aureus ERP sales, contacts, partners, products, purchases, and inventories model/policy/enums/settings families. | Checks product/order/warehouse/move boundaries without pulling UI code. |
| `aureus-hr-services-models` | MIT ERP HR and service model shape. | Aureus ERP employees, time-off, timesheets, projects, support, and recruitments model/policy/enums/settings families. | Checks service-company scope and HR adjacency without over-indexing on UI resources. |
| `killbill-catalog-subscription` | Apache-2.0 subscription lifecycle shape. | Kill Bill catalog, subscription, entitlement, and usage Java sources with glue/DAO/template paths excluded. | Checks product catalog, plan, entitlement, subscription transition, and usage structures. |
| `killbill-invoice-payment` | Apache-2.0 invoice and payment lifecycle shape. | Kill Bill invoice and payment Java sources with glue/DAO/template/provider paths excluded. | Checks invoice dispatch, invoice item, payment API, payment state, and usage invoicing structures. |
| `killbill-account-api` | Apache-2.0 account, tenant, and public API shape. | Kill Bill selected API contracts plus account, tenant, and JAX-RS Java sources. | Checks account data, tenant config, invoice/payment/subscription resources, and integration surface. |
| `openmeter-api-runtime` | Apache-2.0 runtime and deployment entry shape. | OpenMeter server, billing-worker, balance-worker, and Helm chart sources. | Checks runtime entry points and Kubernetes deployment while recording AST limitations for TypeSpec. |
| `openmeter-billing-rating` | Apache-2.0 billing and rating engine shape. | OpenMeter billing model, service, rating, and charge service Go sources. | Checks invoice state, gathering invoice, usage rating, line engine, tax code, and charge lifecycle. |
| `openmeter-entitlement-metering-catalog` | Apache-2.0 metering, entitlement, and product catalog shape. | OpenMeter entitlement, meter, product catalog, subscription, and customer Go sources with tests/adapters excluded. | Checks feature, meter, plan, ratecard, subscription, entitlement, and customer usage structures. |
| `frappe-hr-attendance-leave` | GPL HR attendance and leave workflow shape. | Frappe HR attendance, employee check-in, shift, leave, compensatory leave, earned leave, and holiday assignment doctypes. | Functional-only reference for original HR specs; no source reuse. |
| `frappe-hr-lifecycle-recruitment` | GPL employee lifecycle, recruitment, and performance workflow shape. | Frappe HR job, interview, appointment, onboarding, separation, exit, appraisal, goal, promotion, and transfer doctypes. | Functional-only reference for original HR specs; no doctype/workflow copying. |
| `frappe-hr-payroll-core` | GPL payroll model shape. | Frappe HR salary, payroll, income tax, employee tax, employee benefit, additional salary, incentive, other income, and cost-center doctypes. | Functional-only payroll reference; Canada/Quebec statutory work remains separate. |
| `kimai-time-project-core` | AGPL service-company time/project model shape. | Kimai entity, timesheet, working time, project, customer, and activity PHP sources. | Functional-only reference for time tracking and service delivery; no source/API/template reuse. |
| `kimai-invoice-api-reporting` | AGPL invoice/API/reporting model shape. | Kimai API, invoice, reporting, and export PHP sources. | Functional-only reference for project billing and service reporting; no endpoint/schema/template copying. |
| `frepple-planning-models` | Cautious MIT-dual planning model shape. | frePPLe input models, output, execute, forecast, and ERP connection Python/JS/Vue sources. | Checks item, location, calendar, resource, operation, demand, forecast, planning task, and ERP connector concepts. |
| `frepple-solver-engine` | Cautious MIT-dual solver and forecast engine shape. | frePPLe C++ model, solver, and forecast sources. | Checks operation plan and solver/forecast engine boundaries without copying algorithms. |
| `openboxes-domain-projection` | EPL WMS domain inventory shape. | Minimal Java projections generated from selected OpenBoxes Groovy domain class/import lines. | Groovy is not AST-supported here; this is a structural inventory map, not source reuse. |
| `openboxes-services-api-projection` | EPL WMS service/API inventory shape. | Minimal Java projections generated from selected OpenBoxes Groovy service/controller class/import lines. | Groovy is not AST-supported here; this is a structural inventory map, not source reuse. |
| `superset-bi-backend` | Apache-2.0 BI, semantic dataset, dashboard, security, and report scheduling shape. | Superset `charts`, `dashboards`, `datasets`, `databases`, `reports`, `security`, and SQLAlchemy connector Python families. | Checks whether advanced BI should be native, integrated, or embedded, while isolating credential and row-level security concerns. |
| `superset-frontend-dashboard-explore` | Apache-2.0 dashboard and explore UX architecture shape. | Superset frontend `explore`, `dashboard`, and selected list/role page TS/TSX/JS/JSX families. | Captures dashboard state, native filters, chart customization, and explore form flow without copying UI structures. |
| `node-red-runtime-api-modules` | Apache-2.0 automation runtime and editor API shape. | Selected Node-RED runtime, registry, editor API, util, project, flow, and context JS files copied into a path-safe analysis scope. | Node-RED source paths under `packages/node_modules` were renamed to `packages/modules` only inside ignored Graphify scopes because Graphify excludes `node_modules` path segments. |
| `node-red-editor-nodes-modules` | Apache-2.0 flow editor and node library UX shape. | Selected Node-RED editor-client JS and core nodes JS files copied into a path-safe analysis scope. | Captures canvas, palette, import/export, edit dialogs, subflows, and representative node behavior while keeping UX/API anti-copy boundaries explicit. |

## Completed Outputs

| Run | Output |
| --- | --- |
| `odoo-finance-localization` | `odoo-finance-localization/summary.md` |
| `odoo-services-crm-hr` | `odoo-services-crm-hr/summary.md` |
| `odoo-inventory-mrp` | `odoo-inventory-mrp/summary.md` |
| `twenty-crm-core` | `twenty-crm-core/summary.md` |
| `twenty-object-metadata` | `twenty-object-metadata/summary.md` |
| `twenty-workflow-server` | `twenty-workflow-server/summary.md` |
| `twenty-workflow-front` | `twenty-workflow-front/summary.md` |
| `aureus-finance-models` | `aureus-finance-models/summary.md` |
| `aureus-commerce-inventory-models` | `aureus-commerce-inventory-models/summary.md` |
| `aureus-hr-services-models` | `aureus-hr-services-models/summary.md` |
| `killbill-catalog-subscription` | `killbill-catalog-subscription/summary.md` |
| `killbill-invoice-payment` | `killbill-invoice-payment/summary.md` |
| `killbill-account-api` | `killbill-account-api/summary.md` |
| `openmeter-api-runtime` | `openmeter-api-runtime/summary.md` |
| `openmeter-billing-rating` | `openmeter-billing-rating/summary.md` |
| `openmeter-entitlement-metering-catalog` | `openmeter-entitlement-metering-catalog/summary.md` |
| `frappe-hr-attendance-leave` | `frappe-hr-attendance-leave/summary.md` |
| `frappe-hr-lifecycle-recruitment` | `frappe-hr-lifecycle-recruitment/summary.md` |
| `frappe-hr-payroll-core` | `frappe-hr-payroll-core/summary.md` |
| `kimai-time-project-core` | `kimai-time-project-core/summary.md` |
| `kimai-invoice-api-reporting` | `kimai-invoice-api-reporting/summary.md` |
| `frepple-planning-models` | `frepple-planning-models/summary.md` |
| `frepple-solver-engine` | `frepple-solver-engine/summary.md` |
| `openboxes-domain-projection` | `openboxes-domain-projection/summary.md` |
| `openboxes-services-api-projection` | `openboxes-services-api-projection/summary.md` |
| `superset-bi-backend` | `superset-bi-backend/summary.md` |
| `superset-frontend-dashboard-explore` | `superset-frontend-dashboard-explore/summary.md` |
| `node-red-runtime-api-modules` | `node-red-runtime-api-modules/summary.md` |
| `node-red-editor-nodes-modules` | `node-red-editor-nodes-modules/summary.md` |

## Collaboration Source Inventory

The collaboration extension uses Graphify selectively. The aim is to capture
module relationships and functional boundaries for OpenERP-written specs, not
to copy source structures.

| Candidate | Target Local Source | Treatment | License Caution | Evidence Still Needed |
| --- | --- | --- | --- | --- |
| BookStack | `research/sources/bookstack` | Clone and Graphify focused wiki, permission, search, export/import, API, and localization paths. | MIT candidate; still requires attribution, dependency, asset, and non-code expression review. | HEAD commit, `LICENSE`, dependency license notes, relevant app path list. |
| Baserow | `research/sources/baserow` | Clone and Graphify only MIT-covered core table, view, field, form, API, and permission paths if premium/enterprise directories can be excluded. | Open-core boundary; avoid premium and enterprise paths. | HEAD commit, `LICENSE`, premium/enterprise directory map, package metadata. |
| Zulip | `research/sources/zulip` | Clone and Graphify focused server model/action/webhook/OpenAPI and selected web client paths for durable async communication. | Apache-2.0 candidate; do not copy stream/topic product model, endpoint details, docs, tests, or UI text. | HEAD commit, `LICENSE`, dependency notes, selected `zerver` and `web` path list. |
| Rocket.Chat | `research/sources/rocketchat` | Clone only if Graphify time permits; inspect community communication and integration paths after excluding enterprise/source-available areas. | Cautious open-core boundary; default no source reuse until compatible file set is named. | HEAD commit, license files, `ee` and premium directory exclusions. |
| Mattermost | `research/sources/mattermost` | No deep Graphify by default; keep as functional reference and deployment-license comparison. | Mixed AGPL/commercial/MIT/Apache posture; main platform source is high-risk for MIT target. | Optional license-bound deployment artifact review only. |
| AppFlowy, Docmost, Logseq, Plane, Vikunja, Outline, Anytype, NocoDB | `research/sources/<slug>` | No Graphify unless a later question requires functional architecture detail not covered by permissive candidates. | AGPL, BSL, source-available, or mixed source boundaries. | Functional observations from fiches are enough for this extension phase. |
| Notion, ClickUp, Airtable, Monday.com, Asana, Slack, Microsoft Teams | none | No clone and no Graphify. | Proprietary public benchmarks only. | Public product signals only; no reuse. |

## Expected Outputs

Each completed run should produce:

- runtime proof: `.graphify/.graphify_runtime.json` with `"runtime": "typescript"` in the ignored run workspace;
- `graph.json` or equivalent graph artifact in the ignored workspace;
- a committed summary under `docs/study/05-graphify/<run>/`;
- a provenance note with source commit, scope, skipped files, and license boundary.

## Anti-Copy Reminder

Graphify output is an analytical aid. It must not be used to copy source code, UI text, schemas, exact API shapes, fixtures, docs, assets, tests, or distinctive implementation structures into the future MIT project.
