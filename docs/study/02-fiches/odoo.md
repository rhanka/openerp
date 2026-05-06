# Odoo

## Progress

Fait: Fiche mandatory seed candidate completed from public repository metadata, root license evidence, README evidence, and module directory evidence; fiche work about 100% complete.
À faire: Legal review, anti-copy audit design, and Graphify execution are not started; downstream study work about 0% complete.
Attendu: Use this fiche as an input to shortlist and Graphify planning because Odoo is a mandatory target from the approved spec.

## Identity

- Project: Odoo.
- Repository: https://github.com/odoo/odoo.
- Primary site: https://www.odoo.com.
- Date checked: 2026-05-06.
- Checked ref: `19.0` branch, reported as default branch by `gh repo view odoo/odoo`.
- Repository metadata evidence: `gh repo view odoo/odoo --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount` returned description "Odoo. Open Source Apps To Grow Your Business.", homepage `https://www.odoo.com`, licenseInfo `Other`, and updatedAt `2026-05-06T02:29:53Z`.
- Functional evidence paths: `README.md`, `requirements.txt`, and `addons/` listing at `19.0`.

## License

- Declared license: LGPL-3.0 for Odoo core, with repository metadata reported as `Other` because GitHub license detection returns SPDX `NOASSERTION`.
- Evidence: `https://github.com/odoo/odoo/blob/19.0/LICENSE`; raw file checked with `curl -L https://raw.githubusercontent.com/odoo/odoo/19.0/LICENSE`; GitHub license endpoint returned path `LICENSE`, SPDX `NOASSERTION`, key `other`; repository also has `https://github.com/odoo/odoo/blob/19.0/COPYRIGHT`.
- Reuse classification: `cautious inspiration`.
- Rationale: The methodology treats LGPL as usable for functional study but only cautious for technical inspiration because copied or adapted source, file structure, or tightly coupled implementation details could create obligations inconsistent with a future MIT product. Functional workflows can be rewritten into independent specs; direct code/schema/UI/docs reuse should be avoided unless later legal review approves a narrow use.

## Functional Coverage

- ERP/general suite rating: `Strong`. Evidence: `README.md` describes Odoo as a suite of web-based open source business apps and a full-featured open source ERP when apps are installed together; `addons/` includes `sale`, `purchase`, `stock`, `project`, `contacts`, `website`, `point_of_sale`, and many localization modules.
- CRM rating: `Strong`. Evidence: `README.md` names CRM as a main Odoo app; `addons/` includes `crm`, `crm_livechat`, `sale_crm`, `website_crm`, `event_crm`, and related CRM enrichment modules.
- Accounting/invoicing/tax rating: `Strong`. Evidence: `README.md` names Billing and Accounting; `addons/` includes `account`, `account_payment`, `account_edi`, `account_tax_python`, `account_peppol`, `account_qr_code_*`, `l10n_ca`, `l10n_us`, and broad `l10n_*` tax/localization modules.
- HR/time/leave/payroll rating: `Partial`. Evidence: `addons/` includes `hr`, `hr_attendance`, `hr_expense`, `hr_holidays`, `hr_timesheet`, `hr_work_entry`, and recruiting modules. Unknown rationale: `addons/hr_payroll` was checked at `19.0` through the GitHub contents API and returned 404, so payroll coverage in this repository/ref is not verified.
- Services/subscriptions/projects rating: `Strong`. Evidence: `README.md` names Project Management; `addons/` includes `project`, `project_sale_expense`, `sale_timesheet`, `sale_service`, `sale_project`, `project_todo`, portal/mail modules, and sales/timesheet flows useful for service delivery. Unknown rationale: a community `sale_subscription` module was not verified in this repository/ref.
- MRP/MES/WMS/maintenance/quality rating: `Strong` for MRP/WMS/maintenance, `Partial` for MES/quality. Evidence: `README.md` names Warehouse Management and Manufacturing; `addons/` includes `mrp`, `mrp_account`, `mrp_subcontracting`, `stock`, `stock_account`, `stock_maintenance`, `maintenance`, `repair`, and `barcodes`. Unknown rationale: no first-party `addons/quality` module was observed in the checked `addons/` listing, and MES-specific shop-floor execution needs deeper module review.

