# Graphify Summary: Kill Bill Catalog And Subscription

## Progress

Fait: AST-only Graphify extraction completed for Kill Bill catalog, subscription, entitlement, and usage scope with TypeScript runtime proof.
À faire: Compare subscription lifecycle requirements against OpenMeter and future service-company billing specs; overall study is about 84% complete.
Attendu: Use Kill Bill as the main permissive reference for mature subscription lifecycle boundaries, while avoiding direct reuse of API, state-machine, and billing-rule expression.

## Provenance

- Source repo: https://github.com/killbill/killbill.
- Branch/ref: `master` at local shallow clone commit `81a24d0c`.
- Source boundary: `catalog`, `subscription`, `entitlement`, and `usage` Java sources, excluding glue, DAO, notification, caching, security, health, and template paths for this pass.
- Run workspace: ignored `research/graphify/runs-ast/killbill-catalog-subscription`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 159.
- Nodes: 2,108.
- Edges: 3,411.
- Communities: 124.
- Top hubs from Graphify summary: `DefaultSubscriptionBase`, `DefaultEntitlement`, `StandaloneCatalogMapper`, `DefaultEventsStream`, `DefaultSubscriptionInternalApi`.

## Findings

- The graph centers on subscription base, entitlement, catalog mapping, event stream, and internal subscription API concepts.
- Catalog is not a flat plan table: Graphify exposes plans, products, usage, price lists, case rules, phase changes, and catalog validation as separate structural areas.
- Subscription and entitlement are distinct concepts. The product spec should preserve that distinction because entitlement controls access while subscription controls commercial lifecycle.
- Usage appears in this scope, but invoice/payment runs are needed to understand monetization of measured consumption.

## Product Implications

- Service-company billing should include product catalog, plan, price list, billing phase, subscription, entitlement, usage unit, transition, cancellation/change rules, and tenant-specific configuration.
- The future MIT implementation should not copy Kill Bill package names, transition classes, catalog XML/Java shapes, or rule names. Apache-2.0 allows reuse with notice and patent obligations, but original expression remains the target.
- Canada/Quebec compliance is not solved by this graph; it is subscription architecture evidence, not statutory tax evidence.
