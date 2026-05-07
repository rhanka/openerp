# Graphify Summary: Twenty Object Metadata

## Progress

Fait: AST-only Graphify extraction completed for the Twenty object metadata and client SDK metadata scope with TypeScript runtime proof.
À faire: Inspect server-side metadata ownership and workflow interactions, then translate extensibility findings into original functional requirements; overall study is about 74% complete.
Attendu: Use this run as the main evidence that Twenty's product architecture is metadata-driven, while keeping generated API/schema details outside the MIT implementation boundary.

## Provenance

- Source repo: https://github.com/twentyhq/twenty.
- Branch/ref: `main` at local shallow clone commit `83c40bb8`.
- Source boundary: code-only scope derived from frontend `object-metadata` and client SDK `metadata` code.
- Run workspace: ignored `research/graphify/runs-ast/twenty-object-metadata`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only; non-code semantic files were excluded from this first pass.

## Graph Stats

- Code files extracted: 178.
- Nodes: 550.
- Edges: 411.
- Communities: 161.
- Top hubs from Graphify summary: `MetadataApiClient`, `QueryBatcher`, `getProcessEnvironment()`, `getTokenFromHeaders()`, `parseRequest()`.

## Findings

- `MetadataApiClient` is the strongest hub, confirming that object metadata and generated API access are central to Twenty's extensibility model.
- The largest community is generated schema code. It includes many type guard functions around objects, fields, roles, permissions, views, workspace, users, API keys, command menu items, agents, and logic functions.
- `mapObjectMetadataToGraphQLQuery()` appears as a meaningful bridge between metadata definitions and query generation. The product lesson is generic: metadata should drive UI/query composition, but exact GraphQL generation code must not be copied.
- The graph emphasizes generated runtime helpers, batching, fetching, auth token extraction, and request parsing around metadata APIs.

## Product Implications

- A modern CRM/ERP platform should support configurable objects, fields, views, permissions, and command/action surfaces from the start if extensibility is a product pillar.
- Metadata extensibility should be bounded for MVP: custom fields and views can arrive earlier than arbitrary object engines, generated SDKs, or user-defined logic functions.
- If we implement metadata-driven UI, the spec must be original: independent naming, independent schema, independent generated-client strategy, and no copied type guards/API signatures from Twenty.

## Next Scope

- Run Twenty workflow in smaller cuts to understand how metadata, views, and automation connect.
- Inspect server-side object metadata ownership separately if frontend/client SDK evidence is insufficient.
- Feed these findings into the anti-copy dossier before any TypeScript architecture work begins.
