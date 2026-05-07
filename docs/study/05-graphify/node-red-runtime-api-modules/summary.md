# Graphify Summary: Node-RED Runtime API Modules

## Progress

Fait: AST Graphify extraction completed for Node-RED runtime/API scope with TypeScript runtime proof.
À faire: Decide whether automation is an embedded integration, a small native workflow engine, or both; overall study is about 96% complete.
Attendu: Keep Node-RED as the automation runtime benchmark and avoid rebuilding its full low-code platform in the ERP core.

## Provenance

- Source repo: https://github.com/node-red/node-red.
- Branch/ref: `master` at local shallow clone commit `55e6cc9f`.
- License boundary: Apache-2.0, favorable for study and possible integration, but source, flow JSON structure, node APIs, credential model, editor API contracts, docs, and built-in nodes remain excluded from the future MIT implementation unless explicitly approved for reuse.
- Source boundary: selected `@node-red/editor-api`, `@node-red/runtime`, `@node-red/registry`, and `@node-red/util` JavaScript files.
- Path note: Node-RED source files under `packages/node_modules` were copied into `packages/modules` inside the ignored Graphify scope because Graphify excludes `node_modules` path segments. This is analysis-only path normalization.
- Run workspace: ignored `research/graphify/runs-ast/node-red-runtime-api-modules`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 88.
- Nodes: 532.
- Edges: 709.
- Communities: 86.
- Top hubs from Graphify summary: `checkActiveProject()`, `Flow`, `reloadActiveProject()`, `runGitCommand()`, `filterNodeInfo()`.
- Sensitive files skipped by detection: 3.

## Findings

- Runtime structure centers on flows, subflows, groups, node lifecycle, message delivery, and stop/start behavior.
- Project storage and local Git operations are prominent: active project checks, reloads, branch/status operations, SSH key handling, and settings files form several communities.
- The registry and module loader are separate surfaces for node discovery, module files, node metadata, node help, locales, and external modules.
- Context and property evaluation are explicit runtime capabilities: global/root context, environment property evaluation, JSONata expression evaluation, and node/message property access.
- Authentication, admin HTTP endpoints, telemetry, event hooks, diagnostics, and comms appear as surrounding platform services.

## Product Implications

- The ERP needs automation, but it should start as domain-safe workflows: approvals, notifications, scheduled jobs, data sync, export/import jobs, and event reactions.
- A native workflow engine should have a narrow node catalog tied to ERP permissions and audit logs, not arbitrary package installation by default.
- If Node-RED integration is offered, isolate it as an optional automation service with tenant boundaries, credential storage, plugin policy, flow deployment approvals, and update governance.
- Kubernetes self-hosting should treat automation runtime upgrades and plugin drift as operational risks, with support windows aligned to the product update policy.

## Anti-Copy Notes

- Do not copy Node-RED runtime code, flow JSON format, editor API, built-in node behavior, credential structures, project file layout, palette metadata, docs, or example flows.
- Capability-level inspiration is acceptable: nodes, flows, subflows, credentials, context, deployment, project history, and runtime diagnostics.
