# FacturaScripts

## Progress

Fait: Fiche batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, README evidence, composer metadata, security policy, and core path evidence; fiche phase is 11/27 fiches, about 41% complete after this batch.
À faire: Legal review, plugin ecosystem audit, localization audit, Graphify execution, and remaining corpus fiches outside this batch are not completed; fiche phase is 11/27 fiches, about 41% complete after this batch.
Attendu: Use this fiche as a cautious accounting and invoicing ERP reference, with special attention to LGPL boundaries and Spain-oriented localization assumptions.

## Identity

- Project: FacturaScripts.
- Repository: https://github.com/NeoRazorX/facturascripts.
- Primary site: https://facturascripts.com.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `f7e586d09e6c3a66fa181b7bc48aabb080765977`, reported as default branch by `gh repo view NeoRazorX/facturascripts`.
- Repository metadata evidence: `gh repo view NeoRazorX/facturascripts --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Open source ERP software. Built on modern PHP and bootstrap. Easy and powerful.", homepage `https://facturascripts.com`, latest release `v2026.1` published 2026-04-28, licenseInfo `GNU Lesser General Public License v3.0`, and updatedAt `2026-05-05T16:06:31Z`.
- Functional evidence paths: `README.md`, `README_ES.md`, `COPYING`, `SECURITY.md`, `composer.json`, `Core/Controller`, `Core/Model`, `Core/Table`, `Core/Translation`, and API controllers under `Core/Controller` at the checked ref.

## License

- Declared license: LGPL-3.0-or-later in package metadata, with LGPL-3.0 detected by GitHub.
- Evidence: `gh api repos/NeoRazorX/facturascripts/license` returned path `COPYING` with SPDX `LGPL-3.0`; root `COPYING` contains GNU LGPL version 3 text; `composer.json` declares `license` as `LGPL-3.0-or-later`; README badge identifies LGPL.
- Reuse classification: `cautious inspiration`.
- Rationale: The methodology treats LGPL as suitable for functional study and cautious technical inspiration only after obligations are reviewed. Direct copying of implementation code, templates, UI text, schemas, and tests should be avoided for the MIT target unless a later legal review approves a specific use.

## Functional Coverage

- ERP/general suite rating: `Strong`. Evidence: README describes open source ERP and accounting software for small and medium businesses; core controllers and models cover companies, customers, suppliers, products, warehouses, sales documents, purchase documents, documents, users, and settings.
- CRM rating: `Partial`. Evidence: README lists customer and supplier management as CRM functionality; core paths include customer, supplier, contact, group customer, agent, and mail-related controllers and models. Unknown rationale: lead, opportunity, campaign, and activity-pipeline modules were not verified.
- Accounting/invoicing/tax rating: `Strong`. Evidence: README lists invoicing, quotes, complete accounting, and finance; core controllers and models include invoices, receipts, accounts, journals, fiscal years, tax, tax retention, payment forms, bank accounts, and accounting entries.
- HR/time/leave/payroll rating: `Weak`. Evidence: core paths include `EditWorkEvent` and `ListUser`, but no HR, leave, attendance, or payroll module was verified.
- Services/subscriptions/projects rating: `Partial`. Evidence: business document, quote, order, invoice, files, cron, and plugin architecture paths exist. Unknown rationale: project management, subscriptions, service contracts, and resource planning were not verified in core.
- MRP/MES/WMS/maintenance/quality rating: `Partial` for stock and warehouse; `Weak` for MRP, MES, maintenance, and quality. Evidence: README lists inventory management; core paths include product, warehouse, stock table, stock documents, and transport agency controllers. Unknown rationale: BOM, routing, shop-floor, preventive maintenance, and formal quality flows were not verified.

## Architecture And Operations

- Stack: PHP ERP application with Bootstrap 5, Twig, Composer, MySQL/MariaDB or PostgreSQL, PHPUnit, PHPStan, and npm assets. Evidence: README requirements and `composer.json`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README documents PHP built-in server, Apache, and Nginx options and points production users to stable downloads. Unknown rationale: no first-party Docker Compose, Kubernetes, or Helm deployment path was found in the checked repository path scan.
- API/integration maturity: `Partial`. Evidence: core API controllers include attached files, document creation, document export, payment, product image, root API, plugin API, and upload endpoints; `Core/Table/api_access.xml` and `Core/Table/api_keys.xml` exist. Unknown rationale: public API versioning, SDKs, webhooks, and integration guides were not audited.
- Internationalization/localization: `Strong` for Spanish and multi-language product posture. Evidence: README links Spanish README, translation resources, and official translations; repository paths include `Core/Translation`. Unknown rationale: localization beyond available translations and Spain-oriented accounting was not mapped in detail.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec tax, payroll, accounting, or French-Canada localization modules were identified. Spanish/European accounting value does not directly prove Canadian relevance.
- UX and product quality: `Partial`. Evidence: README describes an intuitive modern interface, responsive design, Bootstrap 5, demo access, official user course, and documentation. Unknown rationale: no hands-on UI, accessibility, or workflow audit was performed.

## Risks

- License risk: `Moderate`. LGPL-3.0-or-later requires obligation review before technical inspiration can influence an MIT implementation.
- Anti-copy risk: `Moderate`. Accounting and invoicing domain structures are specific and mature. Future specs must rewrite workflows independently and avoid copying source, templates, UI labels, Spanish accounting terms as expression, schemas, and tests.
- Maintenance risk: `Partial`. Evidence: latest release `v2026.1` was published on 2026-04-28, repository metadata updated on 2026-05-05, and README warns the repository is the active development version and stable downloads should be used for production.
- Security risk: `Partial`. Evidence: `SECURITY.md` exists and README lists a security contact; composer dependencies include Google 2FA and QR code tooling. Unknown rationale: no advisory history, role model audit, or dependency vulnerability scan was performed.
- Dependency risk: `Partial`. Evidence: `composer.json` pins PHP libraries such as Twig, PHPMailer, PDF, IBAN, 2FA, and QR code packages. Unknown rationale: transitive dependency exposure and plugin compatibility were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `Core/Controller`, `Core/Model`, `Core/Table`, `Core/Lib/API`, `Core/Lib/ExtendedController`, `Core/Translation`, `Dinamic`, and plugin extension boundaries.
- Reason: FacturaScripts is a strong accounting and invoicing functional reference with cautious LGPL posture. Graphify is worthwhile if the shortlist needs a small-business accounting ERP reference and if outputs remain independent analysis.
