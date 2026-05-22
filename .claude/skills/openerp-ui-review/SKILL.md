---
name: openerp-ui-review
description: Use when reviewing OpenERP UI/UX, design-system adoption, visual regressions, accessibility states, locale behavior, or Demo Slice screen quality.
---

# OpenERP UI Review

## Trigger
Use for UI review requests, design-system checks, screenshots, responsive/layout concerns, and workflow UX validation.

## Review scope
Check the exact routes affected by the change. For Demo Slice 1, include:
- `/login`
- `/register-passkey`
- `/admin/approvals`
- `/admin/audit`
- locale switcher

## Method
1. Start or reuse the local app and record the URL.
2. Visit each route in the relevant data mode: demo fallback or live API.
3. Capture screenshots with Playwright or attach them from the e2e test.
4. Challenge the implementation:
   - Can the main action be completed?
   - Are labels, focus states, and feedback accessible?
   - Is any important text clipped or overlapping?
   - Are design-system primitives/tokens used?
   - Does backend state match UI success messages?
5. Report only blockers and material UX risks.

## Playwright reviewer pass
Use `apps/web/tests/ui-review.spec.ts` as the automated baseline for shell ergonomics. It checks desktop, short desktop, and mobile viewports in FR and EN on `/admin/approvals` and `/admin/audit`.

Extend that spec when a visual concern can be made measurable. Prefer assertions for:
- no horizontal overflow;
- header/sidebar children contained inside their parent;
- locale switcher remains in the global header and first viewport;
- locale switch preserves the current route and updates `html lang`;
- active navigation marked with `aria-current="page"`;
- locale switcher visible as a global utility, not confused with nav;
- sidebar and route-level screenshots attached through `testInfo.attach`.

## Locale switcher decision
Current Demo Slice decision: keep FR/EN as a global shell utility in the Sentropic `Header` actions area. It is not a nav item. Use design-system primitives/tokens and the language icon when available.

## Agent review contract
For material UI changes, use:
- one read-only UI reviewer agent to challenge the implementation with screenshots;
- one best-practices/research agent when placement, IA, accessibility, or SaaS conventions are disputed.
- one contradiction/synthesis agent when the output will drive a user decision.

Agents must not return vague asks. Each finding must include route, viewport, locale, severity, fix recommendation, and acceptance criterion.

If the review is decision-oriented, also load `.claude/skills/openerp-ux-decision/SKILL.md` and publish the UX Decision Record before asking for arbitration.

## Output
Use:
```text
Route:
Mode:
Viewport:
Locale:
Selector:
Result:
Evidence:
Blockers:
Preco:
Acceptance:
```
