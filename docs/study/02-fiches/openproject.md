# OpenProject

## Progress

Fait: Fiche sub-batch candidate completed from GitHub metadata, default-branch commit evidence, GPL-3.0 license endpoint evidence, project-management controller/model evidence, API documentation evidence, frontend evidence, localization evidence, and release metadata; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
À faire: Edition boundary review, project-accounting fit review, Graphify execution, and remaining corpus fiches outside this sub-batch are not completed; fiche phase is 20/27 fiches, about 74% complete after this sub-batch.
Attendu: Use this fiche as a mature project-management functional reference, but keep all source-level reuse blocked for the MIT target because of GPL.

## Identity

- Project: OpenProject.
- Repository: https://github.com/opf/openproject.
- Primary site: https://www.openproject.org.
- Date checked: 2026-05-06.
- Checked ref: `dev` branch at commit `a69eaaee7a37deec3d4f3f92802e37efa6689b0d`, reported as default branch by `gh repo view opf/openproject`.
- Repository metadata evidence: `gh repo view opf/openproject --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "OpenProject is the leading open source project management software.", homepage `https://www.openproject.org`, latest release `v17.3.1` published 2026-04-20, licenseInfo `GNU General Public License v3.0`, primary language Ruby, and updatedAt `2026-05-06T05:49:53Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `Gemfile`, `app/controllers/projects_controller.rb`, `app/controllers/work_packages_controller.rb`, `app/controllers/versions_controller.rb`, `app/controllers/members_controller.rb`, `app/controllers/admin/settings`, `app/models/project.rb`, `app/models/work_package.rb`, `app/models/version.rb`, `app/models/member.rb`, `frontend`, `docs/api`, `config/locales`, `docker`, and `spec` at the checked ref.

## License

- Declared license: GPL-3.0.
- Evidence: `gh api repos/opf/openproject/license` returned path `LICENSE` with SPDX `GPL-3.0`; GitHub metadata reports GNU General Public License v3.0.
- Reuse classification: `functional reference only`.
- Rationale: GPL-3.0 blocks direct source-level reuse in the MIT target under the study method. OpenProject can inform independently rewritten project-management specs only.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: OpenProject covers project operations, work packages, members, versions, portfolios, programs, forums, wiki, news, repositories, notifications, permissions, custom fields, exports, and admin settings, but not full ERP finance, HR, inventory, or manufacturing.
- CRM rating: `Weak`. Evidence checked: no sales CRM, lead, opportunity, or campaign module was identified.
- Accounting/invoicing/tax rating: `Weak` to `Partial` for project cost adjacency. Evidence: work-package exports, time/spent time paths, custom fields, and project reporting exist. Unknown rationale: invoicing, general ledger, tax, accounts receivable/payable, and payroll accounting were not verified.
- HR/time/leave/payroll rating: `Partial` for team/project staffing and time-related workflows; `Weak` for HR/payroll. Evidence: users, groups, members, working hours, non-working times, work packages, reminders, and project assignments exist. Unknown rationale: employee master data, leave, benefits, attendance, and payroll were not verified.
- Services/subscriptions/projects rating: `Strong` for project delivery. Evidence: project, work package, version, member, portfolio, program, custom field, workflow, notification, export, Gantt/PDF export, and API documentation paths support service-company project execution.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence checked: no manufacturing, warehouse, maintenance, or formal quality modules were identified.

## Architecture And Operations

- Stack: Ruby/Rails application with TypeScript frontend, API documentation, modular paths, localization files, Docker paths, tests, background workers, and rich admin/project controllers. Evidence: language metadata, `Gemfile`, `app/controllers`, `app/models`, `frontend`, `docs/api`, `config/locales`, `docker`, and `spec`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: Docker paths and extensive admin settings exist. Unknown rationale: Kubernetes or Helm manifests and self-hosted update windows were not verified in the checked path scan.
- API/integration maturity: `Strong`. Evidence: `docs/api`, API docs controller, OAuth controllers, SCIM controllers, repositories, custom fields, project/work-package controllers, and request specs indicate mature integration surfaces. Unknown rationale: external SDK coverage was not audited.
- Internationalization/localization: `Strong` for UI translation infrastructure. Evidence: `config/locales` is present and repository has admin language settings. Unknown rationale: Canada/Quebec statutory accounting, tax, HR, or payroll localization is not relevant to the checked project-management scope and was not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec project-accounting, tax, HR, or payroll module was identified. Generic localization infrastructure does not prove local compliance.
- UX and product quality: `Strong` for project-management UX maturity. Evidence: frontend paths, work package split/full views, project settings, notifications, portfolios, programs, exports, dashboards/homescreen, and extensive system tests indicate rich workflows. Unknown rationale: no hands-on UI or accessibility audit was performed.

## Risks

- License risk: `High`. GPL-3.0 blocks direct source reuse for the MIT target.
- Anti-copy risk: `High`. OpenProject contains detailed workflows, labels, UI components, permission models, exports, reports, and API structures that must not be copied.
- Maintenance risk: `Partial` to `Strong`. Evidence: latest release `v17.3.1` was published on 2026-04-20 and repository metadata updated on 2026-05-06. Concern: edition boundaries and enterprise features require separate review.
- Security risk: `Partial`. Evidence: OAuth, SCIM, authentication settings, roles, permissions, attachments quarantine, virus scanning settings, and admin controls exist. Unknown rationale: no advisory history, permission model audit, or dependency vulnerability scan was performed.
- Dependency risk: `Partial`. Evidence: Rails, TypeScript frontend, API docs, Docker, background workers, and many modules create a broad dependency surface. Unknown rationale: lockfile freshness and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `app/controllers/projects_controller.rb`, `app/controllers/work_packages_controller.rb`, `app/controllers/projects`, `app/controllers/work_packages`, `app/models/project.rb`, `app/models/work_package.rb`, `app/models/version.rb`, `app/models/member.rb`, `frontend`, `docs/api`, `config/locales`, and `spec/features`.
- Reason: OpenProject is a mature service/project-management functional reference. GPL means Graphify outputs must feed independent written specs only.
