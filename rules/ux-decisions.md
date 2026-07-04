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

---

## UXDR-003 - SideNav module grouping (D-01 accepted)

Status: ACCEPTED 2026-05-26. User arbitration: GO recommended option (option A — immediate static grouping).

Ou: global admin shell, `apps/web/src/routes/+layout.svelte`, `apps/web/src/app.css`, all `/admin/*` routes.

Decision: Group the flat 14-item SideNav into four non-clickable section headers — CRM (Leads, Companies, Contacts, Opportunities), Projets/Projects (Projects, Rates), Facturation/Billing (Invoices, Taxes, Accounting), Admin (Users, Roles, Approvals, Audit, Settings). Implemented as four separate `SideNav` component instances (one per group), each preceded by a `<p class="shell__nav-heading">` styled with `--st-*` tokens, because `@sentropic/design-system-svelte` SideNav exposes only a flat `items: SideNavItem[]` prop with no native grouping/section API. Section headers are localized via `nav.section.{crm,projects,billing,admin}` i18n keys (EN+FR). Active-state (`aria-current="page"`) preserved on each group's nav link. Section headers carry `aria-hidden="true"` as each `<SideNav>` has its own accessible `label` matching the section name.

Scope: `+layout.svelte` sidebar structure, `app.css` nav-group/heading styles, `packages/i18n/src/foundation.{en,fr}.json` nav.section.* keys.

Agents consulted:
- Implemented-UI reviewer: `docs/reviews/2026-05-26-ux-review-implemented.md` — confirmed the flat 14-item sidebar as a scalability concern and IA smell; identified cognitive load issue.
- State-of-art: `docs/reviews/2026-05-26-ux-review-state-of-art.md` — evidence from Stripe/Linear/Notion/HubSpot/Salesforce that B2B multi-module consoles group nav at 8–10 items; static non-clickable headers are the dominant pattern.
- Contradiction/synthesis: `docs/reviews/2026-05-26-ux-review-synthesis.md` — D-01 elevated from nit (Agent A) to major IA decision; recommended option A under SideNav API verification; native group API confirmed absent.

Rejected alternatives:
- Flat nav (status quo): rejected; 14 items with zero grouping creates documented cross-module cognitive load and fails ERP market standard for 8+ item navs.
- 2-level collapsible / accordion nav: rejected for current Demo Slice; collapsible state introduces complexity (open/closed persistence, keyboard interaction) not warranted at this scale; defer to a later workpackage if item count exceeds current scope.
- Waiting for SideNav group API: rejected; the API was inspected (`SideNav.svelte.d.ts`) and confirmed flat-only; waiting would delay a low-effort, high-value IA improvement.

Acceptance criteria:
1. All four section headers (CRM, Projects/Projets, Billing/Facturation, Admin) are visible on any `/admin/*` route in both locales.
2. Active-state (`aria-current="page"`) remains functional for all 14 nav items.
3. Section headers are not interactive (no click target, no focus stop).
4. Each section's nav has an accessible `aria-label` matching the section name.
5. `npm run lint -w @sentropic/openerp-web` → 0 errors.
6. `npm run check:i18n` → no missing keys.
7. Playwright `ui-review.spec.ts` section-header assertions pass on all viewports.

Go/No-Go: GO when acceptance criteria 1–7 verified by Playwright and lint gates.

---

## UXDR-004 - Pre-auth shell (D-02 accepted)

Status: ACCEPTED 2026-05-26. User arbitration: GO recommended option (conditional sidebar — hide on pre-auth routes).

Ou: global shell, `apps/web/src/routes/+layout.svelte`, `apps/web/src/app.css`, routes `/login` and `/register-passkey`.

Decision: The admin sidebar (`<aside aria-label="Primary">`) is conditionally rendered only when the current route is NOT a pre-auth route. Pre-auth routes (`/login`, `/register-passkey`) render the global `Header` (with locale switcher, per UXDR-002) and `<main>` spanning full width; no `<SideNav>`, no module section headers, no admin navigation of any kind. Implemented via a reactive `isPreAuth` derived value in `+layout.svelte` that checks `page.url.pathname` against the pre-auth route list. When sidebar is absent, a `.shell--no-sidebar` class on the shell grid makes `<main>` span `grid-column: 1 / -1` for full-width layout.

