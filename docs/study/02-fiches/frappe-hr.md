# Frappe HR

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, HR doctype evidence, payroll doctype evidence, report evidence, frontend asset evidence, and Docker evidence; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
À faire: Canada/Quebec payroll review, legal review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
Attendu: Use this fiche as the strongest open source HR/payroll functional reference so far, but keep it source-level blocked for the MIT target because of GPL.

## Identity

- Project: Frappe HR.
- Repository: https://github.com/frappe/hrms.
- Primary site: https://frappe.io/hr.
- Date checked: 2026-05-06.
- Checked ref: `develop` branch at commit `94023fa64dde3df9018923a678a97c69281469b8`, reported as default branch by `gh repo view frappe/hrms`.
- Repository metadata evidence: `gh repo view frappe/hrms --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned homepage `https://frappe.io/hr`, latest release `v16.6.0` published 2026-04-30, licenseInfo `GNU General Public License v3.0`, primary language Python, and updatedAt `2026-05-06T00:50:36Z`.
- Functional evidence paths: `README.md`, `license.txt`, `pyproject.toml`, `hrms/hr/doctype`, `hrms/payroll/doctype`, `hrms/payroll/report`, `hrms/public/js`, `hrms/public/icons`, `.github/workflows`, and `docker/docker-compose.yml` at the checked ref.

## License

- Declared license: GPL-3.0.
- Evidence: `gh api repos/frappe/hrms/license` returned path `license.txt` with SPDX `GPL-3.0`; GitHub metadata reports GNU General Public License v3.0.
- Reuse classification: `functional reference only`.
- Rationale: GPL-3.0 prevents direct source-level reuse in a future MIT product under the study method. It remains valuable for independently rewritten HR/payroll functional specs and domain analysis.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: Frappe HR is a Frappe app intended to integrate with ERPNext/Frappe, not a standalone ERP suite.
- CRM rating: `Weak`. Evidence checked: no sales CRM module was identified in this HR repository.
- Accounting/invoicing/tax rating: `Partial` for payroll accounting adjacency. Evidence: payroll doctypes include salary components, salary slips, payroll entry, payroll period, income tax slabs, employee tax exemption records, and salary payments reports. Unknown rationale: general ledger, invoicing, sales tax, and accounts receivable/payable are outside this repository.
- HR/time/leave/payroll rating: `Strong`. Evidence: `hrms/hr/doctype` includes attendance, attendance requests, employee checkin, employee lifecycle, leave, performance, recruitment, expense claims, onboarding, separation, appraisals, training, grievances, shifts, and HR settings; `hrms/payroll/doctype` includes salary structures, salary slips, payroll entries, tax slabs, benefits, incentives, and payroll settings.
- Services/subscriptions/projects rating: `Partial`. Evidence: HR and payroll can support service organizations through timesheets, employee records, expense claims, attendance, and salary costs. Unknown rationale: customer projects, contracts, subscriptions, and billing are outside this repository.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified in this HR repository.

## Architecture And Operations

- Stack: Frappe application written mainly in Python with JavaScript, Vue, HTML, SCSS, TypeScript fragments, and Docker Compose support. Evidence: language metadata, `pyproject.toml`, `hrms` package paths, frontend public assets, and `docker/docker-compose.yml`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: Frappe ecosystem supports self-hosting and the repository includes Docker Compose assets and CI workflows. Unknown rationale: first-party Kubernetes or Helm deployment for this app was not verified in the repository.
- API/integration maturity: `Partial`. Evidence: Frappe apps expose doctypes and Frappe framework APIs; HRMS paths include many doctypes, reports, public JS integrations with ERPNext, and payroll utilities. Unknown rationale: external API documentation, stable API policy, webhooks, and SDKs were not audited in this fiche.
- Internationalization/localization: `Partial`. Evidence: Frappe/Frappe HR has translatable doctypes and public assets; paths include icons and UI assets. Unknown rationale: repository path scan did not verify Canada/Quebec statutory payroll localization or French-Canada translation coverage.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec payroll, CNESST, Revenu Quebec, CRA, ROE, T4, RL-1, or Quebec labor-standard evidence was identified. Generic payroll structures do not prove local compliance.
- UX and product quality: `Partial`. Evidence: repository includes public icons, JavaScript bundles for HRMS, performance, interview, hierarchy chart, and payroll utility screens. Unknown rationale: no hands-on UI, accessibility, or HR workflow audit was performed.

## Risks

- License risk: `High`. GPL-3.0 blocks direct technical reuse in the MIT target.
- Anti-copy risk: `High`. Frappe doctypes, payroll rules, reports, fixtures, tests, naming conventions, and UI assets are detailed protected expression and must not be copied.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `v16.6.0` was published on 2026-04-30 and repository metadata updated on 2026-05-06. Concern: product behavior depends on Frappe/ERPNext ecosystem compatibility.
- Security risk: `Partial`. Evidence: HR and payroll contain sensitive personal and payroll data, and Frappe permissions likely apply. Unknown rationale: permission matrix, advisory history, and dependency vulnerability scan were not performed.
- Dependency risk: `Partial`. Evidence: app depends on Frappe framework and ecosystem release compatibility. Unknown rationale: full dependency tree and version-lock strategy were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `hrms/hr/doctype/employee_*`, `hrms/hr/doctype/attendance`, `hrms/hr/doctype/leave_*`, `hrms/hr/doctype/shift_*`, `hrms/hr/doctype/appraisal*`, `hrms/hr/doctype/interview*`, `hrms/hr/doctype/expense_claim*`, `hrms/payroll/doctype/salary_*`, `hrms/payroll/doctype/payroll_*`, `hrms/payroll/doctype/income_tax_slab`, `hrms/payroll/report`, and `hrms/public/js`.
- Reason: This is the strongest HR/payroll functional source in the corpus so far. GPL means Graphify analysis must feed original written specs only, especially for localizable HR/payroll abstractions.
