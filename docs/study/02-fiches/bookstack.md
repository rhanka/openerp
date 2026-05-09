# BookStack

## Evidence

- Date checked: 2026-05-09.
- Sources checked: GitHub repository `BookStackApp/BookStack`, raw `LICENSE`, BookStack official website, official docs index, installation docs, roles and permissions docs, user docs, and API docs.
- Repository evidence: BookStack is described as a platform for storing and organizing information and documentation, now managed on Codeberg while GitHub remains visible.
- Product evidence: official site presents BookStack as a simple, self-hosted wiki with Books, Chapters, and Pages; docs cover roles, permissions, auth, webhooks, language, attachments, diagrams, exports, imports, and API.

## License And Reuse

- Declared license: MIT, checked from repository metadata, README license section, and raw `LICENSE`.
- Reuse posture for an MIT target: potentially usable, subject to attribution, dependency review, and avoiding copy of protected non-code expression.
- Third-party dependencies have their own licenses and must be reviewed before any reuse.
- BookStack is the cleanest license candidate among this batch, but product expression and UI text still need anti-copy handling.

## Collaboration Coverage

- Strong wiki/documentation coverage with books, chapters, pages, shelves, WYSIWYG editing, Markdown editing, attachments, diagrams, exports, imports, tagging, templates, comments-adjacent workflows via docs/API where applicable, and content history/audit evidence.
- Permissions are well developed: roles, content-level permissions, group sync through LDAP/SAML, and admin controls.
- Collaboration is more asynchronous wiki collaboration than live multiplayer editing.
- Good fit for internal process manuals, policy docs, SOPs, implementation notes, and client handover knowledge bases.

## ERP CRM Fit

- ERP fit: partial as a documentation companion. BookStack does not provide accounting, stock, HR, procurement, manufacturing, or CRM modules.
- CRM fit: weak to partial. It can document customers, account procedures, onboarding guides, and support playbooks, but it is not a sales or service CRM.
- Strongest OpenERP relevance is documentation hierarchy, permission inheritance, audit visibility, API coverage, and export/import behavior.

## Architecture Notes

- Stack evidence: PHP and Laravel application with MySQL or MariaDB requirements, web server, Composer, app, routes, database, resources, lang, storage, tests, and public assets.
- The product uses a strict content hierarchy: shelves, books, chapters, and pages.
- Docs expose mature operational surfaces: auth providers, webhooks, language settings, file uploads, caching, sessions, PDF rendering, CLI commands, backups, and API.
- Architecture is conventional web app plus relational data store, making it easier to reason about than CRDT-heavy editors.

## Self-Hosted And Kubernetes

- Self-host posture: strong for classic server install and community Docker containers.
- Official installation docs provide manual and Ubuntu scripts; Docker support is community-maintained through LinuxServer.io and solidnerd images.
- Kubernetes posture: no official first-party Kubernetes chart was verified. Community guides mention Docker Swarm and other hosting options, but not a canonical Helm path.
- OpenERP should design its own container image and chart if adopting BookStack-like docs.

## I18n And Localization

- Strong UI translation process: README and docs point to Crowdin, and the repository has a `lang` directory.
- Official docs include Language and Locale configuration.
- No Canada or Quebec business rules were verified because BookStack is not an ERP statutory product.
- Useful lesson: locale choice and translation contribution process should be admin-visible and community-friendly.

## Anti-Copy Notes

- Even with MIT, do not copy BookStack UI text, docs, screenshots, demo content, icons, hierarchy wording, permission copy, or API examples without attribution and review.
- If borrowing implementation ideas, preserve license notices and verify dependency obligations.
- Avoid recreating the exact Books, Chapters, Pages product model if OpenERP needs a business-object document model.

## OpenERP Takeaways

- A simple document hierarchy can outperform a generic file dump for ERP process knowledge.
- Permission inheritance and content-level overrides are directly relevant for departments, customers, projects, and confidential finance records.
- API, export, import, audit, and backup behavior should be first-class from the start for ERP documentation.
