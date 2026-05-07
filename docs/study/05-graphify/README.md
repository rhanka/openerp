# Graphify Run Index

## Progress

Fait: Graphify wave A is started with local shallow clones for Odoo and Twenty, exact refs recorded, and scoped run boundaries defined before extraction.
À faire: Run Graphify on the prepared scoped corpora, publish extracted graph reports, synthesize cross-project findings, then continue with the remaining wave A anchors; overall study is about 72% complete.
Attendu: Execute the Odoo and Twenty scoped runs first, because they are mandatory anchors and expose the main contrast between broad ERP workflows and modern CRM/platform architecture.

## Local Source Policy

- Cloned repositories live under ignored `research/sources/` and are not committed.
- Graphify workspaces live under ignored `research/graphify/` and are not committed.
- Only provenance, summaries, and selected generated reports are committed under `docs/study/05-graphify/`.
- GPL/AGPL/LGPL/EPL/mixed projects remain subject to the license gate from `00-methodology/license-risk-matrix.md`.

## Wave A Anchor Refs

| Project | Local Source | Branch | Checked Commit | Clone Type | Initial Graphify Status |
| --- | --- | --- | --- | --- | --- |
| Odoo | `research/sources/odoo` | `19.0` | `af50cb24` | shallow Git clone | scoped corpus prepared; extraction pending |
| Twenty | `research/sources/twenty` | `main` | `83c40bb8` | shallow Git clone | scoped corpus prepared; extraction pending |

## Scoped Run Plan

| Run | Purpose | Included Source Families | Reason For Split |
| --- | --- | --- | --- |
| `odoo-finance-localization` | Accounting and Canada localization shape. | Odoo root metadata plus `account`, `l10n_ca`, `api_doc`, and `rpc` code families. | Keeps finance/localization distinct from operations and below noisy whole-repo size. |
| `odoo-operations-services` | CRM, HR/time, services, inventory, MRP, repair, and maintenance relationships. | Odoo root metadata plus `crm`, `hr`, `hr_attendance`, `hr_holidays`, `hr_timesheet`, `project`, `sale_timesheet`, `mrp`, `stock`, `maintenance`, and `repair` code families. | Captures broad ERP functional flow without copying the full 47k-file clone. |
| `twenty-crm-core` | CRM entities and customer-facing activity flow. | Twenty root metadata plus server CRM/task/calendar modules and selected frontend companies/people/dashboard modules. | Keeps core CRM separate from platform metadata and workflow engine. |
| `twenty-object-metadata` | Custom object and schema extensibility model. | Twenty root metadata plus frontend object metadata and selected SDK metadata surfaces. | Isolates platform extensibility, a key product-positioning question. |
| `twenty-workflow` | Workflow builder, execution, trigger, and automation architecture. | Twenty root metadata plus selected server and frontend workflow families. | Workflow modules are large; this run will stay conceptual and anti-copy constrained. |

## Expected Outputs

Each completed run should produce:

- runtime proof: `.graphify/.graphify_runtime.json` with `"runtime": "typescript"` in the ignored run workspace;
- `graph.json` or equivalent graph artifact in the ignored workspace;
- a committed summary under `docs/study/05-graphify/<run>/`;
- a provenance note with source commit, scope, skipped files, and license boundary.

## Anti-Copy Reminder

Graphify output is an analytical aid. It must not be used to copy source code, UI text, schemas, exact API shapes, fixtures, docs, assets, tests, or distinctive implementation structures into the future MIT project.
