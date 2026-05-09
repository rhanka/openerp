# NocoDB

## Evidence

- Date checked: 2026-05-09.
- Public sources checked: GitHub repository `nocodb/nocodb`, GitHub organization `nocodb`, raw license file, and public repository metadata.
- Product position: free, self-hostable Airtable alternative and no-code interface for databases.
- Repository evidence observed: TypeScript/Vue stack, API documentation repository, Docker/self-hosting materials, enterprise compose repository, and public release metadata.
- Current activity signal: GitHub page showed latest release `2026.04.5` published 2026-04-30 and repository update activity in April 2026.

## License And Reuse

- Declared license evidence conflicted across public surfaces: repository page text referenced a Sustainable Use License, while the raw `LICENSE` checked from `master` contained AGPL-3.0 text.
- Reuse classification: `functional reference only` until legal review resolves the active license model and file-level terms.
- Source reuse guardrail: no source, schema, API, UI, examples, templates, docs, or deployment files should be copied into a MIT target.
- Enterprise guardrail: `nocodb-ee-compose` and any enterprise distribution material are outside reuse scope.

## Collaboration Coverage

- Strong for database-backed collaborative tables, forms, views, external database introspection, API generation, and self-hosted data interfaces.
- Relevant collaboration behaviors: shared bases, grid-like editing, views, forms, role permissions, comments/activity if enabled, and integrations.
- Less direct for project management: like Baserow, NocoDB can model work but is not primarily a project execution suite.

## ERP CRM Fit

- ERP fit: strong reference for exposing relational data as collaborative workspaces over PostgreSQL, MySQL, SQLite, or other databases.
- CRM fit: useful for custom contact/account tables, support request trackers, and ad hoc operational registers.
- Weak areas: statutory accounting, payroll, tax, manufacturing execution, warehouse operations, and full CRM sales process depth.
- Best OpenERP adjacency: admin-configurable business tables connected to existing ERP data, with forms and APIs for internal operations.

## Architecture Notes

- Stack evidence: TypeScript, Vue, database connectors, REST API positioning, self-hosted packaging, and API docs.
- Architecture signal: NocoDB is especially relevant where OpenERP wants to put a collaborative UI over existing relational data.
- Risk signal: license uncertainty and source-available references mean architecture study should stay conceptual.

## Self-Hosted And Kubernetes

- Self-host support: strong via Docker and public self-host positioning.
- Kubernetes support: not confirmed as first-party during this check.
- Operational notes: connecting directly to business databases creates security, tenancy, audit, migration, and permission risks that are central for ERP use.

## I18n And Localization

- UI localization was not deeply audited in this pass.
- Business localization: no Canada/Quebec statutory accounting, tax, HR, or payroll compliance was identified.
- OpenERP use: relevant as generic database workspace evidence, not statutory localization evidence.

## Anti-Copy Notes

- Do not copy data model names, generated API conventions, UI flows, database adapter code, docs, examples, branding, or enterprise deployment material.
- Avoid coupling OpenERP directly to NocoDB-style table exposure without an independent security model.
- Use only high-level lessons about database-backed collaboration and schema-aware UI.

## OpenERP Takeaways

- NocoDB is a strong functional reference for turning structured data into collaborative internal tools.
- License ambiguity blocks source reuse for this MIT-target study.
- OpenERP should build an original custom-table/workspace layer with strict permission, audit, and tenant controls rather than exposing raw ERP database structures.
