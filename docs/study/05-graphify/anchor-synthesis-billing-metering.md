# Graphify Anchor Synthesis: Billing And Metering

## Progress

Fait: Six AST Graphify runs are completed for permissive billing/metering anchors: three Kill Bill runs and three OpenMeter runs.
À faire: Fold billing/metering into the global functional spec, then continue HR/time/payroll, manufacturing/WMS, BI/reporting, and automation anchors; overall study is about 84% complete.
Attendu: Continue with Frappe HR and Kimai next, because billing/metering is now structurally covered and Quebec/Canada HR/payroll remains unresolved.

## Coverage

| Project | Main Structural Signal |
| --- | --- |
| Kill Bill | Mature subscription billing lifecycle: catalog, subscription, entitlement, usage, invoice, payment, account, tenant, and REST API resources. |
| OpenMeter | Metered services architecture: feature, meter, ratecard, plan, addon, entitlement, subscription workflow, usage rating, invoice state, and Kubernetes deployment. |

## Findings

- Kill Bill and OpenMeter are complementary rather than interchangeable.
- Kill Bill is stronger for mature subscription lifecycle and invoice/payment orchestration.
- OpenMeter is stronger for event-metered products, usage rating, feature entitlements, and first-party Kubernetes/self-hosted deployment evidence.
- Neither project is a general ERP, accounting ledger, payroll system, or Quebec/Canada statutory compliance source.
- Both are Apache-2.0, which is favorable for a future MIT project, but expressive API schemas, DTOs, state machines, migrations, generated clients, invoice templates, tests, and examples remain anti-copy-sensitive.

## Product Architecture Implications

- Billing should be a bounded platform module connected to CRM, projects, inventory/services, and accounting through events and postings.
- Accounting should own ledger, taxes, reconciliation, statutory reporting, and regional compliance. Billing should own product catalog monetization, usage, entitlements, invoices, payments, and dunning/payment-state workflows.
- Services companies need subscription and usage billing as first-class features, not manufacturing-only functionality.
- Self-hosted Kubernetes should include explicit worker separation, migration strategy, config/tenant management, and update windows. OpenMeter gives better deployment reference material for this than Kill Bill in the inspected repos.

## Anti-Copy Notes

- Apache-2.0 permits reuse with attribution, notice, and patent-license obligations, but original implementation remains the target.
- Do not copy Kill Bill endpoint/resource naming, Java package structures, invoice/payment state machines, catalog rules, plugin API shapes, database migrations, templates, or test scenarios.
- Do not copy OpenMeter TypeSpec/OpenAPI schema, Go service method names, ratecard/entitlement struct names, generated client code, Helm templates, or workflow names.
- The clean-room rule for this study remains: use these graphs to write original functional specs and original Svelte/TypeScript plus TypeScript/Rust architecture.

## Next Graphify Wave

- Run Frappe HR and Kimai next for HR, time tracking, leave, payroll-adjacent workflows, and service time billing.
- Then run frePPLe/OpenBoxes for manufacturing planning and WMS gaps.
- Then run Superset/Node-RED for reporting, dashboards, automation, and integration UX.
