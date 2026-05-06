# OpenERP Study Design

Date: 2026-05-05
Status: Approved for execution planning
Target license for the future product: MIT

## 1. Purpose

This study will produce the decision base for building a fully open source MIT ERP/CRM/back-office platform.

The target product must be bilingual from the start: French and English. It must support a multi-country architecture, with Quebec/Canada prioritized for accounting, tax, HR, and payroll analysis.

The target architecture is SaaS multi-tenant first, while supporting self-hosted and on-prem deployments from the beginning. Self-hosted deployments must run on Kubernetes and include an integrated update process:

- normal support when the instance is less than 12 months behind the current supported version;
- guided catch-up when the instance is 12-24 months behind;
- unsupported or exceptional support when the instance is more than 24 months behind.

This study is not an implementation plan. It defines how to study existing open source products, extract functional knowledge, assess licensing risk, and decide which modules should be designed and built first.

## 2. Product Positioning

The product is not only a manufacturing ERP. It is a horizontal business platform for companies below 2B in revenue, with the MVP optimized for companies in the 20M-500M revenue range.

The core product should serve service companies and recurring-service businesses first, including SaaS, MSP, consulting, agencies, and operational services. The initial service-company scope is:

- customers and contacts;
- contracts and subscriptions;
- projects;
- time tracking;
- expenses;
- support/service activity;
- recurring, milestone, and time-based billing;
- accounting, HR, and payroll where the open source base and localization feasibility support it.

Manufacturing and MES are an important vertical pack, not the only target. The manufacturing scope should cover generic SMB manufacturing, prioritizing:

- discrete workshop and job shop workflows;
- light assembly;
- items, BOMs, routings, inventory, purchase flows, production orders, shop-floor execution, quality, and maintenance;
- process manufacturing, food, chemical, and heavier traceability later.

## 3. Study Approach

The selected approach is a funnel study:

1. Start with a broad corpus of approximately 15-30 open source projects.
2. Evaluate each project using a normalized assessment grid.
3. Shortlist the strongest candidates per domain.
4. Clone and analyze the shortlisted repositories.
5. Run Graphify deeply only on the shortlist.
6. Produce written functional specifications from the research outputs.

Odoo, Twenty, ERPNext, and Dolibarr are mandatory initial candidates, but the corpus is not limited to them. The study must discover additional open source products that cover parts of the scope, especially MES/MRP/WMS, accounting, HR, payroll, recurring billing, field/service operations, and maintenance.

Proprietary products such as Workday, Wave, QuickBooks, Sage, SAP Business One, and similar tools may be used as public functional, UX, pricing, and positioning references only. They must be clearly separated from the open source corpus and must not be treated as reusable sources.

## 4. Corpus And Assessment

Each open source candidate must receive a normalized project fiche with:

- repository URL, primary site, latest checked version or commit, and date checked;
- license and license obligations;
- reuse status: usable, cautious inspiration, functional reference only, or excluded;
- functional coverage by domain;
- product maturity, project activity, community, and release cadence;
- architecture and technology stack;
- UX and product quality;
- internationalization and localization support;
- Quebec/Canada coverage for accounting, tax, HR, and payroll;
- SaaS, multi-tenant, self-hosted, and Kubernetes readiness;
- integration model and API maturity;
- security, maintenance, and dependency risks.

The assessment method and rationale are defined in the execution plan. The only fixed gate is license risk. If a project creates too much risk for a future MIT product, it cannot become a technical base. It may still be used as a functional reference if the risk is documented and controlled.

The expected domain groups are:

- ERP and general business suites;
- CRM and pipeline tools;
- accounting, invoicing, tax, and payments;
- HR, time, leave, expenses, and payroll;
- subscription and recurring-service operations;
- project/service delivery;
- MRP, MES, WMS, shop-floor execution, maintenance, and quality;
- BI, reporting, and workflow automation.

## 5. License And Anti-Copy Policy

The future product should be MIT licensed by default. Apache-2.0 remains a fallback option only if legal review recommends explicit patent/contribution protection.

The study may analyze permissive and copyleft projects, but the treatment differs:

