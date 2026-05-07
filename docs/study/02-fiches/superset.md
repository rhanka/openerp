# Apache Superset

## Progress

Fait: Fiche analytics candidate completed from GitHub metadata, checked default-branch commit, Apache-2.0 license endpoint evidence, dashboard/chart/dataset/report/security paths, frontend paths, Docker/Kubernetes docs, translations, and release metadata; fiche phase is 27/27 fiches, 100% complete after this sub-batch.
À faire: Shortlist decision, BI build-vs-integrate decision, Graphify execution, and original reporting specs are not started; downstream analytics study remains 0% complete.
Attendu: Keep Superset as the main permissive BI/reporting reference, with a product decision later between embedding/integration and rewriting a lighter native reporting layer.

## Identity

- Project: Apache Superset.
- Repository: https://github.com/apache/superset.
- Primary site: https://superset.apache.org/.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `5b5dd010285890b4b5b45e707a9c3b0da413f75e`, reported as default branch by `gh repo view apache/superset`.
- Repository metadata evidence: `gh repo view apache/superset --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Apache Superset is a Data Visualization and Data Exploration Platform", homepage `https://superset.apache.org/`, latest release `6.0.0` published 2025-12-18, licenseInfo Apache-2.0, primary language TypeScript, and updatedAt `2026-05-07T01:31:57Z`.
- Functional evidence paths: `LICENSE.txt`, `README.md`, `pyproject.toml`, `package.json`, `superset/charts`, `superset/dashboards`, `superset/datasets`, `superset/databases`, `superset/connectors`, `superset/models`, `superset/reports`, `superset/security`, `superset/sql_lab.py`, `superset/translations`, `superset-frontend/src/explore`, `superset-frontend/src/dashboard`, `superset-frontend/src/pages/ChartList`, `superset-frontend/src/pages/DashboardList`, `superset-frontend/src/pages/DatasetList`, `superset-frontend/src/pages/RolesList`, `docker`, `docs/admin_docs/installation/kubernetes.mdx`, `helm`, and `tests`.

## License

- Declared license: Apache-2.0.
- Evidence: `gh api repos/apache/superset/license` returned path `LICENSE.txt` with SPDX `Apache-2.0`; GitHub metadata reports Apache License 2.0.
- Reuse classification: `usable`.
- Rationale: Apache-2.0 is permissive with notice, attribution, and patent-license obligations. For this ERP project, Superset is still more likely an integration/embedding candidate than code to rewrite directly.

## Functional Coverage

- ERP/general suite rating: `Weak` to `Partial` for reporting only. Evidence: Superset provides dashboards, charts, datasets, databases, reports, SQL Lab, security roles, and connectors, but no operational ERP, CRM, accounting, HR, WMS, MES, or payroll modules.
- CRM rating: `Weak`. Evidence checked: no CRM modules were identified.
- Accounting/invoicing/tax rating: `Weak` to `Partial` for analytics over external data. Evidence: dataset/database/chart/report infrastructure can report on accounting data if integrated. Unknown rationale: no first-party ledger, invoicing, tax, or statutory accounting module was verified.
- HR/time/leave/payroll rating: `Weak` to `Partial` for analytics over external data. Evidence: generic dashboard/reporting features could cover HR metrics if integrated. Unknown rationale: no HR/payroll transactional module was verified.
- Services/subscriptions/projects rating: `Partial` for analytics. Evidence: dashboards, charts, datasets, SQL Lab, reports, and alerts can serve service-company reporting. Unknown rationale: no operational project/subscription workflows were verified.
- MRP/MES/WMS/maintenance/quality rating: `Partial` for analytics only. Evidence: BI and dashboard layers can report over production, WMS, maintenance, and quality data sources if integrated. Unknown rationale: no manufacturing execution or warehouse transaction module was verified.

## Architecture And Operations

- Stack: Python backend with TypeScript/React frontend, SQL/database connectors, chart plugins, dashboards, datasets, reports, security, tests, Docker, and Helm/Kubernetes documentation. Evidence: repository metadata primary language TypeScript plus paths under `superset`, `superset-frontend`, `docker`, `helm`, and `docs`.
- SaaS/self-hosted/Kubernetes relevance: `Strong`. Evidence: Docker files, docker-compose files, Helm chart paths, and Kubernetes installation docs exist. Unknown rationale: our target self-hosted update policy would still require product-specific migration/version support design.
- API/integration maturity: `Strong`. Evidence: APIs under charts, dashboards, datasets, databases, reports, security, plus connectors and SQL Lab. Unknown rationale: API compatibility guarantees and embedding strategy were not audited.
- Internationalization/localization: `Partial` to `Strong`. Evidence: `superset/translations` and docs i18n paths exist. Unknown rationale: FR/EN product completeness for our target workflows was not audited.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Quebec/Canada statutory accounting, tax, HR, or payroll support was identified. BI can report on local data but does not implement compliance.
- UX and product quality: `Strong` for BI. Evidence: dashboard, explore, chart list, dataset list, SQL Lab, roles, reports, themes, and visualization paths show a mature analytics product. Unknown rationale: no hands-on UI or accessibility audit was performed.

## Risks

- License risk: `Low` to `Medium`. Apache-2.0 is favorable, but notices and dependency licenses matter.
- Anti-copy risk: `Medium`. Do not copy dashboard UX, chart configuration schemas, frontend code, docs, sample data, or API structures into an original ERP reporting module.
- Maintenance risk: `Strong`. Evidence: latest release `6.0.0` was published on 2025-12-18 and repository metadata updated on 2026-05-07; star count is very high. Concern: full Superset integration may be operationally heavy for small companies.
- Security risk: `Partial` to `High`. Evidence: database connections, SQL Lab, embedded dashboards, roles, guest tokens, reports, alerts, and external connectors create security-critical surfaces. Unknown rationale: no advisory or permission audit was performed.
- Dependency risk: `High`. Evidence: Python, TypeScript/React, chart plugins, database drivers, browser rendering, Selenium/Playwright-like screenshot/report flows, Docker, and Helm create a large dependency surface.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `superset/charts`, `superset/dashboards`, `superset/datasets`, `superset/databases`, `superset/reports`, `superset/security`, `superset/sql_lab.py`, `superset/connectors`, `superset-frontend/src/explore`, `superset-frontend/src/dashboard`, `superset-frontend/src/pages`, and `helm`.
- Reason: Superset can anchor BI/reporting architecture and integration decisions. Graphify should support a build-vs-integrate recommendation, not broad code reuse.
