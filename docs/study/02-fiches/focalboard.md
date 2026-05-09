# Focalboard

## Evidence

- Date checked: 2026-05-09.
- Public sources checked: GitHub repository `mattermost-community/focalboard`, raw license file, Mattermost marketplace page, and repository metadata visible from GitHub.
- Product position: open-source, self-hosted project management and board tool positioned as an alternative to Trello, Notion, and Asana.
- Repository evidence observed: Personal Desktop, Personal Server, Docker build/run documentation, web app, server, plugin paths, i18n paths, Swagger API docs, tests, and release metadata.
- Current status signal: latest GitHub release visible as `v8.0.0` from 2024-06-13; repository remains public but appears less active than the other current candidates.

## License And Reuse

- Declared model: source license file describes AGPL-3.0 for source code, Apache-2.0 for specific admin/configuration paths, MIT for compiled versions produced by Mattermost, and commercial licensing options.
- Reuse classification: `functional reference only` for the MIT target unless legal review approves a narrow Apache-covered configuration path.
- License concern: compiled MIT terms do not make the general source tree MIT-reusable.
- Source reuse guardrail: do not copy server, web app, desktop app, plugin code, API docs, board schemas, or UI assets into OpenERP.

## Collaboration Coverage

- Strong for kanban-style collaboration: boards, cards, views, project organization, personal and team work tracking, and multilingual UI.
- Relevant behaviors: board membership, status columns, tasks, comments/activity where available, filtering, templates, and integration with Mattermost contexts.
- Weak for complex enterprise project controls compared with OpenProject, Plane, or Huly.

## ERP CRM Fit

- ERP fit: useful as a reference for lightweight task boards around orders, service cases, onboarding, and internal checklists.
- CRM fit: useful for pipeline-like boards and customer follow-up cards, but not a complete CRM.
- Weak areas: accounting, tax, inventory, HR, payroll, manufacturing, subscription billing, and statutory workflows.
- Best adjacency: board surfaces embedded into OpenERP records, such as customer onboarding, quote follow-up, and service task coordination.

## Architecture Notes

- Stack evidence: Go server, TypeScript/React-style web app, desktop packaging, Dockerfile, Swagger API docs, i18n files, tests, and Mattermost plugin adjacency.
- Architecture signal: simple board/card abstractions are valuable to study for UX and domain modeling, but source copying is blocked.
- Maintenance signal: slower release cadence increases risk for adopting it as a live dependency.

## Self-Hosted And Kubernetes

- Self-host support: Docker and Personal Server documentation are present.
- Kubernetes support: no first-party Kubernetes or Helm path was confirmed during this check.
- Operational note: a self-hosted board service is simpler than full ERP, but production hardening, upgrades, and auth integration would need separate review.

## I18n And Localization

- Multilingual positioning and `webapp/i18n` paths are visible in public evidence.
- Business localization: no Canada/Quebec statutory support was identified.
- OpenERP use: relevant for translating collaboration UI, not for financial or HR compliance.

## Anti-Copy Notes

- Do not copy card model names, board templates, UI text, Mattermost plugin integration, Swagger definitions, icons, or compiled application assets.
- Treat it as a behavioral reference for simple boards only.
- Any Apache-covered path would need file-level legal review before technical reuse.

## OpenERP Takeaways

- Focalboard is useful as a lightweight board reference but not a reuse candidate for MIT source.
- OpenERP should implement original boards tied to ERP objects rather than importing Focalboard concepts wholesale.
- Priority lessons: fast board creation, simple card movement, saved views, and team-friendly task ownership.
