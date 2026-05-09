# Rocket.Chat

## Evidence

- Date checked: 2026-05-09.
- Primary repository: https://github.com/RocketChat/Rocket.Chat.
- Product and docs: https://rocket.chat, https://docs.rocket.chat, and https://developer.rocket.chat.
- GitHub metadata checked with `gh repo view RocketChat/Rocket.Chat`: default branch `develop`, license shown by GitHub as `Other`, primary language TypeScript, latest release `8.4.1` published 2026-05-08, repository updated 2026-05-09.
- Root `LICENSE` checked from GitHub raw: community content outside `apps/meteor/ee/` and `ee/` is MIT; enterprise directories have their own enterprise license.
- `gh api repos/RocketChat/Rocket.Chat/contents` showed `apps`, `packages`, `ee`, `docs`, `development`, `scripts`, `docker-compose-ci.yml`, and `docker-compose-local.yml`.
- `gh api repos/RocketChat/Rocket.Chat/contents/apps/meteor/app` showed communication and integration domains including `api`, `authentication`, `authorization`, `discussion`, `file-upload`, `integrations`, `livechat`, `mentions`, `notifications`, `reactions`, `retention-policy`, `search`, `threads`, `webdav`, and many slash command modules.
- Kubernetes evidence: Rocket.Chat docs describe Helm-based deployment; `gh repo view RocketChat/helm-charts` showed a public Helm charts repository updated 2026-03-30.
- Product docs checked for marketplace, Apps-Engine, Omnichannel apps, Kubernetes deployment, plans, and internationalization.

## License And Reuse

- Declared repository posture: mixed. Community Edition source outside enterprise directories is MIT, while `ee/` and `apps/meteor/ee/` are enterprise/source-available territory.
- GitHub reports license as `Other`, which matches the mixed-license boundary.
- Reuse posture for MIT OpenERP: MIT community files may be legally closer to the target, but default treatment should remain functional reference until a file-level license boundary review excludes `ee/`, marketplace, premium, trademark, and bundled third-party concerns.
- Enterprise/source-available code and premium features are blocked for source reuse under the study policy and can only inform functional observations after explicit review.
- Marketplace and private app limits vary by plan in current docs; avoid relying on marketplace behavior as an open-source baseline.

## Collaboration Coverage

- Strong team messaging coverage: channels, direct messages, threads, mentions, reactions, file upload, search, notifications, user status, permissions, retention, imports, slash commands, integrations, and admin settings.
- Strong external-visitor/customer messaging coverage through Omnichannel and Livechat references, with apps for WhatsApp, SMS, social channels, CRM connectors, bots, and conversation support workflows.
- Strong extension model through Apps-Engine: event listeners, commands, HTTP endpoints, UI blocks, app settings, persistence, OAuth, schedulers, and marketplace/private app packaging.
- Native ERP modules were not identified. CRM fit is mostly through integrations and customer conversation handling rather than first-party CRM data management.

## ERP CRM Fit

- Fit is strongest for customer support and service operations where external conversations become internal work: live chat intake, agent handoff, conversation history, bot triage, and channel escalation.
- CRM fit is partial. Rocket.Chat can inform omnichannel conversation capture and contact handoff, but its public evidence does not replace CRM objects such as leads, opportunities, quotes, accounts, or pipeline workflow.
- ERP fit is indirect. Messaging, integrations, retention, and permissions can support operational collaboration, but accounting, inventory, HR, manufacturing, and procurement functions were not verified.
- For OpenERP, the most relevant idea is customer or record-bound communication that can include external participants through controlled channels when needed.

## Architecture Notes

- Stack observed from GitHub metadata and tree: TypeScript-heavy monorepo, Meteor application under `apps/meteor`, packages under `packages`, enterprise folder `ee`, docs, scripts, Docker Compose files, and Helm chart repository.
- Communication modules are granular: message UI, notifications, search, mentions, file upload, threads, slash commands, integrations, and livechat appear as distinct code areas.
- Apps-Engine is a useful architectural reference for extension boundaries, but OpenERP should avoid recreating a full marketplace in the MVP.
- MongoDB and Meteor shape Rocket.Chat's implementation choices; OpenERP should not inherit those choices unless they fit the existing platform architecture.

## Self-Hosted And Kubernetes

- Rocket.Chat supports self-hosted deployment and public docs describe Kubernetes deployment using Helm, Traefik or ingress, cert-manager, and MongoDB operator setup.
- The primary repository includes Docker Compose files for local and CI usage.
- `RocketChat/helm-charts` exists as a public Helm charts repository, but its license metadata was not returned by GitHub in the check and should be reviewed before any chart reuse.
- For OpenERP, the deployment lesson is to keep communication state, file storage, search, and external integrations configurable for self-hosted environments.

## I18n And Localization

- Developer docs describe Rocket.Chat internationalization using TAP:i18n and a community translation workflow.
- Repository modules include `autotranslate`, and the docs cover i18n for app development.
- This proves UI and app localization infrastructure, not Canada or Quebec ERP localization.
- For OpenERP, record-linked communication must support translated UI strings, locale-aware timestamps, and translatable notification templates; statutory localization remains out of scope for these chat references.

## Anti-Copy Notes

- Do not copy source code, app interfaces, command names, UI block definitions, marketplace rules, Livechat widget code, Omnichannel workflow text, docs, tests, icons, or enterprise-gated behavior.
- Exclude `ee/` and `apps/meteor/ee/` from any technical reuse unless legal review explicitly authorizes a narrow reference path.
- Do not import Rocket.Chat's marketplace assumptions, plan limits, or enterprise feature names into OpenERP requirements.
- The MIT community boundary still requires provenance tracking because the repository is mixed-license.

## OpenERP Takeaways

- object-linked async communication: Capture customer and internal conversations on business records, especially support tickets, opportunities, projects, invoices, and service cases.
- object-linked async communication: Support internal mentions, participant visibility, file attachments, and timeline events before any generic channel UX.
- object-linked async communication: Keep an extension hook for inbound events from email, web forms, chat widgets, or APIs, but make the OpenERP record the durable system of reference.
- generic chat/channel features to keep out of MVP unless proven otherwise: workspace-wide chat, full slash command platform, app marketplace, custom private apps, standalone Livechat widget product, social-channel omnichannel suite, and bot framework.
- generic chat/channel features to keep out of MVP unless proven otherwise: channel moderation, emoji customization, generic thread browser, voice/video, and enterprise communication controls.
