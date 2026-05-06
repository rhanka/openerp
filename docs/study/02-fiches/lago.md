# Lago

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, AGPL-3.0 license endpoint evidence, root repository path evidence, submodule evidence, Lago API metadata, event processor evidence, and deploy documentation evidence; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
À faire: Submodule-depth review, legal review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
Attendu: Use this fiche as a functional reference for usage-based billing and revenue operations, but keep all source-level reuse blocked for the MIT target because of AGPL.

## Identity

- Project: Lago.
- Repository: https://github.com/getlago/lago.
- Primary site: https://www.getlago.com.
- Date checked: 2026-05-06.
- Checked ref: `main` branch at commit `d6aa3e661b40efe8ba84330df5f613b752c4590e`, reported as default branch by `gh repo view getlago/lago`.
- Repository metadata evidence: `gh repo view getlago/lago --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned usage-based billing and metering description, homepage `https://www.getlago.com`, latest release `v1.45.2` published 2026-05-04, licenseInfo `GNU Affero General Public License v3.0`, primary language Go for the root repository, and updatedAt `2026-05-05T22:43:12Z`.
- Functional evidence paths: root `README.md`, `LICENSE`, `.gitmodules`, `api`, `front`, `events-processor`, `deploy`, `docker-compose.yml`, `docker-compose.dev.yml`, `docs/architecture.md`, `docs/database_partitioning.md`, and `docs/monitoring.md`. Additional submodule evidence checked: `getlago/lago-api` at commit `98479cd327b252050cd88b0d4cb7532b21b62e47` with paths `app/controllers/api/v1`, `app/graphql`, `app/models`, `app/services`, `config`, and `db`.

## License

- Declared license: AGPL-3.0.
- Evidence: `gh api repos/getlago/lago/license` returned path `LICENSE` with SPDX `AGPL-3.0`; `gh api repos/getlago/lago-api/license` also returned SPDX `AGPL-3.0`; GitHub metadata for both root and API repositories reports GNU Affero General Public License v3.0.
- Reuse classification: `functional reference only`.
- Rationale: AGPL-3.0 blocks direct source-level reuse for a future MIT implementation under the study method. Lago can inform independently written functional specs for metering, usage billing, invoices, wallets, coupons, entitlements, and integrations.

## Functional Coverage

- ERP/general suite rating: `Weak` to `Partial`. Evidence: Lago focuses on metering and billing rather than full ERP, but billing entities, customers, invoices, payments, analytics, and integrations support back-office revenue workflows.
- CRM rating: `Partial`. Evidence: Lago API paths include customers, customer portal, customer invoices, payment methods, projected usage, usage, wallets, and subscriptions. Unknown rationale: sales pipeline, campaign, activity, and support-case flows were not verified.
- Accounting/invoicing/tax rating: `Strong` for usage billing and invoice operations. Evidence: API and GraphQL paths include invoices, credit notes, fees, taxes, payment receipts, payment requests, payments, billing entities, analytics, and invoice templates. Unknown rationale: general ledger, statutory filing, payroll accounting, and Canada/Quebec local tax packs were not verified.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, leave, attendance, or payroll module was identified.
- Services/subscriptions/projects rating: `Strong` for subscription and usage monetization. Evidence: paths include plans, subscriptions, charges, billable metrics, events, features, entitlements, wallets, coupons, add-ons, and usage processor code under `events-processor`.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified.

## Architecture And Operations

- Stack: Root repository coordinates Go event processing, Docker Compose deployment, docs, and submodules; Lago API is Ruby/Rails with GraphQL, REST controllers, models, services, workers, database migrations, and tests. Evidence: root metadata, `events-processor`, `deploy`, `.gitmodules`, and `getlago/lago-api` metadata.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: root repository includes Docker Compose files, deploy examples, architecture docs, database partitioning docs, monitoring docs, and environment examples. Unknown rationale: Kubernetes or Helm manifests were not verified in the checked path scan.
- API/integration maturity: `Strong`. Evidence: `app/controllers/api/v1`, `app/graphql`, webhook endpoint controllers, integrations for tax/payment/accounting/sales tools, API logs, data API controllers, and event processor paths indicate API-first billing operations.
- Internationalization/localization: `Partial`. Evidence: invoice, tax, payment provider, integration, and customer portal paths are present. Unknown rationale: translation files and Canada/Quebec statutory billing or tax localization were not verified in the checked submodule paths.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec tax, invoicing, payroll, or French-Canada localization evidence was identified.
- UX and product quality: `Partial`. Evidence: root `front` submodule exists and API paths support customer portal, analytics, invoices, payment receipts, and admin workflows. Unknown rationale: frontend submodule was not deeply audited and no hands-on UI review was performed.

## Risks

- License risk: `High`. AGPL-3.0 blocks source-level reuse for the MIT target.
- Anti-copy risk: `High`. Lago contains detailed pricing, metering, invoice, entitlement, wallet, API, GraphQL, and integration structures; future specs must be original and should not copy code, schemas, endpoint names, templates, tests, or invoice examples.
- Maintenance risk: `Partial` to `Strong`. Evidence: root release `v1.45.2` was published on 2026-05-04 and repository metadata updated on 2026-05-05; API submodule release is also `v1.45.2`. Concern: multi-repository/submodule coordination increases review complexity.
- Security risk: `Partial`. Evidence: API keys, security logs, webhooks, payment providers, integrations, GraphQL, customer portal, and billing data paths are present. Unknown rationale: no advisory history, auth model audit, or dependency scan was performed.
- Dependency risk: `Partial`. Evidence: root Go processor, Rails API, submodules, Kafka/Redis/PostgreSQL deployment paths, and many integrations create a broad dependency surface. Unknown rationale: lockfile freshness and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: root `events-processor`, `deploy`, `docs`, plus `getlago/lago-api` paths `app/controllers/api/v1`, `app/graphql`, `app/models`, `app/services`, `app/workers`, `config`, and `db`.
- Reason: Lago is highly relevant for usage-based billing and revenue operations, but AGPL and submodule complexity mean Graphify outputs must feed independent written specs only.
