# Anytype

## Evidence

- Date checked: 2026-05-09.
- Sources checked: GitHub repository `anyproto/anytype-ts`, GitHub organization `anyproto`, Anytype Docs welcome page, collaboration docs, self-hosted docs, local-only docs, networks and backup docs, privacy and encryption docs, storage and deletion docs, and `anyproto/any-sync` repository.
- Repository evidence: `anytype-ts` describes Anytype Desktop as a local-first, peer-to-peer, end-to-end encrypted knowledge OS for macOS, Windows, and Linux, with blocks, databases, kanban, calendar, custom types, gRPC API, and AI agents.
- Docs evidence: Anytype supports spaces, chats, shared spaces, member roles, self-hosted network configuration, local-only mode, local-first storage, encrypted sync, backup nodes, and local P2P sync.

## License And Reuse

- Declared client license: Any Source Available License 1.0 for `anytype-ts`, checked from GitHub README.
- `any-sync` is MIT, but Anytype clients and the whole product stack have mixed licensing across repositories and must be reviewed path by path.
- Reuse posture for an MIT target: Anytype application is reference material only. `any-sync` may be a dependency candidate only after independent review of API, operational fit, and notices.
- Treat source-visible application code as non-permissive for this study.

## Collaboration Coverage

- Strong local-first collaboration concepts: shared spaces, invite links, owner/editor/viewer roles, P2P sync, end-to-end encryption, local-only mode, self-hosted network mode, chats, pages, tasks, wikis, journals, files, databases, custom types, kanban, and calendar.
- Collaboration is privacy-led and decentralized rather than conventional server-owned SaaS collaboration.
- Best fit is personal, small-group, and community knowledge spaces where user-owned keys and offline behavior are central.
- Not verified as a centralized enterprise wiki with mature ERP-style audit, workflow approval, or administrator-owned records.

## ERP CRM Fit

- ERP fit: weak to partial as a collaboration companion. It has rich objects, tasks, databases, and spaces, but no native accounting, inventory, payroll, procurement, manufacturing, or tax module was verified.
- CRM fit: partial through custom objects and spaces for people, organizations, notes, tasks, and knowledge, but no first-party CRM lifecycle module was verified.
- OpenERP relevance is strongest for encrypted local-first spaces, role-based shared areas, custom object modeling, and offline collaboration.

## Architecture Notes

- Client stack: Electron plus TypeScript for desktop, with middleware/protobuf generation and gRPC API evidence.
- Sync architecture: `any-sync` protocol, spaces/channels, end-to-end encryption, creator-controlled keys, local P2P, coordinator node, consensus node, and file node concepts.
- Storage docs describe offline-first local data, encrypted objects, local indexes, backup nodes, and media streaming from backup or peers.
- This architecture is highly distinctive and should remain conceptual unless a separate dependency study approves a concrete integration.

## Self-Hosted And Kubernetes

- Self-host posture: supported through self-hosted network configuration and a team-maintained Docker image per docs.
- Anytype docs recommend dedicated identities per network and manual switching of devices to the same self-hosted network.
- Local-only mode disables backup nodes and keeps sync to local networks.
- Kubernetes posture: no official Kubernetes production chart was verified. Any Kubernetes design would need multiple node types, secret handling, network config distribution, persistence, backup, and device onboarding workflows.

## I18n And Localization

- `anytype-ts` README points localization to Crowdin and includes a command for updating locale files.
- No Canada or Quebec business localization was verified.
- OpenERP should distinguish general app translation from statutory and accounting localization.

## Anti-Copy Notes

- Do not copy Anytype client code, source-visible licensed files, UX copy, object model names, invite flows, encryption docs, protocol details, gRPC shapes, or network configuration examples.
- If `any-sync` is considered later, isolate it as a separate dependency review and avoid copying Anytype product behavior.
- Avoid imitating Anytype’s digital-freedom branding, knowledge OS framing, and local-first narrative.

## OpenERP Takeaways

- Offline-capable, encrypted collaboration is valuable for sensitive ERP notes, customer work, and field operations.
- Owner/editor/viewer shared spaces are a simple collaboration model, but ERP also needs administrator controls, audit trails, retention, and legal export.
- OpenERP should consider local-first notes as an optional client capability while keeping authoritative business records server-governed.
