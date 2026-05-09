# Docmost

## Evidence

- Date checked: 2026-05-09.
- Sources checked: GitHub repository `docmost/docmost`, raw `LICENSE`, Docmost docs introduction, installation guide, license and editions page, authentication docs, self-hosting docs, reverse proxy docs, and Docker Hub page.
- Repository evidence: Docmost is described as open-source collaborative wiki and documentation software, with real-time collaboration, diagrams, spaces, permissions, groups, comments, page history, search, attachments, embeds, and translations.
- Docs evidence: Docmost supports self-hosted and on-premises deployments, open source and enterprise editions, Docker install with Postgres and Redis, and WebSocket-dependent live editing.

## License And Reuse

- Declared core license: AGPL-3.0, checked from raw `LICENSE`, GitHub metadata, README, and Docmost editions docs.
- Enterprise features are separately licensed. README identifies enterprise directories including server EE, client EE, and `packages/ee`.
- Reuse posture for an MIT target: reference material only. Do not reuse AGPL source or enterprise code.
- The edition boundary is a key diligence item because API, SSO, LDAP, MFA, AI, Confluence import, attachment full-text search, comment resolution, and sharing controls can be enterprise-gated.

## Collaboration Coverage

- Strong coverage for team knowledge bases: live editor, spaces, groups, permissions, comments, page history, diagrams, search, attachments, embeds, public sharing, and translations.
- Enterprise docs add SSO, LDAP, MFA, AI, REST API with personal keys and admin key management, Confluence import, DOCX import, and attachment full-text search.
- The product is a close functional reference for internal wiki, team spaces, department documentation, and real-time page editing.
- It is not an ERP suite and no finance, inventory, payroll, procurement, or manufacturing module was verified.

## ERP CRM Fit

- ERP fit: partial as an embedded documentation and knowledge layer.
- CRM fit: partial for support knowledge, customer onboarding docs, sales playbooks, product FAQs, and team spaces, but no native lead, opportunity, case, quote, or contract module was verified.
- Most relevant OpenERP use cases: department wikis, project spaces, knowledge base comments, document review, controlled public sharing, and attachment search.

## Architecture Notes

- Stack evidence: TypeScript monorepo using pnpm workspace and Nx, with server and client apps.
- Runtime dependencies from docs: Docmost service, Postgres, Redis, local or S3-compatible file storage, reverse proxy, and WebSockets for live editing.
- Docker docs expose environment variables for app URL, app secret, database URL, Redis URL, and storage.
- The product architecture separates core collaboration from enterprise controls and integrations.

## Self-Hosted And Kubernetes

- Self-host posture: strong for Docker Compose. The official install guide downloads `docker-compose.yml` from the repository and runs Docmost with Postgres and Redis.
- Reverse proxy docs cover Caddy and Traefik and note WebSocket handling.
- Kubernetes posture: no official first-party Kubernetes chart was verified. Docker Compose can inform service boundaries, but manifests, ingress, storage classes, secret rotation, backup jobs, and scaling policy would need OpenERP design.
- Air-gapped and on-premises claims in docs are relevant but still require operational validation.

## I18n And Localization

- GitHub README states translations in more than ten languages, and docs show language flags plus Crowdin acknowledgement.
- No Canada or Quebec statutory localization was verified.
- OpenERP should view Docmost as UI-i18n reference only, not as a fiscal or HR localization source.

## Anti-Copy Notes

- Do not copy Docmost source, docs, UI text, diagrams, enterprise feature boundaries, API shapes, compose files, migration/import logic, or permission labels.
- Keep observations functional and independently worded.
- Avoid basing OpenERP enterprise/free boundaries on Docmost’s exact edition split.

## OpenERP Takeaways

- Real-time wiki spaces are useful for departmental ERP knowledge, but permissions, audit, and import/export need to align with ERP roles.
- WebSocket live editing has deployment consequences that must be visible in Kubernetes and reverse proxy design.
- Attachment search, comments, and review workflows are high-value collaboration features when tied to customers, projects, and internal policies.
