# Graphify Summary: OpenMeter API Runtime

## Progress

Fait: Graphify extraction completed for OpenMeter runtime/deployment scope with TypeScript runtime proof, with a recorded AST limitation for TypeSpec.
À faire: Use Go domain graphs and manual API-spec review for OpenMeter API concepts; overall study is about 84% complete.
Attendu: Keep this run as deployment/runtime evidence only, because TypeSpec files were copied into scope but not structurally extracted by the AST pass.

## Provenance

- Source repo: https://github.com/openmeterio/openmeter.
- Branch/ref: `main` at local shallow clone commit `8d3a5a05`.
- Source boundary: OpenMeter server, billing-worker, balance-worker, API TypeSpec sources, and Helm chart files.
- Run workspace: ignored `research/graphify/runs-ast/openmeter-api-runtime`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction, plus document detection for Helm YAML.

## Graph Stats

- Scope files copied: 186.
- Files recognized by Graphify: 23 total, including 12 Go code files and 11 YAML documents.
- Nodes: 34.
- Edges: 29.
- Communities: 9.
- Top hubs from Graphify summary: `Application`, `initializeApplication()`, `metadata()`, `main()`, `initNamespace()`.

## Findings

- The graph confirms separate server, billing-worker, and balance-worker entry points, with generated wiring around application initialization and metadata.
- Helm chart files were detected as documents, supporting Kubernetes/self-hosted deployment evidence.
- TypeSpec files were not included in the AST graph. OpenMeter API concepts must therefore be reviewed from source paths and domain Go graphs rather than inferred from this graph alone.

## Product Implications

- OpenMeter is the stronger self-hosted/Kubernetes reference than Kill Bill in this billing lot because Helm deployment is first-party in the inspected repository.
- Future self-hosted architecture should include separate API/server, billing worker, balance/entitlement worker, jobs, database migrations, and upgrade policy surfaces.
- Do not copy OpenMeter TypeSpec/OpenAPI shapes, generated clients, Helm templates, or service names without explicit review.