Scope: `+layout.svelte` conditional sidebar rendering, `app.css` `.shell--no-sidebar` grid override, routes `/login` and `/register-passkey`.

Agents consulted:
- Implemented-UI reviewer: `docs/reviews/2026-05-26-ux-review-implemented.md` — confirmed F-01 (mobile below-the-fold blocker) and F-04 (IA smell, admin nav exposed pre-auth); identified single `+layout.svelte` with no auth-route escape as the root cause.
- State-of-art: `docs/reviews/2026-05-26-ux-review-state-of-art.md` — SaaS B2B market (Salesforce, HubSpot, Notion) uses a dedicated auth shell without admin nav; locale switcher retained pre-auth per bilingual Quebec standard.
- Contradiction/synthesis: `docs/reviews/2026-05-26-ux-review-synthesis.md` — F-01 and F-04 unified as "pre-auth shell" issue; architectural diagnosis confirmed; recommended option A (dedicated layout) preferred over option B (CSS hide); implementation settled on conditional rendering (same file, no route reorganization) as functionally equivalent at current scale.

Rejected alternatives:
- Keep sidebar on pre-auth routes: rejected; confirmed blocker F-01 (mobile form pushed below fold) and major F-04 (admin IA exposed pre-auth). No acceptable mitigation short of removing the sidebar.
- CSS-only hide (sidebar present in DOM, hidden via `display:none`): rejected; sidebar remains in tab order and accessible tree; not a real fix for the IA or accessibility concern.
- Dedicated `(auth)/+layout.svelte` route group: functionally equivalent; deferred in favor of simpler in-place conditional rendering at current two-route pre-auth scope. Revisit if the pre-auth surface grows.

Acceptance criteria:
1. `/login` and `/register-passkey`: `getByLabel("Primary")` not attached to DOM.
2. `/login` and `/register-passkey`: no `<nav>` element with any admin section label present.
3. `/login` and `/register-passkey`: `getByTestId("locale-switcher")` visible (UXDR-002 retained).
4. `/login` mobile (390x844): main content top edge is within the first viewport (form not below fold).
5. Any `/admin/*` route: sidebar present and contains four section headers.
6. Keyboard flow on `/login`: brand → EN → FR → Email field (no sidebar in tab order).
7. `npm run lint -w @sentropic/openerp-web` → 0 errors.
8. Playwright `ui-review.spec.ts` pre-auth assertions pass on all viewports and both locales.

Go/No-Go: GO when acceptance criteria 1–8 verified by Playwright and lint gates.

---

## UXDR-005 - Status steppers on Opportunity + Invoice detail pages

Status: ACCEPTED 2026-05-26. User arbitration: GO recommended option (horizontal stepper alongside existing Tag).

Ou: `apps/web/src/routes/admin/crm/opportunities/[id]/+page.svelte`, `apps/web/src/routes/admin/billing/invoices/[id]/+page.svelte`, `apps/web/src/lib/components/StatusStepper.svelte`.

Decision: Render a reusable horizontal `StatusStepper` on both detail pages, alongside (not replacing) the existing status `Tag`. On Opportunity detail: stages sorted by `orderIndex`, current stage receives `aria-current="step"`, prior stages are `done`, upcoming stages are `upcoming`; terminal states (`won`, `lost`) are shown as a distinct off-path badge appended to the stepper. On Invoice detail: lifecycle sequence Draft → Issued → Paid (with `partially_paid` inserted between Issued and Paid when the invoice has that status); `void` and `written_off` are terminal off-path states shown as a warning badge, not as steps. The single `StatusStepper` component accepts `steps:{key,label,state}[]` and an optional `terminalLabel`/`terminalTone`; styled with `--st-*` tokens; accessible via `aria-current="step"` on the current step.

Scope: `lib/components/StatusStepper.svelte` (new reusable component), CRM opportunity detail page, billing invoice detail page, `packages/i18n` `billing.invoices.step.*` keys (EN+FR).

Agents consulted:
- Implemented-UI reviewer: `docs/reviews/2026-05-26-ux-review-implemented.md` — identified absence of lifecycle context on detail pages; status Tag alone insufficient for orientation.
- State-of-art: `docs/reviews/2026-05-26-ux-review-state-of-art.md` — B2B ERP (Salesforce, HubSpot, Stripe) uses horizontal steppers for lifecycle position; stepper + tag is the dominant combined pattern.
- Contradiction/synthesis: `docs/reviews/2026-05-26-ux-review-synthesis.md` — D-03 elevated to material decision; recommended stepper + existing Tag over badge-only; terminal off-path as distinct badge confirmed by evidence.

