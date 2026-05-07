# Graphify Summary: OpenMeter Entitlement Metering And Catalog

## Progress

Fait: AST-only Graphify extraction completed for OpenMeter entitlement, metering, product catalog, subscription, and customer scope with TypeScript runtime proof.
À faire: Merge this with Kill Bill findings into the functional billing map and continue HR/time/payroll anchors; overall study is about 84% complete.
Attendu: Use OpenMeter for metered services, feature entitlements, and product catalog concepts, especially where Kill Bill is less event-metering oriented.

## Provenance

- Source repo: https://github.com/openmeterio/openmeter.
- Branch/ref: `main` at local shallow clone commit `8d3a5a05`.
- Source boundary: entitlement, meter, product catalog, subscription, and customer Go sources, excluding tests, adapters, mocks, snapshots, HTTP handlers, and balance-worker paths for this pass.
- Run workspace: ignored `research/graphify/runs-ast/openmeter-entitlement-metering-catalog`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 195.
- Nodes: 1,783.
- Edges: 2,002.
- Communities: 207.
- Top hubs from Graphify summary: `service`, `SubscriptionUniqueConstraintValidator`, `EntitlementHandler`, `FlatFeeRateCard`, `UsageBasedRateCard`.

## Findings

- The graph centers on subscription workflow service, uniqueness validation, entitlement handlers, flat-fee and usage-based rate cards, and entitlement templates.
- OpenMeter separates feature, meter, entitlement, plan, addon, ratecard, subscription, and customer usage attribution concepts.
- Product catalog has richer usage-billing concepts than a basic ERP product table: plan phases, addons, ratecards, feature meters, alignment, prorating, discounts, and tax concepts appear as distinct areas.
- Customer and subject/entitlement mapping is important for service products where the billable customer and usage subject can differ.

## Product Implications

- The service-company MVP should support feature, meter, customer usage attribution, plan, addon, ratecard, flat-fee price, usage-based price, entitlement template, entitlement grant, subscription phase, subscription item, and usage period concepts.
- OpenMeter helps specify metered SaaS/service billing but not payroll, HR, general ledger, or Quebec/Canada statutory requirements.
- Avoid copying OpenMeter API names, TypeSpec schema, ratecard structs, entitlement handlers, workflow names, and generated clients.
