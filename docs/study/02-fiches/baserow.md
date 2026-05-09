# Baserow

## Evidence

- Date checked: 2026-05-09.
- Public sources checked: GitHub repository `baserow/baserow`, Baserow documentation, installation pages, and repository metadata visible from GitHub.
- Product position: open-source no-code database workspace and Airtable alternative with databases, application builder, automations, dashboards, API-first access, and self-hosting.
- Repository evidence observed: `backend`, `web-frontend`, `enterprise`, `premium`, `deploy`, `docs`, `docker-compose.yml`, `docker-compose.all-in-one.yml`, `docker-compose.no-caddy.yml`, `LICENSE`, `README.md`, and API documentation links.
- Current activity signal: GitHub page showed active repository updates in late 2025 and README version `2.2.2`; Baserow docs and GitHub page were public and current at the check date.

## License And Reuse

- Declared model: open-core, with non-premium and non-enterprise features under MIT according to the public README.
- Reuse classification: `usable with boundary review` for MIT-covered core code only.
- Source reuse guardrail: exclude `premium`, `enterprise`, paid-plan material, hosted-service assets, trademarks, copy text, screenshots, and any files whose license header or folder policy differs from MIT.
- Dependency guardrail: verify Python, JavaScript, Vue, SCSS, Docker image, and Helm chart dependency licenses before any vendoring.

## Collaboration Coverage

- Strong fit for shared data tables, forms, grid views, field-level configuration, API-backed workspaces, internal dashboards, and lightweight process databases.
- Relevant collaboration behaviors: shared workspaces, permissions, table views, forms, comments or row-level activity where available, automations, and application portals.
- Less direct fit for classic project execution: Baserow can model tasks and workflows, but it is not primarily a full project planning suite with issue lifecycle, release planning, or sprint/cycle ceremonies.

## ERP CRM Fit

- ERP fit: useful as a flexible record workspace for auxiliary business data, intake forms, operational registers, and internal tools.
- CRM fit: useful for lightweight account/contact/opportunity prototypes, but weaker than a CRM-native product for pipeline automation, sales activities, forecasting, and customer timeline depth.
- Strongest OpenERP adjacency: custom tables around customers, service requests, equipment lists, approvals, and project intake where a rigid ERP module would slow teams down.
- Weak areas: statutory accounting, payroll, inventory costing, manufacturing execution, procurement, and tax compliance.

## Architecture Notes

- Stack evidence: Django/Python backend, Vue.js frontend, PostgreSQL database, Docker packaging, docs, API docs, and plugin-oriented repository organization.
- Architecture signal: table/field/view abstractions are mature enough to study for a generic custom-object layer, but implementation details must be revalidated before reuse.
- API signal: public API documentation and OpenAPI schema are first-class product surfaces.
- Edition boundary: `enterprise` and `premium` directories require explicit exclusion unless legal review says otherwise.

## Self-Hosted And Kubernetes

- Self-host support: strong. Public docs list Docker, Docker Compose, all-in-one Docker, and other deployment options.
- Kubernetes support: present through Helm documentation and a chart repository; docs describe prerequisites for Kubernetes clusters and Helm 3.
- Operational notes: deployment includes PostgreSQL, Redis, object storage/S3 options, Caddy/TLS options, and environment configuration in documented paths.

## I18n And Localization

- UI localization appears supported through the web frontend and public product docs.
- Business localization: no Canada/Quebec accounting, tax, HR, or payroll compliance was identified.
- OpenERP use: treat Baserow localization as UI-language evidence, not statutory ERP localization evidence.

## Anti-Copy Notes

- Do not copy table templates, UI layouts, field labels, automation editor flows, API schema names, docs, screenshots, icons, brand assets, or premium/enterprise behavior.
- Acceptable study use: independently describe generic requirements such as custom objects, fields, views, permissions, forms, webhooks, and import/export.
- If MIT code reuse is considered later, perform file-level license verification and preserve notices.

## OpenERP Takeaways

- Baserow is the strongest permissive candidate in this work-management/database lot.
- OpenERP can use it as a reference for a custom workspace layer: tables, typed fields, saved views, forms, permissions, and API-first access.
- Keep the MVP smaller than Baserow: start with custom records linked to CRM/projects, import/export, views, and audit history before adding full no-code app building or automations.
