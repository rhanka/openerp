# Graphify Run Index

## Progress

Fait: Graphify wave A is started; Odoo, Twenty, and Aureus ERP shallow clones are recorded; ten TypeScript-runtime AST graph runs are completed and summarized.
À faire: Run semantic docs+code extraction where useful, synthesize cross-project findings, then continue with billing/time/manufacturing/BI anchors; overall study is about 80% complete.
Attendu: Continue with permissive billing and metering anchors, because Aureus now gives the MIT ERP comparison point against Odoo.

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

## Expected Outputs

Each completed run should produce:

- runtime proof: `.graphify/.graphify_runtime.json` with `"runtime": "typescript"` in the ignored run workspace;
- `graph.json` or equivalent graph artifact in the ignored workspace;
- a committed summary under `docs/study/05-graphify/<run>/`;
- a provenance note with source commit, scope, skipped files, and license boundary.

## Anti-Copy Reminder

Graphify output is an analytical aid. It must not be used to copy source code, UI text, schemas, exact API shapes, fixtures, docs, assets, tests, or distinctive implementation structures into the future MIT project.
