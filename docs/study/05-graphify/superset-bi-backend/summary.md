# Graphify Summary: Superset BI Backend

## Progress

Fait: AST Graphify extraction completed for Superset BI backend scope with TypeScript runtime proof.
À faire: Convert BI findings into a bounded reporting module and decide integration versus native rebuild; overall study is about 96% complete.
Attendu: Treat Superset as the advanced BI benchmark and likely integration target, while keeping the core ERP reporting model smaller and original.

## Provenance

- Source repo: https://github.com/apache/superset.
- Branch/ref: `master` at local shallow clone commit `b5186d1c`.
- License boundary: Apache-2.0, favorable for study and possible integration, but copied source, UI text, schemas, APIs, report templates, examples, and credential handling remain excluded from the future MIT codebase unless a dedicated reuse decision is made.
- Source boundary: `superset/charts`, `superset/dashboards`, `superset/datasets`, `superset/databases`, `superset/reports`, `superset/security`, and `superset/connectors/sqla` Python families.
- Run workspace: ignored `research/graphify/runs-ast/superset-bi-backend`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction with semantic inference for Python docstrings and API descriptions.

## Graph Stats

- Code files extracted: 63.
- Nodes: 1,207.
- Edges: 4,134.
- Communities: 91.
- Top hubs from Graphify summary: `SqlaTable`, `BaseDatasource`, `RowLevelSecurityFilter`, `SupersetSecurityManager`, `EncryptedField`.
- Sensitive files skipped by detection: 1.

## Findings

- Superset backend centers on dataset and datasource abstractions, with `SqlaTable` and `BaseDatasource` as the strongest structural anchors.
- Security is not an add-on: row-level security, datasource access, permission/view menu management, database access, and dashboard access form a large part of the graph.
- Database connection and credential safety appear as first-class concerns through encrypted fields, SSH tunnel structures, database schemas, metadata retrieval, and SQL validation.
- Chart and dashboard APIs are tightly connected to query context, cache warm-up, screenshots/thumbnails, import/export, favorites, certification, and filtering.
- Report scheduling is a distinct backend surface, including execution logs, email/webhook/Slack notifications, recipient types, and schedule CRUD.

## Product Implications

- The ERP should ship native operational reporting first: saved reports, KPI tiles, export jobs, audit-friendly filters, and role-aware access on ERP data.
- Advanced BI should be designed as a platform integration boundary: embed or connect Superset-style dashboards rather than rebuilding a full BI product inside the ERP.
- If embedded BI is supported, database credentials, row-level security, tenant isolation, guest access, cache behavior, and export permissions must be product requirements from day one.
- A future semantic dataset layer should stay original and ERP-specific: entities, metrics, dimensions, and permissions should be derived from our domain model, not copied from Superset.

## Anti-Copy Notes

- Do not copy Superset source code, REST resource shapes, schema classes, permission names, SQL Lab behavior, chart config structures, import/export YAML, report templates, notification implementations, or example data.
- Apache-2.0 makes integration legally friendlier than AGPL/GPL anchors, but the MIT project should still keep independent naming, data contracts, UI flows, and implementation structure.
