# Frappe CRM

## Progress

Fait: Fiche batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, README evidence, package metadata, Python metadata, and module path evidence; fiche phase is 11/27 fiches, about 41% complete after this batch.
À faire: Legal review, ERPNext integration audit, Graphify execution, and remaining corpus fiches outside this batch are not completed; fiche phase is 11/27 fiches, about 41% complete after this batch.
Attendu: Use this fiche as a modern Frappe-based CRM functional reference only, especially for sales workflow and ERPNext integration expectations.

## Identity

- Project: Frappe CRM.
- Repository: https://github.com/frappe/crm.
- Primary site: https://frappe.io/crm.
- Date checked: 2026-05-06.
- Checked ref: `develop` branch at commit `a27797d92c3ca7fbac21ca64084dfbf193c6b114`, reported as default branch by `gh repo view frappe/crm`.
- Repository metadata evidence: `gh repo view frappe/crm --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Fully featured, open source CRM", homepage `https://frappe.io/crm`, latest release `v1.70.0` published 2026-04-28, licenseInfo `GNU Affero General Public License v3.0`, and updatedAt `2026-05-06T02:46:36Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `pyproject.toml`, `package.json`, `crm/api`, `crm/fcrm/doctype`, `frontend`, `docker`, and `crm/crowdin.yml` at the checked ref.

## License

- Declared license: AGPL-3.0 from repository license evidence; package metadata conflict noted because `package.json` declares `GPL-3.0`.
- Evidence: `gh api repos/frappe/crm/license` returned path `LICENSE` with SPDX `AGPL-3.0`; root `LICENSE` contains GNU AGPL version 3 text; `package.json` declares `license` as `GPL-3.0`.
- Reuse classification: `functional reference only`.
- Rationale: AGPL is high risk for a future MIT target, and the package metadata mismatch requires conservative handling. Frappe CRM can inform sales-team workflows, Frappe app structure at a high level, and integration expectations only through independently rewritten analysis.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: README positions Frappe CRM as a CRM for modern sales teams, not a full ERP suite.
- CRM rating: `Strong`. Evidence: README lists leads, deals, custom views, Kanban, all-in-one lead/deal pages, activities, comments, notes, tasks, call UI, and email templates; source paths include CRM doctypes for leads, deals, contacts, organizations, call logs, dashboards, products, notifications, lead sources, statuses, and assignment APIs.
- Accounting/invoicing/tax rating: `Partial`. Evidence: README states ERPNext integration can extend CRM capabilities to invoicing, accounting, and more. Unknown rationale: first-party accounting, invoice, tax, and ledger modules were not verified in the Frappe CRM repository itself.
- HR/time/leave/payroll rating: `Weak`. Evidence: source paths include CRM holiday and holiday list doctypes for scheduling context. Unknown rationale: employee HR records, leave management, attendance, timesheets, and payroll were not verified.
- Services/subscriptions/projects rating: `Partial`. Evidence: README and source paths show tasks, notes, comments, activities, todos, dashboards, calls, and communication APIs. Unknown rationale: project management, service contracts, subscriptions, and project accounting were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, quality, BOM, routing, or stock operation modules were verified in this CRM repository.

## Architecture And Operations

- Stack: Frappe Framework app with Python backend, Vue frontend, Frappe UI, JavaScript/TypeScript assets, and optional ERPNext compatibility. Evidence: README "Under the Hood", `pyproject.toml`, and `package.json`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README documents Frappe Cloud managed hosting, production self-hosting with `easy-install.py`, Docker Compose setup under `docker`, and development with Bench. Unknown rationale: no first-party Kubernetes or Helm path was found in the checked repository path scan.
- API/integration maturity: `Strong` for CRM integrations. Evidence: README lists Twilio, Exotel, WhatsApp, and ERPNext integration; source paths include `crm/api` modules for activities, contacts, dashboard, exchange rates, notifications, settings, todo, views, WhatsApp, and auth.
- Internationalization/localization: `Partial`. Evidence: repository includes `crm/crowdin.yml` and README references Frappe ecosystem docs; Frappe apps generally support translations through the framework. Unknown rationale: country-specific tax, HR, payroll, and accounting localization are outside this CRM repository and were not audited.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec-specific CRM, tax, payroll, or French-Canada localization modules were verified in this repository.
- UX and product quality: `Partial`. Evidence: README emphasizes simple UX, custom views, Kanban, screenshots, lead/deal pages, call UI, and Frappe UI. Unknown rationale: no hands-on UI, accessibility, or mobile workflow audit was performed.

## Risks

- License risk: `High`. AGPL-3.0 blocks technical reuse for the MIT target; metadata mismatch with `package.json` does not reduce the risk.
- Anti-copy risk: `High`. Frappe CRM has distinctive doctypes, form layouts, workflow terms, Frappe-specific APIs, screenshots, and UI flows that must not be copied into future implementation specs.
- Maintenance risk: `Partial`. Evidence: latest release `v1.70.0` was published on 2026-04-28 and repository metadata updated on 2026-05-06. Concern: checked default branch is `develop`, and README labels develop as future/v2 unstable while stable compatibility is tied to main/v1.x.
- Security risk: `Unknown`. Evidence checked: source paths include auth and session APIs, but no security policy, advisory history, permission model audit, or dependency scan was performed.
- Dependency risk: `Partial`. Evidence: `pyproject.toml` depends on Frappe develop range and Twilio; frontend uses a yarn-managed Vue/Frappe UI stack. Unknown rationale: transitive dependency and Frappe version upgrade risk were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `crm/fcrm/doctype/crm_lead`, `crm/fcrm/doctype/crm_deal`, `crm/fcrm/doctype/crm_contacts`, `crm/fcrm/doctype/crm_organization`, `crm/fcrm/doctype/crm_call_log`, `crm/fcrm/doctype/crm_dashboard`, `crm/fcrm/doctype/crm_product`, `crm/api`, `frontend`, and `docker`.
- Reason: Frappe CRM is a focused modern CRM candidate with useful sales workflow and integration evidence. Graphify should run only if the shortlist needs a Frappe CRM comparison distinct from ERPNext, and outputs must remain functional analysis because of AGPL.
