# AFFiNE

## Evidence

- Date checked: 2026-05-09.
- Sources checked: GitHub repository `toeverything/AFFiNE`, raw `LICENSE`, raw `packages/backend/server/LICENSE`, raw `README.md`, AFFiNE team page, AFFiNE Docker self-host article, and Better Stack AFFiNE guide.
- Repository evidence: https://github.com/toeverything/AFFiNE reports AFFiNE as a privacy-focused, local-first workspace joining Notion-style docs with Miro-style canvas work.
- Product evidence: the README describes docs, canvas, tables, local-first work, real-time collaboration, web and cross-platform clients, AI, templates, BlockSuite, y-octo, OctoBase, Yjs, Electron, React, and Jotai.

## License And Reuse

- License posture: mixed and requires file-boundary review. The README says AFFiNE Community Edition is available for self-host under MIT, while the root `LICENSE` delegates some backend and native paths to separate license text.
- The backend server license includes Enterprise Edition conditions and states that CE or client-side served parts have MPL-2.0 treatment in that license context.
- Reuse posture for an MIT target: treat CE-visible MIT parts as potentially usable only after legal review; treat backend, native, EE, cloud, AI, subscription, and future enterprise paths as reference material only.
- Attribution and notice tracking are required for any permitted reuse.

## Collaboration Coverage

- Strong workspace coverage for documents, visual canvas, whiteboards, tables, linked pages, embedded content, presentations, templates, and team-oriented workspaces.
- Real-time collaboration and sync are presented as core capabilities, with local-first behavior as a design premise.
- Product fit is strongest for knowledge work, project planning, visual ideation, team docs, and lightweight structured work.
- It is not an ERP collaboration suite: no first-party accounting, purchasing, stock, payroll, service contracts, or audit-heavy workflow module was verified.

## ERP CRM Fit

- ERP fit: weak to partial. AFFiNE can model lightweight operational boards, meeting notes, project docs, checklists, and simple databases, but it is not a finance, inventory, HR, or manufacturing product.
- CRM fit: partial as a configurable workspace. It can support account notes, opportunity notes, customer research, status boards, and linked documents, but no native lead, opportunity, quote, activity, pipeline, or customer lifecycle module was verified.
- Strongest OpenERP relevance is as a collaboration layer around ERP records: embedded documents, shared canvases, decision notes, and project pages.

## Architecture Notes

- Frontend/product stack: TypeScript, React, Electron, BlockSuite, Jotai, and a block/canvas model.
- Sync/data evidence: README references Yjs, y-octo, and OctoBase for CRDT and local-first collaboration behavior.
- Product architecture is centered on reusable blocks, editable pages, edgeless canvases, and multi-view structured content.
- The architecture is useful as a conceptual reference for an ERP workspace surface, not as a source template.

## Self-Hosted And Kubernetes

- Self-host posture: available. The README points to Docker-based self-hosting and published container packages.
- AFFiNE team materials distinguish Cloud and Self-Hosted team offerings.
- Kubernetes posture: no first-party production Helm chart was verified in the checked sources. Third-party deployment writeups and platform templates exist, but they should be treated as operational references, not canonical packaging.
- OpenERP should expect to design its own Kubernetes chart and persistence model if adopting similar collaboration features.

## I18n And Localization

- Translation posture: present but not fully verified for enterprise-grade localization. The README invites translation and language support contributions through community channels.
- No Canada or Quebec business localization was verified.
- OpenERP should separate UI translation from business localization: French UI support is only one part of Quebec-ready behavior.

## Anti-Copy Notes

- Do not copy AFFiNE source, UI language, templates, examples, block names, API shapes, sync internals, diagrams, product copy, or distinctive canvas behaviors.
- Keep BlockSuite, OctoBase, y-octo, and Yjs observations at the architecture-pattern level unless a later legal review explicitly approves a dependency or integration path.
- Avoid imitating the combined Notion/Miro positioning, visual identity, and template catalog.

## OpenERP Takeaways

- A useful OpenERP workspace should let users attach living documents, sketches, tables, and decision notes directly to business objects.
- Local-first ideas are valuable for field work and unreliable networks, but ERP consistency requires careful conflict handling and audit trails.
- Build collaboration primitives around ERP-owned records, permissions, and history rather than cloning a general-purpose knowledge OS.
