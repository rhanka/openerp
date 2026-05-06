# Twenty

## Progress

Fait: Fiche mandatory seed candidate completed from GitHub metadata, root license evidence, package metadata, README evidence, deployment paths, and module directory evidence; fiche work about 100% complete.
À faire: Legal review, enterprise-file boundary review, and Graphify execution are not started; downstream study work about 0% complete.
Attendu: Use this fiche as an input to CRM shortlist and Graphify planning because Twenty is a mandatory target from the approved spec.

## Identity

- Project: Twenty.
- Repository: https://github.com/twentyhq/twenty.
- Primary site: https://twenty.com.
- Date checked: 2026-05-06.
- Checked ref: `main` branch, reported as default branch by `gh repo view twentyhq/twenty`.
- Repository metadata evidence: `gh repo view twentyhq/twenty --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount` returned description "The open alternative to Salesforce, designed for AI.", homepage `https://twenty.com`, latest release `v2.2.0` published 2026-05-04, licenseInfo `Other`, and updatedAt `2026-05-06T03:23:06Z`.
- Functional evidence paths: `README.md`, `package.json`, `packages/twenty-server/src/modules`, `packages/twenty-front/src/modules`, `packages/twenty-docker`, `packages/twenty-sdk`, and `packages/twenty-client-sdk` at `main`.

## License

- Declared license: AGPL-3.0 for the main package, with a commercial license carve-out for files marked as enterprise.
- Evidence: `https://github.com/twentyhq/twenty/blob/main/LICENSE`; raw file checked with `curl -L https://raw.githubusercontent.com/twentyhq/twenty/main/LICENSE`; `https://github.com/twentyhq/twenty/blob/main/package.json` declares `license` as `AGPL-3.0`; GitHub license endpoint returned path `LICENSE`, SPDX `NOASSERTION`, key `other`.
- Reuse classification: `functional reference only`.
- Rationale: The methodology treats AGPL as high risk for a future MIT target. Twenty can inform CRM behavior, extensibility concepts, object modeling patterns, and workflow expectations only through independently rewritten findings. Files marked enterprise are not open-source reuse targets and should be excluded from technical study beyond public functional observation.

## Functional Coverage

- ERP/general suite rating: `Weak`. Evidence: README positions Twenty as an open-source CRM and app-building platform, not an ERP suite; checked modules focus on people, companies, opportunities, tasks, workflows, messaging, dashboards, and workspace management. No accounting, inventory, HR, manufacturing, or purchasing modules were observed.
- CRM rating: `Strong`. Evidence: README identifies Twenty as an open-source CRM and an alternative to Salesforce; server modules include `company`, `person`, `opportunity`, `task`, `timeline`, `calendar`, `messaging`, `workflow`, and `dashboard`; frontend modules include `companies`, `people`, `activities`, `views`, `workflow`, `dashboards`, and `settings`.
- Accounting/invoicing/tax rating: `Weak`. Evidence: no accounting, invoice, tax, payment, or ledger modules were observed in `packages/twenty-server/src/modules` or `packages/twenty-front/src/modules`. Unknown rationale: custom apps could model billing objects, but no first-party accounting domain was verified.
- HR/time/leave/payroll rating: `Weak`. Evidence: checked modules include users and workspace members, but no HR, leave, timesheet, attendance, or payroll modules were observed.
- Services/subscriptions/projects rating: `Partial`. Evidence: `task`, `workflow`, `calendar`, `dashboard`, object metadata, app extension, and custom object support can model service workflows; README describes objects, fields, views, logic functions, agents, and apps. Unknown rationale: first-party project accounting, recurring billing, subscriptions, and service delivery modules were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence: no manufacturing, inventory, warehouse, maintenance, quality, BOM, routing, or shop-floor modules were observed in checked module directories.

## Architecture And Operations

