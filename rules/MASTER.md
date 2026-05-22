# OpenERP Master Rules

## Project posture
- Target: original MIT OpenERP implementation for bilingual ERP/CRM/back-office workflows.
- Do not copy third-party code, UI text, fixtures, screenshots, workflow structures, templates, or demo data from research sources.
- Treat `research/sources/**` as vendored study material, not implementation source.
- UI runtime must use `@sentropic/design-system-*` packages.

## Workflow
- Read this file before action; read narrower rules only when relevant.
- Keep edits scoped to the user request and current workpackage.
- Scratch and generated temporary artifacts go under `./tmp/`.
- Never revert user changes or unrelated worktree changes.
- Prefer focused verification first, then broaden before claiming completion.

## Reporting
Use:

```text
Fait
Publication
A faire (multi-track)
Attendus
```

`Attendus` must be actionable:
- `Ou`: exact route, file, command, branch, or tracker entry.
- `Action`: concrete user or agent action.
- `Preco`: recommended decision or path.
- `Sortie attendue`: observable completion criterion.

Weak attendu example: "review UI".
Strong attendu example: "Open `http://localhost:4173/admin/approvals`, approve a seeded request, return `OK` or blockers by route; sortie: Go/No-Go UI for Demo Slice 1."

## Decision protocol
- Do not ask the user to decide UI/UX/product orientation from a weak or single-perspective note.
- UX decisions are blocked until a UX Decision Record exists for any user-facing choice affecting navigation, IA, layout, hierarchy, workflow order, feedback states, accessibility, locale behavior, or visible business wording.
- Existing UX decisions live in `rules/ux-decisions.md`; read it before changing covered behavior.
- For material UI/UX decisions, produce a clear orientation supported by:
  - an état-de-l-art / best-practices pass;
  - an implemented-UI review pass against the running app, code, or screenshots.
- Add a third contradiction/synthesis pass when the decision touches placement, information architecture, accessibility, conventions, or disputed tradeoffs.
- When agent delegation is available and explicitly requested or otherwise authorized by the active session, use separate agents for those passes. If not available, report the missing pass as an `Attendu`.
- Minimum orientation:
  - 2 independent agents for narrow, reversible UX choices on one route, with no shell/navigation change, no auth/passkey/audit/approval flow, no live mutation, and no unresolved disagreement.
  - 3 independent agents for material, disputed, cross-route, auth/security, data-mutating, responsive, locale, accessibility, or Demo Slice decisions.
- The implementer must not be the sole decision maker. A final UX decision must name the consulted agents, alternatives rejected, chosen path, acceptance criteria, and evidence.
- UX Decision Record output must include:
  - `Ou`: route, file, workflow, component, or screen.
  - `Orientation`: recommended path now.
  - `Options rejetees`: alternatives considered and why rejected.
  - `Preuves`: sources, screenshots, tests, code references, or reviewer observations.
  - `Risques`: residual risk and mitigation.
  - `Decision proposee`: concrete yes/no or option A/B.
  - `Go/No-Go`: observable acceptance criteria.

## Gates
- Bugfix: reproduce, identify root cause, add or update a test, then patch.
- Browser behavior: add or update Playwright coverage when feasible.
- UI changes: run a reviewer-style pass with desktop/mobile snapshots or attach Playwright screenshots.
- UX decisions: No-Go until the UX Decision Record and required 2/3-agent orientation exist.
- Before final: report commands run and any verification not run.
