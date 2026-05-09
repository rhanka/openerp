# Mattermost

## Evidence

- Date checked: 2026-05-09.
- Primary repository: https://github.com/mattermost/mattermost.
- Helm repository: https://github.com/mattermost/mattermost-helm.
- Product and docs: https://mattermost.com and https://docs.mattermost.com.
- GitHub metadata checked with `gh repo view mattermost/mattermost`: default branch `master`, license shown by GitHub as `Other`, primary language TypeScript, latest release `v11.6.1` published 2026-04-21, repository updated 2026-05-09.
- Root `LICENSE.txt` checked from GitHub raw: compiled Mattermost platform versions produced by Mattermost, Inc. are under an MIT license; third-party source compilation is under AGPL v3.0 or commercial license, with Apache-2.0 coverage for specific admin/configuration source areas such as `server/templates/`, `server/i18n/`, `server/public/`, and `webapp/`.
- Mattermost licensing docs checked for Team Edition, Enterprise Edition, source-available plugin policy, and source fork constraints.
- `gh api repos/mattermost/mattermost/contents` showed `server`, `webapp`, `api`, `e2e-tests`, `tools`, and license files.
- `gh api repos/mattermost/mattermost/contents/server/channels/app` showed communication and platform domains including channel, post, team, user, permissions, search, plugin, slash commands, webhooks, notification, file, import/export, retention, compliance, shared channels, scheduled posts, reactions, and integrations.
- `gh repo view mattermost/mattermost-helm` showed Apache-2.0 Helm charts for Kubernetes, updated 2026-04-22.

## License And Reuse

- Declared repository posture: mixed and high-risk for MIT source reuse. Public source compilation path is AGPL v3.0 or commercial, with Apache-2.0 for specific admin/configuration areas and MIT for compiled versions produced by Mattermost, Inc.
- GitHub reports license as `Other`, matching the mixed license terms.
- Reuse posture for MIT OpenERP: functional reference only by default. Do not reuse source from the primary repository unless a legal review proves a specific file is under a compatible license and isolated from AGPL obligations.
- Source-available Mattermost plugins and enterprise features are reference-only under the study policy.
- Helm repository is Apache-2.0 and may be a deployment reference after separate chart review, but it does not change the source reuse posture of the main platform.

## Collaboration Coverage

- Strong messaging and operational collaboration coverage: teams, channels, posts, direct/group messages, threads, files, reactions, mentions, search, notifications, permissions, plugins, webhooks, slash commands, retention, compliance, imports, exports, and shared channels.
- Product docs describe messaging collaboration, workflow automation, audio and screensharing, project/task management through Boards, AI agents, and integrations.
- Integrations docs cover no-code, low-code, and custom plugin paths, with REST APIs, webhooks, slash commands, bots, Playbooks, and third-party connectors.
- Native ERP, CRM, accounting, inventory, manufacturing, HR, and procurement modules were not identified.

## ERP CRM Fit

- Fit is strongest for operational collaboration around incidents, DevSecOps, and secure work coordination.
- CRM fit is weak to partial. Mattermost can support customer or partner communication when integrated with a CRM, but the checked evidence is not a first-party sales CRM.
- ERP fit is indirect. Mattermost can inform record activity messaging, incident communication, approvals, audit-friendly retention, and integration callbacks, but not ERP transaction logic.
- For OpenERP, the useful pattern is governed collaboration embedded in workflows, with permissions and retention tied to the business object.

## Architecture Notes

- Stack observed from GitHub metadata and tree: Go server, TypeScript/React webapp, PostgreSQL-oriented platform, plugins, REST API, web sockets, file storage, search, server-side tests, and e2e tests.
- Server domains in `server/channels/app` show clear application services for posts, channels, teams, users, permissions, plugins, commands, notifications, compliance, and imports/exports.
- Plugin architecture is relevant for OpenERP as an extension boundary, but full plugin parity is too broad for an MVP collaboration layer.
- Mattermost's source license complexity means architectural learning should be expressed as independent OpenERP requirements, not as ported module design.

## Self-Hosted And Kubernetes

- Mattermost positions itself strongly for on-premises and private-cloud deployment.
- Public Kubernetes docs describe Operator and Helm-based deployment, including S3-compatible storage and managed database recommendations.
- `mattermost/mattermost-helm` provides Apache-2.0 Helm charts for Kubernetes.
- Mattermost docs note enterprise licensing requirements for multi-server deployment, so OpenERP should not assume all scale-out patterns are part of a permissive baseline.

## I18n And Localization

- Repository license text identifies `server/i18n/` as one of the Apache-2.0-covered source areas.
- Mattermost localization handbook says the product is developed in US English and supports additional languages through a translation server workflow.
- Product plans mention availability in 20+ languages, and admin docs include auto-translation configuration through LibreTranslate or Agents.
- This is UI/product localization evidence only. Canada or Quebec ERP, tax, HR, and accounting localization were not identified.

## Anti-Copy Notes

- Do not copy source code, plugin APIs, server service boundaries, UI layouts, product text, docs, tests, compliance workflows, Playbook behavior, Boards behavior, AI-agent flows, or enterprise/source-available plugin behavior.
- Treat AGPL and source-available material as functional reference only unless legal review says otherwise for a named file set.
- Do not reproduce Mattermost's product packaging of Channels, Playbooks, Boards, Calls, or AI agents in OpenERP.
- Keep Helm chart observations separate from application source observations because their licenses differ.

## OpenERP Takeaways

- object-linked async communication: Add record-bound discussion with permissions inherited from the business object, durable files, mentions, and audit-friendly timeline entries.
- object-linked async communication: Design system-generated messages for status changes, assignments, approvals, reminders, imports, and integration callbacks.
- object-linked async communication: Support retention and export requirements at the object or module level, especially for customer, invoice, project, ticket, and operational records.
- generic chat/channel features to keep out of MVP unless proven otherwise: workspace-wide chat, Playbooks-style runbooks, Kanban boards, calls, screensharing, AI agents, plugin marketplace, generic command console, and cross-workspace shared channels.
- generic chat/channel features to keep out of MVP unless proven otherwise: mission-control incident suite, legal-hold productization, voice/video, and broad DevSecOps integrations.
