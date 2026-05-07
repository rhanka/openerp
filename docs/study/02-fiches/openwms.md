# OpenWMS

## Progress

Fait: Fiche operations candidate completed from GitHub metadata, checked default-branch commit, Apache license endpoint evidence, README architecture evidence, microservice/public-private split evidence, WMS/MFC scope, and Spring/Kubernetes/cloud evidence; fiche phase is 27/27 fiches, 100% complete after this sub-batch.
À faire: Shortlist decision, component-by-component license review, Graphify execution, and original WMS specs are not started; downstream WMS study remains 0% complete.
Attendu: Keep OpenWMS as a WMS/MFC architecture and functional reference, but treat it as cautious inspiration because several business components are split into separate repositories, private previews, or GPL/private modules.

## Identity

- Project: OpenWMS.
- Repository: https://github.com/openwms/org.openwms.
- Primary site: https://openwms.github.io/org.openwms/.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `6e6e5889a60d667e22c997e1eb9d7e0386010fae`, reported as default branch by `gh repo view openwms/org.openwms`.
- Repository metadata evidence: `gh repo view openwms/org.openwms --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Open Warehouse Management System", homepage `https://openwms.github.io/org.openwms/`, latest release `3.0.0` published 2025-02-22, licenseInfo Apache-2.0, primary language Java, and updatedAt `2026-05-03T14:18:15Z`.
- Functional evidence paths and README evidence: `LICENSE`, `README.md`, `pom.xml`, `org.openwms.core.util`, `src`, `scripts`, `.github/workflows`; README describes a WMS with Material Flow Control, ERP interaction, inventory service references, MFC/device integration, Spring Boot microservices, RabbitMQ event propagation, and deployment on PaaS/Kubernetes platforms.

## License

- Declared license: Apache-2.0 with public/private component split.
- Evidence: `gh api repos/openwms/org.openwms/license` returned path `LICENSE` with SPDX `Apache-2.0`; README microservice table lists many components with mixed accessibility, including public Apache-2.0 components, private/private-preview components, and some GPLv3/private modules.
- Reuse classification: `cautious inspiration`.
- Rationale: the root repo is permissive, but the product scope spans many repositories and not all functional components are equally open. Direct reuse should be limited to verified Apache-2.0 files/components with notices and patent-license obligations; otherwise use only functional specs.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: README describes ERP systems sending high-level tasks into OpenWMS and status/product-catalog interactions back to ERP, but OpenWMS itself is not a full ERP.
- CRM rating: `Weak`. Evidence checked: no lead, opportunity, customer-service CRM, or sales-campaign modules were identified.
- Accounting/invoicing/tax rating: `Weak`. Evidence checked: no general ledger, invoicing, tax, AR/AP, or statutory accounting modules were identified.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, leave, attendance, or payroll modules were identified.
- Services/subscriptions/projects rating: `Weak`. Evidence checked: no project or subscription modules were identified.
- MRP/MES/WMS/maintenance/quality rating: `Strong` for WMS/MFC architecture and `Partial` for MES adjacency. Evidence: README covers warehouse tasks from ERP, inventory service references, receiving, movements, transport, routing, tasks, shipping, putaway, trucks, device/PLC interaction, RabbitMQ eventing, and Spring Boot microservices. Unknown rationale: complete open source availability varies by component, and formal maintenance/quality modules were not verified.

## Architecture And Operations

- Stack: Java/Spring Boot microservice ecosystem with Maven, Spring Framework subprojects, RabbitMQ, JPA, some BPMN workflow engine support, and separate service repositories. Evidence: README technologies section, `pom.xml`, `org.openwms.core.util`, and repository metadata.
- SaaS/self-hosted/Kubernetes relevance: `Strong`. Evidence: README says Spring Boot applications are designed to run on modern PaaS cloud platforms including Azure Kubernetes Service, AWS EKS, and Red Hat OpenShift. Unknown rationale: project-specific Helm charts, operator, and update/rollback process were not audited.
- API/integration maturity: `Partial`. Evidence: README describes ERP integration, event/command propagation, service repositories, product catalog updates, and device-facing integrations. Unknown rationale: stable API specs and SDKs were not audited in this root repo.
- Internationalization/localization: `Weak` to `Partial`. Evidence: README lists a translation service as private preview; root repo localization depth was not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Quebec/Canada accounting, tax, HR, or payroll localization was identified. WMS functional concepts are region-neutral but do not solve statutory needs.
- UX and product quality: `Partial`. Evidence: README references a user interface and architecture, but the checked root repo mainly exposes common/core utility code and documentation. Unknown rationale: no hands-on UI or operator-flow review was performed.

## Risks

- License risk: `Medium`. Root repo is Apache-2.0, but product-level functionality spans multiple repositories with public/private and GPL/private components.
- Anti-copy risk: `High`. Service boundaries, message semantics, API names, architecture diagrams, documentation, and business component names must not be copied.
- Maintenance risk: `Partial`. Evidence: latest release `3.0.0` was published on 2025-02-22 and repository metadata updated on 2026-05-03. Concern: functional completeness requires tracking many component repositories.
- Security risk: `Partial`. Evidence: warehouse control, device integration, event broker, ERP integration, and microservices create operational security surfaces. Unknown rationale: auth, tenancy, advisory, and dependency audit were not performed.
- Dependency risk: `Partial` to `High`. Evidence: distributed Spring Boot microservices, RabbitMQ, JPA, BPMN engines, cloud platforms, and separate service repositories increase integration complexity.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `README.md`, `org.openwms.core.util`, public component repositories referenced by README such as `org.openwms.tms.transportation`, `org.openwms.tms.routing`, `org.openwms.wms.receiving`, `org.openwms.wms.movements`, `org.openwms.common.service`, and `org.openwms.common.tasks`.
- Reason: OpenWMS can inform WMS/MFC functional boundaries and integration architecture, but Graphify should be scoped to verified public permissive components and original written specs.
