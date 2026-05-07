# Graphify Summary: frePPLe Solver Engine

## Progress

Fait: AST-only Graphify extraction completed for frePPLe C++ model, solver, and forecast engine scope with TypeScript runtime proof.
À faire: Decide whether the future product needs embedded planning algorithms or integration with an external planning engine; overall study is about 92% complete.
Attendu: Treat this run as architecture awareness only, not as solver-code inspiration, unless legal and technical review explicitly approve deeper reuse.

## Provenance

- Source repo: https://github.com/frePPLe/frepple.
- Branch/ref: `master` at local shallow clone commit `6d6ed7b7`.
- Source boundary: C++ `src/model`, `src/solver`, and `src/forecast` sources.
- Run workspace: ignored `research/graphify/runs-ast/frepple-solver-engine`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 47.
- Nodes: 1,080.
- Edges: 2,293.
- Communities: 66.
- Top hubs from Graphify summary: `size()`, `error_node()`, `valid()`, `local_data()`, `type()`.

## Findings

- The graph is dominated by the embedded expression parser/header in forecast sources, so top hub names are not product-domain concepts.
- Domain-relevant communities still expose operation plan creation/update/status propagation and forecast base/measure/solver concepts.
- This confirms that APS/MRP depth quickly becomes algorithmic and specialized, unlike CRUD-style ERP modules.
- A future Svelte/TypeScript plus TypeScript/Rust product should probably integrate a planning engine first, then rewrite only if planning becomes strategic.

## Product Implications

- Manufacturing planning should be behind a clear engine boundary: planning inputs, plan run, plan outputs, explanations, constraints, and exceptions.
- Rust may be relevant later for scheduling/optimization services, but MVP should avoid hand-rolling an APS solver.
- Do not copy C++ solver logic, expression parser behavior, operation-plan algorithms, examples, or test expectations.
