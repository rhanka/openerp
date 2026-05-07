# OpenBoxes

## Progress

Fait: Fiche operations candidate completed from GitHub metadata, checked default-branch commit, EPL-1.0 license endpoint evidence, WMS/supply-chain path evidence, docs evidence, Docker evidence, inventory/order/shipment/requisition views, API docs, and release metadata; fiche phase is 27/27 fiches, 100% complete after this sub-batch.
À faire: Shortlist decision, EPL legal review, Graphify execution, and original inventory/WMS specs are not started; downstream WMS study remains 0% complete.
Attendu: Keep OpenBoxes as a strong inventory and stock-movement functional reference, especially for services with distributed stock, but do not treat EPL code as reusable into the MIT target without legal review.

## Identity

- Project: OpenBoxes.
- Repository: https://github.com/openboxes/openboxes.
- Primary site: https://openboxes.com.
- Date checked: 2026-05-06.
- Checked ref: `develop` branch at commit `688ab67d5d550d71ee9ab5019f30071b9b2459ac`, reported as default branch by `gh repo view openboxes/openboxes`.
- Repository metadata evidence: `gh repo view openboxes/openboxes --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "OpenBoxes is a supply chain management system designed to manage inventory and track stock movements for healthcare facilities.", homepage `https://openboxes.com`, latest release `v0.9.7-hotfix1` published 2026-04-23, licenseInfo EPL-1.0, primary language Groovy, and updatedAt `2026-05-06T08:36:58Z`.
- Functional evidence paths: `LICENSE.md`, `README.md`, `docker`, `docs`, `docs/api-guide`, `docs/user-guide`, `grails-app/controllers`, `grails-app/domain`, `grails-app/services`, `grails-app/views/inventory`, `grails-app/views/order`, `grails-app/views/product`, `grails-app/views/purchaseOrder`, `grails-app/views/requisition`, `grails-app/views/shipment`, `grails-app/views/stockMovement`, `grails-app/views/stockTransfer`, `grails-app/views/report`, `grails-app/conf/templates`, `test/unit`, and `test/integration`.

## License

- Declared license: EPL-1.0.
- Evidence: `gh api repos/openboxes/openboxes/license` returned path `LICENSE.md` with SPDX `EPL-1.0`; GitHub metadata reports Eclipse Public License 1.0.
- Reuse classification: `cautious inspiration`.
- Rationale: EPL-1.0 is a weak-copyleft license. For a future MIT product, use OpenBoxes as a functional reference unless legal review approves specific source-level reuse and notice obligations.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: OpenBoxes covers supply-chain operations, products, suppliers, organizations, orders, requisitions, shipments, inventory, locations, reports, and users, but not full accounting, HR, payroll, or CRM.
- CRM rating: `Weak`. Evidence checked: organizations, parties, and suppliers exist, but no sales CRM, lead/opportunity, campaign, or case-management depth was verified.
- Accounting/invoicing/tax rating: `Weak` to `Partial` for purchasing adjacency. Evidence: purchase orders, payment terms, suppliers, and order adjustments exist. Unknown rationale: general ledger, AR/AP, invoices, tax, bank reconciliation, and statutory reports were not verified.
- HR/time/leave/payroll rating: `Weak`. Evidence: persons and users exist, but no employee HR, leave, attendance, benefits, or payroll modules were verified.
- Services/subscriptions/projects rating: `Partial` for service logistics and distributed stock, `Weak` for subscriptions/projects. Evidence: requisitions, fulfillment, shipments, stock movements, locations, and reports support operational service delivery. Unknown rationale: project management, subscription billing, and professional-services workflows were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Strong` for WMS/inventory and `Partial` for procurement/logistics. Evidence: inventory, product catalog, location, purchase order, requisition, shipment, stock movement, stock transfer, picklist, receiving, put-away, bin location, cycle count, barcode, and transaction views/services are present. Unknown rationale: MRP, shop-floor MES, maintenance, and formal quality modules were not verified.

## Architecture And Operations

- Stack: Groovy/Grails application with GSP views, services/controllers/domains, docs, Docker configuration, and tests. Evidence: repository metadata primary language Groovy and paths under `grails-app`, `docs`, `docker`, and `test`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: `docker/Dockerfile` and docker-compose files exist, plus installation and admin docs. Unknown rationale: Kubernetes/Helm manifests and self-hosted update windows were not verified.
- API/integration maturity: `Partial`. Evidence: `docs/api-guide` includes generic resources, authentication, inbound receiving, outbound stock movement, products, locations, and lookup docs. Unknown rationale: API stability, SDKs, and versioning guarantees were not audited.
- Internationalization/localization: `Partial`. Evidence: `docs/admin-guide/configuration/i18n.md`, localization configuration docs, and Grails app i18n paths exist. Unknown rationale: bilingual FR/EN completeness was not audited.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Quebec/Canada accounting, tax, HR, or payroll localization was identified. Healthcare logistics workflows may be reusable conceptually but do not prove statutory compliance.
- UX and product quality: `Partial`. Evidence: many GSP views for inventory, products, shipments, requisitions, reports, and admin workflows; docs include user/admin/API guides. Unknown rationale: no hands-on UI, mobile workflow, barcode device, or accessibility audit was performed.

## Risks

- License risk: `Medium`. EPL-1.0 is not aligned with a simple MIT reuse posture without legal review.
- Anti-copy risk: `High`. Inventory workflows, reports, templates, barcode behavior, API resources, GSP views, demo/configuration data, and logistics terms must not be copied.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `v0.9.7-hotfix1` was published on 2026-04-23 and repository metadata updated on 2026-05-06.
- Security risk: `Partial`. Evidence: users, roles, API authentication docs, uploads, reports, and logistics data create security surfaces. Unknown rationale: advisory history, auth model, dependency state, and tenancy were not audited.
- Dependency risk: `Partial`. Evidence: Grails/Groovy stack, Docker, database configuration, templates, docs, and tests create a mature but legacy-feeling dependency surface. Unknown rationale: lockfile freshness and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `grails-app/domain`, `grails-app/services`, `grails-app/controllers`, `grails-app/views/inventory`, `grails-app/views/product`, `grails-app/views/requisition`, `grails-app/views/shipment`, `grails-app/views/stockMovement`, `grails-app/views/stockTransfer`, `docs/api-guide`, and `docs/user-guide`.
- Reason: OpenBoxes is a strong WMS/inventory functional reference. EPL licensing means Graphify outputs should feed original specs rather than source reuse.
