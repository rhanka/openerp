# Vikunja

## Evidence

- Date checked: 2026-05-09.
- Public sources checked: GitHub repository `go-vikunja/vikunja`, Vikunja installation docs, Vikunja documentation index, and public repository metadata.
- Product position: self-hostable task and project application with web frontend, API, desktop/mobile clients, integrations, migration paths, sharing, and notifications.
- Repository evidence observed: Go, TypeScript, Vue, SCSS language mix; public docs for install, configuration, API, permissions, webhooks, OAuth 2.0 authorization server, LDAP, OpenID, plugins, migrations, tests, and translations.
- Current activity signal: public docs were current at the check date; GitHub repository and docs showed modern consolidated API/frontend packaging.

## License And Reuse

- Declared license: AGPL-3.0 based on checked public license evidence and project distribution model.
- Reuse classification: `functional reference only`.
- Source reuse guardrail: do not copy code, API routes, permission model, UI, migration logic, docs, mobile/desktop packaging, or deployment examples into the MIT target.
- Dependency guardrail: even for reference-only study, note that task apps commonly include calendar, mail, auth, and notification dependencies that would need separate review in an implementation.

## Collaboration Coverage

- Strong for personal/team task management: projects, tasks, sharing, reminders, labels, saved filters, comments/activity where available, notifications, migration from other tools, and webhooks.
- Relevant behaviors: permissions, OpenID/LDAP auth, OAuth server, API, n8n integration, plugins, CLI, and migration tools.
- Less complete for portfolio/project accounting than OpenProject or Plane, but lighter and easier to understand for task-centric workflows.

## ERP CRM Fit

- ERP fit: useful for to-do lists, service checklists, customer follow-up tasks, internal assignments, and project task slices.
- CRM fit: good reference for simple customer follow-ups, reminders, and team ownership; not a CRM-native account/opportunity system.
- Weak areas: accounting, tax, payroll, HR records, inventory, procurement, manufacturing, and statutory reporting.
- Best OpenERP adjacency: task layer embedded across CRM accounts, support tickets, projects, and operational records.

## Architecture Notes

- Stack evidence: Go backend with bundled frontend, TypeScript/Vue UI, single deployable binary/container, database support including SQLite, PostgreSQL, MySQL/MariaDB, configuration file/env model, and API documentation.
- Architecture signal: compelling operational simplicity compared with heavier collaboration platforms.
- Integration signal: public docs cover API, webhooks, CLI, n8n, OAuth, OpenID, LDAP, permissions, plugins, and migrators.

## Self-Hosted And Kubernetes

- Self-host support: strong. Public docs list binary, source build, Docker, Debian/Ubuntu, RPM, Arch, Alpine, FreeBSD, Ansible, and Docker Compose paths.
- Kubernetes support: present in docs through Kubernetes hosting and a Helm chart install option.
- Operational notes: docs emphasize UTF-8 database settings, reverse proxy setup, backups, systemd hardening, and upgrade backups.

## I18n And Localization

- Translation documentation is listed in the development docs, and UTF-8 database guidance is explicit for non-Latin characters.
- Business localization: no Canada/Quebec statutory accounting, tax, HR, or payroll support was identified.
- OpenERP use: relevant for UI translation and task text handling, not compliance localization.

## Anti-Copy Notes

- Do not copy task schemas, route names, permission implementation, docs, migration scripts, UI copy, icons, or deployment snippets.
- Use only independently written lessons: tasks need sharing, reminders, labels, filters, auth integration, webhooks, and simple deployment.
- AGPL-3.0 blocks source reuse for the MIT target.

## OpenERP Takeaways

- Vikunja is the best lightweight task-management reference in this batch, especially for self-host simplicity.
- OpenERP should build a native task layer with customer/project/support links, reminders, shared ownership, and API/webhook hooks.
- A single-service deployment lesson is useful: collaboration features should not require a large platform footprint for small OpenERP installs.
