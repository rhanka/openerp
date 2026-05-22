# UX Decisions

## UXDR-001 - Shell Locale Switcher (DISPUTED — superseded by UXDR-002)

Status: DISPUTED 2026-05-19. Utilisateur a conteste le placement "footer de sidebar" ("deja exclu, ou a-t-on vu ce pattern ?"). UXDR-002 reouvre la decision avec nouvelles passes d'agents et propose D1/D2 a l'arbitrage utilisateur. Ne pas s'appuyer sur UXDR-001 pour de nouveaux changements UI.

Ou: global shell, `apps/web/src/routes/+layout.svelte`, `apps/web/src/app.css`, routes `/admin/approvals` and `/admin/audit`.

Decision (historique, non opposable): Retenir FR/EN comme utilitaire global en footer de sidebar pour la Demo Slice. Ne pas en faire un item de navigation. Differer un deplacement vers header/menu utilisateur jusqu'a l'existence d'une top bar ou d'un menu profile stable.

Scope: locale switcher shell, FR/EN route preservation, document language, sidebar footer behavior on desktop, short desktop, and mobile.

Agents consulted:
- Etat de l'art: `019e3866-1650-7292-94fc-b047fc7d8d83`.
- Revue UI implementee: `019e3866-375d-7731-9f33-d3f86e5d9cd6`.
- Contradiction / audit instructions: `019e3866-549c-7390-85ea-79b5ee9391d9`.

Evidence (datee):
- State-of-art pass recommended footer sidebar as the current pragmatic Demo Slice placement, with future reassessment for header/profile menu.
- Implemented-UI pass found the footer acceptable only if visible in the first desktop viewport on long pages.
- `apps/web/tests/ui-review.spec.ts` couvrait FR/EN, desktop, short desktop, mobile, `/admin/approvals`, `/admin/audit`, no horizontal overflow, sidebar containment, viewport-visible switcher, route preservation, et `html lang`.

Rejected alternatives (a relire dans UXDR-002):
- Header or profile menu now: rejected until OpenERP has a stable top bar/profile menu.
- Settings-only: rejected for immediate language switching; settings can later own organization defaults.
- Navigation item: rejected because FR/EN is not a business destination and must not compete with `aria-current` nav.
- Floating control or page footer: rejected for overlap, visibility, and ERP consistency risks.

Risks:
- Sidebar footer can be pushed offscreen by long pages if the sidebar stretches with content.
- `role="tablist"` for language change is acceptable short term but should be revisited for semantics.
- Mobile shell may later need drawer/collapsed behavior.

Acceptance (deja remplie par implementation actuelle, mais ne valide pas la decision):
- FR/EN stays after primary nav and inside the shell.
- On desktop and short desktop, `locale-switcher.bottom <= viewport.height`.
- On mobile, no horizontal document overflow.
- Switching locale preserves the current admin route and updates `html lang`.
- Visible labels follow the active locale.

Go/No-Go: NO-GO (decision contestee, superseded par UXDR-002 en cours d'arbitrage).

---

## UXDR-002 - Shell Locale Switcher (D2 accepted)

Status: ACCEPTED 2026-05-21. User arbitration: `GO D2`, with explicit constraint to align with the Sentropic design system header and use the language icon.

Ou: global shell, `apps/web/src/routes/+layout.svelte`, `apps/web/src/app.css`, routes `/admin/approvals`, `/admin/audit`, `/login`, `/register-passkey`.

Decision: Retenir D2. Place FR/EN in the global Sentropic `Header` actions area, with `role="group"`, `aria-pressed` toggle buttons, route preservation, and a visible language icon. Rejeter D1 sidebar-footer for the current Demo Slice because the user explicitly excluded it.

Scope: locale switcher shell, FR/EN route preservation, document language, global header behavior on desktop, short desktop, and mobile. Includes pre-auth routes `/login` and `/register-passkey`.

Agents consulted:
- Etat de l'art (Claude, 2026-05-19): common public/gov pattern places language in a top header; authenticated SaaS often places language behind profile/header controls; sidebar-footer had weak evidence for language specifically.
- Revue UI implementee (Claude, 2026-05-19): 12 screenshots from the sidebar-footer implementation showed route preservation and viewport visibility but also an ambiguous utility placement and no visible language affordance beyond FR/EN.
- Contradiction / synthese (Claude, 2026-05-19): defended D1 as pragmatic, but also identified D2 as the natural destination once a stable top bar exists.
- Codex implementation pass (2026-05-21): D2 is feasible with `@sentropic/design-system-svelte` `Header`, `@lucide/svelte` `Languages`, and reviewer coverage asserting header containment on admin and auth routes.

Evidence:
- User arbitration 2026-05-21: `GO D2`.
- Implementation target: `apps/web/src/routes/+layout.svelte`, `apps/web/src/app.css`.
- Reviewer tests: `apps/web/tests/ui-review.spec.ts` covers `/admin/approvals`, `/admin/audit`, `/login`, `/register-passkey`, FR/EN, desktop, short desktop, mobile, header containment, no overflow, route preservation, and `html lang`.

Rejected alternatives:
- D1 (sidebar-footer corrected): rejected by user arbitration; previous concern was that this option had already been excluded and was not a convincing language placement pattern.
- D3 (sidebar HEAD, sous logo): rejected because it competes with product identity and still treats language as sidebar chrome rather than a global shell action.
- C (settings page only): rejected because bilingual Quebec/Canada use requires a one-click global language switch on every route.
- D4 (radiogroup ARIA): rejected; `role="group"` + `aria-pressed` remains the simpler and valid toggle pattern for two locales.

Risks:
- Header currently has one global action; it must not become a sparse or decorative top bar. Add profile/search/tenant controls only when backed by real workflow needs.
- If a third language is added, replace the two-button toggle with a dropdown/menu and retest placement.
- If mobile navigation becomes a drawer, retest header/sidebar focus order and containment.

Acceptance:
1. Route `/admin/approvals`, viewport 1280x800, locale FR: `getByRole("banner", { name: "Global application header" })` visible and contains `data-testid="locale-switcher"`.
2. Route `/admin/approvals`, click `EN`: pathname remains `/admin/approvals`, `html[lang="en"]`, button EN has `aria-pressed="true"`.
3. Routes `/login` and `/register-passkey`, viewport 1280x800: header switcher present and functional before authentication.
4. Route `/admin/audit`, viewport 390x844, locale EN: no horizontal overflow; header, sidebar navigation, and main content do not overlap.
5. Keyboard flow reaches brand, EN, FR, then admin navigation with visible focus styles.

Go/No-Go: GO for D2 when the reviewer Playwright checks and web lint/build pass.
