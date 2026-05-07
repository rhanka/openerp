# Graphify Summary: OpenBoxes Services And API Projection

## Progress

Fait: Graphify extraction completed for an OpenBoxes WMS service/API projection with TypeScript runtime proof.
À faire: Translate service/API inventory into original WMS workflow specs; overall study is about 92% complete.
Attendu: Use this projection to identify WMS service surfaces, not to copy EPL service/controller design.

## Provenance

- Source repo: https://github.com/openboxes/openboxes.
- Branch/ref: `develop` at local shallow clone commit `8a637bd0`.
- Source boundary: selected OpenBoxes Groovy services and controllers for inventory, product, location, stock, shipment, requisition, order, purchase, picklist, receipt, transaction, lot, catalog, and supplier concepts.
- Projection method: minimal Java projection files generated from Groovy class/import lines only, because Graphify AST did not recognize Groovy as extractible code in this run.
- Run workspace: ignored `research/graphify/runs-ast/openboxes-services-api-projection`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction on projection files.

## Graph Stats

- Projection files extracted: 171.
- Nodes: 342.
- Edges: 171.
- Communities: 171.
- Top hubs from Graphify summary: `AdjustInventoryService`, `AllocationRequest`, `AttributeController`, `AttributeService`, `BarcodeService`.

## Findings

- The service/API projection exposes WMS operational surfaces: inventory services, adjustment, cycle count, product availability, stock movement, outbound movement, stock transfer, requisition, receiving, shipment, order, picklist, product, supplier, barcode, location, and API controllers.
- OpenBoxes has strong operational WMS breadth, but projection connectivity is intentionally shallow because only class/import lines were used.
- API guide files list authentication, locations, receiving, put-away, outbound stock movement, product, category, pagination, lookup, and generic resource operations.

## Product Implications

- Original WMS specs should include receiving, put-away, picking, shipment, outbound stock movement, stock transfer, stock adjustment, cycle count, product availability, stocklist/replenishment, inventory transaction summary, barcode, and location APIs.
- Shop-floor MES should not be inferred from OpenBoxes. It supports WMS/logistics, while frePPLe supports planning; execution and quality need later references or original design.
- EPL code remains cautious: no copying services, controllers, API resources, views, docs, report structures, templates, or sample configuration.