- Stack: TypeScript monorepo using Nx, NestJS, React, PostgreSQL, Redis, BullMQ, Lingui, and GraphQL-related dependencies. Evidence: README Stack section and `package.json` dependencies/workspaces at `main`.
- SaaS/self-hosted/Kubernetes relevance: `Strong` for CRM/self-host/Kubernetes packaging. Evidence: README documents cloud and self-hosting via Docker Compose; repository tree includes `packages/twenty-docker/docker-compose.yml`, `packages/twenty-docker/helm/twenty`, `packages/twenty-docker/k8s/manifests`, and Terraform under `packages/twenty-docker/k8s/terraform`.
- API/integration maturity: `Strong` for CRM platform integration. Evidence: README describes app development with objects, fields, views, agents, and logic functions; `package.json` workspaces include `packages/twenty-sdk`, `packages/twenty-client-sdk`, `packages/twenty-zapier`, `packages/twenty-apps`, and `packages/twenty-cli`.
- Internationalization/localization: `Partial`. Evidence: README stack lists Lingui and links Crowdin; frontend has `locales` and `localization` directories; docs include localized self-host pages under `packages/twenty-docs/l`. Unknown rationale: business-domain localization for accounting, tax, HR, and payroll was not verified.
- Quebec/Canada relevance: `Weak`. Evidence: no Canada or Quebec accounting, tax, HR, payroll, or language-specific business localization modules were observed. Twenty may still support French UI localization, but Quebec business rules were not verified.
- UX and product quality: `Partial`. Evidence: README positions Twenty as a modern CRM and references user guide, customizable layouts, objects, views, workflows, agents, and Figma; frontend modules include `layout-customization`, `views`, `side-panel`, `command-menu`, `dashboards`, and `ui`. Unknown rationale: no hands-on UI walkthrough or accessibility audit was performed.

## Risks

- License risk: `High`. AGPL plus commercial-marked enterprise files prevents technical reuse for a future MIT product under the study method.
- Anti-copy risk: `High`. Twenty has distinctive CRM object, workflow, app-building, SDK, UI, and AI-agent concepts. Later specs must avoid copying source, UI text, docs, internal names, schemas, generated metadata, tests, demo data, or SDK/API shapes too closely.
- Security risk: `Unknown`. Evidence checked: README and top-level module listings showed authentication-adjacent frontend modules such as `auth`, `captcha`, `accounts`, connected-account modules, and operational tooling, but no security policy or advisory review was performed for this fiche.
- Maintenance risk: `Partial`. Evidence: latest release `v2.2.0` was published on 2026-05-04 and repository metadata updated on 2026-05-06, with 45,528 stars. Concern: feature scope is CRM/platform-first, so ERP/back-office coverage gaps are product-scope risks rather than maintenance failures.
- Dependency risk: `Partial`. Evidence: `package.json` pins a TypeScript/Nx/Yarn monorepo with dependencies and resolutions, and the README stack includes NestJS, BullMQ, PostgreSQL, Redis, React, Jotai, Linaria, and Lingui. Unknown rationale: lockfile vulnerability state and transitive dependency exposure were not audited.

## Graphify Eligibility

- Graphify target: yes.
- Modules/plugins to inspect: `packages/twenty-server/src/modules/company`, `packages/twenty-server/src/modules/person`, `packages/twenty-server/src/modules/opportunity`, `packages/twenty-server/src/modules/task`, `packages/twenty-server/src/modules/workflow`, `packages/twenty-server/src/modules/dashboard`, `packages/twenty-server/src/modules/messaging`, `packages/twenty-server/src/modules/calendar`, `packages/twenty-front/src/modules/companies`, `packages/twenty-front/src/modules/people`, `packages/twenty-front/src/modules/activities`, `packages/twenty-front/src/modules/views`, `packages/twenty-front/src/modules/workflow`, `packages/twenty-front/src/modules/object-metadata`, `packages/twenty-sdk`, `packages/twenty-client-sdk`, and deployment packages under `packages/twenty-docker`.
- Reason: Mandatory target from approved spec. Graphify should extract CRM model, workflow, extensibility, and deployment architecture signals while respecting AGPL and enterprise-file boundaries.
