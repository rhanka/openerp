---
name: openerp-ux-decision
description: Use when OpenERP UI, UX, product, IA, accessibility, locale, or workflow orientation needs a clear decision or user arbitration.
---

# OpenERP UX Decision

## Trigger
Use before deciding or asking the user to decide on UI/UX/product direction, including shell layout, navigation, locale placement, workflow order, visible business wording, accessibility, feedback states, and Demo Slice screens.

## Hard Rule
No UX decision from a single viewpoint. A decision-ready recommendation needs a UX Decision Record and the required independent agent passes.

## Agent Threshold
Use 2 agents only for narrow, reversible choices on one route, with no shell/navigation change, no auth/passkey/audit/approval flow, no live mutation, and no unresolved disagreement:
- state-of-art/local-pattern agent;
- contradiction/synthesis agent.

Use 3 agents for material, disputed, cross-route, auth/security, data-mutating, responsive, locale, accessibility, or Demo Slice decisions:
- state-of-art/local-pattern agent;
- implemented-UI reviewer with Playwright/screenshot evidence when UI exists;
- contradiction/synthesis agent.

If agent delegation is unavailable, mark the missing pass as an `Attendu` and return `No-Go`.

## UX Decision Record
Use:
```text
UX Decision Record
Ou:
Decision:
Scope:
Agents consulted:
Evidence:
Rejected alternatives:
Risks:
Acceptance:
Go/No-Go:
```

`Decision` must be imperative: `Retenir X`, `Rejeter Y`, or `Differer jusqu'a Z`. Do not use vague phrasing like `a considerer`, `peut-etre`, or `semble preferable`.

## Blockers
Return `No-Go` when any of these are true:
- implementer-only auto-review;
- synthesis without concrete decision;
- research copied into implementation;
- review without route, viewport, locale, or data mode;
- missing screenshot/Playwright evidence for existing UI;
- recommendation without acceptance criteria.

## Project Report
After the UX Decision Record, report in:
```text
Fait
Publication
A faire
Attendus
```

`Attendus` must include `Ou / Action / Preco / Sortie attendue`.
