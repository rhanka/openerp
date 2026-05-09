# Foundation Security I18n Implementation Notes

## Source Of Truth

Implementation starts from `docs/study/10-mvp-specs/foundation-security-i18n.md`.

The implementation plan is `docs/superpowers/plans/2026-05-09-foundation-security-i18n-implementation.md`.

## Anti-Copy Gate

- No third-party source code, schemas, API contracts, UI strings, tests, demo data, reports, templates, screenshots, or module layouts were used as implementation inputs.
- GPL and AGPL projects are functional references only through OpenERP-written specs.
- MIT, Apache-2.0, and BSD references require attribution notes before any direct reuse.
- Every PR touching domain behavior must name the OpenERP spec section it implements.

## Acceptance Coverage

- Tenant setup creates baseline roles and owner.
- Zero active owners is blocked.
- Permissions deny by default.
- Role changes write audit events.
- FR and EN catalogs must match before release.
- Self-hosted update state exposes the three support windows.
- Audit events are append-only through public APIs.
