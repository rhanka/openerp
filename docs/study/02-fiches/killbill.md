# Kill Bill

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, Apache-2.0 license endpoint evidence, module path evidence, API path evidence, database migration evidence, and release metadata; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
À faire: Payment-plugin ecosystem review, deployment review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
Attendu: Use this fiche as the strongest permissive subscription billing reference so far, with deeper review focused on catalog, subscription, invoicing, payment, and plugin boundaries.

## Identity

- Project: Kill Bill.
- Repository: https://github.com/killbill/killbill.
- Primary site: https://killbill.io.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `5d5ccbb50202b2001f2897e78e780324c4ed97c4`, reported as default branch by `gh repo view killbill/killbill`.
- Repository metadata evidence: `gh repo view killbill/killbill --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Open-Source Subscription Billing & Payments Platform", homepage `https://killbill.io`, latest release `killbill-0.24.17` published 2026-04-23, licenseInfo `Apache License 2.0`, primary language Java, and updatedAt `2026-05-05T17:22:33Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `pom.xml`, `api`, `account`, `catalog`, `subscription`, `entitlement`, `invoice`, `payment`, `usage`, `overdue`, `tenant`, `jaxrs`, `server`, `beatrix`, and database migrations under module `src/main/resources` paths at the checked ref.

## License

- Declared license: Apache-2.0.
- Evidence: `gh api repos/killbill/killbill/license` returned path `LICENSE` with SPDX `Apache-2.0`; GitHub metadata reports Apache License 2.0.
- Reuse classification: `usable`.
- Rationale: Apache-2.0 is compatible with a future MIT target after attribution, notice, and patent-license obligations are tracked. Future implementation must still avoid copying code, tests, templates, database migrations, API shapes, and plugin details without explicit review.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: Kill Bill is a billing platform, not a full ERP; account, tenant, invoice, payment, entitlement, and usage modules support back-office monetization workflows.
- CRM rating: `Weak` to `Partial`. Evidence: account and account-email modules exist. Unknown rationale: lead, opportunity, campaign, and customer service workflows were not verified.
- Accounting/invoicing/tax rating: `Strong` for subscription invoicing and payment operations. Evidence: `invoice`, `payment`, `account`, `overdue`, `catalog`, `tenant`, and migration paths cover invoices, payments, account data, overdue states, product catalog, and multi-tenant configuration. Unknown rationale: general ledger, statutory tax filing, payroll accounting, and Canada/Quebec tax packs were not verified.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, leave, attendance, or payroll module was identified.
- Services/subscriptions/projects rating: `Strong` for subscriptions and recurring monetization. Evidence: `subscription`, `entitlement`, `catalog`, `usage`, `invoice`, `payment`, and `jaxrs` paths show subscription lifecycle, entitlement, usage, invoicing, payment, and API surfaces.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or quality modules were identified.

## Architecture And Operations

- Stack: Java multi-module billing platform built with Maven, module-specific APIs, persistence resources, database migrations, JAX-RS resources, plugin-oriented payment and invoice APIs, and integration tests. Evidence: `pom.xml`, module `pom.xml` files, `api`, `jaxrs`, `server`, `beatrix`, and module resource paths.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: account/tenant modules indicate multi-tenant capability and server packaging exists. Unknown rationale: Kubernetes, Helm, and official self-hosted update automation were not verified in this repository path scan.
- API/integration maturity: `Strong`. Evidence: `api/src/main/java`, `jaxrs`, payment plugin API paths, invoice plugin API paths, event interfaces, tenant APIs, catalog APIs, and resource migrations show a broad integration-oriented platform surface.
- Internationalization/localization: `Partial`. Evidence: invoice translation resources include `InvoiceTranslation_en_US.properties`, and test resources include catalog translation files such as `CatalogTranslation_fr_CA.properties`. Unknown rationale: production-grade French-Canada invoicing, tax, or accounting localization was not verified.
- Quebec/Canada relevance: `Weak` to `Partial`. Evidence: `CatalogTranslation_fr_CA.properties` appears in test resources, but no Quebec or Canada statutory tax, accounting, or payroll compliance module was verified.
- UX and product quality: `Weak` for end-user UI in this repository; `Strong` for backend domain depth. Evidence: repository is backend-heavy Java with API, service, and migration modules. Unknown rationale: admin UI and customer portal experience were not audited.

## Risks

- License risk: `Low`. Apache-2.0 is permissive but requires notice and patent-obligation handling.
- Anti-copy risk: `Moderate`. Subscription billing has detailed domain logic; future specs should avoid copying API models, billing algorithms, migrations, templates, test scenarios, and plugin naming.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `killbill-0.24.17` was published on 2026-04-23 and repository metadata updated on 2026-05-05. Unknown rationale: plugin ecosystem compatibility and release support policy were not audited.
- Security risk: `Partial`. Evidence: account, tenant, user context, plugin, and payment paths handle sensitive billing and payment flows. Unknown rationale: no security advisory history, auth model audit, or dependency vulnerability scan was performed.
- Dependency risk: `Partial`. Evidence: Maven multi-module Java platform with many internal modules and payment/plugin integrations. Unknown rationale: transitive dependency exposure and plugin compatibility were not audited.

## Graphify Eligibility

- Graphify target: yes, if subscription billing is shortlisted.
- Modules/plugins to inspect: `api`, `catalog`, `subscription`, `entitlement`, `invoice`, `payment`, `usage`, `overdue`, `account`, `tenant`, `jaxrs`, `server`, and `beatrix`.
- Reason: Apache-2.0 licensing and deep subscription-billing coverage make Kill Bill a strong technical and functional mapping candidate, with anti-copy review for detailed billing logic.
