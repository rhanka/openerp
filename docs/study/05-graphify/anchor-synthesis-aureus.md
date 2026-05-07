# Graphify Anchor Synthesis: Aureus ERP

## Progress

Fait: Three AST Graphify runs are completed for Aureus ERP, covering finance, commerce/inventory, and HR/services model scopes.
À faire: Compare Aureus with Odoo and remaining wave A anchors, then decide how much permissive-code inspiration is useful for the future MIT architecture; overall study is about 80% complete.
Attendu: Keep Aureus in the Graphify evidence set as the main permissive ERP comparison point, while treating maturity and local compliance as unresolved.

## Coverage

| Run | Main Structural Signal |
| --- | --- |
| `aureus-finance-models` | Accounting model centered on moves, move lines, payments, payment registration, and journals. |
| `aureus-commerce-inventory-models` | Commerce/inventory model centered on orders, warehouses, products, inventory moves, and partners. |
| `aureus-hr-services-models` | HR/service model centered on employees, applicants, projects, tasks, companies, and timesheets. |

## Findings

- Aureus is a credible permissive ERP comparison point for domain boundaries. It is not merely an invoicing app.
- It covers finance, commerce, inventory, HR adjacency, recruitment, projects, support, and timesheets at the model level.
- Its warehouse model includes locations, operation types, routes, and rules, which makes it more useful than a minimal stock table reference.
- It does not resolve the biggest strategic gap: Canada/Quebec statutory accounting and payroll.
- It also does not replace Odoo for mature ERP breadth, Twenty for metadata/workflow platform ideas, or specialized anchors for billing, HR/payroll, MRP, WMS, BI, and automation.

## Product Architecture Implications

- Use Aureus to validate that a modular ERP plugin shape can exist under MIT, but do not inherit Laravel/Filament architecture as the target stack.
- Product modules should remain domain-driven rather than UI-plugin-driven: finance, CRM, commerce, inventory, services, HR/time, and workflow each need stable boundaries.
- The future Svelte/TypeScript frontend and TypeScript/Rust backend should use original module names, schemas, APIs, and UX, even when permissive sources inform comparable boundaries.

## Anti-Copy Notes

- MIT allows reuse under attribution, but the project should still avoid unnecessary copying of file structure, model names, policy names, UI labels, docs, demo data, and plugin taxonomy.
- If any Aureus implementation idea is reused later, attribution and notice tracking must be explicit.
- Prefer using Aureus as a sanity check for permissive ERP feasibility, not as a source to port.

## Next Graphify Wave

- Run Kill Bill and OpenMeter next for permissive billing and metering.
- Then run Frappe HR/Kimai for HR/time gaps and frePPLe/OpenBoxes for manufacturing/WMS gaps.
