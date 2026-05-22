# UI Review Rules

## When required
Use this rule when touching `apps/web`, design-system usage, Svelte routes, browser workflows, locale UI, auth/passkey UI, audit, or approvals.

## Review contract
Each review must name:
- Route: exact URL or route file.
- Viewport: desktop and, for layout-sensitive changes, mobile.
- Data mode: demo fallback or live API.
- Result: `OK` or blockers by route.
- Evidence: Playwright output, screenshot attachment, or explicit manual observation.

## Demo Slice 1 review routes
- `/login`
- `/register-passkey`
- `/admin/approvals`
- `/admin/audit`
- locale switcher in the shell

## Blocker criteria
- Component cannot be used.
- Layout overlaps, clips important text, or causes horizontal scroll.
- Design-system primitive/token is bypassed without reason.
- Locale switch breaks route or visible labels.
- Live action reports success but backend state disagrees.

## Snapshot discipline
- Attach Playwright screenshots for live workflow tests.
- Keep committed visual baselines only when the assertion is stable and intentional.
- Do not commit transient `test-results/` or `playwright-report/` artifacts.

## Locale switcher orientation
- Demo Slice decision: FR/EN is a global shell utility in the Sentropic `Header` actions area, not a navigation item.
- Use design-system primitives/tokens and the language icon when available.
- No-Go if the switcher is confused with business navigation, falls outside the global header, breaks the current route, fails to update `html lang`, loses keyboard focus visibility, or creates horizontal overflow.

## UI/UX reviewer agent system
- Use a dedicated reviewer agent for material shell, navigation, locale, approval, audit, login, or passkey UI changes.
- Use a separate best-practices/research agent when the question is about placement, information architecture, or UX conventions rather than code correctness.
- Use a third contradiction/synthesis agent when the recommendation will drive a user decision or when two acceptable patterns compete.
- Keep reviewer agents read-only unless explicitly assigned a disjoint implementation scope.
- Run or extend `apps/web/tests/ui-review.spec.ts` for measurable checks:
  - desktop, short desktop, and mobile viewports;
  - FR and EN locales;
  - `/admin/approvals` and `/admin/audit`;
  - no horizontal overflow;
  - header and sidebar controls contained inside the shell;
  - locale switcher remains in the global header and first viewport;
  - locale switch preserves the current route and updates `html lang`;
  - active nav item exposes `aria-current="page"`;
  - sidebar and route-level screenshot attachments per checked route.
- Reviewer output must be actionable:
  - `Ou`: route, viewport, locale, selector, or file.
  - `Action`: exact validation or code/design change.
  - `Preco`: recommended path, with severity.
  - `Sortie attendue`: observable Go/No-Go criterion.

## Decision-ready UI reports
For UI/UX choices, do not publish a recommendation until the report separates:
- `Etat de l'art`: convention or best-practice orientation, including rejected alternatives.
- `Revue implementee`: what the current app actually does, with route/viewport/locale evidence.
- `Contradiction`: strongest counterargument or reason the recommendation might be wrong.
- `Synthese`: one clear recommendation, risk level, and Go/No-Go criterion.

Minimum agent set:
- 2 agents for narrow, reversible UX choices on one route, with no shell/navigation change, no auth/passkey/audit/approval flow, no live mutation, and no unresolved disagreement:
  - state-of-art/local-pattern agent;
  - contradiction/synthesis agent.
- 3 agents for material UI changes, shell/navigation/IA, auth/passkey/audit/approval, responsive/mobile, locale, accessibility, live workflow success/failure states, Demo Slice routes, or any disputed recommendation:
  - state-of-art/local-pattern agent;
  - implemented UI reviewer agent with Playwright evidence when UI exists;
  - contradiction/synthesis agent.

Decision blocker errors:
- implementer-only auto-review;
- synthesis without a concrete decision;
- research that copies third-party source material into implementation;
- review without route, viewport, locale, or data mode;
- missing screenshot or Playwright evidence for existing UI;
- vague recommendation without Go/No-Go acceptance criteria.

Finding format:
```text
Route:
Viewport:
Locale:
Selector:
Severity:
Evidence:
Recommended fix:
Acceptance:
```
