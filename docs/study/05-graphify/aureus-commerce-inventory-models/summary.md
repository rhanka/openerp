# Graphify Summary: Aureus Commerce And Inventory Models

## Progress

Fait: AST-only Graphify extraction completed for Aureus ERP commerce/inventory model scope with TypeScript runtime proof.
À faire: Compare inventory model depth with Odoo, OpenBoxes, and frePPLe later; overall study is about 80% complete.
Attendu: Use this run to identify permissive ERP product/order/warehouse boundaries, not as a direct implementation blueprint.

## Provenance

- Source repo: https://github.com/aureuserp/aureuserp.
- Branch/ref: `master` at local shallow clone commit `dd251ac`.
- Source boundary: code-only scope derived from `sales`, `contacts`, `partners`, `products`, `purchases`, and `inventories` model/policy/enum/settings families.
- Run workspace: ignored `research/graphify/runs-ast/aureus-commerce-inventory-models`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 210.
- Nodes: 1,239.
- Edges: 1,120.
- Communities: 152.
- Top hubs from Graphify summary: `Order`, `Warehouse`, `Product`, `Move`, `Partner`.

## Findings

- Commerce/inventory is centered on order, warehouse, product, inventory move, and partner models.
- Warehouse graph queries exposed creation of locations, operation types, routes, and rules. This is useful evidence that even a permissive ERP candidate treats warehouse setup as a system of locations, operation types, and stock rules rather than a single warehouse table.
- Product variant generation appears as a meaningful product model capability.
- Sales/purchase/partner/product/inventory boundaries appear broad enough for service-company operations and basic distribution, but not enough to prove MRP, MES, or advanced WMS maturity.

## Product Implications

- Core inventory requirements should include product, variant, partner, warehouse, location, operation type, stock route/rule, stock move, purchase order, and sales order concepts.
- Manufacturing should not be inferred from this graph. It supports inventory and commerce foundations, while frePPLe/OpenBoxes/Odoo MRP remain better manufacturing/WMS references.
- Aureus can inform permissive domain boundaries, but exact warehouse setup functions, route/rule naming, relations, and policy structure should not be copied.
