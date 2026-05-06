# IDURAR

## Progress

Fait: Fiche batch candidate completed from GitHub metadata, default-branch commit evidence, root license evidence, README evidence, package metadata, security policy, and source path evidence; fiche phase is 11/27 fiches, about 41% complete after this batch.
À faire: Legal review, anti-copy review, deeper functional audit, and remaining corpus fiches outside this batch are not completed; fiche phase is 11/27 fiches, about 41% complete after this batch.
Attendu: Keep IDURAR as a simple ERP/CRM functional reference only; do not use it as source-level implementation input.

## Identity

- Project: IDURAR.
- Repository: https://github.com/idurar/idurar-erp-crm.
- Primary site: https://www.idurarapp.com.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `5f59dce220b0655e9354617826e509b6a776dc93`, reported as default branch by `gh repo view idurar/idurar-erp-crm`.
- Repository metadata evidence: `gh repo view idurar/idurar-erp-crm --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Free Open Source ERP CRM Software Accounting Invoicing | Node Js React", homepage `https://www.idurarapp.com`, latest release `4.1.1` published 2026-03-16, licenseInfo `GNU Affero General Public License v3.0`, and updatedAt `2026-05-04T17:23:12Z`.
- Functional evidence paths: `README.md`, `LICENSE`, `SECURITY.md`, `backend/package.json`, `frontend/package.json`, `backend/src/controllers/appControllers`, `backend/src/routes`, `backend/src/locale`, and `frontend/src/locale` at the checked ref.

## License

- Declared license: AGPL-3.0 in repository license evidence; package metadata has a conflicting `Fair-code License` string in `backend/package.json`.
- Evidence: `gh api repos/idurar/idurar-erp-crm/license` returned path `LICENSE` with SPDX `AGPL-3.0`; root `LICENSE` contains GNU AGPL version 3 text; README states the project is released under GNU AGPLv3; `backend/package.json` declares `license` as `Fair-code License`.
- Reuse classification: `functional reference only`.
- Rationale: The repository license evidence is AGPL-3.0, which the methodology treats as high risk for a future MIT target. The package metadata mismatch increases legal ambiguity rather than reducing risk. Use only independently rewritten workflow observations.

## Functional Coverage

- ERP/general suite rating: `Partial`. Evidence: README describes ERP/CRM, invoice, inventory, accounting, and HR positioning. Source paths show simple app controllers and settings for clients, invoices, quotes, and payments. Unknown rationale: broad ERP modules such as purchasing, stock operations, accounting ledger, HR administration, and manufacturing were not verified.
- CRM rating: `Partial`. Evidence: README lists customer management; backend paths include `clientController`; frontend route and UI paths support an app shell. Unknown rationale: leads, opportunities, campaigns, activities, and support cases were not verified.
- Accounting/invoicing/tax rating: `Partial`. Evidence: backend controllers include `invoiceController` and `paymentController`; setup defaults include invoice and quote settings. Unknown rationale: general ledger, tax engine, bank reconciliation, and statutory reporting were not verified.
- HR/time/leave/payroll rating: `Weak`. Evidence: README mentions HR and repository has one HR-themed feature document path. Unknown rationale: no first-party HR, leave, attendance, timesheet, or payroll controller/model paths were identified in the checked source path scan.
- Services/subscriptions/projects rating: `Weak`. Evidence checked: source path scan did not verify project management, subscription billing, service contracts, or recurring operations.
- MRP/MES/WMS/maintenance/quality rating: `Weak`. Evidence: README mentions inventory and backend has an inventory middleware for unique numbers. Unknown rationale: no warehouse, stock movement, BOM, manufacturing, maintenance, or quality modules were verified.

## Architecture And Operations

- Stack: MERN-style application with Node.js, Express, MongoDB, React, Ant Design, Redux, Vite, and Pug. Evidence: README stack description plus `backend/package.json` and `frontend/package.json`.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: README links installation instructions and calls out a self-hosted enterprise version; package scripts include backend setup and frontend build/dev. Unknown rationale: no Docker Compose, Kubernetes, or Helm deployment paths were found in the checked repository path scan.
- API/integration maturity: `Partial`. Evidence: backend paths include `backend/src/routes/appRoutes/appApi.js`, `backend/src/routes/coreRoutes/coreApi.js`, and CRUD controller factories. Unknown rationale: public API docs, versioning, webhooks, SDKs, and external integrations were not audited.
- Internationalization/localization: `Partial`. Evidence: backend and frontend locale paths exist, including `en_us.js`, language settings, and alternate README docs in French and Spanish. Unknown rationale: country-specific tax, accounting, HR, and payroll localization was not verified.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Canada or Quebec tax, payroll, accounting, or French-Canada localization files were verified. French README documentation exists, but local business rules were not found.
- UX and product quality: `Partial`. Evidence: README includes a product screenshot and states Ant Design framework use; frontend package uses React, Ant Design, Redux, and Vite. Unknown rationale: no hands-on UI or accessibility audit was performed.

## Risks

- License risk: `High`. AGPL-3.0 blocks technical reuse for the MIT target, and the backend package license string conflicts with repository license evidence.
- Anti-copy risk: `High`. Even simple invoice and CRM workflows must be rewritten independently because AGPL protects source, UI text, schemas, and API details.
- Maintenance risk: `Partial`. Evidence: latest release `4.1.1` was published on 2026-03-16 and repository metadata updated on 2026-05-04. Concern: source path evidence suggests narrower functional depth than the broad ERP/CRM/HR positioning.
- Security risk: `Partial`. Evidence: `SECURITY.md` exists and backend dependencies include bcrypt, JWT, rate limiting, CORS, and file upload packages. Unknown rationale: no security advisory review, permission model audit, or dependency scan was performed.
- Dependency risk: `Partial`. Evidence: backend uses Express, Mongoose, html-pdf, multer, OpenAI, Resend, and other npm packages; frontend uses React, Ant Design, Redux, Vite, and React Quill. Unknown rationale: lockfile CVEs and maintenance status were not audited.

## Graphify Eligibility

- Graphify target: no.
- Modules/plugins to inspect: If later reconsidered, inspect `backend/src/controllers/appControllers`, `backend/src/controllers/middlewaresControllers/createCRUDController`, `backend/src/routes`, `backend/src/models`, `frontend/src/router`, and locale paths.
- Reason: IDURAR is AGPL and appears narrower than other CRM and ERP candidates in this batch. It is useful as a simple functional reference, but not an efficient Graphify target unless the shortlist specifically needs a lightweight MERN invoicing/CRM comparison.
