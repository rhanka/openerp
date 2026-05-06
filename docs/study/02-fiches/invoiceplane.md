# InvoicePlane

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, license file evidence, README evidence, composer metadata, and module path evidence; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
À faire: Trademark review, localization audit, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 16/27 fiches, about 59% complete after this sub-batch.
Attendu: Use this fiche as a cautious invoicing reference pending legal and attribution review, with deeper review focused on recurring invoices, tax configuration, and trademark boundaries.

## Identity

- Project: InvoicePlane.
- Repository: https://github.com/InvoicePlane/InvoicePlane.
- Primary site: https://www.invoiceplane.com.
- Date checked: 2026-05-06.
- Checked ref: `develop` branch at commit `2b8206d7122ea1ed72437114d27e5fbc9a2e4a60`, reported as default branch by `gh repo view InvoicePlane/InvoicePlane`.
- Repository metadata evidence: `gh repo view InvoicePlane/InvoicePlane --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned homepage `https://www.invoiceplane.com`, latest release `v1.7.1` published 2026-02-16, licenseInfo `Other`, primary language PHP, and updatedAt `2026-05-05T14:00:03Z`.
- Functional evidence paths: `README.md`, `LICENSE.txt`, `composer.json`, `application/modules/clients`, `application/modules/invoices`, `application/modules/payments`, `application/modules/quotes`, `application/modules/reports`, `application/modules/settings`, `application/modules/setup`, `application/modules/users`, `application/language`, and `application/config` at the checked ref.

## License

- Declared license: MIT-style application grant with trademark restrictions for the InvoicePlane name and logo and bundled CodeIgniter license text.
- Evidence: `gh api repos/InvoicePlane/InvoicePlane/license` returned path `LICENSE.txt` with SPDX `NOASSERTION`; `LICENSE.txt` contains an MIT-style grant for InvoicePlane plus explicit name/logo restrictions and a CodeIgniter license section; `composer.json` declares `license` as `MIT`; README license section points to `LICENSE.txt`.
- Reuse classification: `cautious inspiration`.
- Rationale: The package metadata says MIT and the application grant is MIT-style, but GitHub reports `Other` and SPDX `NOASSERTION`, while the same license file carries trademark restrictions and bundled CodeIgniter terms. Treat this as functional and architectural inspiration until legal review clears any narrower technical reuse. Brand, logo, name, UI identity, docs, assets, templates, and tightly coupled implementation details must not be reused.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: repository modules focus on invoicing, clients, payments, reports, settings, and setup rather than full ERP operations.
- CRM rating: `Partial`. Evidence: `application/modules/clients` includes client controllers, models, notes, address views, and client table views. Unknown rationale: lead, opportunity, campaign, pipeline, and support-case flows were not verified.
- Accounting/invoicing/tax rating: `Strong` for invoicing and small-business payment tracking. Evidence: `application/modules/invoices`, `application/modules/payments`, `application/modules/quotes`, `application/modules/reports`, and `application/modules/settings/views/partial_settings_taxes.php` cover invoices, recurring invoices, payments, quotes, reports, and tax settings.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, attendance, leave, or payroll module was found in the checked path scan.
- Services/subscriptions/projects rating: `Partial`. Evidence: invoices include recurring invoice controllers and models; settings include projects/tasks settings. Unknown rationale: subscription lifecycle, entitlement, service contract, and project accounting depth were not audited.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified.

## Architecture And Operations

- Stack: PHP self-hosted application using CodeIgniter, Composer dependencies, JavaScript, SCSS, Dockerfile assets, and database-backed setup migrations. Evidence: `composer.json`, `Dockerfile`, `application/config`, and `application/modules/setup/sql`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README documents Docker-based local start, production install, container environment variables, persistent volumes, and automatic migrations. Unknown rationale: Kubernetes, Helm, multi-tenant SaaS, and managed update policies were not verified.
- API/integration maturity: `Weak` to `Partial`. Evidence: payment gateways and email/PDF dependencies appear in `composer.json`; modules expose controller-based web flows. Unknown rationale: public REST API, webhooks, SDKs, and versioned integration docs were not verified.
- Internationalization/localization: `Partial`. Evidence: README links translation work and `application/language/english` exists; default language can be configured at first startup. Unknown rationale: repository path scan did not verify broad in-repo translations or country-specific accounting packs.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec tax, e-invoicing, payroll, or French-Canada localization evidence was identified. Generic language support may help future localization but does not prove local compliance.
- UX and product quality: `Partial`. Evidence: README presents invoice, quote, client, payment, customization, reporting, Docker, and security workflows. Unknown rationale: no hands-on UI, accessibility, or workflow timing audit was performed.

## Risks

- License risk: `Moderate`. The application has MIT-style evidence, but GitHub `NOASSERTION`, trademark restrictions, and bundled third-party license text require attribution/legal review before technical reuse.
- Anti-copy risk: `Moderate`. Invoice templates, UI text, sample layouts, migrations, and domain naming should inform original specs only unless attribution review approves reuse.
- Maintenance risk: `Partial`. Evidence: latest release `v1.7.1` was published on 2026-02-16 and repository metadata updated on 2026-05-05. Unknown rationale: long-term governance and upgrade support were not audited.
- Security risk: `Partial`. Evidence: README documents recent security hardening and security reporting guidance; `composer.json` includes PDF, mail, random compatibility, and payment dependencies. Unknown rationale: advisory history and dependency vulnerability scan were not performed.
- Dependency risk: `Partial`. Evidence: `composer.json` depends on CodeIgniter, mPDF, PHPMailer, Stripe, Guzzle, HTMLPurifier, QR code, and dotenv packages. Unknown rationale: lockfile freshness and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `application/modules/clients`, `application/modules/invoices`, `application/modules/payments`, `application/modules/quotes`, `application/modules/reports`, `application/modules/settings`, `application/modules/setup`, `application/config`, and `application/language`.
- Reason: InvoicePlane is useful for an original small-business invoicing functional specification, especially for quote-to-invoice, recurring invoice, payment, and reporting workflows. Graphify outputs should remain functional-spec-first until legal review clears any narrower technical reuse.
