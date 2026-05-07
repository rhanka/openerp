# Graphify Summary: Node-RED Editor And Nodes Modules

## Progress

Fait: AST Graphify extraction completed for Node-RED editor/nodes scope with TypeScript runtime proof.
À faire: Convert editor findings into original automation UX requirements and decide integration versus native limited builder; overall study is about 96% complete.
Attendu: Use Node-RED to understand mature automation UX, but keep the ERP workflow builder narrower and domain-aware.

## Provenance

- Source repo: https://github.com/node-red/node-red.
- Branch/ref: `master` at local shallow clone commit `55e6cc9f`.
- License boundary: Apache-2.0, favorable for study and possible integration, but editor source, UI text, canvas behavior, palette model, node definitions, credentials UI, and built-in node behavior must not be copied into the future MIT product.
- Source boundary: selected `@node-red/editor-client/src/js` and `@node-red/nodes/core` JavaScript files.
- Path note: Node-RED source files under `packages/node_modules` were copied into `packages/modules` inside the ignored Graphify scope because Graphify excludes `node_modules` path segments. This is analysis-only path normalization.
- Run workspace: ignored `research/graphify/runs-ast/node-red-editor-nodes-modules`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 131.
- Nodes: 1,120.
- Edges: 1,947.
- Communities: 131.
- Top hubs from Graphify summary: `redraw()`, `init()`, `showQuickAddDialog()`, `importNodes()`, `updateSelection()`.
- Sensitive files skipped by detection: 0.

## Findings

- The editor canvas is the largest structural area: redraw, selection, ports, mouse handling, grouping, layout, node dimensions, and workspace navigation.
- Import/export and change review are first-class UX capabilities: node import, conversion, replace behavior, diff panels, conflict handling, and deployment controls are visible.
- Palette and module installation surfaces appear as separate communities, which is important if third-party automation extensions are ever allowed.
- Edit dialogs, config nodes, credentials inputs, subflow input/output/status, and environment controls form a large portion of the authoring experience.
- Built-in node families such as MQTT, HTTP, split/join, batch, TCP, and CSV parsing confirm that generic automation quickly expands beyond ERP scope.

## Product Implications

- A native ERP automation builder should start with constrained domain actions instead of a general-purpose visual programming canvas.
- Expected first workflows: approval routing, record-change triggers, email/webhook notifications, scheduled exports, customer/project alerts, and integration sync jobs.
- Visual editing can be postponed or limited to a structured rule builder if the MVP needs speed and auditability.
- If a full flow builder is required later, security requirements must include credential isolation, plugin approval, tenant-safe execution, execution logs, and deployment review.

## Anti-Copy Notes

- Do not copy Node-RED canvas code, node palette UX, import/export formats, built-in node implementations, dialog structures, credentials UI, help text, icons, examples, or editor shortcut behavior.
- Capability-level inspiration is acceptable: visual flow editing, node palette, import/export, deployment review, subflows, credentials, debug messages, and runtime status.
