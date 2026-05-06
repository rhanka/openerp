# Dolibarr

## Progress

Fait: Fiche mandatory seed candidate completed from GitHub metadata, GPL license evidence, README evidence, module directory evidence, language directory evidence, and deployment path evidence; fiche work about 100% complete.
À faire: Shortlist decision, legal review, and any conditional Graphify execution are not started; downstream study work about 0% complete.
Attendu: Keep Dolibarr in the initial shortlist discussion for ERP/back-office coverage unless license risk or architectural fit disqualifies deeper study.

## Identity

- Project: Dolibarr.
- Repository: https://github.com/Dolibarr/dolibarr.
- Primary site: https://www.dolibarr.org.
- Date checked: 2026-05-06.
- Checked ref: `develop` branch, reported as default branch by `gh repo view Dolibarr/dolibarr`.
- Repository metadata evidence: `gh repo view Dolibarr/dolibarr --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount` returned description covering contacts, suppliers, invoices, orders, stocks, agenda, accounting, and more; homepage `https://www.dolibarr.org`; latest release `23.0.2` published 2026-04-04; licenseInfo GPL-3.0; and updatedAt `2026-05-06T01:10:36Z`.
- Functional evidence paths: `README.md`, `COPYING`, `htdocs/` module directories, `htdocs/langs`, and deployment paths under `dev/build/docker` at `develop`.

## License

- Declared license: GPL-3.0-or-later for Dolibarr, with dependency licenses tracked separately.
- Evidence: `https://github.com/Dolibarr/dolibarr/blob/develop/COPYING`; raw file checked with `curl -L https://raw.githubusercontent.com/Dolibarr/dolibarr/develop/COPYING`; GitHub license endpoint returned path `COPYING`, SPDX `GPL-3.0`, key `gpl-3.0`; README license section states GPL-3+ and points to `COPYING` plus `COPYRIGHT` for dependencies.
- Reuse classification: `functional reference only`.
- Rationale: The methodology treats GPL projects as high risk for direct technical reuse in a future MIT product. Dolibarr can inform functional behavior, module scope, installation/upgrade considerations, and localization requirements through independently rewritten specs only.

## Functional Coverage

- ERP/general suite rating: `Strong`. Evidence: README describes Dolibarr ERP & CRM for contacts, quotes, invoices, orders, stocks, agenda, HR, ECM, and manufacturing; `htdocs/` includes `societe`, `contact`, `commande`, `fourn`, `product`, `reception`, `expedition`, `projet`, `ticket`, and `accountancy`.
- CRM rating: `Strong`. Evidence: README lists customers, prospects, leads, contacts, opportunities, commercial proposals, customer orders, contracts/subscriptions, interventions, and tickets; `htdocs/` includes `contact`, `societe`, `comm`, `ticket`, `contrat`, `fichinter`, and `supplier_proposal`.
- Accounting/invoicing/tax rating: `Strong`. Evidence: README lists invoices, payments, bank accounts, accounting, reports, supplier invoices, direct debit, credit transfer, and Canadian double taxes; `htdocs/` includes `compta`, `accountancy`, `supplier_invoice`, `paypal`, `stripe`, `paybox`, `multicurrency`, and `margin`.
- HR/time/leave/payroll rating: `Partial`. Evidence: README lists employee leave, expense reports, recruitment, employee/staff management, and timesheets; `htdocs/` includes `holiday`, `expensereport`, `recruitment`, `hrm`, `salaries`, and `user`. Unknown rationale: README explicitly says payroll is not fully supported yet, so payroll coverage is weak.
- Services/subscriptions/projects rating: `Strong`. Evidence: README lists contracts/subscription management, interventions, ticket system, projects and tasks, event organization, and surveys; `htdocs/` includes `contrat`, `fichinter`, `ticket`, `projet`, `resource`, `eventorganization`, and `opensurvey`.
- MRP/MES/WMS/maintenance/quality rating: `Partial`. Evidence: README lists stock/warehouse, barcodes, batches/lots/serials, product variants, BOM, manufacturing orders, and workstations; `htdocs/` includes `bom`, `mrp`, `workstation`, `barcode`, `product`, `reception`, and `expedition`. Unknown rationale: dedicated MES, quality, and maintenance depth was not verified in this fiche.

