# Aureus ERP

## Progress

Fait: Fiche batch candidate completed from GitHub metadata, default-branch commit evidence, root license evidence, README evidence, composer metadata, and plugin path evidence; fiche phase is 11/27 fiches, about 41% complete after this batch.
À faire: Legal attribution review, plugin maturity review, Graphify execution, and remaining corpus fiches outside this batch are not completed; fiche phase is 11/27 fiches, about 41% complete after this batch.
Attendu: Use this fiche as the main permissive-license ERP candidate in this batch, with deeper review focused on plugin completeness and implementation maturity.

## Identity

- Project: Aureus ERP.
- Repository: https://github.com/aureuserp/aureuserp.
- Primary site: https://aureuserp.com.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `dd251ac499f90910a953e0de2fbb613357b39925`, reported as default branch by `gh repo view aureuserp/aureuserp`.
- Repository metadata evidence: `gh repo view aureuserp/aureuserp --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Free and Open Source ERP platform", homepage `https://aureuserp.com`, latest release `v1.3.1` published 2026-03-23, licenseInfo `MIT License`, and updatedAt `2026-05-06T04:31:59Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `composer.json`, `plugins/webkul/accounting`, `plugins/webkul/invoices`, `plugins/webkul/inventories`, `plugins/webkul/sales`, `plugins/webkul/employees`, `plugins/webkul/time-off`, `plugins/webkul/timesheets`, and `routes/api.php` at the checked ref.

## License

- Declared license: MIT.
- Evidence: `gh api repos/aureuserp/aureuserp/license` returned path `LICENSE` with SPDX `MIT`; root `LICENSE` contains MIT License text; `composer.json` declares `license` as `MIT`.
- Reuse classification: `usable`.
- Rationale: MIT aligns with the target license and can support deeper technical inspiration after attribution obligations are tracked. Reuse still requires anti-copy hygiene because plugin naming, UI text, docs, demo data, and assets remain protected expression.

## Functional Coverage

- ERP/general suite rating: `Strong`. Evidence: `README.md` describes a comprehensive ERP for SMEs and large organizations; plugin paths cover analytics, contacts, partners, accounting, inventory, sales, purchases, HR, projects, website, and support.
- CRM rating: `Partial`. Evidence: README lists sales pipeline, opportunity management, contacts, partners, and customer/vendor contact management; plugin paths include `plugins/webkul/sales`, `plugins/webkul/contacts`, and `plugins/webkul/partners`. Unknown rationale: dedicated lead, opportunity, campaign, support-case, and activity history depth was not audited.
- Accounting/invoicing/tax rating: `Strong`. Evidence: README lists accounting, accounts, invoices, and payments modules; plugin paths include `plugins/webkul/accounting`, `plugins/webkul/accounts`, `plugins/webkul/invoices`, and `plugins/webkul/payments`.
- HR/time/leave/payroll rating: `Partial`. Evidence: README lists employees, recruitment, timeoffs, and timesheet modules; plugin paths include `plugins/webkul/employees`, `plugins/webkul/recruitments`, `plugins/webkul/time-off`, and `plugins/webkul/timesheets`. Unknown rationale: payroll, benefits, Canadian employment rules, and statutory reporting were not verified.
- Services/subscriptions/projects rating: `Partial`. Evidence: README lists projects, internal communication, support, table views, and website modules. Unknown rationale: recurring subscriptions, service contracts, project accounting, and SLA handling were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Partial` for inventory and procurement; `Weak` for MRP, MES, maintenance, and quality. Evidence: README lists inventories, products, purchases, and procurement; plugin paths include inventory, product, purchase, and sales modules. Unknown rationale: manufacturing orders, BOMs, routing, shop-floor execution, maintenance, and quality modules were not found in the checked plugin list.

## Architecture And Operations

- Stack: PHP ERP application built on Laravel 11, FilamentPHP 5, Livewire 4, TailwindCSS 4, MySQL or SQLite, Composer, and Node tooling. Evidence: README requirements and `composer.json` dependencies.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README provides clone, Composer install, Artisan install, and local server steps; Laravel Sail appears in dev dependencies. Unknown rationale: first-party Docker Compose, Kubernetes, and Helm deployment assets were not verified in the repository path scan.
- API/integration maturity: `Partial`. Evidence: README claims extensive APIs and developer-friendly customization; `composer.json` includes Laravel Sanctum and Scribe; repository path includes `routes/api.php`. Unknown rationale: API documentation output, versioning policy, webhooks, and SDKs were not audited.
- Internationalization/localization: `Partial`. Evidence: README lists multi-language support; repository paths include `lang` and plugin `resources/lang` directories in English and Arabic, with vendor translations for many languages. Unknown rationale: accounting and HR localization depth by country was not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec-specific tax, payroll, HR, or French-Canada modules were identified in the checked path scan. General multi-language support may help future localization, but local business rules are unverified.
- UX and product quality: `Partial`. Evidence: README emphasizes responsive UI, FilamentPHP, TailwindCSS, Livewire, role-based access control, analytics, and mobile optimization. Unknown rationale: no hands-on UI walkthrough, accessibility review, or workflow audit was performed.

## Risks

- License risk: `Low`. MIT is compatible with the target posture when attribution is preserved.
- Anti-copy risk: `Moderate`. The project is permissively licensed, but future work should still avoid copying UI copy, assets, demo data, exact plugin taxonomy, and unusually specific implementation structures without attribution review.
- Maintenance risk: `Partial`. Evidence: latest release `v1.3.1` was published on 2026-03-23 and repository metadata updated on 2026-05-06. Concern: broad plugin coverage may be newer and less battle-tested than older ERP systems.
- Security risk: `Partial`. Evidence: README claims role-based access control through Filament Shield; `composer.json` includes Laravel Sanctum and security-related admin dependencies. Unknown rationale: no security policy, advisory history, permission model audit, or dependency vulnerability scan was performed.
- Dependency risk: `Partial`. Evidence: Laravel 11, Filament 5, Livewire 4, TailwindCSS 4, and multiple Laravel packages appear in `composer.json`. Unknown rationale: lockfile freshness, CVEs, and plugin dependency boundaries were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `plugins/webkul/accounting`, `plugins/webkul/accounts`, `plugins/webkul/invoices`, `plugins/webkul/payments`, `plugins/webkul/inventories`, `plugins/webkul/products`, `plugins/webkul/purchases`, `plugins/webkul/sales`, `plugins/webkul/contacts`, `plugins/webkul/partners`, `plugins/webkul/employees`, `plugins/webkul/time-off`, `plugins/webkul/timesheets`, `plugins/webkul/projects`, `plugins/webkul/security`, and `routes/api.php`.
- Reason: MIT licensing and broad ERP plugin coverage make Aureus ERP a candidate for deeper technical mapping if shortlist review confirms plugin maturity and domain completeness.
