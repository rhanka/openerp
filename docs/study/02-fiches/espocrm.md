# EspoCRM

## Progress

Fait: Fiche batch candidate completed from GitHub metadata, default-branch commit evidence, license endpoint evidence, README evidence, composer metadata, package metadata, and source path evidence; fiche phase is 11/27 fiches, about 41% complete after this batch.
À faire: Legal review, extension ecosystem audit, Graphify execution, and remaining corpus fiches outside this batch are not completed; fiche phase is 11/27 fiches, about 41% complete after this batch.
Attendu: Use this fiche as a mature CRM platform functional reference only; prioritize API and customization observations over source-level reuse.

## Identity

- Project: EspoCRM.
- Repository: https://github.com/espocrm/espocrm.
- Primary site: https://www.espocrm.com.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `7a24f3d02ac2c47ed10116a16adbe7ccc5dabee0`, reported as default branch by `gh repo view espocrm/espocrm`.
- Repository metadata evidence: `gh repo view espocrm/espocrm --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "EspoCRM - Open Source CRM Application", homepage `https://www.espocrm.com`, latest release `9.3.6` published 2026-04-30, licenseInfo `GNU Affero General Public License v3.0`, and updatedAt `2026-05-06T04:04:02Z`.
- Functional evidence paths: `README.md`, `LICENSE.txt`, `composer.json`, `package.json`, `application/Espo/Modules/Crm`, `application/Espo/Core/Api`, `application/Espo/Controllers`, `client`, `frontend`, and `install` at the checked ref.

## License

- Declared license: AGPL-3.0-or-later in package metadata, with AGPL-3.0 detected by GitHub.
- Evidence: `gh api repos/espocrm/espocrm/license` returned path `LICENSE.txt` with SPDX `AGPL-3.0`; root `LICENSE.txt` contains GNU AGPL version 3 text; README says EspoCRM is licensed under GNU AGPLv3; `composer.json` and `package.json` declare `AGPL-3.0-or-later`.
- Reuse classification: `functional reference only`.
- Rationale: AGPL is high risk for a future MIT target. EspoCRM can inform CRM product behavior, extension expectations, REST API maturity, and customization workflows only through independently rewritten analysis.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: README positions EspoCRM as a CRM platform and custom business application platform, not an ERP suite.
- CRM rating: `Strong`. Evidence: README lists leads, contacts, opportunities, marketing campaigns, support cases, and business information management; source paths include `application/Espo/Modules/Crm`, CRM controllers, email, lead capture, ACL, calls, meetings, and API infrastructure.
- Accounting/invoicing/tax rating: `Weak`. Evidence checked: README and source path scan did not verify first-party accounting, invoices, tax, ledger, or billing modules in the core repository.
- HR/time/leave/payroll rating: `Weak`. Evidence checked: no HR, leave, attendance, timesheet, or payroll module was verified in the checked source path scan.
- Services/subscriptions/projects rating: `Partial`. Evidence: README lists support cases and custom entities; source paths include cases, tasks, calls, meetings, email, lead capture, jobs, and customization metadata. Unknown rationale: project management, service contracts, recurring subscriptions, and project accounting were not verified as first-party core modules.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, inventory, warehouse, maintenance, quality, BOM, or shop-floor modules were verified in this CRM repository.

## Architecture And Operations

- Stack: PHP REST API backend with single-page frontend, MySQL/MariaDB or PostgreSQL support, Slim, Symfony components, Ratchet, JavaScript/TypeScript frontend tooling, Grunt, PHPStan, and PHPUnit. Evidence: README architecture and requirements plus `composer.json` and `package.json`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README documents manual installation, script installation, Docker installation, and Traefik installation. Unknown rationale: no first-party Kubernetes or Helm path was found in the checked repository path scan.
- API/integration maturity: `Strong`. Evidence: README states a straightforward REST API; source paths include `application/Espo/Core/Api`, API controllers, API key authentication, OAuth account/provider paths, email integration, web socket entry point, and metadata schema references.
- Internationalization/localization: `Partial`. Evidence: README describes POEditor translation workflow and language contributions; package scripts include translation build tooling. Unknown rationale: Canada, Quebec, tax, HR, or accounting localization was not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec-specific business localization, tax, payroll, or French-Canada package was found in the checked source path scan.
- UX and product quality: `Partial`. Evidence: README describes an uncluttered, minimalist, fast UI with a short learning curve and includes a product screenshot and online demo. Unknown rationale: no hands-on UI, accessibility, or mobile audit was performed.

## Risks

- License risk: `High`. AGPL-3.0-or-later blocks technical reuse for the MIT target.
- Anti-copy risk: `High`. EspoCRM has distinctive CRM metadata, REST API patterns, UI behavior, extension mechanisms, and documentation that must be rewritten as neutral findings before implementation.
- Maintenance risk: `Strong` for current activity, with residual review needed. Evidence: latest release `9.3.6` was published on 2026-04-30 and repository metadata updated on 2026-05-06. Unknown rationale: long-term roadmap and extension compatibility were not audited.
- Security risk: `Partial`. Evidence: source paths include ACL, API auth, API keys, OAuth, user security, two-factor email, LDAP dependency, and authentication modules. Unknown rationale: no advisory history, penetration findings, or permission model audit was performed.
- Dependency risk: `Partial`. Evidence: `composer.json` and `package.json` show a large PHP and JavaScript dependency surface, including some GitHub-pinned frontend packages and dev tooling. Unknown rationale: transitive CVEs and package maintenance were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `application/Espo/Modules/Crm`, `application/Espo/Core/Api`, `application/Espo/Controllers`, `application/Espo/Core/Authentication`, `application/Espo/Core/Acl`, `application/Espo/Classes`, `client`, `frontend`, and metadata/schema resources.
- Reason: EspoCRM is a mature CRM platform with strong API and customization evidence. Graphify is useful if the shortlist needs a compact CRM-platform comparison, but AGPL restricts output to functional analysis.
