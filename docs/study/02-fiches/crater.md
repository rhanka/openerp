# Crater

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, Laravel/Vue path evidence, API controller evidence, model evidence, and Docker Compose evidence; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
À faire: Legal review, maintenance review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
Attendu: Use this fiche as an AGPL functional reference for modern invoicing workflows, not as a source-level reference for the MIT target.

## Identity

- Project: Crater.
- Repository: https://github.com/crater-invoice-inc/crater.
- Primary site: https://craterapp.com.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `05d5ce26fdd8d9466009163444e944259bc0cc2a`, reported as default branch by `gh repo view crater-invoice-inc/crater`.
- Repository metadata evidence: `gh repo view crater-invoice-inc/crater --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned homepage `https://craterapp.com`, latest release `6.0.6` published 2022-03-06, licenseInfo `GNU Affero General Public License v3.0`, primary language PHP, and updatedAt `2026-05-06T02:33:28Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `composer.json`, `package.json`, `app/Models`, `app/Http/Controllers/V1/Admin`, `app/Http/Controllers/V1/Customer`, `app/Http/Controllers/V1/Webhook`, `routes/api.php`, `resources/scripts`, `resources/scripts/locales`, `resources/lang`, `docker-compose.yml`, and `Dockerfile` at the checked ref.

## License

- Declared license: AGPL-3.0.
- Evidence: `gh api repos/crater-invoice-inc/crater/license` returned path `LICENSE` with SPDX `AGPL-3.0`; GitHub metadata reports GNU Affero General Public License v3.0.
- Reuse classification: `functional reference only`.
- Rationale: AGPL is a hard barrier for direct technical reuse in the MIT target under the study method. Crater can inform independently written functional specs, but source code, Vue components, API shapes, templates, UI copy, migrations, tests, and demo data must not be copied.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: model and controller paths focus on invoicing, customers, payments, expenses, items, companies, settings, and modules rather than full ERP domains.
- CRM rating: `Partial`. Evidence: `app/Models/Customer.php`, customer admin controllers, customer portal controllers, customer Vue views, notes, addresses, and customer sales reporting are present. Unknown rationale: lead, opportunity, activity, and campaign management were not verified.
- Accounting/invoicing/tax rating: `Strong` for invoicing. Evidence: models and controllers cover estimates, invoices, recurring invoices, payments, expenses, tax types, transactions, currencies, exchange rates, profit/loss reports, tax summary reports, PDFs, and send-preview flows.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, attendance, leave, or payroll module was identified in the checked path scan.
- Services/subscriptions/projects rating: `Partial`. Evidence: recurring invoices, items, estimates, expenses, custom fields, notes, customer portal, and reports are present. Unknown rationale: service contracts, project delivery, entitlements, and SLA management were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified.

## Architecture And Operations

- Stack: Laravel PHP backend with Vue frontend, Vite, Blade, Dockerfile, Docker Compose, and API/controller layout under `app/Http/Controllers/V1`. Evidence: language metadata, `composer.json`, `package.json`, `resources/scripts`, `routes/api.php`, and Docker paths.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: repository includes `docker-compose.yml`, `docker-compose` support files, Dockerfile, installation controllers, and update controllers. Unknown rationale: Kubernetes, Helm, multi-tenant SaaS, and active self-hosted update policy were not verified.
- API/integration maturity: `Partial` to `Strong` for product API shape. Evidence: versioned admin/customer controllers under `app/Http/Controllers/V1`, `routes/api.php`, webhook controller, mobile auth controller, modules API token controller, and generated frontend stores. Unknown rationale: API documentation, SDKs, webhooks beyond cron, and compatibility policy were not audited.
- Internationalization/localization: `Partial`. Evidence: `resources/scripts/locales` contains many locale JSON files including `fr.json`; `resources/lang/vendor/backup` has broad translated package strings. Unknown rationale: country-specific invoicing, tax, and accounting localization were not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec tax, accounting, payroll, or French-Canada compliance module was identified. Generic French UI translation does not prove Quebec compliance.
- UX and product quality: `Partial`. Evidence: Vue views cover dashboards, invoices, estimates, recurring invoices, customers, settings, reports, payment flows, base components, modals, and installation wizard. Unknown rationale: no hands-on UI, accessibility, or end-to-end workflow audit was performed.

## Risks

- License risk: `High`. AGPL-3.0 blocks source-level reuse for the MIT target.
- Anti-copy risk: `High`. The Laravel/Vue model-controller-store layout, UI components, API names, PDF templates, migrations, and reporting structures should not be copied.
- Maintenance risk: `Weak` to `Partial`. Evidence: latest release is from 2022-03-06, while repository metadata was updated on 2026-05-06. Unknown rationale: update activity may reflect maintenance or repository metadata changes, but release cadence appears stale.
- Security risk: `Partial`. Evidence: role and ability controllers, auth controllers, Sanctum config, CORS config, backup settings, and update controllers are present. Unknown rationale: no advisory history, permission audit, or dependency vulnerability scan was performed.
- Dependency risk: `Partial`. Evidence: Laravel, Vue, Vite, Docker, backup, PDF, media, and auth dependencies are implied by repository paths and package files. Unknown rationale: lockfile state and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `app/Models`, `app/Http/Controllers/V1/Admin/Invoice`, `app/Http/Controllers/V1/Admin/Estimate`, `app/Http/Controllers/V1/Admin/RecurringInvoice`, `app/Http/Controllers/V1/Admin/Payment`, `app/Http/Controllers/V1/Admin/Report`, `app/Http/Controllers/V1/Admin/Customer`, `app/Http/Controllers/V1/Customer`, `routes/api.php`, `resources/scripts/admin/views`, and `resources/scripts/admin/stores`.
- Reason: Crater is useful for functional mapping of a modern small-business invoicing experience, but AGPL requires Graphify outputs to feed independent written specs only.