- MIT, Apache-2.0, BSD, and similarly permissive projects may be used for deeper technical inspiration, subject to attribution and license obligations.
- MPL and similar weak-copyleft projects require review before technical reuse.
- GPL and AGPL projects may be studied for functional behavior, workflows, domain concepts, and high-level architecture, but they are higher risk for a future MIT codebase.

AGPL is not considered contagious through functional study alone. A true independent recoding is not an AGPL modification. The risk appears when the new product copies or adapts protected expression, including code, distinctive structure, UI text, docs, assets, tests, demo data, internal naming, or very recognizable schemas/APIs.

The study will therefore use a written-spec recoding model:

1. Existing projects are observed and analyzed.
2. Findings are rewritten as functional specifications in French and English, without source code excerpts.
3. Implementation later starts from those specifications, not from copied source.
4. Before merge, code and product artifacts should pass an anti-copy audit.

The anti-copy audit should check:

- direct code similarity;
- names and internal concepts copied too closely;
- UI text and documentation similarity;
- copied assets or demo data;
- copied tests or fixtures;
- database/API structures that are unusually specific to one source;
- dependency and license obligations.

This is a risk-control process, not a final legal opinion. If the project becomes commercially deployed at scale, the license matrix and anti-copy process should be reviewed by counsel.

## 6. Graphify Use

Graphify must be used after the initial assessment, not across the entire raw corpus.

The minimum Graphify targets are:

- Odoo, including relevant industry/manufacturing modules or community modules where available;
- Twenty;
- ERPNext if the assessment keeps it in the shortlist;
- the strongest MES/MRP/WMS candidates discovered during the corpus phase;
- any accounting, HR, or payroll project that appears strong enough to influence MVP scope.

For each Graphify run, the study should capture:

- repository URL;
- branch, tag, or commit;
- license files;
- modules/plugins included;
- Graphify HTML output;
- Graphify JSON output;
- Graphify report;
- extraction notes and limitations.

Graphify outputs are research artifacts. They do not become implementation specs directly. They feed the written functional specifications and architecture analysis.

## 7. Functional Specification Outputs

The study will produce progressive specs:

- a global functional map across the full scope;
- implementation-ready specs only for the selected MVP modules.

The global map should describe domains, modules, capabilities, integration points, localization needs, and deprioritized areas.

Implementation-ready MVP specs should include:

- user roles;
- workflows;
- states and state transitions;
- data entities;
- business rules;
- permissions;
- API expectations;
- acceptance tests;
- localization requirements;
- audit and compliance requirements where relevant.

For accounting, HR, and payroll, the study must prioritize Quebec/Canada. If open source coverage is weak, the relevant feature should be downgraded to an integration, localized extension point, or later module rather than forcing a low-confidence implementation.

## 8. Expected Deliverables

The study must deliver:

1. Corpus report: 15-30 project fiches, assessment criteria, rationale, licenses, inclusion/exclusion reasons.
2. Positioning report: product target, differentiation, open source vs proprietary reference analysis, and MVP recommendation.
3. Functional map: full-scope domain map for services, recurring services, back office, and manufacturing/MES.
4. MVP functional specs: implementation-ready specs for the selected first modules.
5. License and anti-copy dossier: license matrix, reuse classification, recoding rules, and audit checklist.
6. Graphify dossier: generated HTML/JSON/reports and a synthesis of each analyzed repository.

## 9. End-Of-Study Decisions

At the end of this study, the project should be able to decide:

- which modules belong in the MVP;
- which modules are deferred because no strong open source base or localization basis exists;
- which open source projects inform each domain;
- which proprietary products are relevant only as positioning or UX references;
- what architecture should be planned for Svelte/TypeScript frontend, TypeScript backend, and Rust where useful;
- how SaaS and self-hosted Kubernetes distribution should be supported;
- how updates and support windows should work for self-hosted instances;
- what license and anti-copy constraints must be carried into implementation.

## 10. Initial Assumptions

- The repo is currently a planning workspace, not an initialized application codebase.
- The first implementation wave should not start until the study plan is written and the corpus is selected.
- The project should preserve the option of a broad horizontal product, not collapse into a manufacturing-only ERP.
- MIT is the preferred license for the future product.
- French and English are first-class requirements, not later translations.
