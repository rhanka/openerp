# Ralph

## Progress

Fait: Fiche operations candidate completed from GitHub metadata, checked default-branch commit, Apache-2.0 license endpoint evidence, asset/CMDB path evidence, reports/security/supports/virtual modules, Docker/docs evidence, and release metadata; fiche phase is 27/27 fiches, 100% complete after this sub-batch.
À faire: Shortlist decision, Graphify execution, and original asset/EAM-adjacent specs are not started; downstream asset-management study remains 0% complete.
Attendu: Keep Ralph as a permissive asset-management and CMDB reference for equipment lifecycle, but position it as EAM-adjacent rather than a full maintenance or manufacturing system.

## Identity

- Project: Ralph.
- Repository: https://github.com/allegro/ralph.
- Primary site: https://ralph.allegro.tech/.
- Date checked: 2026-05-06.
- Checked ref: `ng` branch at commit `ed65b1d42b05d1672f8a11677a9de5630ecf08a5`, reported as default branch by `gh repo view allegro/ralph`.
- Repository metadata evidence: `gh repo view allegro/ralph --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Ralph is the CMDB / Asset Management system for data center and back office hardware.", homepage `https://ralph.allegro.tech/`, latest release `20260506.1` published 2026-05-06, licenseInfo Apache-2.0, primary language Python, and updatedAt `2026-05-06T11:25:29Z`.
- Functional evidence paths: `LICENSE`, `README.md`, `pyproject.toml`, `setup.py`, `requirements`, `docker`, `docs`, `src/ralph/assets`, `src/ralph/accessories`, `src/ralph/accounts`, `src/ralph/api`, `src/ralph/back_office`, `src/ralph/data_center`, `src/ralph/domains`, `src/ralph/licences`, `src/ralph/networks`, `src/ralph/operations`, `src/ralph/reports`, `src/ralph/security`, `src/ralph/supports`, `src/ralph/virtual`, and `src/ralph/tests`.

## License

- Declared license: Apache-2.0.
- Evidence: `gh api repos/allegro/ralph/license` returned path `LICENSE` with SPDX `Apache-2.0`; GitHub metadata reports Apache License 2.0.
- Reuse classification: `usable`.
- Rationale: Apache-2.0 is compatible with a permissive strategy if notices, attribution, and patent-license implications are handled. The study should still avoid copying UI text, docs, fixtures, schemas, and nonessential implementation detail.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: Ralph covers assets, hardware lifecycle, licenses, support contracts, operations, domains, networks, virtual/cloud inventory, users, reports, and API, but not full ERP accounting, procurement, CRM, HR, payroll, inventory sales, or manufacturing.
- CRM rating: `Weak`. Evidence checked: no sales CRM, lead, opportunity, campaign, or customer-service module was identified.
- Accounting/invoicing/tax rating: `Weak` to `Partial` for asset finance adjacency. Evidence: asset price/currency fields, invoice-report paths, support price/currency migrations, and license/support modules exist. Unknown rationale: general ledger, invoicing, tax, AR/AP, depreciation accounting, and statutory reporting were not verified.
- HR/time/leave/payroll rating: `Weak` to `Partial` for assigned equipment. Evidence: accounts/users and back-office hardware assignment paths exist. Unknown rationale: employee HR, leave, attendance, benefits, and payroll were not verified.
- Services/subscriptions/projects rating: `Partial` for internal services and support contracts. Evidence: service visibility, supports, operations, virtual/cloud assets, domains, and reports exist. Unknown rationale: subscription billing and project delivery modules were not verified.
- MRP/MES/WMS/maintenance/quality rating: `Partial` for asset/EAM adjacency and `Weak` for MRP/MES/WMS/quality. Evidence: assets, data center, accessories, supports, operations, networks, licenses, virtual/cloud, security, and reports modules support equipment lifecycle and operational asset tracking. Unknown rationale: preventive maintenance plans, work orders, spare parts, quality inspections, and manufacturing execution were not verified.

## Architecture And Operations

- Stack: Python/Django-style application with API modules, admin UI/templates/static assets, Docker files, docs, tests, and packaging metadata. Evidence: repository metadata primary language Python, `pyproject.toml`, `setup.py`, `requirements`, `src/ralph`, and `docker`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: Docker files and installation docs exist. Unknown rationale: Kubernetes/Helm manifests, SaaS tenancy, and self-hosted upgrade windows were not audited.
- API/integration maturity: `Partial` to `Strong`. Evidence: `src/ralph/api`, API docs, per-module API paths for assets, operations, security, supports, virtual, SSL certificates, and accounts. Unknown rationale: SDKs, API version stability, and integration contracts were not audited.
- Internationalization/localization: `Weak` to `Partial`. Evidence: Django-style app could support localization, but explicit FR/EN completeness was not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Quebec/Canada accounting, tax, HR, or payroll localization was identified. Asset-management concepts are largely region-neutral but not statutory.
- UX and product quality: `Partial`. Evidence: admin templates, dashboards docs, quickstart docs, reports, transitions, custom fields, and rich asset views exist. Unknown rationale: no hands-on UI or accessibility review was performed.

## Risks

- License risk: `Low` to `Medium`. Apache-2.0 is favorable, with notice and patent obligations.
- Anti-copy risk: `Medium` to `High`. Asset lifecycle fields, admin screens, reports, transitions, fixtures, docs, and API structures should not be copied verbatim.
- Maintenance risk: `Strong`. Evidence: latest release `20260506.1` was published on 2026-05-06 and repository metadata updated on 2026-05-06.
- Security risk: `Partial`. Evidence: asset inventories, account/LDAP paths, security module, virtual/cloud sync, SSL certificate module, reports, and API surfaces exist. Unknown rationale: advisory history, permission model, and dependency audit were not performed.
- Dependency risk: `Partial`. Evidence: Python/Django-style stack, Docker, LDAP, OpenStack/cloud sync, static/admin UI, and many modules create a meaningful dependency surface. Unknown rationale: lockfile freshness and transitive CVEs were not audited.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `src/ralph/assets`, `src/ralph/back_office`, `src/ralph/data_center`, `src/ralph/supports`, `src/ralph/operations`, `src/ralph/reports`, `src/ralph/api`, `src/ralph/security`, `src/ralph/virtual`, and `docs/user`.
- Reason: Ralph is a permissive reference for equipment lifecycle and CMDB concepts. Graphify should clarify whether asset/EAM-adjacent scope belongs in core ERP or a later vertical pack.
