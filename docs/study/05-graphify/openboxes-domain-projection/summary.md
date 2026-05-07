# Graphify Summary: OpenBoxes Domain Projection

## Progress

Fait: Graphify extraction completed for an OpenBoxes WMS domain projection with TypeScript runtime proof.
À faire: Use this as structural inventory only and reconcile with source/path review for richer WMS behavior; overall study is about 92% complete.
Attendu: Keep OpenBoxes as a strong functional WMS reference, but treat EPL source reuse as blocked until legal review.

## Provenance

- Source repo: https://github.com/openboxes/openboxes.
- Branch/ref: `develop` at local shallow clone commit `8a637bd0`.
- Source boundary: selected OpenBoxes Groovy domain files for inventory, product, location, stock, shipment, requisition, order, purchase, picklist, receipt, transaction, lot, catalog, and supplier concepts.
- Projection method: minimal Java projection files generated from Groovy class/import lines only, because Graphify AST did not recognize Groovy as extractible code in this run.
- Run workspace: ignored `research/graphify/runs-ast/openboxes-domain-projection`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction on projection files.

## Graph Stats

- Projection files extracted: 74.
- Nodes: 148.
- Edges: 74.
- Communities: 74.
- Top hubs from Graphify summary: `Attribute`, `Category`, `CycleCount`, `CycleCountCandidate`, `CycleCountDetails`.

## Findings

- This run is an inventory of domain concepts, not a deep dependency graph.
- Domain concepts include location, location group, inventory, inventory item, inventory count, cycle count, transaction, transaction entry, stock movement, requisition, receipt, shipment, order, picklist, product, product catalog, supplier, and reporting dimensions.
- The projection confirms breadth across WMS and logistics concepts, but behavior must be interpreted from source/path review and future manual spec work.

## Product Implications

- WMS specs should include product, product package, category, supplier, location, location group, inventory, inventory item, lot, transaction, inventory count, cycle count, requisition, receipt, shipment, order, purchase order, picklist, stock movement, and stock transfer concepts.
- For small manufacturers, WMS should connect to planning/MRP outputs, purchasing, inventory valuation/accounting, and shop-floor consumption.
- Do not copy OpenBoxes Groovy domains, GSP views, API resources, templates, demo data, reports, barcode workflows, or logistics terminology without legal review.
