# Plane

## Evidence

- Date checked: 2026-05-09.
- Public sources checked: GitHub repository `makeplane/plane`, GitHub organization `makeplane`, public README, and repository metadata.
- Product position: modern open-source project management platform for work items, cycles, modules, views, pages, analytics, docs, and triage.
- Repository evidence observed: `apps`, `packages`, `deployments`, `docs`, `docker-compose.yml`, `docker-compose-local.yml`, `LICENSE.txt`, `README.md`, and developer documentation links.
- Current activity signal: GitHub organization page showed `makeplane/plane` updated 2026-05-06; repo page showed latest release `v1.3.0` from 2026-04-06 and official Helm charts updated 2026-05-08.

## License And Reuse

- Declared license: AGPL-3.0 for the main `makeplane/plane` repository.
- Reuse classification: `functional reference only`.
- Related permissive artifacts: some SDK or MCP repositories in the organization show MIT, but the main product source is AGPL-3.0.
- Source reuse guardrail: do not copy main product code, UI, workflow names, docs, API shapes, database models, deployment files, or tests.

## Collaboration Coverage

- Strong project collaboration coverage: work items, cycles, modules, saved views, pages, analytics, docs, issue references, file uploads, and project/team workflows.
- Relevant behaviors: sprint/cycle planning, product modules, rich text collaboration, shared filtered views, and triage queues.
- Database workspace coverage: weak compared with Baserow/NocoDB; Plane is project/work management first.

## ERP CRM Fit

- ERP fit: strong as a reference for service/project execution and internal work coordination.
- CRM fit: useful when customer opportunities or accounts need attached tasks, delivery plans, and support work; not a full sales CRM.
- Weak areas: accounting, tax, payroll, inventory, manufacturing, purchasing, and statutory compliance.
- Best OpenERP adjacency: project delivery tasks, customer implementation plans, service case work, release/change tracking, and internal triage.

## Architecture Notes

- Stack evidence: TypeScript-heavy repository with Python/Django components, React Router, Node.js, PostgreSQL, Redis, Docker, docs, and deployment paths.
- Architecture signal: useful reference for modern issue/project UX and rich text pages connected to work items.
- API/integration signal: organization contains SDK and MCP repositories, but main product API compatibility was not audited in this pass.
- Edition/product signal: cloud and self-host are both public product paths.

## Self-Hosted And Kubernetes

- Self-host support: documented from the README through deployment guides and Docker.
- Kubernetes support: README links Kubernetes deployment; organization has official Helm charts.
- Operational notes: self-hosting a project platform requires attention to PostgreSQL, Redis, file storage, background jobs, email, auth, and upgrades.

## I18n And Localization

- UI localization was not deeply audited in this pass.
- Business localization: no Canada/Quebec statutory accounting, tax, HR, or payroll support was identified.
- OpenERP use: product-management language and collaboration UX are relevant; statutory localization is not.

## Anti-Copy Notes

- Do not copy Plane's work item labels, cycle/module UX, pages editor behavior, analytics layouts, issue properties, docs, deployment manifests, screenshots, or API contracts.
- Use independently written requirements such as "project work items need customer links, rich notes, saved views, and delivery cycles."
- AGPL-3.0 blocks source-level reuse for the MIT target.

## OpenERP Takeaways

- Plane is one of the best references for polished project/work collaboration, but it is not a reuse source for MIT code.
- OpenERP should adopt the lesson that service work needs first-class views, triage, rich notes, and project grouping.
- Keep OpenERP's implementation ERP-native: link work items to customers, quotes, invoices, support cases, and delivery milestones.
