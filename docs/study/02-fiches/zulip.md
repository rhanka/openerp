# Zulip

## Evidence

- Date checked: 2026-05-09.
- Primary repository: https://github.com/zulip/zulip.
- Packaging repository: https://github.com/zulip/docker-zulip.
- Product site and self-hosting docs: https://zulip.com and https://zulip.com/self-hosting/.
- GitHub metadata checked with `gh repo view zulip/zulip`: default branch `main`, Apache-2.0, primary language Python, latest release `12.0` published 2026-04-27, repository updated 2026-05-09.
- `gh api repos/zulip/zulip/contents` showed `zerver`, `web`, `static`, `templates`, `locale`, `api_docs`, `docs`, `puppet`, and `scripts`.
- `gh api repos/zulip/zulip/contents/zerver` showed server domains such as `models`, `views`, `webhooks`, `worker`, `openapi`, `actions`, `data_import`, and tests.
- `gh repo view zulip/docker-zulip` showed Apache-2.0 packaging, and `gh api repos/zulip/docker-zulip/contents` showed `compose.yaml`, `Dockerfile`, `helm`, and deployment docs.

## License And Reuse

- Declared license: Apache License 2.0 for `zulip/zulip`.
- Packaging repository license: Apache License 2.0 for `zulip/docker-zulip`.
- Reuse posture for MIT OpenERP: permissive reference candidate, subject to file-level dependency and asset review before any source reuse.
- Apache-2.0 is compatible with the target direction at policy level, but implementation should still avoid importing UI text, docs, test fixtures, brand assets, or database details into OpenERP.
- Zulip is not open-core according to the public self-hosting page, which states that the same open-source software is used for self-hosted deployments and cloud customers; paid self-hosted plans primarily change support and services.

## Collaboration Coverage

- Strong async team communication model centered on streams/channels plus topics, direct messages, mentions, reactions, read state, search, files, user groups, permissions, webhooks, bots, integrations, imports, exports, and notifications.
- Topic-first conversation structure is the main product distinction. It gives long-lived discussions durable context without forcing each topic to become a project task.
- API and integration coverage is strong for event-driven communication: `api_docs`, `zerver/openapi`, `zerver/webhooks`, bots, imports from other chat tools, and documented REST APIs.
- Native ERP, CRM, invoicing, inventory, manufacturing, HR, and accounting modules were not identified. Zulip is a communication substrate, not an ERP suite.

## ERP CRM Fit

- Fit is strongest for collaboration around ERP records: customer account discussion, opportunity handoff notes, project delivery threads, incident notes, purchase clarification, and internal approvals.
- CRM fit is indirect. Zulip can inform conversation UX, notification policy, and activity history, but not lead, opportunity, campaign, quote, or account data models.
- ERP fit is indirect. The useful pattern is durable async context attached to work objects, not a standalone chat product inside OpenERP.
- Avoid treating channels as business objects. For OpenERP, the business object should remain the customer, opportunity, project, invoice, ticket, procurement request, or work order; communication should attach to those objects.

## Architecture Notes

- Stack observed from GitHub metadata and tree: Python server, TypeScript and JavaScript web client, PostgreSQL-oriented deployment assets, templates, static assets, localization files, OpenAPI docs, workers, webhooks, and data import paths.
- The architecture separates server domains in `zerver`, frontend assets in `web` and `static`, operational automation in `puppet` and `scripts`, and public API documentation in `api_docs`.
- Integration model is relevant to OpenERP: webhooks, bot users, REST API, imports, and event workers show how a communication system can remain extensible without turning every workflow into custom code.
- Do not mirror Zulip's internal module names, URL structure, schema shape, or topic semantics. Use it only to validate independent OpenERP requirements.

## Self-Hosted And Kubernetes

- Public self-hosting docs describe direct installation on Ubuntu or Debian, Docker-based deployment, and prebuilt images for selected platforms.
- `zulip/docker-zulip` provides container configuration with `compose.yaml`, Dockerfile assets, and a `helm` directory.
- Kubernetes relevance is present through the packaging repository, but production maturity of the Helm path was not audited beyond public repository evidence.
- For OpenERP, the take-away is to design collaboration as a deployable internal service or module that works in a single-node install first, then can be isolated for larger deployments.

## I18n And Localization

- Repository evidence includes a top-level `locale` directory and user-facing help docs for changing language preferences.
- Zulip has broad UI localization infrastructure, but no Canada or Quebec-specific ERP compliance content was identified.
- For OpenERP, reuse the principle of full UI message localization and per-user language preferences; do not infer statutory localization coverage from chat UI translation alone.

## Anti-Copy Notes

- Do not copy Zulip source code, migrations, topic UI flows, help text, message rendering behavior, onboarding copy, import/export formats, API shapes, or tests.
- Do not reproduce the stream/topic product model verbatim. OpenERP needs object-bound conversation threads, not a general chat clone.
- Treat screenshots, docs, labels, notification defaults, and integration names as reference material only.
- Keep any future source review limited to permissively licensed files and record provenance before reuse.

## OpenERP Takeaways

- object-linked async communication: Build a lightweight conversation layer attached to business records, with durable threads, mentions, participants, files, read state, and object activity history.
- object-linked async communication: Prefer record context as the primary navigation anchor. A user should start from a customer, opportunity, invoice, ticket, project, or work order and see the relevant discussion there.
- object-linked async communication: Add integration hooks so system events can create structured messages on a record timeline without requiring users to join a global chat room.
- generic chat/channel features to keep out of MVP unless proven otherwise: standalone company chat, broad channel directory, topic management as an end-user information architecture, custom emoji administration, public community moderation, chat imports from other platforms, and full chat-client parity.
- generic chat/channel features to keep out of MVP unless proven otherwise: mobile push service, rich bot platform, marketplace integrations, and organization-wide chat administration.
