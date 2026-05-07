# Graphify Anchor Synthesis: Manufacturing Planning And WMS

## Progress

Fait: Four useful Graphify runs are completed for manufacturing/WMS anchors: two frePPLe AST runs and two OpenBoxes projection AST runs.
À faire: Fold planning/WMS findings into the global functional spec, then continue BI/reporting and automation anchors; overall study is about 92% complete.
Attendu: Continue with Superset and Node-RED next, because reporting/automation is the last wave A domain gap.

## Coverage

| Project | Main Structural Signal |
| --- | --- |
| frePPLe | MRP/APS planning model and solver/forecast architecture: item, location, calendar, resource, operation, demand, forecast, planning task, ERP connection, and operation plan engine. |
| OpenBoxes | WMS/logistics domain and service/API inventory: product, location, inventory, transaction, stock movement, requisition, receiving, shipment, order, picklist, cycle count, barcode, and API resources. |

## Findings

- frePPLe and OpenBoxes cover different layers. frePPLe is planning/APS; OpenBoxes is WMS/logistics execution.
- Neither project proves complete MES, quality, maintenance, or shop-floor equipment integration.
- Manufacturing should remain a vertical pack connected to the service-company ERP core, not the only product direction.
- frePPLe has favorable MIT text but dual-license/commercial wording needs legal review before implementation-level inspiration.
- OpenBoxes is EPL-1.0 and should remain a functional/cautious reference for a future MIT product.

## Product Architecture Implications

- Manufacturing pack should separate planning, inventory/WMS, execution, quality, and maintenance.
- Planning should have a clear engine boundary: inputs, constraints, plan run, outputs, pegging/explanations, exceptions, and integration events.
- WMS should own receiving, put-away, stock movement, stock transfer, picking, shipment, inventory count, cycle count, and barcode/location workflows.
- The core product should support services companies without requiring manufacturing modules; manufacturing adds planning and WMS depth where relevant.

## Anti-Copy Notes

- Do not copy frePPLe solver code, operation-plan algorithms, data examples, connector mappings, UI structures, spreadsheets, or forecast behavior without legal review.
- Do not copy OpenBoxes Groovy domains, services, controllers, GSP views, API docs, templates, demo data, reports, barcode behavior, or logistics labels without legal review.
- OpenBoxes Graphify outputs here are projections from class/import lines because raw Groovy was not extracted by Graphify AST. Treat them as structural inventory, not dependency proof.

## Next Graphify Wave

- Run Apache Superset for BI/reporting: datasets, charts, dashboards, SQL Lab, permissions, and embedded analytics.
- Run Node-RED for automation/integration UX: nodes, flows, runtime, editor API, credentials, and deployment model.