## Architecture And Operations

- Stack: PHP web application with JavaScript enhancements, MariaDB/MySQL/PostgreSQL support, and no heavy framework per README. Evidence: README System Environment and product description sections; repository paths under `htdocs/` and `dev/build/docker`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README documents standalone/web application use, package installs, Docker image, and ready-to-use SaaS/cloud offers; repository tree includes `dev/build/docker/Dockerfile`, `dev/build/docker/docker-compose.yml`, and development Docker paths. Unknown rationale: no Kubernetes or Helm path was found in the checked repository tree.
- API/integration maturity: `Strong`. Evidence: README lists APIs REST and SOAP, LDAP, payment platforms, email collector, and import/export; `htdocs/` includes `api`, `webhook`, `webservices`, `imports`, `exports`, `dav`, `stripe`, `paypal`, and `zapier`.
- Internationalization/localization: `Strong`. Evidence: README lists multi-language support and country-specific features; `htdocs/langs` includes `fr_CA`, `en_CA`, `fr_FR`, `en_US`, and many other locale directories.
- Quebec/Canada relevance: `Partial`. Evidence: README explicitly lists Canadian double taxes and cumulative VAT support; `htdocs/langs` includes `fr_CA` and `en_CA`. Unknown rationale: Quebec payroll, provincial HR compliance, Releve, RL slips, and CNESST coverage were not verified.
- UX and product quality: `Partial`. Evidence: README describes Dolibarr as user-friendly, modular, customizable with dashboards and skins, and includes a product screenshot; `htdocs/theme`, `htdocs/takepos`, `htdocs/webportal`, and optional modules indicate broad UI surfaces. Unknown rationale: no hands-on UI walkthrough or accessibility audit was performed.

## Risks

- License risk: `High`. GPL-3-or-later prevents direct source-level reuse for a future MIT codebase under the study method.
- Anti-copy risk: `High`. Dolibarr has mature ERP/CRM module names, workflows, UI text, PDF templates, hooks, marketplace conventions, and database/API conventions. Later specs must avoid copying source, UI text, docs, assets, templates, demo data, tests, and unusually specific schema/API structures.
- Security risk: `Partial`. Evidence: repository listing includes `htdocs/security.txt`, README shows a CII Best Practices badge, and module listing includes `datapolicy` and permission-sensitive business modules. Unknown rationale: no security advisory history, authentication model audit, or vulnerability scan was performed.
- Maintenance risk: `Partial`. Evidence: latest release `23.0.2` was published on 2026-04-04 and repository metadata updated on 2026-05-06, with 7,164 stars. Concern: architecture is a PHP monolith and may be less aligned with the future Svelte/TypeScript backend direction, though it remains a valuable functional reference.
- Dependency risk: `Partial`. Evidence: repository tree includes vendored PHP/JavaScript dependencies under `htdocs/includes` and multiple `composer.json`/`composer.lock` files, plus Docker build paths. Unknown rationale: dependency license aggregation, freshness, and CVE exposure were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `htdocs/accountancy`, `htdocs/compta`, `htdocs/societe`, `htdocs/contact`, `htdocs/contrat`, `htdocs/projet`, `htdocs/ticket`, `htdocs/fichinter`, `htdocs/holiday`, `htdocs/expensereport`, `htdocs/hrm`, `htdocs/mrp`, `htdocs/bom`, `htdocs/workstation`, `htdocs/product`, `htdocs/reception`, `htdocs/expedition`, `htdocs/api`, `htdocs/webhook`, `htdocs/webservices`, and `htdocs/langs/fr_CA`.
- Reason: Graphify if initial assessment keeps Dolibarr in the shortlist for ERP/back-office coverage. It is functionally broad but GPL-licensed, so Graphify output must feed independent functional specs only.
