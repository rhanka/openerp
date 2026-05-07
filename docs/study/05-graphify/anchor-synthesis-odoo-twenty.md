# Graphify Anchor Synthesis: Odoo And Twenty

## Progress

Fait: Seven AST Graphify runs are completed for mandatory anchors Odoo and Twenty, covering finance/localization, services/CRM/HR, inventory/MRP, CRM activity infrastructure, metadata extensibility, and workflow server/frontend.
À faire: Run Graphify on the remaining wave A anchors, add semantic extraction for docs/manifests where useful, and translate findings into the global functional map; overall study is about 78% complete.
Attendu: Use this synthesis as the first bridge into `06-functional-map`, because mandatory-anchor graph evidence is now sufficient for initial product architecture conclusions.

## Coverage

| Anchor | Completed Runs | Main Structural Signal |
| --- | --- | --- |
| Odoo | `odoo-finance-localization`, `odoo-services-crm-hr`, `odoo-inventory-mrp` | Mature ERP module graph centered on accounting moves, projects/tasks/timesheets, CRM leads, employees/leave, stock moves, manufacturing orders, pickings, warehouses, and work orders. |
| Twenty | `twenty-crm-core`, `twenty-object-metadata`, `twenty-workflow-server`, `twenty-workflow-front` | Modern CRM/platform graph centered on metadata APIs, generated schema/client layers, connected calendar/activity sync, workflow triggers, run governance, and schema computation. |

## Cross-Anchor Findings

- Odoo shows the operational ERP truth: finance, services, HR/time, inventory, and MRP are deeply entangled through accounting moves, analytic lines, projects, stock moves, and production orders.
- Twenty shows the platform product truth: modern CRM value comes from metadata, generated APIs, connected-account sync, workflow triggers, and extensible views rather than only static lead/contact tables.
- These are complementary references. Odoo should inform what business domains must exist; Twenty should inform how configurable objects, views, workflow, and self-hosted TypeScript architecture could feel.
- The MIT product should not copy either architecture wholesale. Odoo's model names and workflows are LGPL/cautious; Twenty is AGPL/functional-only.

## Product Architecture Implications

- Core data domains should be explicit and stable: organization, person/contact, opportunity/lead, project, task, employee, time entry, leave, invoice, journal entry, payment, product, warehouse/location, stock move, production order.
- Extensibility should be built around original metadata concepts, but MVP should start with custom fields/views before attempting a full object engine or generated SDK ecosystem.
- Automation should be event-driven but governed: activation/deactivation, run state, throttling, trigger filters, and auditability are first-order requirements if workflows are user-configurable.
- Accounting should be independent and conservative. Dashboards, CRM, projects, timesheets, inventory, and manufacturing can post into finance, but ledger correctness must not depend on UI/dashboard structure.
- Manufacturing should be a vertical pack: stock and production are central, while repair/maintenance and advanced MES remain later-stage adjacent capabilities.

## Functional Map Seeds

| Future Functional Area | Requirement Seeds From Graphify |
| --- | --- |
| Finance | Journal entry and line model; invoice lifecycle; payment registration; tax line preparation; chart template/localization layer; reporting/dashboard separation. |
| CRM | Lead/opportunity pipeline; contact/company model; activity and calendar sync; task/project conversion path; connected-account state and sync errors. |
| Services | Project, task, customer portal visibility, timesheet, employee/resource, analytic/project accounting hooks. |
| HR/time | Employee record, leave/time-off, allocation/accrual, attendance or time-entry integration, approval paths; payroll still requires statutory research. |
| Inventory/MRP | Product, warehouse/location, stock move, picking, move line, stock rule, BOM/MRP, production order, work order, serial/lot handling. |
| Metadata/extensibility | Custom fields, custom views, permissions, generated query composition, metadata client boundary, but with original schema/API design. |
| Workflow | Business-event triggers, scheduled triggers, run state, throttling, output schema, activation/deactivation, event filtering, readable trigger language. |

## Anti-Copy Notes

- Do not copy Odoo schemas, XML views, method names, reports, localization templates, demo data, or business workflow text.
- Do not copy Twenty metadata schema, generated SDK code, GraphQL operations, workflow service names, UI labels, or package structures.
- Graphify outputs can guide independent requirements and architecture questions only.

## Next Graphify Wave

Continue with permissive and high-gap anchors:

- Aureus ERP for MIT ERP plugin architecture and maturity check.
- Kill Bill and OpenMeter for permissive billing/metering architecture.
- Frappe HR and Kimai for HR/time/payroll and service billing functional gaps.
- frePPLe and OpenBoxes for MRP/APS and WMS/inventory detail.
- Superset and Node-RED for BI and automation build-vs-integrate decisions.
