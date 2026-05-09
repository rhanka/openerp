# AppFlowy

## Evidence

- Date checked: 2026-05-09.
- Sources checked: GitHub repository `AppFlowy-IO/AppFlowy`, raw `LICENSE`, AppFlowy Docs start page, AppFlowy Cloud product page, self-hosting guide, AppFlowy Cloud deployment and architecture docs, translation docs, and pricing page.
- Repository evidence: GitHub describes AppFlowy as an AI collaborative workspace for projects, wikis, and teams, built with Flutter and Rust, with AGPLv3 license.
- Documentation evidence: AppFlowy Docs describe local data control, native clients, notes, wikis, projects, databases, kanban, calendar, Cloud sync, self-hosted Cloud, and translation workflow.

## License And Reuse

- Declared license: AGPL-3.0 for the main repository, checked from `LICENSE` and repository metadata.
- AppFlowy also has AppFlowy-Cloud, AppFlowy-Web, commercial self-host material, and pricing tiers; these require separate boundary review.
- Reuse posture for an MIT target: reference material only. Do not reuse source, schemas, client/server protocol details, docs, UI text, tests, sample data, or self-host commercial material.
- AppFlowy is valuable for product study, but AGPL and commercial boundaries make direct technical reuse unsuitable without legal approval.

## Collaboration Coverage

- Strong coverage for notes, wikis, projects, workspaces, databases, kanban, calendar, mobile and desktop usage, sync, AI assistance, and team membership.
- AppFlowy Cloud docs state that Cloud enables backup, multi-device access, team invitations, Spaces, and optional AI.
- Self-hosting docs note that collaborative editing in the AppFlowy app with AppFlowy Cloud had limitations in the checked guide, including UI refresh behavior after sync; treat real-time behavior as evolving.
- Best fit is private team workspace plus structured knowledge, not regulated ERP operations.

## ERP CRM Fit

- ERP fit: weak to partial. AppFlowy can support project notes, team wikis, task boards, planning databases, and operational checklists, but no native accounting, stock, procurement, payroll, manufacturing, or tax module was verified.
- CRM fit: partial through configurable pages and databases. It can model contact notes and customer workspaces, but no first-party CRM lifecycle module was verified.
- Useful OpenERP adjacency: customer workspace pages, project delivery docs, internal procedures, onboarding, and lightweight task collaboration.

## Architecture Notes

- Client stack: Flutter and Rust, with native desktop and mobile focus.
- Cloud architecture: AppFlowy Cloud docs describe GoTrue, AppFlowy-Cloud, Postgres, Redis, Minio, user admin web UI, web socket path, PgAdmin, and Portainer in the deployment architecture.
- AppFlowy favors native experience, offline/local workflows, and configurable building blocks.
- The architecture suggests a clear split between native clients, sync services, identity, storage, and file handling.

## Self-Hosted And Kubernetes

- Self-host posture: strong for Docker Compose. AppFlowy Cloud deployment docs target a single machine with Docker and routes for `/gotrue`, `/api`, `/ws`, `/web`, `/pgadmin`, `/minio`, and `/portainer`.
- AppFlowy app can be configured to connect to a self-hosted AppFlowy Cloud server.
- Kubernetes posture: no official Kubernetes chart was verified in the checked docs. A Kubernetes deployment would need custom manifests for auth, API, web sockets, Postgres, Redis, object storage, ingress, secrets, and backup.
- OpenERP should not assume AppFlowy self-host packaging maps directly to a multi-tenant Kubernetes ERP deployment.

## I18n And Localization

- Translation docs are mature enough to show source file paths, inlang workflow, language file generation, and supported locale registration.
- The project has `project.inlang` assets and translation instructions.
- No Canada or Quebec business localization was verified.
- For OpenERP, reuse the process lesson: make translation files contributor-friendly, but keep statutory localization separate from UI strings.

## Anti-Copy Notes

- Do not copy AppFlowy source, Flutter/Rust implementation details, UI copy, pricing text, deployment templates, admin flows, database schemas, or cloud service routes.
- Treat AppFlowy Cloud and commercial self-hosting as product references only.
- Avoid reproducing AppFlowy’s Notion-alternative positioning, template phrasing, and workspace terminology too closely.

## OpenERP Takeaways

- Native-feeling collaboration can matter for ERP users who work offline or across devices.
- A self-hosted workspace needs an explicit split between identity, sync, storage, files, admin, and observability.
- OpenERP should add collaboration as ERP-aware pages, task boards, and shared notes anchored to customers, projects, invoices, and support records.
