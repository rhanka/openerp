# Graphify Summary: Odoo Inventory, MRP, Repair And Maintenance

## Progress

Fait: AST-only Graphify extraction completed for the Odoo inventory/MRP/repair/maintenance code scope with TypeScript runtime proof.
À faire: Compare against frePPLe and OpenBoxes Graphify runs later, then define the manufacturing vertical pack; overall study is about 76% complete.
Attendu: Use this graph to bound manufacturing as a vertical pack with inventory and production foundations before advanced MES.

## Provenance

- Source repo: https://github.com/odoo/odoo.
- Branch/ref: `19.0` at local shallow clone commit `af50cb24`.
- Source boundary: code-only scope derived from `mrp`, `stock`, `maintenance`, and `repair`.
- Run workspace: ignored `research/graphify/runs-ast/odoo-inventory-mrp`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 115.
- Nodes: 2,068.
- Edges: 2,907.
- Communities: 210.
- Top hubs from Graphify summary: `StockMove`, `MrpProduction`, `StockPicking`, `ProductProduct`, `StockWarehouse`.

## Findings

- Inventory and manufacturing are structurally centered on stock moves, manufacturing orders, pickings, products, and warehouses.
- `MrpWorkorder`, `StockMoveLine`, `StockRule`, and `MrpProduction` communities indicate that production execution, move completion, routing/procurement rules, and serial generation are core implementation pressure points.
- Maintenance and repair did not emerge as top hubs in this cut, which supports treating them as adjacent modules rather than MVP manufacturing foundations.
- The graph confirms that a manufacturing pack cannot be added as only a BOM table. It needs stock movement, warehouse, picking, production order, work order, and product lifecycle integration.

## Product Implications

- Manufacturing vertical v1 should include products, warehouses/locations, stock moves, pickings, BOM/MRP, production orders, work orders, and repair/maintenance hooks.
- WMS-lite should precede advanced MES. Device control, AGV routing, and shop-floor automation can stay outside MVP.
- Avoid copying Odoo's stock move, production, picking, warehouse, workorder, rule, and serial-generation structures. Use the graph only to identify independent functional boundaries.
