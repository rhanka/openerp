# OrangeHRM

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, plugin path evidence, installer evidence, API path evidence, and translation evidence; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
À faire: Edition boundary review, Canada/Quebec HR/payroll localization review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
Attendu: Use this fiche as a mature HRM functional reference, while treating source-level reuse as blocked for the MIT target because of GPL.

## Identity

- Project: OrangeHRM.
- Repository: https://github.com/orangehrm/orangehrm.
- Primary site: https://www.orangehrm.com.
- Date checked: 2026-05-06.
- Checked ref: `main` branch at commit `d3a50a814c3098fde81b99abfaacd8cb5a787429`, reported as default branch by `gh repo view orangehrm/orangehrm`.
- Repository metadata evidence: `gh repo view orangehrm/orangehrm --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned latest release `v5.8.1` published 2026-04-06, licenseInfo `GNU General Public License v3.0`, primary language PHP, and updatedAt `2026-05-05T17:51:42Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `composer.json`, `package.json`, `src/plugins/orangehrmPimPlugin`, `src/plugins/orangehrmLeavePlugin`, `src/plugins/orangehrmTimePlugin`, `src/plugins/orangehrmAttendancePlugin`, `src/plugins/orangehrmRecruitmentPlugin`, `src/plugins/orangehrmPerformancePlugin`, `src/plugins/orangehrmClaimPlugin`, `src/plugins/orangehrmDashboardPlugin`, `src/plugins/orangehrmCorePlugin`, `installer`, `installer/Migration`, `installer/client`, `devTools/generate`, and translation paths under `installer/Migration` at the checked ref.

## License

- Declared license: GPL-3.0.
- Evidence: `gh api repos/orangehrm/orangehrm/license` returned path `LICENSE` with SPDX `GPL-3.0`; GitHub metadata reports GNU General Public License v3.0.
- Reuse classification: `functional reference only`.
- Rationale: GPL-3.0 blocks direct source-level reuse for a future MIT implementation. OrangeHRM can inform written HRM specs, but plugin code, APIs, UI copy, migrations, tests, fixtures, translation strings, and data schemas must not be copied.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: repository is HRM-focused rather than a general ERP suite.
- CRM rating: `Weak`. Evidence checked: no sales CRM, pipeline, or opportunity module was identified.
- Accounting/invoicing/tax rating: `Weak` to `Partial` for expense claims only. Evidence: `src/plugins/orangehrmClaimPlugin` exists. Unknown rationale: general ledger, invoicing, payroll accounting, and tax filing were not verified.
- HR/time/leave/payroll rating: `Strong` for HRM, time, leave, attendance, recruitment, and performance; `Weak` for payroll in this repository. Evidence: plugin paths include PIM, leave, time, attendance, recruitment, performance, claim, admin, authentication, OAuth, dashboard, and core APIs. Unknown rationale: payroll statutory calculation was not identified in the checked path scan.
- Services/subscriptions/projects rating: `Partial` for service-company time tracking. Evidence: `src/plugins/orangehrmTimePlugin` includes customer, project, project activity, timesheet, employee report, and project report APIs. Unknown rationale: billing, subscriptions, contracts, and project accounting are outside the checked HR scope.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified.

## Architecture And Operations

- Stack: PHP HRM system with plugin architecture, Vue and TypeScript frontend areas, Twig templates, Composer, package metadata, installer, migrations, API controllers, and developer generation tools. Evidence: language metadata, `composer.json`, `package.json`, `src/plugins`, `installer`, `installer/client`, and `devTools/generate`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: repository includes `Dockerfile`, installer, upgrader, system checks, migrations, and CLI install paths. Unknown rationale: Kubernetes, Helm, multi-tenant SaaS, and self-hosted update support windows were not verified.
- API/integration maturity: `Partial` to `Strong` for HR API organization. Evidence: plugin paths include many `Api`, `Controller`, `Dao`, `Service`, `Dto`, and `config/routes.yaml` directories; `devTools/generate/create-api.sh` and OpenAPI generation tooling are present. Unknown rationale: public API compatibility, SDKs, and webhook surface were not audited.
- Internationalization/localization: `Strong` for UI translation infrastructure; `Unknown` for statutory localization. Evidence: installer migration translation files include French and many other locales; language-string and translation migration directories are present. Unknown rationale: Canada/Quebec employment law, payroll, and statutory reporting were not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec HR/payroll statutory module was identified. French translation artifacts do not prove Quebec HR or payroll compliance.
- UX and product quality: `Partial`. Evidence: pluginized Vue/TypeScript frontend, installer client, dashboards, employee self-service flows, timesheets, reports, recruitment screens, and performance modules exist. Unknown rationale: no hands-on UI or accessibility audit was performed.

## Risks

- License risk: `High`. GPL-3.0 blocks direct source reuse for the MIT target.
- Anti-copy risk: `High`. HR domain entities, plugin API names, permission rules, translations, fixtures, and migrations are rich protected expression.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `v5.8.1` was published on 2026-04-06 and repository metadata updated on 2026-05-05. Concern: open source edition boundaries versus commercial OrangeHRM features need separate review.
- Security risk: `Partial`. Evidence: authentication, OAuth, admin, installer, upgrader, permissions, and API paths exist. Unknown rationale: advisory history, role model audit, data protection review, and dependency scan were not performed.
- Dependency risk: `Partial`. Evidence: PHP, Vue, TypeScript, Twig, Composer, installer client, and generated API tooling are present. Unknown rationale: lockfile freshness and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `src/plugins/orangehrmPimPlugin`, `src/plugins/orangehrmLeavePlugin`, `src/plugins/orangehrmTimePlugin`, `src/plugins/orangehrmAttendancePlugin`, `src/plugins/orangehrmRecruitmentPlugin`, `src/plugins/orangehrmPerformancePlugin`, `src/plugins/orangehrmClaimPlugin`, `src/plugins/orangehrmCorePlugin`, `src/plugins/orangehrmAdminPlugin`, `src/plugins/orangehrmAuthenticationPlugin`, `installer/Migration`, and `devTools/generate`.
- Reason: OrangeHRM is valuable for HRM workflow mapping and plugin modularization analysis, but GPL limits outputs to independent functional specs.
