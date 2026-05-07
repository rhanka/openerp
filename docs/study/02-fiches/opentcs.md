# OpenTCS

## Progress

Fait: Fiche operations candidate completed from GitHub metadata, checked default-branch commit, README licensing section, source/assets license split, AGV control scope, dispatching/routing/scheduling paths, module evidence, and release metadata; fiche phase is 27/27 fiches, 100% complete after this sub-batch.
À faire: Shortlist decision, legal review, Graphify execution, and original MES/shop-floor transport specs are not started; downstream shop-floor control study remains 0% complete.
Attendu: Use OpenTCS as a shop-floor transport-control reference if the manufacturing vertical keeps AGV/material-flow scope, but do not reuse assets, docs, plant models, or code without license-by-file review.

## Identity

- Project: OpenTCS.
- Repository: https://github.com/openTCS/opentcs.
- Primary site: https://www.opentcs.org/.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `a4f10951bebbbc800ceb4147171eee0fe7abf4fa`, reported as default branch by `gh repo view openTCS/opentcs`.
- Repository metadata evidence: `gh repo view openTCS/opentcs --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "The open Transportation Control System (by Fraunhofer IML)", homepage `https://www.opentcs.org/`, latest release `Release 7.2.1` published 2026-02-03, null GitHub licenseInfo, primary language Java, and updatedAt `2026-05-07T01:19:19Z`.
- Functional evidence paths: `README.adoc`, `LICENSES`, `REUSE.toml` files, `opentcs-api-base`, `opentcs-kernel`, `opentcs-kernelcontrolcenter`, `opentcs-model-editor`, `opentcs-operationsdesk`, `opentcs-plantoverview`, `opentcs-strategies-default`, `opentcs-strategies-default/src/main/java/org/opentcs/strategies/basic/dispatching`, `opentcs-strategies-default/src/main/java/org/opentcs/strategies/basic/routing`, and `opentcs-strategies-default/src/main/java/org/opentcs/strategies/basic/scheduling`.

## License

- Declared license: MIT source with mixed asset and third-party licenses.
- Evidence: `README.adoc` licensing section says original source code is MIT, original assets including documentation are CC-BY-4.0, some configuration/data files are CC0-1.0, and some third-party assets are Apache-2.0 or OFL-1.1. The GitHub license endpoint returned 404 and `licenseInfo` is null, so file-level review is required.
- Reuse classification: `cautious inspiration`.
- Rationale: MIT source is favorable, but the repo uses REUSE-style file-level licensing and has non-code assets/docs under different licenses. Functional specs are safe; implementation-level reuse requires file-by-file license confirmation.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: OpenTCS is a transport-control framework, not an ERP suite.
- CRM rating: `Weak`. Evidence checked: no CRM modules were identified.
- Accounting/invoicing/tax rating: `Weak`. Evidence checked: no accounting, invoicing, tax, AR/AP, or payroll accounting modules were identified.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, leave, attendance, or payroll modules were identified.
- Services/subscriptions/projects rating: `Weak`. Evidence checked: no project, subscription, or service-delivery billing modules were identified.
- MRP/MES/WMS/maintenance/quality rating: `Strong` for shop-floor vehicle/material-flow control and `Partial` for MES/WMS adjacency. Evidence: README defines OpenTCS as a platform/framework for AGVs and mobile robots; modules cover kernel, model editor, operations desk, plant overview, drivers, dispatching, routing, scheduling, peripherals, orders, vehicles, paths, points, and plant model data. Unknown rationale: production orders, inventory accounting, maintenance, and quality workflows were not verified.

## Architecture And Operations

- Stack: Java 21 platform with Gradle modules and multiple desktop/server components. Evidence: repository metadata primary language Java, `build.gradle`, README Java guidance, and modules under `opentcs-*`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: OpenTCS is self-hostable and modular. Unknown rationale: Kubernetes manifests, Helm charts, SaaS operation patterns, and update windows were not verified.
- API/integration maturity: `Partial` to `Strong`. Evidence: `opentcs-api-base`, kernel APIs, driver components, communication adapter concept, and strategy modules exist. Unknown rationale: external REST/API stability and SDK maturity were not audited.
- Internationalization/localization: `Partial`. Evidence: multi-module application resources exist, but explicit FR/EN UI localization coverage was not audited.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Quebec/Canada regulatory, accounting, HR, or payroll localization was identified. This is expected for AGV control scope.
- UX and product quality: `Partial`. Evidence: operations desk, plant overview, model editor, kernel control center, and documentation exist. Unknown rationale: no hands-on UI test, operator workflow test, or accessibility review was performed.

## Risks

- License risk: `Medium`. Source appears MIT, but GitHub license endpoint does not classify the repo and assets/docs/configuration use other licenses.
- Anti-copy risk: `High`. Plant model structures, route/dispatch/schedule behavior, operator UI, documentation, and file formats must not be copied into an MIT ERP/MES product.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `7.2.1` was published on 2026-02-03 and repository metadata updated on 2026-05-07.
- Security risk: `Partial`. Evidence: kernel/control interfaces and vehicle communication adapters create operational control surfaces. Unknown rationale: no advisory, auth, network, or industrial-safety audit was performed.
- Dependency risk: `Partial`. Evidence: Java 21, Gradle multi-module architecture, desktop/server applications, and external vehicle drivers create integration complexity. Unknown rationale: lockfile and dependency vulnerability state were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `opentcs-api-base`, `opentcs-kernel`, `opentcs-operationsdesk`, `opentcs-plantoverview`, `opentcs-model-editor`, `opentcs-strategies-default/src/main/java/org/opentcs/strategies/basic/dispatching`, `opentcs-strategies-default/src/main/java/org/opentcs/strategies/basic/routing`, and `opentcs-strategies-default/src/main/java/org/opentcs/strategies/basic/scheduling`.
- Reason: OpenTCS is relevant only if the manufacturing vertical includes material-flow control, AGV dispatching, or plant-model concepts. Graphify outputs must stay at functional and conceptual level.
