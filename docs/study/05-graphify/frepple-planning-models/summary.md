# Graphify Summary: frePPLe Planning Models

## Progress

Fait: AST-only Graphify extraction completed for frePPLe planning model scope with TypeScript runtime proof.
À faire: Convert MRP/APS findings into original manufacturing-pack specs and compare with OpenBoxes logistics findings; overall study is about 92% complete.
Attendu: Use frePPLe as the strongest planning reference, but keep legal review before implementation-level inspiration because of dual-license/commercial wording.

## Provenance

- Source repo: https://github.com/frePPLe/frepple.
- Branch/ref: `master` at local shallow clone commit `6d6ed7b7`.
- Source boundary: `freppledb/input/models`, `freppledb/output`, `freppledb/execute`, `freppledb/forecast`, and `freppledb/erpconnection` Python/JS/Vue sources.
- Run workspace: ignored `research/graphify/runs-ast/frepple-planning-models`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 152.
- Nodes: 1,479.
- Edges: 2,934.
- Communities: 159.
- Top hubs from Graphify summary: `Task`, `Forecast`, `ForecastPlan`, `Location`, `Item`.

## Findings

- Planning models center on task execution, forecast, forecast plan, location, item, calendar, resource, measure, operation, and operation-resource concepts.
- frePPLe has a richer planning vocabulary than a basic manufacturing order module: demand, supplier, buffer, operation, operation dependency, resource, calendar, and ERP connection are visible structural areas.
- Forecast and planning task concepts are first-class, which supports a manufacturing planning pack rather than embedding MRP inside inventory alone.
- Frontend/minified JS creates noisy hubs in the graph; product conclusions should rely mainly on model and planning nodes.

## Product Implications

- Manufacturing pack specs should include item, location, calendar, resource, operation, operation dependency, operation resource, demand, forecast, forecast plan, supplier, buffer, planning task, and ERP connector concepts.
- The core product should still start service-company friendly; manufacturing planning should be a vertical pack connected to inventory and purchasing.
- Do not copy frePPLe model names, solver behavior, examples, connector mappings, UI structures, or sample spreadsheets without legal review.
