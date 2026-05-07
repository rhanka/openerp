# Graphify Summary: Kill Bill Account And API

## Progress

Fait: AST-only Graphify extraction completed for Kill Bill account, tenant, and public API scope with TypeScript runtime proof.
À faire: Compare API shape with future TypeScript backend boundaries and self-hosted tenant/update requirements; overall study is about 84% complete.
Attendu: Use this graph for account, tenant, and billing API surface awareness, not as an endpoint or DTO template.

## Provenance

- Source repo: https://github.com/killbill/killbill.
- Branch/ref: `master` at local shallow clone commit `81a24d0c`.
- Source boundary: selected billing API contracts plus account, tenant, and JAX-RS Java sources, excluding glue, DAO, and security paths for this pass.
- Run workspace: ignored `research/graphify/runs-ast/killbill-account-api`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 176.
- Nodes: 2,204.
- Edges: 3,053.
- Communities: 164.
- Top hubs from Graphify summary: `AccountResource`, `DefaultMutableAccountData`, `InvoiceResource`, `SubscriptionBase`, `JaxRsResourceBase`.

## Findings

- Account and API surface is centered on account resource, mutable account data, invoice resource, subscription base, base REST resource, and payment resource.
- Account APIs bridge invoice, payment, entitlement, subscription, catalog, overdue, and tag errors, which shows account as the operational hub for billing workflows.
- Tenant translation hooks exist for invoice and catalog translation. This is localization infrastructure, not evidence of Canada/Quebec statutory support.
- JAX-RS resources and JSON DTOs are strong anti-copy-risk areas because endpoint shape and payload structure are expressive product surface.

## Product Implications

- Future API specs should define original account, tenant, invoice, subscription, payment, and entitlement resources in TypeScript, with original DTO names and endpoint shapes.
- Tenant configuration, invoice template/translation override, catalog translation, and account timeline are useful functional requirements for self-hosted and SaaS operations.
- Quebec/Canada tax and payroll requirements still need statutory sources and accounting localization work; translation endpoints do not prove tax compliance.
