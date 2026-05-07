# Graphify Anchor Synthesis: HR Time And Payroll

## Progress

Fait: Five AST Graphify runs are completed for HR/time anchors: three Frappe HR runs and two Kimai runs.
À faire: Fold HR/time/payroll findings into the global functional spec, then continue manufacturing/WMS, BI/reporting, and automation anchors; overall study is about 88% complete.
Attendu: Continue with frePPLe and OpenBoxes next, because manufacturing/WMS is the next remaining domain gap after HR/time/payroll.

## Coverage

| Project | Main Structural Signal |
| --- | --- |
| Frappe HR | HR breadth: attendance, leave, shift, employee lifecycle, recruitment, appraisal, salary slip, payroll entry, benefits, tax slabs, and payroll/accounting adjacency. |
| Kimai | Service-company depth: customer, project, activity, timesheet, working time, invoice, export, API, and project reporting. |

## Findings

- Frappe HR is the strongest open source functional reference for HR and payroll breadth, but GPL blocks source-level reuse in the MIT target.
- Kimai is the strongest service-company time-tracking reference, but AGPL blocks source-level reuse in the MIT target.
- HR/time should be first-class for services companies. Manufacturing should add shift and attendance depth later, but it is not the only product target.
- Payroll remains the largest regional risk. Frappe HR provides generic payroll structure, not Quebec/Canada statutory compliance.
- Kimai has `fr_CA` locale support and useful time-format behavior, but that is UX localization, not statutory coverage.

## Product Architecture Implications

- HR/time MVP should separate employee master data, attendance/check-in, shifts, leave, timesheets, projects, activities, rates, expenses, payroll, and accounting postings.
- Payroll should be modular and regionalized. For Quebec/Canada, the safer initial path may be payroll integration or a narrow payroll-prep module until CRA/Revenu Quebec/CNESST requirements are specified.
- Service-company billing needs a clean bridge from timesheet/project data to invoice/billing/accounting.
- Sensitive HR/payroll data requires permission, audit, retention, and privacy design from the start.

## Anti-Copy Notes

- Frappe HR is GPL-3.0 and Kimai is AGPL-3.0, so these projects are functional references only.
- Do not copy Frappe doctypes, JSON fields, Python methods, fixtures, reports, workflows, tests, or UI text.
- Do not copy Kimai entities, Symfony services/controllers, API endpoints, templates, translation strings, invoice renderers, calculation code, or report layouts.
- Use these graphs to produce original specs and original Svelte/TypeScript plus TypeScript/Rust implementation.

## Next Graphify Wave

- Run frePPLe and OpenBoxes next for manufacturing planning, inventory, WMS, stock movement, requisition, and fulfillment gaps.
- Then run Superset and Node-RED for reporting, dashboards, automation, and integration UX.
