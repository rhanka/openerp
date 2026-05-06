# OpenMeter

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, Apache-2.0 license endpoint evidence, API specification evidence, generated client evidence, Go service path evidence, deployment chart evidence, and release metadata; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
À faire: Billing workflow depth review, entitlement integration review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
Attendu: Use this fiche as the main permissive metering and usage-billing platform reference, especially for API-first usage events, meters, entitlements, and Kubernetes deployment shape.

## Identity

- Project: OpenMeter.
- Repository: https://github.com/openmeterio/openmeter.
- Primary site: https://openmeter.io.
- Date checked: 2026-05-06.
- Checked ref: `main` branch at commit `6471bb8d3c0559aef6c416f64bc5cab008351437`, reported as default branch by `gh repo view openmeterio/openmeter`.
- Repository metadata evidence: `gh repo view openmeterio/openmeter --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned metering/billing description, homepage `https://openmeter.io`, latest release `v1.0.0-beta.227` published 2026-02-12, licenseInfo `Apache License 2.0`, primary language Go, and updatedAt `2026-05-06T00:43:04Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `api/openapi.yaml`, `api/openapi.cloud.yaml`, `api/spec`, `api/client/javascript`, `api/client/python`, `api/client/go`, `api/v3`, `cmd/server`, `cmd/billing-worker`, `cmd/balance-worker`, `cmd/notification-service`, `cmd/jobs`, `pkg`, `test/billing`, `test/subscription`, `deploy/charts/openmeter`, `deploy/charts/benthos-collector`, `docker-compose.yaml`, and `config.example.yaml` at the checked ref.

## License

- Declared license: Apache-2.0.
- Evidence: `gh api repos/openmeterio/openmeter/license` returned path `LICENSE` with SPDX `Apache-2.0`; GitHub metadata reports Apache License 2.0.
- Reuse classification: `usable`.
- Rationale: Apache-2.0 is compatible with a future MIT target after attribution, notice, and patent-obligation handling. Future implementation must avoid copying API definitions, generated clients, schemas, tests, examples, UI/API text, and domain code without explicit review.

## Functional Coverage

- ERP/general suite rating: `Weak` to `Partial`. Evidence: OpenMeter focuses on metering, billing, entitlements, and product catalog, not full ERP.
- CRM rating: `Weak` to `Partial`. Evidence: API specs and handlers include customers and subjects. Unknown rationale: lead, opportunity, campaign, and service-case workflows were not verified.
- Accounting/invoicing/tax rating: `Partial` to `Strong` for usage billing infrastructure. Evidence: API specs and tests include billing profiles, invoices, tax, credit grants, product catalog, subscriptions, meters, events, entitlements, and notification paths. Unknown rationale: full invoicing UI, general ledger, accounts receivable/payable, and statutory accounting were not verified.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, leave, attendance, or payroll module was identified.
- Services/subscriptions/projects rating: `Strong` for metered services and recurring products. Evidence: API and tests cover events, meters, subscriptions, addons, plans, features, entitlements, credits, billing jobs, usage queries, and generated clients.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified.

## Architecture And Operations

- Stack: Go backend with TypeSpec/OpenAPI specifications, generated Go/JavaScript/Python clients, command services, internal packages, PostgreSQL/ClickHouse/Kafka-oriented infrastructure paths, Docker Compose, and Helm charts. Evidence: language metadata, `api/spec`, `api/client`, `cmd`, `pkg`, `deploy/charts`, and `docker-compose.yaml`.
- SaaS/self-hosted/Kubernetes relevance: `Strong`. Evidence: `deploy/charts/openmeter`, `deploy/charts/benthos-collector`, chart templates, Docker Compose, kind config, config examples, and service command paths support Kubernetes/self-hosted analysis. Unknown rationale: long-term update policy and backward compatibility windows were not audited.
- API/integration maturity: `Strong`. Evidence: `api/openapi.yaml`, TypeSpec sources, generated clients for JavaScript, Python, and Go, v3 handlers, OpenAPI middleware, and test suites indicate API-first design.
- Internationalization/localization: `Weak`. Evidence checked: API and billing primitives are domain-generic, but UI translation and country-specific localization were not identified in the checked path scan.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec tax, invoicing, payroll, or French-Canada localization evidence was identified.
- UX and product quality: `Partial` for developer experience, `Weak` for business UI. Evidence: generated clients, API docs/specs, examples, and quickstart jobs support developer workflows. Unknown rationale: no end-user UI or accessibility audit was performed.

## Risks

- License risk: `Low`. Apache-2.0 is permissive with notice and patent-license obligations.
- Anti-copy risk: `Moderate`. API-first products expose detailed schemas and generated clients. Future specs should avoid copying TypeSpec/OpenAPI shapes, handler names, examples, tests, and client code without review.
- Maintenance risk: `Partial`. Evidence: latest release `v1.0.0-beta.227` was published on 2026-02-12 and repository metadata updated on 2026-05-06. Concern: beta versioning and API stability require review before implementation dependency.
- Security risk: `Partial`. Evidence: API auth/security spec paths, billing data, events, entitlements, and generated clients exist. Unknown rationale: advisory history, auth model audit, and dependency scan were not performed.
- Dependency risk: `Partial`. Evidence: Go services, TypeScript clients, Python clients, TypeSpec, ClickHouse/PostgreSQL/Kafka adjacent packages, and Helm charts create a multi-runtime surface. Unknown rationale: transitive dependency exposure was not audited.

## Graphify Eligibility

- Graphify target: yes, if metering/usage billing is shortlisted.
- Modules/plugins to inspect: `api/spec`, `api/openapi.yaml`, `api/v3`, `api/client/javascript`, `api/client/python`, `cmd/server`, `cmd/billing-worker`, `cmd/balance-worker`, `cmd/jobs`, `pkg`, `test/billing`, `test/subscription`, and `deploy/charts/openmeter`.
- Reason: Apache-2.0 licensing, API-first design, and Kubernetes chart coverage make OpenMeter a strong technical mapping candidate for metered services and usage billing.
