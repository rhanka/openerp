# Logseq

## Evidence

- Date checked: 2026-05-09.
- Sources checked: GitHub repository `logseq/logseq`, GitHub `logseq/docs`, Logseq Sync blog, Logseq DB-version docs, plugin docs, product roadmap/update page, and Logseq organization page.
- Repository evidence: Logseq describes itself as a privacy-first, open-source platform for knowledge management and collaboration, with Markdown, Org-mode, graph, local-first, plugins, and DB graph work.
- Documentation evidence: docs cover DB graphs, paid sync, plugins, DB graph plugin support, and sync behavior; blog warns that older Sync beta did not support multi-person same-graph collaboration, while newer DB docs and roadmap material describe real-time collaborative sync work.

## License And Reuse

- Declared license: AGPL-3.0 for the main application, checked from GitHub metadata and `LICENSE.md` evidence in repository listing.
- Logseq docs repository is MIT, but that does not change the main application license.
- Plugin docs and sample plugin materials have separate licensing and need separate review.
- Reuse posture for an MIT target: main app is reference material only. Do not reuse source, editor internals, graph model implementation, plugin API code, or UI text without explicit legal approval.

## Collaboration Coverage

- Strong personal knowledge management coverage: outliner, graph links, journals, pages, Markdown/Org-mode, whiteboards, plugins, publishing, PDF workflows, and DB graph work.
- Collaboration coverage is evolving. Older Sync guidance said public beta sync was not for multiple users editing the same graph, while DB-version docs and recent roadmap/update material describe real-time collaborative sync and self-hosted sync direction.
- Best fit is personal and team knowledge capture, research notes, linked references, and local-first thinking rather than centralized ERP team operations.

## ERP CRM Fit

- ERP fit: weak. Logseq is not a back-office system and no accounting, stock, HR, payroll, procurement, manufacturing, or fiscal localization module was verified.
- CRM fit: weak to partial as a note-taking companion. It can help with meeting notes, account research, linked references, and personal task capture, but it lacks CRM domain objects.
- OpenERP relevance is knowledge capture pattern design: backlinks, daily notes, block references, graph navigation, and offline-first notes linked to business records.

## Architecture Notes

- Stack evidence: Clojure/ClojureScript codebase with Electron/web/mobile packaging, Markdown and Org-mode heritage, plugin APIs, DB graph work, and Dockerfile presence.
- The product model is block/outliner-first, then graph-linked, with a newer database graph direction.
- Plugin ecosystem is a major architecture signal; plugin API stability and license implications would need review before inspiration becomes implementation.
- Architecture is optimized for local knowledge graphs, not multi-tenant ERP data integrity.

## Self-Hosted And Kubernetes

- Self-host posture: limited and nuanced. A Dockerfile exists, and community discussion references running Logseq as a web service, but classic self-hosted Logseq does not equal a full server-owned multi-user data store.
- Sync is paid/invite-only in some docs, and self-hosted sync appears in newer roadmap/update material rather than as a mature official ops guide in the checked sources.
- Kubernetes posture: no mature first-party chart was verified.
- OpenERP should not rely on Logseq as a direct self-host collaboration server model.

## I18n And Localization

- Repository evidence includes `.i18n-lint.toml`; community and app distribution indicate broad language activity, but a full localization audit was not performed.
- No Canada or Quebec statutory localization was verified.
- Knowledge graph UI translation is relevant, but ERP local rules must be designed independently.

## Anti-Copy Notes

- Do not copy Logseq source, UI text, plugin API shapes, graph terminology, query syntax, block IDs, data storage conventions, sample graphs, docs, or sync behavior.
- Treat AGPL app internals as off-limits for implementation.
- Keep lessons at the level of user needs: fast capture, backlinks, daily notes, graph navigation, and offline access.

## OpenERP Takeaways

- ERP users benefit from quick capture surfaces: daily notes, meeting notes, links to customers, and block-level references to work items.
- Backlinks can make business context discoverable without forcing every note into a rigid form.
- Local-first knowledge capture is attractive, but ERP records need server authority, audit history, and conflict rules.
