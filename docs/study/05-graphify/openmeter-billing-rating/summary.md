# Graphify Summary: OpenMeter Billing And Rating

## Progress

Fait: AST-only Graphify extraction completed for OpenMeter billing, rating, and charge service scope with TypeScript runtime proof.
À faire: Compare OpenMeter usage rating with Kill Bill usage-in-arrears and future service-company billing specs; overall study is about 84% complete.
Attendu: Use OpenMeter as the main permissive reference for metered billing and rating architecture, while keeping invoice/legal-compliance work separate.

## Provenance

- Source repo: https://github.com/openmeterio/openmeter.
- Branch/ref: `main` at local shallow clone commit `8d3a5a05`.
- Source boundary: billing models, billing service, billing rating, and charge service Go sources, excluding tests.
- Run workspace: ignored `research/graphify/runs-ast/openmeter-billing-rating`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 72.
- Nodes: 500.
- Edges: 611.
- Communities: 75.
- Top hubs from Graphify summary: `Service`, `InvoiceStateMachine`, `engineRegistry`, `Totals`, `mockCalculator`.

## Findings

- Billing is centered on a broad service layer, invoice state machine, line engine registry, totals, invoice calculation, and charge lifecycle.
- Graphify exposes gathering invoices, standard invoices, invoice state transitions, line engines, billable periods, usage discounts, pricing/rating, credit purchase, tax code resolution, and quantity snapshots.
- This is highly relevant for services companies that sell subscriptions, consumption, credits, or usage-based plans.
- The graph does not prove statutory invoicing or accounting. It is a usage-billing engine reference.

## Product Implications

- Future billing specs should include metered quantity snapshot, line engine, invoice state machine, gathering invoice, standard invoice, charge, rating, tax-code resolution, usage discount, billing profile, and external invoicing app concepts.
- Billing/rating should be a platform service consumed by ERP modules, not a replacement for accounting ledger and local tax logic.
- Avoid copying OpenMeter service method names, state-machine code, ratecard structures, generated model mixins, and test cases.