Rejected alternatives:
- Badge-only (no stepper): rejected; Tag communicates current state but does not convey lifecycle position or remaining steps; context lost especially for multi-step won/lost outcomes.
- Replace Tag with stepper: rejected; Tag is compact and used in list views; replacing breaks established scan pattern; combining is additive and does not increase noise.
- Collapsible or vertical stepper: rejected at current Demo Slice scale; single row of 2–4 steps is fully legible horizontally; collapsible adds state management overhead for no gain.

Acceptance criteria:
1. Opportunity detail `/admin/crm/opportunities/demo-op-1`: `data-testid="opportunity-pipeline-stepper"` visible, one `[aria-current="step"]` on the current stage step, prior stages `data-step-state="done"`.
2. Invoice detail `/admin/billing/invoices/demo-inv-1`: `data-testid="invoice-lifecycle-stepper"` visible, one `[aria-current="step"]` on the current status step.
3. Terminal states (won, lost, void, written_off): `data-testid="stepper-terminal"` visible with appropriate tone.
4. Step labels use `crm.opportunities.status.*` (pipeline stage name) and `billing.invoices.step.*` keys — EN/FR aligned.
5. `npm run lint -w @sentropic/openerp-web` → 0 errors; `npm run check:i18n` → valid.
6. Playwright `uxdr-005-006.spec.ts` assertions pass for EN and FR locales.

Go/No-Go: GO when acceptance criteria 1–6 verified by Playwright and lint gates.

---

## UXDR-006 - Company detail child sections (Opportunities + Contacts)

Status: ACCEPTED 2026-05-26. User arbitration: GO recommended option (read-only linked sections under the activity timeline).

Ou: `apps/web/src/routes/admin/crm/companies/[id]/+page.svelte`, `apps/web/src/routes/admin/crm/companies/[id]/+page.server.ts`, `packages/i18n` `crm.companies.detail.opportunities.*` and `crm.companies.detail.contacts.*` keys (EN+FR).

Decision: Extend the Company detail `+page.server.ts` to load `listOpportunities({companyId})` and `listContacts({companyId})` in the same `Promise.all` as the existing company + timeline fetch. Add demo fallbacks (1 Opportunity, 1 Contact for `demo-co-1`). Render two new read-only sections on the page above the activity timeline: "Opportunities" (name + status Tag + amount, linked to `/admin/crm/opportunities/{id}`) and "Contacts" (name + email + status Tag, linked to `/admin/crm/contacts/{id}`). Show `EmptyState` when none. Section pattern mirrors the project detail (tasks/time/team) section model.

Scope: `companies/[id]/+page.server.ts` (Promise.all extension, demo fallback), `companies/[id]/+page.svelte` (two new sections + CSS), `packages/i18n` new keys (EN+FR).

Agents consulted:
- Implemented-UI reviewer: `docs/reviews/2026-05-26-ux-review-implemented.md` — confirmed Company detail shows only audit timeline, giving no 360 account view; listed as D-04 with impact "major".
- State-of-art: `docs/reviews/2026-05-26-ux-review-state-of-art.md` — CRM platforms (Salesforce, HubSpot) consistently expose related Contacts and Opportunities on the Account record; this is the baseline expectation for account-centric workflows.
- Contradiction/synthesis: `docs/reviews/2026-05-26-ux-review-synthesis.md` — D-04 confirmed major; recommended read-only linked lists (no inline create) as the correct first step; inline create deferred to a later workpackage.

Rejected alternatives:
- Timeline-only (status quo): rejected; Company page with only an audit timeline is incomplete for a CRM workflow; operators cannot see associated opportunities or contacts without leaving the record.
- Inline create forms: rejected for this slice; adds form-management complexity (server actions, validation) not warranted at this Demo Slice; read-only linked lists satisfy the 360-view requirement and are sufficient for navigation.
- Separate sub-route/tab: rejected; the project detail pattern (same page, stacked sections) is already established and approved; introducing tabs or sub-routes would require a navigation IA decision outside this scope.

