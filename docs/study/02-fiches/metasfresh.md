# metasfresh

## Progress

Fait: Fiche batch candidate completed from GitHub metadata, default-branch commit evidence, README evidence, license-file evidence, and repository path evidence; fiche phase is 11/27 fiches, about 41% complete after this batch.
À faire: Legal review, shortlist decision, Graphify execution, and remaining corpus fiches outside this batch are not completed; fiche phase is 11/27 fiches, about 41% complete after this batch.
Attendu: Use this fiche as a functional ERP and manufacturing reference input, but keep source-level reuse blocked by GPL risk.

## Identity

- Project: metasfresh.
- Repository: https://github.com/metasfresh/metasfresh.
- Primary site: http://metasfresh.com/en.
- Date checked: 2026-05-06.
- Checked ref: `new_dawn_uat` branch at commit `2b00d4b7abe1d02f75855cb45bed3f25855ca390`, reported as default branch by `gh repo view metasfresh/metasfresh`.
- Repository metadata evidence: `gh repo view metasfresh/metasfresh --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "We do Open Source ERP - Fast, Flexible & Free Software to scale your Business.", homepage `http://metasfresh.com/en`, latest release `5.175` published 2023-06-27, licenseInfo `null`, and updatedAt `2026-05-05T18:41:29Z`.
- Functional evidence paths: `README.md`, `backend/LICENSE.md`, `backend/de.metas.acct.base/LICENSE.txt`, `backend/de-metas-salesorder`, `backend/de.metas.acct.base`, `backend/de.metas.material`, `backend/de.metas.ui.web.base`, and `backend/de.metas.util.web` at the checked ref.

## License

- Declared license: GPL-2.0 evidence in repository files; GitHub license endpoint did not detect a repository-level license.
- Evidence: `gh api repos/metasfresh/metasfresh/license` returned 404; `README.md` shows a GPL badge linking to a license file; raw `backend/LICENSE.md` and `backend/de.metas.acct.base/LICENSE.txt` contain GNU GPL version 2 text at the checked ref.
- Reuse classification: `functional reference only`.
- Rationale: The methodology treats GPL projects as high risk for a future MIT target. metasfresh can inform ERP workflows, domain coverage, deployment expectations, and module boundaries only through independently rewritten functional analysis. Source, schema, UI text, tests, documentation, generated models, and unusually specific APIs must not be copied.

## Functional Coverage

- ERP/general suite rating: `Strong`. Evidence: `README.md` describes metasfresh as a responsive open source ERP for industry and trade; repository paths include sales order, accounting, material, warehouse, invoice, and web UI modules.
- CRM rating: `Partial`. Evidence: `backend/de.metas.ui.web.base/src/main/java/de/metas/ui/web/crm` and business partner/account paths indicate customer relationship support. Unknown rationale: lead, opportunity, campaign, and sales-pipeline depth was not verified in this fiche.
- Accounting/invoicing/tax rating: `Strong`. Evidence: `backend/de.metas.acct.base` contains accounting, tax, document posting, account, invoice, payment, and financial-reporting classes and SQL paths.
- HR/time/leave/payroll rating: `Unknown`. Evidence checked: repository path searches for HR, leave, timesheet, and payroll did not identify a first-party HR/payroll module comparable to ERPNext or Odoo. metasfresh may support personnel-adjacent data through partner or user records, but HR coverage was not verified.
- Services/subscriptions/projects rating: `Partial`. Evidence: accounting paths include project account types and sales order paths include order processing and invoice flows. Unknown rationale: recurring subscriptions, service delivery, and project management were not verified as first-party modules.
- MRP/MES/WMS/maintenance/quality rating: `Strong` for inventory, warehouse, manufacturing, and material flow; `Partial` for MES, maintenance, and quality. Evidence: repository paths include `de.metas.material`, sales shipment and invoice processing, warehouse UI paths, and manufacturing paths under `backend/de.metas.ui.web.base/src/main/java/de/metas/manufacturing`. Unknown rationale: dedicated MES, preventive maintenance, and formal quality modules need deeper source review.

## Architecture And Operations

- Stack: Java backend with PostgreSQL SQL assets and HTML5/React/Redux web frontend. Evidence: `README.md` states a 3-tier architecture with REST API and web frontend in HTML5, ReactJS, and Redux; repository language metadata shows Java, PLpgSQL, JavaScript, TypeScript, and Dockerfile.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: `README.md` documents Docker and Ubuntu installer deployment. Unknown rationale: no first-party Kubernetes or Helm path was found in the checked repository path scan.
- API/integration maturity: `Partial`. Evidence: `README.md` states REST API; repository paths include `backend/de.metas.util.web/src/main/java/de/metas/rest_api` and API audit/request paths. Unknown rationale: public API versioning, integration docs, and client SDK maturity were not audited.
- Internationalization/localization: `Partial`. Evidence: README first steps include interface language switching; repository paths include Java i18n resources and many language-specific database resource classes. Unknown rationale: country-specific accounting localization breadth was not assessed.
- Quebec/Canada relevance: `Unknown`. Evidence checked: path searches did not verify Canada or Quebec accounting, payroll, tax, or French-Canada localization modules. French UI support may exist through i18n resources, but Canadian business rules were not verified.
- UX and product quality: `Partial`. Evidence: `README.md` emphasizes responsive UX and includes screenshots for KPI dashboard, sales order, and material receipt windows. Unknown rationale: no hands-on UI walkthrough, accessibility audit, or workflow timing assessment was performed.

## Risks

- License risk: `High`. GPL-2.0 evidence blocks source-level reuse for the MIT target under the methodology.
- Anti-copy risk: `High`. metasfresh contains mature ERP domain models, generated model classes, SQL assets, UI flows, and business process names that must not leak into future implementation specs as copied expression.
- Maintenance risk: `Partial`. Evidence: repository metadata was updated on 2026-05-05 and the README claims regular releases, but GitHub latest release metadata showed `5.175` from 2023-06-27.
- Security risk: `Unknown`. Evidence checked: repository path scan found authentication and API audit paths indirectly, but no security policy, advisory review, or permission model audit was performed.
- Dependency risk: `Partial`. Evidence: large Java and web monorepo with PLpgSQL and generated assets. Unknown rationale: dependency lockfiles, CVEs, and JavaScript supply-chain exposure were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `backend/de-metas-salesorder`, `backend/de.metas.acct.base`, `backend/de.metas.material`, `backend/de.metas.ui.web.base/src/main/java/de/metas/ui/web/crm`, `backend/de.metas.ui.web.base/src/main/java/de/metas/manufacturing`, `backend/de.metas.ui.web.base/src/main/java/de/metas/warehouse`, and `backend/de.metas.util.web/src/main/java/de/metas/rest_api`.
- Reason: Strong ERP, accounting, warehouse, and manufacturing coverage could inform functional maps, but GPL risk means Graphify output must be used only as rewritten functional analysis and should be run only if metasfresh enters the ERP/manufacturing shortlist.
