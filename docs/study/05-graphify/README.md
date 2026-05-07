# Graphify Run Index

## Progress

Fait: Graphify wave A is advanced; Odoo, Twenty, Aureus ERP, Kill Bill, OpenMeter, Frappe HR, and Kimai shallow clones are recorded; twenty-one TypeScript-runtime AST graph runs are completed and summarized.
À faire: Continue manufacturing/WMS, BI/reporting, and automation anchors, then consolidate the functional map; overall study is about 88% complete.
Attendu: Continue with frePPLe and OpenBoxes next, because HR/time/payroll now has functional evidence and manufacturing/WMS remains the next domain gap.

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

## Expected Outputs

Each completed run should produce:

- runtime proof: `.graphify/.graphify_runtime.json` with `"runtime": "typescript"` in the ignored run workspace;
- `graph.json` or equivalent graph artifact in the ignored workspace;
- a committed summary under `docs/study/05-graphify/<run>/`;
- a provenance note with source commit, scope, skipped files, and license boundary.

## Anti-Copy Reminder

Graphify output is an analytical aid. It must not be used to copy source code, UI text, schemas, exact API shapes, fixtures, docs, assets, tests, or distinctive implementation structures into the future MIT project.
