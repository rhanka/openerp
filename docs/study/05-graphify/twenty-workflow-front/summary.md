# Graphify Summary: Twenty Workflow Frontend

## Progress

Fait: AST-only Graphify extraction completed for the Twenty frontend workflow scope with TypeScript runtime proof.
À faire: Expand UI workflow extraction only if the product needs a native workflow builder before MVP; overall study is about 76% complete.
Attendu: Keep frontend workflow findings lightweight for now, because server-side workflow and Node-RED will provide stronger automation architecture evidence.

## Provenance

- Source repo: https://github.com/twentyhq/twenty.
- Branch/ref: `main` at local shallow clone commit `83c40bb8`.
- Source boundary: code-only scope derived from frontend workflow GraphQL, hooks, states, types, utils, trigger, and version families.
- Run workspace: ignored `research/graphify/runs-ast/twenty-workflow-front`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 132.
- Nodes: 195.
- Edges: 75.
- Communities: 124.
- Top hubs from Graphify summary: `getDayName()`, `getDayOfWeekDescription()`, `getMonthName()`, `getMonthsDescription()`.

## Findings

- This frontend cut is dominated by cron-to-human trigger description utilities and trigger forms, not by the full workflow visual canvas.
- The graph is sparse. It is useful as evidence that user-facing workflow UX must translate technical schedules into readable business language.
- The selected frontend scope deliberately excluded the largest visual diagram and workflow-step directories to keep file count controlled. Therefore this is not a full workflow-builder UX graph.

## Product Implications

- If native automation is included early, readable schedule/trigger language is a real UX requirement.
- The current product plan should not overcommit to a complex visual workflow builder before core ERP/CRM/accounting workflows are defined.
- Use Node-RED and Power Automate/Zapier benchmarks for workflow UX expectations, and treat this Twenty frontend run as a narrow scheduling/trigger signal only.
