# Graphify Summary: Twenty Workflow Server

## Progress

Fait: AST-only Graphify extraction completed for the Twenty server-side workflow scope with TypeScript runtime proof.
À faire: Reconcile this with frontend workflow UX and Node-RED later; overall study is about 76% complete.
Attendu: Treat server-side workflow as an architecture reference for automation governance, but not as source or API-shape reuse because Twenty remains AGPL functional-only.

## Provenance

- Source repo: https://github.com/twentyhq/twenty.
- Branch/ref: `main` at local shallow clone commit `83c40bb8`.
- Source boundary: code-only scope derived from server workflow `common`, `workflow-builder`, `workflow-runner`, `workflow-status`, `workflow-tools`, and `workflow-trigger`.
- Run workspace: ignored `research/graphify/runs-ast/twenty-workflow-server`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 166.
- Nodes: 571.
- Edges: 517.
- Communities: 165.
- Top hubs from Graphify summary: `WorkflowThrottlingWorkspaceService`, `WorkflowDatabaseEventTriggerListener`, `WorkflowTriggerWorkspaceService`, `WorkflowRunWorkspaceService`, `WorkflowSchemaWorkspaceService`.

## Findings

- Server workflow is not just a visual builder. The graph centers throttling, database-event triggers, trigger activation/deactivation, run state, and schema computation.
- The strongest hubs indicate operational controls that matter for self-hosted ERP automation: run throttling, trigger gating, event filtering, run retrieval/update, and step output schema computation.
- Workflow schema computation appears as a distinct hub, linking automation to metadata and record outputs.
- This supports a cautious automation roadmap: start with simple event triggers and action runs, then add schema inference, throttling, queue governance, and workspace controls.

## Product Implications

- The future product needs automation governance from the start if workflows become user-facing: rate limits, run status, auditability, activation rules, and safe event filtering.
- Workflow triggers should be designed around business events, not copied from Twenty's listener or workspace-service structure.
- For a MIT rewrite, use original terminology, original event schema, original queue behavior, and independent permission checks.