Acceptance criteria:
1. `/admin/crm/companies/demo-co-1`: `data-testid="opportunities-section-title"` visible and contains the localized section heading.
2. `/admin/crm/companies/demo-co-1`: `data-testid="company-opportunities-list"` visible with at least 1 item linking to `/admin/crm/opportunities/`.
3. `/admin/crm/companies/demo-co-1`: `data-testid="contacts-section-title"` visible and contains the localized section heading.
4. `/admin/crm/companies/demo-co-1`: `data-testid="company-contacts-list"` visible with at least 1 item linking to `/admin/crm/contacts/`.
5. Section headings localized in EN and FR; `check:i18n` → valid.
6. `npm run lint -w @sentropic/openerp-web` → 0 errors.
7. Playwright `uxdr-005-006.spec.ts` company detail assertions pass for EN and FR locales.

Go/No-Go: GO when acceptance criteria 1–7 verified by Playwright and lint gates.

---

## UXDR-007 — Reporting/Automation nav grouping

Status: PROPOSED / NO-GO. Decision: KEEP the single "Reporting" nav section (6 items). The split into Reporting + Automation is deferred. Reopen trigger: a 7th item is added to the section, OR the URL namespace is re-architected.

Ou: global admin shell, `apps/web/src/routes/+layout.svelte`, nav section header `nav.section.reporting`, all `/admin/reporting/*` routes. Reference UXDR-003 (module grouping).

Orientation: Retain the single "Reporting" section (6 items: Saved views, Reports, Dashboards, Scheduled deliveries, Workflows, Webhooks). Do NOT split into a "Reporting" sub-section and an "Automation" sub-section at this time.

Options rejetees:
- Split into Reporting (Saved views, Reports, Dashboards, Scheduled deliveries) + Automation (Workflows, Webhooks): rejected now. The section currently has 6 items, which is below the 8-item cognitive-load threshold identified in UXDR-003. Both Workflows and Webhooks are output-oriented (they react to the same audit events that Reports consume) and belong in the same observability/automation surface. Splitting requires a nav IA decision, a URL re-architecture (currently all under `/admin/reporting/`), and new i18n section keys — disproportionate for 6 items.
- Collapse Workflows + Webhooks under a nested "Automation" sub-heading within the same SideNav group: rejected; the SideNav component has no native sub-grouping API (confirmed in UXDR-003); would require custom DOM with accessibility risks.

Preuves:
- Review pass (2026-05-31): the 6-item single section was examined against the UXDR-003 threshold. The split was identified as a valid future direction but not a current blocker.
- UXDR-003 established the 8-item cognitive-load threshold for grouping; the current section is at 6.
- The FR nav collision (`nav.reportDefinitions` FR = "Rapports" colliding with `nav.section.reporting` FR = "Rapports") was fixed independently by renaming `nav.reportDefinitions` FR to "Rapports personnalisés" — this does not require a structural split.

Risques:
- If a 7th item is added (e.g. Alerts, Exports, AI reports), the section will cross the threshold and the split should be revisited.
- The current URL namespace (`/admin/reporting/workflows`, `/admin/reporting/webhooks`) conflates "reporting" with "automation"; if the URL namespace is re-architected, the nav grouping must follow.
- The FR label fix ("Rapports personnalisés") distinguishes Reports from the Reporting section header; no further collision risk in the current 6-item scope.

Decision proposee: KEEP the single "Reporting" section. NO-GO on the Reporting/Automation split.

Go/No-Go: NO-GO (deferred). Reopen when: (a) a 7th item is added to the section, or (b) the `/admin/reporting/` URL namespace is re-architected to separate reporting from automation routes.

---

## UXDR-008 — Shell complet : drawer mobile, header identité, skip link (GO)

Ou: `apps/web/src/routes/+layout.svelte`, `apps/web/src/app.css`, `apps/web/src/routes/+layout.server.ts`, `apps/web/src/routes/auth/logout/+server.ts` (nouveau), `packages/i18n/src/foundation.{fr,en}.json`, `apps/web/tests/ui-review.spec.ts`.

