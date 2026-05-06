# Kimai

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, Symfony path evidence, API controller evidence, entity evidence, invoice evidence, and translation evidence; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
À faire: Legal review, service billing fit review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
Attendu: Use this fiche as the main time-tracking and service-billing functional reference, while keeping AGPL source reuse blocked for the MIT target.

## Identity

- Project: Kimai.
- Repository: https://github.com/kimai/kimai.
- Primary site: https://www.kimai.org.
- Date checked: 2026-05-06.
- Checked ref: `main` branch at commit `ebb54e9c0c5c6ae342bcff3bf63beebfda838cfd`, reported as default branch by `gh repo view kimai/kimai`.
- Repository metadata evidence: `gh repo view kimai/kimai --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned homepage `https://www.kimai.org`, latest release `2.56.0` published 2026-04-27, licenseInfo `GNU Affero General Public License v3.0`, primary language PHP, and updatedAt `2026-05-06T05:00:54Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `composer.json`, `config`, `src/Entity`, `src/API`, `src/Controller`, `src/Invoice`, `src/Timesheet`, `src/Project`, `src/Customer`, `src/Repository`, `templates`, `translations`, `assets`, `Dockerfile`, and `.github/workflows` at the checked ref.

## License

- Declared license: AGPL-3.0.
- Evidence: `gh api repos/kimai/kimai/license` returned path `LICENSE` with SPDX `AGPL-3.0`; GitHub metadata reports GNU Affero General Public License v3.0.
- Reuse classification: `functional reference only`.
- Rationale: AGPL-3.0 blocks direct source-level reuse for a future MIT implementation. Kimai can inform independent functional specs for time tracking, projects, billing, and invoicing.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: repository is centered on time tracking and service billing rather than full ERP.
- CRM rating: `Partial`. Evidence: `src/Entity/Customer.php`, customer controllers, customer repositories, customer comments, rates, and customer reports exist. Unknown rationale: lead, opportunity, campaign, and sales pipeline management were not verified.
- Accounting/invoicing/tax rating: `Partial`. Evidence: `src/Invoice`, invoice controllers, invoice entities/templates, tax entities, invoice renderers for PDF/docx/ods/xlsx, and invoice calculation paths exist. Unknown rationale: general ledger, accounts receivable/payable, statutory tax filing, and payroll accounting were not verified.
- HR/time/leave/payroll rating: `Strong` for time tracking and working time; `Weak` for HR/payroll. Evidence: `src/Timesheet`, `src/Entity/Timesheet.php`, `src/Entity/WorkingTime.php`, user/team entities, rate calculations, reports, exports, and tracking modes are present. Unknown rationale: employee HR master data, leave, benefits, and payroll were not verified.
- Services/subscriptions/projects rating: `Strong` for services/projects/time billing; `Weak` for subscriptions. Evidence: entities and controllers cover customers, projects, activities, teams, timesheets, rates, budgets, invoices, exports, and reports. Unknown rationale: recurring subscription billing and entitlements were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified.

## Architecture And Operations

- Stack: Symfony/PHP application with Twig templates, Doctrine entities/repositories, REST API controllers, Webpack/asset pipeline, translations, Dockerfile, and GitHub workflows. Evidence: `composer.json`, `config`, `src`, `templates`, `translations`, `assets`, and `Dockerfile`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: repository description and README position Kimai as on-premise or SaaS; Dockerfile exists. Unknown rationale: Kubernetes, Helm, tenant isolation, and update windows were not verified in the repository.
- API/integration maturity: `Strong`. Evidence: `src/API` contains controllers for actions, activities, authentication, configuration, customers, exports, invoices, projects, status, tags, teams, timesheets, users, and API models; API docs templates for Swagger UI and Stoplight exist under `templates/bundles/NelmioApiDocBundle`.
- Internationalization/localization: `Strong` for UI translation coverage. Evidence: `translations` includes many locale files including French, Swiss German, Portuguese variants, and domain-specific translation files. Unknown rationale: Canada/Quebec statutory tax, labor, and payroll localization were not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec statutory module was identified. French translation and configurable invoices can help UX localization but do not prove local compliance.
- UX and product quality: `Partial`. Evidence: templates cover dashboards, customers, projects, timesheets, reports, invoice rendering, widgets, wizard, profile, and permissions; frontend assets include calendar, dashboard, invoice, and form scripts. Unknown rationale: no hands-on UI or accessibility audit was performed.

## Risks

- License risk: `High`. AGPL-3.0 blocks source-level reuse for the MIT target.
- Anti-copy risk: `High`. Timesheet entities, invoice rendering, rate calculations, API paths, translations, templates, and reporting structures must not be copied.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `2.56.0` was published on 2026-04-27 and repository metadata updated on 2026-05-06. Unknown rationale: plugin compatibility, enterprise feature boundaries, and long-term support policy were not audited.
- Security risk: `Partial`. Evidence: API authentication, security controllers, SAML controller, login link, password reset, two-factor config, rate limiter config, permissions, and roles are present. Unknown rationale: advisory history and dependency vulnerability scan were not performed.
- Dependency risk: `Partial`. Evidence: Symfony, Doctrine, Twig, API documentation, two-factor, and frontend asset dependencies appear through repository structure and package files. Unknown rationale: lockfile state and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `src/API`, `src/Controller/TimesheetController.php`, `src/Timesheet`, `src/Invoice`, `src/Project`, `src/Customer`, `src/Entity`, `src/Repository`, `templates/invoice`, `templates/project`, `templates/customer`, `templates/dashboard`, and `translations`.
- Reason: Kimai is highly relevant to a service-company core for time tracking, project billing, and invoice generation. AGPL means analysis must feed original functional specs only.
