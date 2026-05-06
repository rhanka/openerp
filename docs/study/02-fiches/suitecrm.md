# SuiteCRM

## Progress

Fait: Fiche batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, README evidence, composer metadata, and module path evidence; fiche phase is 11/27 fiches, about 41% complete after this batch.
À faire: Legal review, SuiteCRM 8 comparison, Graphify execution, and remaining corpus fiches outside this batch are not completed; fiche phase is 11/27 fiches, about 41% complete after this batch.
Attendu: Use this fiche as a mature CRM functional reference only, and document the AGPL/GPL metadata mismatch before any deeper technical study.

## Identity

- Project: SuiteCRM.
- Repository: https://github.com/SuiteCRM/SuiteCRM.
- Primary site: https://www.suitecrm.com.
- Date checked: 2026-05-06.
- Checked ref: `hotfix` branch at commit `1e97fa326893273568829b4219d177043f2a44f2`, reported as default branch by `gh repo view SuiteCRM/SuiteCRM`.
- Repository metadata evidence: `gh repo view SuiteCRM/SuiteCRM --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "SuiteCRM - Open source CRM for the world", homepage `https://www.suitecrm.com`, latest release `v7.15.1` published 2026-03-19, licenseInfo `GNU Affero General Public License v3.0`, and updatedAt `2026-05-06T00:14:26Z`.
- Functional evidence paths: `README.md`, `LICENSE.txt`, `composer.json`, `modules`, `Api/V8`, `Api/docs/swagger/swagger.json`, `service`, `soap`, `include`, and `themes` at the checked ref.

## License

- Declared license: AGPL-3.0 from repository license evidence and README; package metadata conflict noted because `composer.json` declares `GPL-3.0`.
- Evidence: `gh api repos/SuiteCRM/SuiteCRM/license` returned path `LICENSE.txt` with SPDX `AGPL-3.0`; root `LICENSE.txt` contains GNU AGPL version 3 text; README says SuiteCRM is published under AGPLv3; `composer.json` declares `license` as `GPL-3.0`.
- Reuse classification: `functional reference only`.
- Rationale: AGPL is high risk for a future MIT target, and the metadata mismatch reinforces the need for conservative handling. SuiteCRM can inform CRM workflows and module coverage only through independently written analysis.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: README positions SuiteCRM as CRM, not ERP; modules focus on sales, marketing, service, collaboration, reporting, and CRM administration.
- CRM rating: `Strong`. Evidence: README describes enterprise-ready CRM; module paths include Accounts, Contacts, Leads, Opportunities, Campaigns, Cases, Calls, Meetings, Tasks, Emails, Documents, Calendar, Prospects, Reports, WorkFlow, Quotes, Contracts, Products, and Invoices.
- Accounting/invoicing/tax rating: `Partial`. Evidence: module paths include `AOS_Invoices`, `AOS_Quotes`, `AOS_Contracts`, `AOS_Products`, `AOS_Product_Categories`, currencies, and PDF templates. Unknown rationale: no general ledger, tax engine, bank reconciliation, or statutory accounting module was verified.
- HR/time/leave/payroll rating: `Weak`. Evidence: module paths include Employees and resource calendar, but no HR records, leave, attendance, timesheets, or payroll module was verified.
- Services/subscriptions/projects rating: `Partial`. Evidence: module paths include Cases, Contracts, Projects, ProjectTask, BusinessHours, Knowledge Base, WorkFlow, Calendar, and support-related case updates. Unknown rationale: service subscriptions, SLA billing, and project accounting were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no inventory, warehouse, manufacturing, maintenance, quality, BOM, or routing modules were identified in the checked module list.

## Architecture And Operations

- Stack: PHP CRM application on traditional LAMP-style architecture with Apache or IIS, PHP, MySQL/MariaDB or MSSQL, Smarty, JavaScript, Slim API dependencies, OAuth packages, SAML, Elasticsearch client, and extensive legacy SugarCRM-derived modules. Evidence: README requirements and `composer.json`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README says SuiteCRM can be self-hosted on internal networks, public cloud providers, or managed hosting, and lists LAMP requirements. Unknown rationale: no first-party Docker Compose, Kubernetes, or Helm deployment path was found in the checked repository path scan.
- API/integration maturity: `Strong`. Evidence: repository paths include `Api/V8`, OAuth2 entities and repositories, Swagger docs, Postman collection, SOAP service paths, connectors, email integration, calendar sync, and SAML dependency metadata.
- Internationalization/localization: `Partial`. Evidence: README links translations, and repository paths include many language files under modules and include templates. Unknown rationale: accounting, tax, HR, and Canada-specific localization were not audited.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec-specific CRM, accounting, tax, or French-Canada localization modules were verified. Translation availability alone does not prove Quebec business-rule support.
- UX and product quality: `Partial`. Evidence: README describes SuiteCRM 7 as mature and stable with demo, community, regular releases, and enterprise-ready CRM status. Unknown rationale: no hands-on UI, accessibility, or SuiteCRM 8 comparison was performed.

## Risks

- License risk: `High`. AGPL-3.0 blocks technical reuse for the MIT target; `composer.json` license mismatch requires caution but does not lower the risk.
- Anti-copy risk: `High`. SuiteCRM has mature CRM module names, workflows, metadata, APIs, UI text, and report/workflow structures that must not be copied into later implementation specs.
- Maintenance risk: `Partial`. Evidence: latest release `v7.15.1` was published on 2026-03-19 and repository metadata updated on 2026-05-06. Concern: README states SuiteCRM 8 is the latest version but not yet as feature complete, so version-line strategy needs review.
- Security risk: `Partial`. Evidence: README references releases with security patches; modules include ACL, roles, security groups, OAuth2, SAML dependencies, and API authentication paths. Unknown rationale: no advisory history, CVE scan, or permission model audit was performed.
- Dependency risk: `Partial`. Evidence: `composer.json` includes Slim, OAuth, SAML, Elasticsearch, Smarty, PHPMailer, HTML purifier, validators, and many legacy-compatible dependencies. Unknown rationale: transitive vulnerability and upgrade exposure were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `modules/Accounts`, `modules/Contacts`, `modules/Leads`, `modules/Opportunities`, `modules/Campaigns`, `modules/Cases`, `modules/AOS_Quotes`, `modules/AOS_Invoices`, `modules/AOS_Contracts`, `modules/AOW_WorkFlow`, `modules/AOR_Reports`, `modules/Project`, `modules/ProjectTask`, `Api/V8`, and `Api/docs`.
- Reason: SuiteCRM is a mature CRM functional reference with strong workflow and API coverage, but AGPL requires Graphify output to remain functional analysis only.
