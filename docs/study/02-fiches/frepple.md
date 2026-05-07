# frePPLe

## Progress

Fait: Fiche operations candidate completed from GitHub metadata, checked default-branch commit, COPYING evidence, MRP/model path evidence, planning examples, ERP connector evidence, deployment evidence, and localization evidence; fiche phase is 27/27 fiches, 100% complete after this sub-batch.
À faire: Shortlist decision, legal review, Graphify execution, and original functional specs are not started; downstream study work for operations planning remains 0% complete.
Attendu: Keep frePPLe as a high-value MRP/APS functional reference, but treat the dual-license/commercial-option wording as a legal review item before any technical inspiration beyond functional specification.

## Identity

- Project: frePPLe.
- Repository: https://github.com/frePPLe/frepple.
- Primary site: https://frepple.com.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `dc0d719afb36d4c5ef5b35b0d9cc060e7db4d3b5`, reported as default branch by `gh repo view frePPLe/frepple`.
- Repository metadata evidence: `gh repo view frePPLe/frepple --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "frePPLe - open source supply chain planning", homepage `https://frepple.com`, latest release `9.15.0 Community Edition` published 2026-04-10, licenseInfo `Other`, primary language C++, and updatedAt `2026-05-06T15:22:53Z`.
- Functional evidence paths: `COPYING`, `README.md`, `CMakeLists.txt`, `pyproject.toml`, `freppledb/input/models`, `freppledb/input/views`, `freppledb/output/views`, `freppledb/forecast`, `freppledb/execute`, `freppledb/webservice`, `freppledb/common`, `freppledb/erpconnection`, `freppledb/metrics`, `freppledb/wizard`, `src/model`, `src/solver`, `src/forecast`, `doc/examples`, `doc/erp-integration`, `contrib/docker`, and `contrib/kubernetes`.

## License

- Declared license: MIT dual-license with commercial option.
- Evidence: `gh api repos/frePPLe/frepple/license` returned path `COPYING` with SPDX `NOASSERTION`; `COPYING` states the software is free software under the MIT license and also describes a commercial license option for additional functionality and support.
- Reuse classification: `cautious inspiration`.
- Rationale: MIT text is favorable for reuse, but GitHub cannot classify the file automatically and the project has dual-license/commercial-option wording. Treat functional analysis as safe, and require a legal review before adapting implementation details, names, UI structures, data fixtures, or API shapes.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: frePPLe covers supply chain planning, demand, inventory, resources, suppliers, customers, operations, and ERP connectors, but not CRM, HR, accounting, payroll, or broad ERP administration.
- CRM rating: `Weak`. Evidence checked: no lead, opportunity, campaign, sales-pipeline, or customer-service CRM module was identified.
- Accounting/invoicing/tax rating: `Weak`. Evidence checked: no general ledger, invoicing, tax, AR/AP, bank reconciliation, or statutory reporting module was identified.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: resources and skills exist for planning, but employee HR, leave, attendance, benefits, and payroll were not verified.
- Services/subscriptions/projects rating: `Weak` to `Partial`. Evidence: resources, operations, demand, delivery plans, and constraints can inform service capacity planning, but no project-management, subscription, or professional-services billing module was verified.
- MRP/MES/WMS/maintenance/quality rating: `Strong` for MRP/APS and production planning, `Partial` for MES adjacency, and `Weak` for WMS/maintenance/quality. Evidence: input models include buffer, calendar, customer, demand, item, item distribution, location, operation, operation plan, resource, supplier, and views for capacity, inventory, manufacturing, purchasing, and sales; C++ paths include planning model and solver code; examples include operations, resources, forecasting, suppliers, and buffers. Unknown rationale: shop-floor execution, work-order feedback, maintenance, and formal quality workflows were not verified as full modules.

## Architecture And Operations

- Stack: C++ planning engine with Python/Django-style application modules and Vue/Vite frontend fragments. Evidence: primary language metadata, `src/model`, `src/solver`, `freppledb/*`, `pyproject.toml`, and frontend paths under `freppledb/input/frontend`.
- SaaS/self-hosted/Kubernetes relevance: `Strong`. Evidence: `contrib/docker` and `contrib/kubernetes/frepple-deployment.yaml`, `frepple-networkpolicy.yaml`, and `frepple-postgres-deployment.yaml` exist at the checked ref. Unknown rationale: self-hosted upgrade windows and migration compatibility were not audited.
- API/integration maturity: `Partial` to `Strong`. Evidence: `freppledb/webservice`, `freppledb/erpconnection`, REST/API-oriented documentation, and ERP integration docs for Odoo, ERPNext, Openbravo, and uzerp. Unknown rationale: stability of public APIs and client SDKs was not audited.
- Internationalization/localization: `Strong` for UI localization. Evidence: frontend translation files include `en.json` and `fr.json` plus other languages under `freppledb/input/frontend/src/i18n/translations`.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada/Quebec accounting, tax, HR, or payroll localization was identified. French UI translations do not prove local statutory support.
- UX and product quality: `Partial`. Evidence: planning views, operation-plan detail UI, kanban, gantt, wizard sample data, and planning examples exist. Unknown rationale: no hands-on UI review, accessibility review, or operational usability test was performed.

## Risks

- License risk: `Medium`. MIT text is favorable, but the dual-license/commercial-option wording and GitHub `NOASSERTION` result require review before implementation-level inspiration.
- Anti-copy risk: `High`. Planning models, solver behavior, operation-plan names, sample spreadsheets, images, reports, and connector mappings must not be copied into the future MIT product.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `9.15.0 Community Edition` was published on 2026-04-10 and repository metadata updated on 2026-05-06. Concern: community/commercial boundaries require review.
- Security risk: `Partial`. Evidence: webservice, Django-style modules, authentication/common paths, and deployment manifests create internet-facing surfaces. Unknown rationale: no advisory, dependency, permission, or deployment-hardening audit was performed.
- Dependency risk: `Partial`. Evidence: C++, Python, Django-style app modules, PostgreSQL deployment, webservice, frontend, and ERP connectors create a broad dependency and integration surface. Unknown rationale: lockfiles and transitive dependencies were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `freppledb/input/models`, `freppledb/input/views`, `freppledb/output/views`, `freppledb/forecast`, `freppledb/execute`, `freppledb/erpconnection`, `src/model`, `src/solver`, `src/forecast`, `doc/examples`, and `doc/erp-integration`.
- Reason: frePPLe is one of the strongest open functional references for MRP/APS. Graphify outputs should feed original planning specs, not copied solver logic or copied schema/API details.
