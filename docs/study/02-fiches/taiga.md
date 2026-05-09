# Taiga

## Evidence

- Date checked: 2026-05-09.
- Public sources checked: GitHub organization `taigaio`, repositories `taiga-docker`, `taiga-back`, `taiga-front`, and public repository metadata.
- Product position: agile project management tool with backend, frontend, events, protected-media, and Docker deployment repositories.
- Repository evidence observed: `taiga-docker` with Docker Compose deployment, `.env` configuration, gateway, launch scripts, OAuth/importer configuration, and license/contribution policy; `taiga-back` and `taiga-front` metadata.
- Current activity signal: organization page showed `taiga-front` and `taiga-back` updated 2026-03-23; deployment/docs repositories had later-2025 activity.

## License And Reuse

- Declared model: mixed by component. GitHub metadata showed `taiga-back` and deployment-related repositories as MPL-2.0, while `taiga-front` and `taiga-front-dist` were AGPL-3.0.
- Reuse classification: `functional reference only` for this study unless legal review approves isolated MPL-2.0 backend learning.
- Source reuse guardrail: because frontend AGPL and component boundaries matter, do not copy source, schemas, UI, docs, or deployment files into the MIT target.
- Contribution policy note: Taiga Docker README states accepted patches must be compatible with MPL-2.0, but that does not remove AGPL constraints from frontend components.

## Collaboration Coverage

- Strong agile collaboration reference: projects, backlogs, issues, epics/user stories, task boards, sprints, wiki-like project context, imports, notifications, and integrations.
- Relevant behaviors: Scrum/Kanban planning, GitHub/GitLab import or auth paths, Slack integration, public registration configuration, and team project workflows.
- Database workspace coverage: weak; Taiga is work management rather than no-code database.

## ERP CRM Fit

- ERP fit: useful for project/service delivery workflows, especially implementation tasks and agile teams.
- CRM fit: indirect. It can attach work to customers in an ERP-owned model, but it is not sales CRM.
- Weak areas: accounting, tax, payroll, inventory, procurement, manufacturing, and statutory reporting.
- Best OpenERP adjacency: customer implementation boards, internal product delivery, issue handling, and support backlog workflows.

## Architecture Notes

- Stack evidence: Python backend, CoffeeScript/JavaScript frontend distribution, events service, protected-media service, Docker Compose deployment, PostgreSQL configuration, and gateway service.
- Architecture signal: mature separation of backend, frontend, events, async behavior, and deployment config.
- Risk signal: older frontend technology and mixed licensing reduce attractiveness as a direct platform reference.

## Self-Hosted And Kubernetes

- Self-host support: strong via `taiga-docker` and Docker Compose instructions.
- Kubernetes support: no first-party Helm/Kubernetes deployment was confirmed in this pass.
- Operational notes: production deployments are expected to use a stable branch and `.env` hardening; auth/import integrations need explicit configuration.

## I18n And Localization

- Taiga has long-standing multilingual/community orientation, but UI localization files were not deeply audited in this pass.
- Business localization: no Canada/Quebec statutory accounting, tax, HR, or payroll compliance was identified.
- OpenERP use: project UI localization may inform translation coverage expectations, not statutory ERP localization.

## Anti-Copy Notes

- Do not copy agile terminology, board layouts, user story flows, importer logic, frontend code, API structures, docs, or deployment scripts.
- Use high-level agile requirements only after rewriting them in OpenERP terms.
- Treat mixed MPL/AGPL component boundaries as a legal review item, not an engineering shortcut.

## OpenERP Takeaways

- Taiga remains a useful agile project-management reference, especially for service and implementation teams.
- License mix and older frontend stack make it less attractive than permissive or modern references.
- OpenERP should support lightweight agile boards tied to customers/projects, but avoid reproducing Taiga-specific ceremonies or UI structure.
