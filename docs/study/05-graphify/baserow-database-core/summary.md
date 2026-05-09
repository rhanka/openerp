# Baserow Database Core Graphify Summary

## Provenance

- repository URL: https://github.com/baserow/baserow
- HEAD commit: `9b56c3f`
- date checked: 2026-05-09
- license evidence: root `LICENSE` plus repository evidence; core MIT/open-core
  boundaries require directory-level review.
- local source: `research/sources/baserow`
- Graphify workspace: `research/graphify/baserow-database-core`
- runtime proof: `research/graphify/baserow-database-core/.graphify/.graphify_runtime.json` contains `"runtime": "typescript"`.
- Graphify outputs: `graph.json`, `graph.html`, and `GRAPH_REPORT.md` in the ignored workspace.

## Scope

modules inspected:

- `backend/src/baserow/contrib/database/table`
- `backend/src/baserow/contrib/database/fields`
- `backend/src/baserow/contrib/database/views`
- `backend/src/baserow/contrib/database/rows`
- `backend/src/baserow/contrib/database/tokens`
- `backend/src/baserow/contrib/database/webhooks`
- selected `backend/src/baserow/contrib/database/api` submodules for tables,
  fields, views, and rows.

The run intentionally excluded `premium` and `enterprise` directories.

Graph result:

- 180 included files.
- 4254 nodes.
- 54556 graph links.
- 78 communities.

This run is AST-oriented. Non-code files were limited to license and readme
context; the study summary below is rewritten in OpenERP language.

## Communities Observed

The main hubs were `Field`, `Table`, `ViewHandler`, `View`, `LinkRowField`,
`GeneratedTableModel`, `LinkRowFieldType`, `FieldObject`,
`FieldDoesNotExist`, and `FormView`.

The graph highlights an architecture centered on table metadata, dynamic field
types, view handlers, row operations, link-row relations, generated data models,
filters, constraints, tokens, and webhooks.

## Functional Findings In OpenERP Language

- OpenERP can support configurable operational views without turning every
  customer data need into a custom module. The useful abstraction is typed
  views over ERP/CRM-owned objects.
- Field types need explicit governance. For ERP/CRM, custom fields should be
  tenant-scoped, permission-aware, exportable, and compatible with audit and
  reporting.
- Linked records are powerful but risky. OpenERP should define typed
  relationships between business objects before allowing user-defined links.
- Form views and public submission surfaces are useful for customer intake,
  service requests, internal approvals, and manufacturing quality checks.
- Webhooks and API tokens are important extension points, but should inherit
  tenant isolation, audit logging, and rate controls from foundation.

## License And Reuse Boundary

Baserow is useful because the core has MIT/open-core evidence, but this is not
a blanket reuse approval. Any technical study must exclude premium and
enterprise paths and confirm file-level licensing before reuse.

## Anti-Copy Limitations

- anti-copy: do not copy Baserow source, field names, API shapes, form/view UI,
  validation text, migrations, tests, fixtures, webhooks, templates, or docs.
- anti-copy: avoid recreating an Airtable-like product surface as a generic
  workspace. OpenERP should expose configurable ERP/CRM views only where they
  serve business workflows.
- anti-copy: future implementation must start from OpenERP functional specs,
  not from this source tree or Graphify graph.
