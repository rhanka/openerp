# ERPNext

## Progress

Fait: Fiche mandatory seed candidate completed from GitHub metadata, license endpoint evidence, README evidence, package metadata, and module directory evidence; fiche work about 100% complete.
À faire: Shortlist decision, legal review, and any conditional Graphify execution are not started; downstream study work about 0% complete.
Attendu: Keep ERPNext in the initial shortlist discussion unless license risk or Canada/Quebec localization gaps disqualify it for deeper technical study.

## Identity

- Project: ERPNext.
- Repository: https://github.com/frappe/erpnext.
- Primary site: https://erpnext.com.
- Additional public product/docs reference: https://frappe.io/erpnext.
- Date checked: 2026-05-06.
- Checked ref: `develop` branch, reported as default branch by `gh repo view frappe/erpnext`.
- Repository metadata evidence: `gh repo view frappe/erpnext --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount` returned description "Free and Open Source Enterprise Resource Planning (ERP)", homepage `https://frappe.io/erpnext`, latest release `v15.107.0` published 2026-05-05, licenseInfo GPL-3.0, and updatedAt `2026-05-06T04:19:44Z`.
- Functional evidence paths: `README.md`, `pyproject.toml`, `license.txt`, and `erpnext/` module directories at `develop`.

## License

- Declared license: GPL-3.0.
- Evidence: GitHub license endpoint returned path `license.txt`, SPDX `GPL-3.0`, key `gpl-3.0`; raw file checked with `curl -L https://raw.githubusercontent.com/frappe/erpnext/develop/license.txt`; `pyproject.toml` project URLs point to the repository and documentation.
- Reuse classification: `functional reference only`.
- Rationale: The methodology treats GPL projects as high risk for direct technical reuse in a future MIT product. ERPNext can inform functional behavior, workflows, module boundaries, and high-level architecture only through independently rewritten specs.

## Functional Coverage

- ERP/general suite rating: `Strong`. Evidence: README describes ERPNext as an open-source ERP system for invoices, stock, personnel, and daily operations; module directories include `accounts`, `buying`, `selling`, `stock`, `assets`, `projects`, `support`, `setup`, and `report_center`.
- CRM rating: `Partial`. Evidence: module directories include `crm`, `selling`, `communication`, `telephony`, and `support`. Unknown rationale: CRM appears integrated into ERP workflows, but no dedicated CRM product depth review was performed in this fiche.
- Accounting/invoicing/tax rating: `Strong`. Evidence: README lists Accounting as a key feature; module directories include `accounts`, `edi`, `regional`, `selling`, `buying`, and `erpnext_integrations`.
- HR/time/leave/payroll rating: `Partial`. Evidence: README mentions managing personnel; module directories include HR-adjacent `projects` and operational domains, but the checked `erpnext/` listing did not expose a first-party `hr` or `payroll` directory in this repository. Unknown rationale: HR/payroll may live in separate Frappe apps such as HRMS, so ERPNext repository-only HR/payroll coverage is not verified.
- Services/subscriptions/projects rating: `Strong` for projects/support, `Partial` for subscriptions. Evidence: README lists Projects as a key feature with tasks, timesheets, and issues; directories include `projects`, `support`, `selling`, `communication`, and `portal`. Unknown rationale: recurring billing/subscription depth was not verified in the checked repository paths.
- MRP/MES/WMS/maintenance/quality rating: `Strong` for manufacturing, stock, quality, and maintenance; `Partial` for MES. Evidence: README lists Manufacturing and order/stock management as key features; module directories include `manufacturing`, `stock`, `quality_management`, `maintenance`, `assets`, and `subcontracting`. Unknown rationale: dedicated MES/shop-floor execution depth needs module-level review.

## Architecture And Operations

- Stack: ERPNext application on Frappe Framework, written in Python and JavaScript with Frappe UI/Vue for UI components. Evidence: README Under the Hood section; `pyproject.toml` lists Python package metadata and Frappe dependency range.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README documents managed hosting through Frappe Cloud and self-hosting with Frappe Docker and Docker Compose; repository tree query showed `.github/workflows/docker-release.yml`. Unknown rationale: first-party Kubernetes or Helm manifests were not found in the ERPNext repository tree checked here, though related Frappe deployment repositories may exist.
- API/integration maturity: `Strong`. Evidence: README states Frappe Framework provides a REST API; directories include `controllers`, `erpnext_integrations`, `edi`, `telephony`, and `portal`.
- Internationalization/localization: `Partial`. Evidence: repository has `erpnext/locale` with many `.po` language files including `fr.po`, and `erpnext/regional` with regional modules for several countries. Unknown rationale: Canada/Quebec regional accounting or payroll was not found in the checked `erpnext/regional` listing.
- Quebec/Canada relevance: `Weak`. Evidence: `erpnext/regional` listing includes Australia, Italy, South Africa, Turkey, United Arab Emirates, United States, and shared address/report directories, but no Canada or Quebec module was observed. French UI translation exists as `erpnext/locale/fr.po`, but Canada/Quebec accounting, tax, HR, and payroll coverage is not verified.
- UX and product quality: `Partial`. Evidence: README presents a live demo, product screenshots, Frappe UI, and key ERP feature walkthroughs; modules include `desktop_icon`, `workspace_sidebar`, `portal`, `templates`, and report/dashboard-oriented paths. Unknown rationale: no hands-on UI walkthrough or accessibility audit was performed.

## Risks

- License risk: `High`. GPL-3.0 prevents direct source-level reuse for a future MIT codebase under the study method.
- Anti-copy risk: `High`. ERPNext has broad ERP domain models, workflows, doctypes, reports, and naming conventions. Later specs must avoid copying code, UI text, documentation, doctypes, fixtures, tests, demo data, and unusually specific schema/API structures.
- Security risk: `Partial`. Evidence: README includes a "Report Security Vulnerabilities" link and CI status; Frappe Framework evidence includes user authentication and REST API in the README. Unknown rationale: no advisory history, permission matrix audit, or dependency vulnerability scan was performed.
- Maintenance risk: `Partial`. Evidence: latest release `v15.107.0` was published on 2026-05-05 and repository metadata updated on 2026-05-06, with 33,603 stars. Concern: ERPNext is split across the Frappe ecosystem, so a repository-only study may miss HR/payroll or deployment components.
- Dependency risk: `Partial`. Evidence: `pyproject.toml` lists Python package dependencies and a Frappe dependency range. Unknown rationale: full dependency lock state, transitive dependency exposure, and Frappe ecosystem package risk were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `erpnext/accounts`, `erpnext/crm`, `erpnext/selling`, `erpnext/buying`, `erpnext/stock`, `erpnext/projects`, `erpnext/support`, `erpnext/manufacturing`, `erpnext/quality_management`, `erpnext/maintenance`, `erpnext/assets`, `erpnext/subcontracting`, `erpnext/regional`, and integration paths under `erpnext/erpnext_integrations` and `erpnext/edi`.
- Reason: Graphify if initial assessment keeps ERPNext in the shortlist. It is functionally strong but GPL-licensed, so Graphify output must feed independent functional specs only.