## Architecture And Operations

- Stack: Python server with JavaScript web client and PostgreSQL driver dependency. Evidence: repository structure at `19.0` includes Python addons and web assets under `addons/web`; `requirements.txt` includes `psycopg2`; README links to Odoo administration and developer documentation.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README points to standard installation documentation and nightly builds; Odoo is commercially offered as SaaS by the primary site. Unknown rationale: no first-party Kubernetes or Helm path was found in the checked repository tree query; Kubernetes suitability must be assessed through packaging or external deployment projects.
- API/integration maturity: `Strong`. Evidence: `addons/` includes `api_doc`, `rpc`, `base_import`, `auth_oauth`, `auth_ldap`, `payment_*`, `google_*`, `microsoft_*`, automation through `base_automation`, and EDI modules such as `account_edi`.
- Internationalization/localization: `Strong`. Evidence: `addons/` includes many `l10n_*` modules, `transifex`, and specific country modules including `l10n_ca`, `l10n_fr`, `l10n_us`, and broad accounting localization modules.
- Quebec/Canada relevance: `Partial`. Evidence: `addons/l10n_ca` exists at `19.0`, and `l10n_fr` plus French HR leave modules are present. Unknown rationale: Quebec-specific payroll, CNESST, Releve, RL slips, or provincial HR/payroll coverage was not verified in this fiche.
- UX and product quality: `Partial`. Evidence: README presents Odoo as an integrated web-based app suite with standalone apps for CRM, accounting, project, POS, HR, warehouse, and manufacturing; `addons/web`, `website`, `point_of_sale`, `spreadsheet`, and dashboard modules indicate mature product surfaces. Unknown rationale: no hands-on UI walkthrough or accessibility audit was performed in this fiche.

## Risks

- License risk: `Moderate`. LGPL allows functional study and may allow constrained integration patterns, but it is not a permissive MIT-compatible source for direct copying under this study method.
- Anti-copy risk: `High`. Odoo has mature, distinctive workflows, module naming, data models, UI text, and documentation. Later specs must rewrite behavior independently and avoid source, XML view, schema, demo data, tests, and UI text reuse.
- Security risk: `Partial`. Evidence: README has a Security section pointing to Odoo's Responsible Disclosure page; `addons/` includes authentication and access-related modules such as `auth_oauth`, `auth_ldap`, `auth_totp`, `auth_passkey`, `auth_password_policy`, and `auth_timeout`. Unknown rationale: no security advisory history, dependency vulnerability scan, or permission model audit was performed.
- Maintenance risk: `Partial`. Evidence: repository metadata updated on 2026-05-06 and star count was 50,487, suggesting active maintenance. Concern: the open/community repository may not include every commercial module needed for services, subscriptions, payroll, or advanced localization.
- Dependency risk: `Partial`. Evidence: `requirements.txt` pins many Python dependencies and includes version splits by Python runtime and OS packaging baseline, including security-related pin comments. Unknown rationale: dependency freshness and CVE exposure were not audited.

## Graphify Eligibility

- Graphify target: yes.
- Modules/plugins to inspect: `addons/crm`, `addons/account`, `addons/l10n_ca`, `addons/hr`, `addons/hr_attendance`, `addons/hr_holidays`, `addons/hr_timesheet`, `addons/project`, `addons/sale_timesheet`, `addons/sale_service`, `addons/mrp`, `addons/stock`, `addons/maintenance`, `addons/repair`, and API/integration modules `addons/api_doc` and `addons/rpc`.
- Reason: Mandatory target from approved spec. Graphify should focus on functional structure and module relationships, not source reuse.
