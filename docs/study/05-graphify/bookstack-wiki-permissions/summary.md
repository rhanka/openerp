# BookStack Wiki Permissions Graphify Summary

## Provenance

- repository URL: https://github.com/BookStackApp/BookStack
- HEAD commit: `50d3be4`
- date checked: 2026-05-09
- license evidence: `LICENSE` in the cloned repository declares MIT.
- local source: `research/sources/bookstack`
- Graphify workspace: `research/graphify/bookstack-wiki-permissions`
- runtime proof: `research/graphify/bookstack-wiki-permissions/.graphify/.graphify_runtime.json` contains `"runtime": "typescript"`.
- Graphify outputs: `graph.json`, `graph.html`, and `GRAPH_REPORT.md` in the ignored workspace.

## Scope

modules inspected:

- `app/Entities`
- `app/Permissions`
- `app/Api`
- `app/Search`
- `app/Exports`
- `app/References`

Graph result:

- 162 included files.
- 1220 nodes.
- 1447 graph links.
- 152 communities.

This run is AST-oriented. Non-code files were limited to license and readme
context; the study summary below is rewritten in OpenERP language.

## Communities Observed

The main hubs were `Entity`, `SearchRunner`, `PageController`, `PageContent`,
`TrashCan`, `ExportFormatter`, `ChapterController`, `ZipImportRunner`,
`JointPermissionBuilder`, and `BookController`.

The graph points to a product architecture centered on content entities,
permission derivation, search, imports/exports, references, and API formatting.
The most useful signal for OpenERP is the separation between content hierarchy,
access calculation, search indexing, lifecycle operations, and external API
surface.

## Functional Findings In OpenERP Language

- Business documentation should be a first-class object family, not only file
  attachments. Customer, project, contract, procedure, and handover knowledge
  should support hierarchy and permissions.
- Permission inheritance matters. OpenERP should support inherited access from
  organization, department, customer/project space, and document object, with
  explicit overrides where needed.
- Search should treat documents, comments, tags, and business references as one
  operational corpus while preserving tenant and object permissions.
- Import and export should be planned early for self-hosted customers,
  backups, legal review, client handover, and migration between instances.
- API formatting should be stable enough for integrations, but OpenERP should
  define its own resource names and payloads from OpenERP specs.

## License And Reuse Boundary

BookStack is the cleanest collaboration knowledge-base candidate in this wave
because the main project is MIT. Technical inspiration can be considered only
after attribution, dependency, asset, and non-code expression review.

## Anti-Copy Limitations

- anti-copy: do not copy BookStack source, UI labels, documentation text,
  screenshots, demo data, route names, API examples, permission wording, import
  templates, or hierarchy terminology.
- anti-copy: do not reproduce the exact BookStack product model when OpenERP
  needs ERP/CRM object-bound spaces and documents.
- anti-copy: future implementation must start from OpenERP functional specs,
  not from this source tree or Graphify graph.