Orientation: Desktop (>= 769 px) : sidebar `<aside>` statique 240 px dans le CSS grid, toujours visible, pas de toggle. Mobile (<= 768 px) : nav principale via composant `Drawer` DS (`side="left"`, overlay, backdrop scrim) ouvert par un toggle hamburger (`aria-expanded` + `aria-controls`, visible mobile uniquement). Boite identite dans la zone `actions` du `Header`, a droite du locale-switcher : signed-in = icone Lucide `User` + `OverflowMenu` DS (`placement="bottom-end"`, item "Se deconnecter" `danger` -> POST `/auth/logout`) ; signed-out hors pre-auth = `<Button variant="secondary" size="sm" href="/login">Se connecter</Button>`. Routes pre-auth (`/login`, `/register-passkey`) : brand + langues uniquement (UXDR-004 conserve). Skip link WCAG 2.4.1 premier element focusable -> `#main-content`. 5 groupes SideNav conserves (UXDR-003/007). Escape et clic backdrop ferment le drawer avec retour focus hamburger ; fermeture auto sur navigation (`afterNavigate`) ; `inert` sur le contenu hors drawer en mobile ouvert (etat client `matchMedia`, jamais calcule au SSR). Identite : option (c) icone sans nom (l'API login/finish ne retourne que des UUIDs) ; migration vers profil via `GET /api/users/{id}` dans `+layout.server.ts` = attendu du workpackage suivant.

Options rejetees: rail desktop 48 px (differe, cout disproportionne Demo Slice) ; toggle hamburger desktop (affordance orpheline sans rail) ; `Popover`/`role=menu` custom pour l'identite (`OverflowMenu` DS plus direct) ; initiales depuis l'UUID (opaque, confus) ; enrichir le cookie au login (l'API ne retourne pas le profil ; alourdit le chemin critique) ; duplication identite dans le drawer (anti-pattern AP-01).

Preuves: `docs/reviews/2026-07-03-ux-shell-state-of-art.md` (Carbon UI Shell, Material, Odoo/Salesforce/HubSpot, WCAG 2.4.1/2.4.3) ; `docs/reviews/2026-07-03-ux-shell-implemented.md` (DOM live openerp-dev, 5 ecarts bloquants, APIs DS Drawer/OverflowMenu/Header/SideNav) ; `docs/reviews/2026-07-03-ux-shell-synthesis.md` (arbitrages zones A-D, decision identite sur code reel `login/finish/+server.ts`). Agents consultes : etat-de-l-art, revue-UI-implementee, contradiction/synthese (3 passes independantes, 2026-07-03). Directive produit utilisateur 2026-07-02 : « drawer et menus verticaux, et header classique (dont la boite id = signin, langues) ».

Risques: Drawer DS sans Escape/focus-trap natifs (mitigation : `svelte:window` + `inert` + tests clavier Playwright) ; largeur Drawer `min(100vw,24rem)` plein ecran sur 375 px (mitigation : override 16rem) ; `isMobile && drawerOpen` doit etre client-only (`matchMedia`) sinon faux au SSR ; route `/auth/logout` prerequis bloquant.

Decision proposee: GO orientation complete (synthese §3.1-3.5).

Go/No-Go: GO si les criteres Playwright de la synthese §4 passent (desktop 1280x800 : hamburger cache, sidebar visible, identite + langues dans le banner, skip link focusable ; mobile 375x812 : hamburger visible, sidebar cachee, drawer `role=dialog` ouvre/ferme via Escape + backdrop avec retour focus ; `/login` : ni sidebar ni hamburger ni CTA connexion ; deconnexion : cookie efface + redirect `/login`).

Addendum 2026-07-03 (fidélité DS, directive utilisateur « header/drawer pas en phase avec le DS ») : le shell est migré sur le design system actuel — bump @sentropic/design-system-svelte ^0.7.0 → ^0.34.66 (+ themes/tokens ^0.11.0). Les contrôles faits main sont remplacés par les composants officiels : sélecteur de langue = `LanguageToggle` (variant select, supersède la forme boutons FR/EN aria-pressed d'UXDR-002 en conservant sa sémantique : bascule globale header, préservation de route, html[lang]) ; boîte identité = `IdentityMenu` (compact ; signed-in = avatar initiales + menu Se déconnecter ; signed-out = bouton connexion DS) ; drawer = `Drawer` 0.34. Sémantique UXDR-008 inchangée (anatomie, breakpoints, a11y, pré-auth). Gates re-vérifiés : svelte-check 0/0, build ok, e2e 217/217.
