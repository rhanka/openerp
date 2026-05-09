# Outline

## Evidence

- Date checked: 2026-05-09.
- Sources checked: GitHub repository `outline/outline`, raw `LICENSE`, Outline official website, integrations page, community Kubernetes chart docs, and self-hosting references.
- Repository evidence: Outline is described as a fast team knowledge base with real-time collaboration, Markdown compatibility, Docker topic, and BSL 1.1 license.
- Product evidence: official site describes a team knowledge base with fast editing, Markdown, slash commands, embeds, real-time collaboration, comments, threads, search, AI answers, Slack integration, permissions, groups, guests, public sharing, custom domains, RTL support, and translations for more than twenty languages.

## License And Reuse

- Declared license: Business Source License 1.1, checked from raw `LICENSE`.
- The license text names General Outline, Inc., Licensed Work `Outline 1.7.1`, a Document Service restriction, Change Date 2030-05-04, and Apache-2.0 as change license.
- Reuse posture for an MIT target: reference material only until change date and only after legal review. Do not reuse source, API shapes, UI text, docs, assets, or deployment examples.
- BSL is not OSI-open at present and is not compatible with a permissive reuse posture for this study.

## Collaboration Coverage

- Strong team knowledge base coverage: real-time document editing, comments, threads, nested documents, collections, Markdown, embeds, Slack workflows, public sharing, permissions, groups, guest access, search, and AI-assisted answers.
- Integrations coverage is broad across authentication, design, collaboration, developer, media, and utility tools.
- Best fit is company wiki, engineering docs, support knowledge, onboarding, product specs, and team announcements.
- It is not an ERP or CRM system.

## ERP CRM Fit

- ERP fit: partial only as a knowledge base beside ERP workflows.
- CRM fit: partial for customer-facing docs, support answers, sales enablement, and internal handbooks, but no native lead, opportunity, quote, campaign, case, contract, or billing module was verified.
- OpenERP relevance: polished document UX, team permissions, comments, search, integrations, and public/private sharing around business records.

## Architecture Notes

- Stack evidence from repository/product pages: TypeScript/React/Node.js-style knowledge base, Markdown-compatible editor, Docker deployment topic, API/integration story, Slack integration, search, and permissions.
- Third-party summaries point to PostgreSQL, Redis, and S3-compatible storage, but official deployment details were not fully verified in this fiche.
- The product emphasizes fast navigation, collaboration, integrations, and polished editor behavior.
- API and integration surfaces are attractive conceptually but must not be copied.

## Self-Hosted And Kubernetes

- Self-host posture: available; official site advertises on-premises and self-hosted use.
- Docker is visible as a repository topic and in community deployment guides.
- Kubernetes posture: a community-maintained Helm chart exists, with PostgreSQL, Redis, ingress, and storage considerations. No first-party chart was verified.
- OpenERP should treat Kubernetes packaging as an independent design task, not an Outline reuse path.

## I18n And Localization

- Official site states RTL support and translations for more than twenty languages including French, Spanish, German, Korean, and Chinese.
- No Canada or Quebec statutory localization was verified.
- OpenERP lesson: multilingual collaboration UI and RTL support can be product differentiators, but statutory local rules remain separate.

## Anti-Copy Notes

- Do not copy Outline source, BSL-licensed implementation, editor behavior details, API shapes, integration copy, UI text, screenshots, icons, or permission labels.
- Avoid the exact team knowledge base positioning and document service commercial boundaries.
- Use only high-level functional observations for OpenERP specs.

## OpenERP Takeaways

- A business app benefits from fast docs, comments, search, and private/public sharing around records.
- Integrations should be designed as neutral extension points, not cloned from a vendor-specific catalog.
- License controls matter: BSL projects can be excellent references but poor technical inputs for an MIT target.
