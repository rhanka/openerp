# Implemented UI Review — 2026-05-26

Reviewer: automated evidence capture + visual analysis pass
Method: Playwright (chromium, headless), demo mode (no API), desktop 1440x900 + mobile 390x844, locales FR/EN
Data mode: demo fallback on all routes (OPENERP_DEV_ORG_ID/OPENERP_DEV_USER_ID not set)
Server: dev (Vite, port 4176)
Total automated checks: 696
Automated issues: 2 (both on /admin/billing/accounting mobile overflow)
Manual visual issues found: 12 additional

---

## Summary Table

| Route | Desktop EN | Desktop FR | Mobile EN | Mobile FR |
|---|---|---|---|---|
| /login | OK* | OK* | ISSUE | ISSUE |
| /register-passkey | OK* | OK* | ISSUE | ISSUE |
| /admin/approvals | OK | OK | OK | OK |
| /admin/audit | OK | OK | OK | OK |
| /admin/crm/leads | OK | OK | OK | OK |
| /admin/crm/companies | OK | OK | OK | OK |
| /admin/crm/contacts | OK | OK | OK | OK |
| /admin/crm/opportunities | OK | OK | OK | OK |
| /admin/crm/opportunities/demo-op-1 | OK | OK | OK | OK |
| /admin/project/projects | OK | OK | OK | OK |
| /admin/project/projects/demo-pr-1 | OK | OK | OK | OK |
| /admin/project/rates | OK | OK | OK | OK |
| /admin/billing/invoices | OK | OK | OK | OK |
| /admin/billing/invoices/demo-inv-1 | OK | OK | OK | OK |
| /admin/billing/taxes | OK | OK | OK | OK |
| /admin/billing/accounting | OK | OK | ISSUE | ISSUE |

*OK with IA observation: full admin sidebar appears on pre-auth routes.

---

## Prioritized Top Findings

### F-01 — Mobile sidebar blocks pre-auth form content
**Route:** /login, /register-passkey
**Viewport:** mobile (390x844)
**Locale:** FR, EN
**Selector:** `.shell__sidebar`, `.shell__main`
**Severity:** blocker
**Evidence:** `login__mobile__en__viewport.png`, `login__mobile__fr__viewport.png`, `register-passkey__mobile__en__viewport.png` — the full 14-item admin sidebar renders above the form content on mobile at all pre-auth routes. The form heading is pushed below the fold and requires scrolling past the entire nav. On mobile the grid stacks to `grid-template-rows: auto auto minmax(0,1fr)` (header, sidebar, main), so the sidebar always renders first.
**Recommended fix:** For pre-auth routes (`/login`, `/register-passkey`), suppress the sidebar or replace with a minimal shell. Alternatively, the global shell layout must support a collapsed/hidden sidebar variant that is activated for unauthenticated routes.
**Acceptance:** /login and /register-passkey at 390x844: form content visible in first viewport without scrolling; sidebar hidden or collapsed to zero height.

---

### F-02 — Design token namespace fragmentation across all page-level components
**Route:** All routes except /admin/approvals
**Viewport:** desktop, mobile
**Locale:** FR, EN
**Selector:** scoped `<style>` blocks in route `.svelte` files
**Severity:** blocker
**Evidence:** Code audit of `apps/web/src/routes/admin/` — 14 of 15 page components (all CRM, project, billing) use `--sent-*` token names (`--sent-space-lg`, `--sent-color-text-muted`, `--sent-font-size-sm`, `--sent-color-border-default`, `--sent-radius-sm`, etc.) that are not defined by the `@sentropic/design-system-tokens` package. The shell and one page (`/admin/approvals`) correctly use `--st-*` tokens. Additionally, `billing/accounting/+page.svelte` uses a third, incompatible namespace: `--color-*`, `--space-400`, `--font-size-sm`, `--font-weight-medium`. All three namespaces resolve to undefined/browser-default values at runtime, bypassing the design system ThemeProvider.
**Recommended fix:** Audit and migrate all scoped CSS in `apps/web/src/routes/admin/**/*.svelte` to use `--st-semantic-*` and `--st-component-*` tokens from `@sentropic/design-system-tokens`. Eliminate `--sent-*` and `--color-*` token references. Run the token audit in CI.
**Acceptance:** `grep -r "var(--sent-" apps/web/src` returns zero results; `grep -r "var(--color-" apps/web/src` returns zero results from scoped styles; visual review confirms spacing/color match the ThemeProvider output.

---

### F-03 — /admin/billing/accounting: Journal Entries table overflows horizontally on mobile
**Route:** /admin/billing/accounting
**Viewport:** mobile (390x844)
**Locale:** EN, FR
**Selector:** `table.data-table[data-testid="journal-entries-table"]`
**Severity:** blocker
**Evidence:** Playwright automated check — `documentDelta=221 (EN) / documentDelta=175 (FR)` at 390x844. Screenshot `billing-accounting__mobile__en__full.png` shows the Journal Entries table columns (Date, Reference, Description, Source, Status, Debit) extend beyond viewport width; columns are truncated/merged. The `entry-description` cell has `white-space: nowrap` + `max-width: 240px` which forces the row wider than the container. The `.page` wrapper does not have `overflow-x: hidden` and no `overflow-x: auto` wrapper exists around the table.
**Recommended fix:** Wrap both tables in `accounting/+page.svelte` in a `div` with `overflow-x: auto; max-width: 100%`. Remove `white-space: nowrap` from `.entry-description` on narrow viewports, or reduce max-width to a percentage.
**Acceptance:** Playwright check `documentDelta <= 1` on /admin/billing/accounting at 390x844 in both locales.

---

### F-04 — Pre-auth routes expose full admin navigation sidebar (IA observation)
**Route:** /login, /register-passkey
**Viewport:** desktop 1440x900, mobile 390x844
**Locale:** FR, EN
**Selector:** `.shell__sidebar nav[aria-label="Admin"]`
**Severity:** major
**Evidence:** `login__desktop__en__viewport.png` — full sidebar shows Leads, Companies, Contacts, Opportunities, Projects, Rates, Invoices, Taxes, Accounting, Users, Roles, Approvals, Audit, Settings (14 items) on the login page. These are all authenticated admin routes. Pre-auth pages should not expose the full admin navigation. Note: this is an IA observation forwarded to the synthesis agent — no UX decision exists for the pre-auth shell layout. Do not implement without a UXDR.
**Recommended fix:** (Requires UXDR) Consider a pre-auth layout variant (`/login/+layout.svelte`, `/register-passkey/+layout.svelte`) with a minimal header-only shell, no sidebar, or a reduced product-identity-only sidebar.
**Acceptance:** /login and /register-passkey: sidebar nav items for admin routes not rendered or not visible without authentication.

---

### F-05 — Opportunities form: "Company ID" is a raw UUID input, not a name picker
**Route:** /admin/crm/opportunities
**Viewport:** desktop 1440x900
**Locale:** EN, FR
**Selector:** `input[name="companyId"]`
**Severity:** major
**Evidence:** `crm-opportunities__desktop__en__viewport.png` — the "Company ID" field label (i18n key `crm.opportunities.field.companyId` = "Company ID" / "Identifiant societe") presents as a free-text input expecting a UUID. Users cannot know the company UUID. The same pattern exists in the Billing Invoices `fromProposal` form (Proposal ID field). The field is functional but unusable without external lookup.
**Recommended fix:** Replace the raw ID input with either (a) a `<select>` dropdown populated from the demo/live company list, or (b) a searchable combobox using the `@sentropic/design-system-svelte` Select primitive. The FR label "Identifiant societe" is also overly technical — consider "Societe" with a picker.
**Acceptance:** User can select a company by name (not UUID) when creating an opportunity. Company name resolves to the correct `companyId` on form submit.

---

### F-06 — Opportunity detail: "Activity" section labels not localized (EN/FR parity issue)
**Route:** /admin/crm/opportunities/demo-op-1
**Viewport:** desktop 1440x900
**Locale:** FR
**Selector:** `.timeline-entry` or equivalent
**Severity:** major
**Evidence:** `crm-opportunity-detail__mobile__fr__viewport.png` — the detail page heading shows "Annual licence renewal" (EN content) in FR locale. The i18n keys exist and are correct (`crm.opportunities.detail.timeline.title` = "Activite"), but the opportunity name is a data string from the demo fixture and will always be in the language it was created in. The metadata panel labels (STATUS, STAGE, EXPECTED VALUE) appear to be raw uppercase field names — these are not translated. Screenshot shows metadata row with all-caps labels "STATUS", "STAGE", "EXPECTED VALUE" in both locales.
**Recommended fix:** Replace raw uppercase field name strings with i18n keys. Use `crm.opportunities.field.status`, `crm.opportunities.field.stage`, `crm.opportunities.field.expectedValue`.
**Acceptance:** Metadata field labels on /admin/crm/opportunities/demo-op-1 use locale-appropriate text in both FR and EN.

---

### F-07 — Project detail: "Mark doneDelete" and "ApproveDelete" labels run together (missing spacing)
**Route:** /admin/project/projects/demo-pr-1
**Viewport:** desktop 1440x900
**Locale:** EN
**Selector:** task list row actions, time entry row actions
**Severity:** major
**Evidence:** `project-project-detail__desktop__en__viewport.png` — the task "Implement core API endpoints" shows "Mark doneDelete" as a continuous string (no space/separator between the two action buttons), and time entry "API endpoint implementation" shows "ApproveDelete" similarly. These are button labels running together without a gap element or flex container.
**Recommended fix:** Wrap the action buttons in a flex container with `gap` to ensure visual separation. Verify the Svelte template outputs separate `<Button>` elements rather than concatenated text.
**Acceptance:** Action button labels on project detail rows render with visible spacing; "Mark done" and "Delete" are distinct clickable targets.

---

### F-08 — Billing invoice detail: "Back to list" link uses inline link style inconsistent with other details
**Route:** /admin/billing/invoices/demo-inv-1
**Viewport:** mobile 390x844
**Locale:** EN
**Selector:** `.back-link` or equivalent
**Severity:** minor
**Evidence:** `billing-invoice-detail__mobile__en__viewport.png` — the "Back to list" link is styled as a blue inline link at the top of the page. The opportunity detail and project detail pages use `← Back to list` with an arrow in a header-level position (`page__header` top-right area). Invoice detail places the back link above the `<h1>` as an inline link, creating an inconsistent pattern between detail pages.
**Recommended fix:** Align the back-link pattern across all detail pages — use the same position (page__header top-right or above h1), same icon (← arrow), same styling.
**Acceptance:** Back-link renders in the same visual position and style across opportunity detail, project detail, and invoice detail.

---

### F-09 — Audit page: action codes (`settings.changed`, `roles.changed`, `update.preflight_requested`) shown as raw strings
**Route:** /admin/audit
**Viewport:** desktop 1440x900
**Locale:** FR
**Selector:** `td` (Action column)
**Severity:** minor
**Evidence:** `audit__desktop__fr__viewport.png` — the Action column shows raw machine strings: `settings.changed`, `roles.changed`, `update.preflight_requested`. These are not translated or humanized in either locale. The FR locale shows the same raw codes as EN.
**Recommended fix:** Add i18n keys for audit action types, or at minimum apply a humanization transform (replace `.` with space, title-case). Consider a Tag component for action type display.
**Acceptance:** Audit action strings resolve to human-readable labels in both locales.

---

### F-10 — Mobile: main content consistently pushed below full sidebar on all admin routes (scroll required)
**Route:** /admin/approvals, /admin/audit, /admin/crm/leads, all admin routes
**Viewport:** mobile 390x844
**Locale:** FR, EN
**Selector:** `.shell__sidebar`, `.shell__main`
**Severity:** minor
**Evidence:** `approvals__mobile__fr__viewport.png`, `audit__mobile__en__viewport.png`, `crm-leads__mobile__fr__viewport.png` — on every admin route at mobile width, the full 14-item sidebar scrolls into view first. The page heading is below the fold. Users must scroll 700-750px to reach the first admin nav item and the page content. No mobile hamburger/drawer/collapse mechanism exists.
**Recommended fix:** (Requires UXDR for navigation IA on mobile) Implement a collapsible/hamburger sidebar for `max-width: 760px`. The sidebar should render collapsed (hidden or drawer) by default on mobile.
**Acceptance:** On mobile, the page `<h1>` is visible in the first viewport without scrolling; a toggle control opens/closes the sidebar.

---

### F-11 — Locale switcher: "Language" group ARIA role is `group`, buttons use `aria-pressed` (UXDR-002 acceptance check)
**Route:** All routes
**Viewport:** desktop, mobile
**Locale:** FR, EN
**Selector:** `[data-testid="locale-switcher"]`
**Severity:** nit (acceptance criterion met)
**Evidence:** Automated checks: all 32 routes × viewport × locale combinations pass locale-switcher-visible, locale-switcher-in-header, header-banner-visible, locale-switcher-icon-visible, locale-switcher-aria-pressed. UXDR-002 acceptance criteria are met. The `role="group"` with `aria-pressed` toggle pattern is in place and the language icon (`<Languages>` from `@lucide/svelte`) is rendered. The active locale button has `aria-pressed="true"`.
**Recommended fix:** No action required. Note for future: if a third locale is added, the two-button toggle should be replaced with a dropdown as specified in UXDR-002.
**Acceptance:** GO — UXDR-002 acceptance criteria verified by automated checks.

---

### F-12 — CRM/billing/project pages: scoped `<style>` blocks re-implement `.page`, `.page__header`, `.page__lede` classes already in `app.css`
**Route:** All CRM, project, billing routes
**Viewport:** desktop, mobile
**Locale:** FR, EN
**Selector:** `<style>` blocks in route `.svelte` files
**Severity:** nit (cross-route IA observation)
**Evidence:** Code audit — each page-level component re-declares `.page`, `.page__header`, `.page__lede`, `.page__actions` in scoped style blocks. The global `app.css` already defines these. The scoped declarations shadow the global ones with `--sent-*` tokens (undefined), causing divergence from the `app.css` baseline which uses `--st-*`. Approvals and Audit routes do NOT redeclare these classes in scoped styles and thus inherit the correct global definitions.
**Recommended fix:** Remove scoped redeclarations of `.page`, `.page__header`, `.page__lede`, `.page__actions`, `.page__form` from individual route components. Let these inherit from the global `app.css` baseline. Only declare page-specific layout that is not already covered by the global utilities.
**Acceptance:** Zero scoped redeclarations of `.page`, `.page__header`, `.page__lede` in route-level `<style>` blocks.

---

## Per-Route Findings

### /login

```
Route: /login
Viewport: desktop 1440x900
Locale: EN
Selector: .shell__sidebar
Severity: major (IA observation — no UXDR exists)
Evidence: login__desktop__en__viewport.png — full admin nav sidebar visible on pre-auth page
Recommended fix: Pre-auth layout variant with no sidebar (requires UXDR)
Acceptance: Admin nav not rendered on /login without authentication
```

```
Route: /login
Viewport: mobile 390x844
Locale: EN, FR
Selector: .shell__sidebar, .shell__main
Severity: blocker
Evidence: login__mobile__en__viewport.png, login__mobile__fr__viewport.png — form below fold
Recommended fix: Suppress sidebar on pre-auth routes at mobile
Acceptance: Form heading visible in first mobile viewport
```

### /register-passkey

```
Route: /register-passkey
Viewport: mobile 390x844
Locale: EN, FR
Selector: .shell__sidebar, .shell__main
Severity: blocker
Evidence: register-passkey__mobile__en__viewport.png — form below fold (same pattern as /login)
Recommended fix: Same as /login — suppress sidebar on pre-auth routes at mobile
Acceptance: Form heading visible in first mobile viewport
```

### /admin/approvals

```
Route: /admin/approvals
Viewport: desktop 1440x900, mobile 390x844
Locale: EN, FR
Selector: [data-testid="locale-switcher"], .shell__header, nav[aria-label="Admin"]
Severity: OK
Evidence: approvals__desktop__en__viewport.png, approvals__mobile__fr__viewport.png — UXDR-002 acceptance met;
  locale switcher in header, aria-pressed correct, aria-current="page" on Approvals nav link.
  Mobile: sidebar+main stack correctly (no overflow); page heading visible after sidebar scroll.
Recommended fix: —
Acceptance: GO for UXDR-002 scope
```

### /admin/audit

```
Route: /admin/audit
Viewport: desktop 1440x900
Locale: FR
Selector: td (Action column)
Severity: minor
Evidence: audit__desktop__fr__viewport.png — raw action strings (settings.changed, roles.changed, update.preflight_requested)
Recommended fix: Humanize or i18n-translate audit action codes
Acceptance: Action column shows human-readable labels in active locale
```

### /admin/crm/leads

```
Route: /admin/crm/leads
Viewport: desktop 1440x900
Locale: EN, FR
Selector: section.page
Severity: major (token)
Evidence: Code audit — scoped style uses --sent-* tokens (undefined). Visual output relies on fallback/default browser styles.
Recommended fix: Migrate scoped CSS to --st-* tokens; remove scoped .page redeclaration
Acceptance: --sent- references removed; visual output matches ThemeProvider baseline
```

### /admin/crm/companies

```
Route: /admin/crm/companies
Viewport: desktop 1440x900
Locale: EN
Selector: .page__item (company card)
Severity: minor
Evidence: crm-companies__desktop__en__viewport.png — company card shows "WEBSITE" as an uppercase label preceding the URL ("WEBSITE / https://example.com"). This appears to be a raw field name rendered without a corresponding i18n label or visually distinct separator.
Recommended fix: Render website URL with a link icon or lowercase "Website:" prefix rather than all-caps raw field name
Acceptance: Website field renders as a clickable hyperlink or labeled field, not uppercase raw string
```

```
Route: /admin/crm/companies
Viewport: desktop 1440x900
Locale: EN, FR
Selector: section.page style block
Severity: major (token)
Evidence: Code audit — scoped style uses --sent-* tokens
Recommended fix: Migrate to --st-* tokens
Acceptance: Zero --sent- references
```

### /admin/crm/contacts

```
Route: /admin/crm/contacts
Viewport: desktop 1440x900
Locale: EN
Selector: .page__item (contact card)
Severity: minor
Evidence: crm-contacts__desktop__en__viewport.png — contact card shows "EMAIL" as uppercase label preceding alice@example.com. Same pattern as Companies "WEBSITE" — raw uppercase field names exposed as visible labels.
Recommended fix: Same as Companies — use lowercase labeled or icon-based field display
Acceptance: Email field renders as a mailto: link or labeled field, not uppercase raw string
```

### /admin/crm/opportunities

```
Route: /admin/crm/opportunities
Viewport: desktop 1440x900
Locale: EN
Selector: input[name="companyId"]
Severity: major
Evidence: crm-opportunities__desktop__en__viewport.png — "Company ID" is a free-text UUID input
Recommended fix: Replace with company name picker / select
Acceptance: Company selected by name, UUID resolved internally
```

```
Route: /admin/crm/opportunities
Viewport: desktop 1440x900
Locale: EN
Selector: .page__lose-form input[name="lossReason"]
Severity: minor
Evidence: crm-opportunities__desktop__en__viewport.png — "Loss reason" input placeholder text ("Loss reason") is not localized — uses raw EN string, not i18n key. In FR locale the placeholder remains "Loss reason" (EN).
Recommended fix: Replace hardcoded placeholder with t(locale, "crm.opportunities.field.lossReason") or an appropriate i18n key
Acceptance: Loss reason placeholder resolves in both FR and EN
```

### /admin/crm/opportunities/demo-op-1

```
Route: /admin/crm/opportunities/demo-op-1
Viewport: desktop 1440x900
Locale: EN, FR
Selector: .page__meta-grid th or equivalent
Severity: major
Evidence: crm-opportunity-detail__desktop__en__viewport.png — STATUS, STAGE, EXPECTED VALUE shown as uppercase raw labels
Recommended fix: Replace with i18n keys: crm.opportunities.field.status, crm.opportunities.field.stage, crm.opportunities.field.expectedValue
Acceptance: Metadata labels localized in both FR and EN
```

### /admin/project/projects

```
Route: /admin/project/projects
Viewport: desktop 1440x900
Locale: FR
Selector: section.page
Severity: major (token)
Evidence: Code audit — --sent-* tokens
Recommended fix: Migrate to --st-* tokens
Acceptance: Zero --sent- references
```

### /admin/project/projects/demo-pr-1

```
Route: /admin/project/projects/demo-pr-1
Viewport: desktop 1440x900
Locale: EN
Selector: task list row, time entry row
Severity: major
Evidence: project-project-detail__desktop__en__viewport.png — "Mark doneDelete" and "ApproveDelete" run together without spacing
Recommended fix: Add flex gap between action buttons in task/time entry row template
Acceptance: Action labels render as distinct separated buttons
```

```
Route: /admin/project/projects/demo-pr-1
Viewport: desktop 1440x900
Locale: EN, FR
Selector: .page (detail page) style block
Severity: major (token)
Evidence: Code audit — --sent-* tokens
Recommended fix: Migrate to --st-* tokens
Acceptance: Zero --sent- references
```

### /admin/project/rates

```
Route: /admin/project/rates
Viewport: desktop 1440x900
Locale: EN, FR
Selector: section.page
Severity: major (token)
Evidence: Code audit — --sent-* tokens
Recommended fix: Migrate to --st-* tokens
Acceptance: Zero --sent- references
```

### /admin/billing/invoices

```
Route: /admin/billing/invoices
Viewport: desktop 1440x900
Locale: EN
Selector: .billing-invoices__fromProposal legend
Severity: minor
Evidence: billing-invoices__desktop__en__viewport.png — form label "Convert from approved proposal" is EN; placeholder "Proposal ID" is not localized (same in FR). In FR the form legend reads "Convertir depuis une proposition approuvee" (correct) but the field label placeholder stays "Proposal ID".
Recommended fix: Check placeholder string uses i18n key
Acceptance: Proposal ID field placeholder renders in active locale
```

### /admin/billing/invoices/demo-inv-1

```
Route: /admin/billing/invoices/demo-inv-1
Viewport: desktop 1440x900
Locale: FR
Selector: .back-link
Severity: minor
Evidence: billing-invoice-detail__desktop__fr__viewport.png — "Retour a la liste" link at top, above h1, as inline blue link. Other detail pages (opportunity, project) place this link in the top-right of the page__header area.
Recommended fix: Align back-link pattern across detail pages
Acceptance: Back-link position and style consistent across all detail routes
```

### /admin/billing/taxes

```
Route: /admin/billing/taxes
Viewport: desktop 1440x900
Locale: EN, FR
Selector: section.page
Severity: major (token)
Evidence: Code audit — --sent-* tokens
Recommended fix: Migrate to --st-* tokens
Acceptance: Zero --sent- references
```

### /admin/billing/accounting

```
Route: /admin/billing/accounting
Viewport: mobile 390x844
Locale: EN, FR
Selector: table.data-table[data-testid="journal-entries-table"]
Severity: blocker
Evidence: billing-accounting__mobile__en__full.png — documentDelta=221; table columns overflow viewport; Date+Reference columns collapse/merge; content illegible
Recommended fix: Wrap table in overflow-x: auto container; remove white-space: nowrap from entry-description at mobile
Acceptance: documentDelta <= 1 at 390x844 in both locales (automated check passes)
```

```
Route: /admin/billing/accounting
Viewport: all
Locale: all
Selector: section.page <style> block
Severity: blocker (token namespace)
Evidence: Code audit — uses --color-text-secondary, --color-border-subtle, --color-bg-subtle, --color-surface-hover, --font-size-sm, --font-weight-medium, --space-100/200/300/400 — none are defined by @sentropic/design-system-tokens. Third incompatible namespace alongside --sent-* in other pages and --st-* in shell.
Recommended fix: Migrate to --st-* tokens; also note this page uses flex+custom rather than the shared .page global class pattern
Acceptance: Zero --color- and --space- references; visual output matches ThemeProvider baseline
```

---

## Cross-Route Observations (for synthesis agent)

1. **Sidebar IA — flat 14-item list**: The sidebar currently exposes 14 flat items: Leads, Companies, Contacts, Opportunities, Projects, Rates, Invoices, Taxes, Accounting, Users, Roles, Approvals, Audit, Settings. This is a notable IA observation — no grouping by module (CRM / Project / Billing / Admin). As the product grows, this will become progressively harder to scan. No UXDR exists for sidebar grouping. Forwarded to synthesis agent for eventual IA decision.

2. **Token namespace divergence — three namespaces in use**: `--st-*` (shell, approvals), `--sent-*` (most CRM/project/billing pages), `--color-*`/`--space-*` (accounting). All three resolve to browser defaults. Visual regression risk is high as ThemeProvider token values diverge from hardcoded fallbacks. A token migration workpackage is needed.

3. **Card + inline-form pattern not always consistent**: Leads uses a single-row inline form inside a Card for capture (good). Invoices uses a partial form (Convert from proposal) without all fields. Companies uses a multi-column grid form. The pattern is coherent but the number of columns (auto-fill, minmax(220px, 1fr)) behaves differently at mid-width breakpoints — at ~760px some forms show 2 columns, others 1. Not a blocker but worth a responsive form review.

4. **"Demo data" badge position inconsistent**: Approvals shows "Demo data" in the top-right of the page__header area (as a Tag). Audit shows "Demo data" in the same position plus an "Export" button. Several CRM/billing pages also show "Demo data" in the top-right. This is consistent. Invoice detail shows "Demo data ← Back to list" in the same row — the back link and demo badge share a row, which is the deviation (see F-08).

5. **Opportunity detail inactive on mobile sidebar**: The opportunity detail mobile screenshot (`crm-opportunity-detail__mobile__fr__viewport.png`) shows `aria-current="page"` on "Opportunites" in the sidebar — correct. But no action buttons render on the detail page (only metadata + timeline). The list page has actions (Advance, Win, Lose, Delete) but the detail page shows no actions. Intentional? If the detail page is read-only in demo mode, an explicit "No actions in demo mode" callout would improve clarity.

---

## Screenshot Index

All screenshots at `tmp/uxr-shots/`. Format: `{route-name}__{viewport}__{locale}__{type}.png`

Key screenshots referenced in this report:
- `login__mobile__en__viewport.png` — F-01 evidence
- `login__mobile__fr__viewport.png` — F-01 evidence
- `register-passkey__mobile__en__viewport.png` — F-01 evidence
- `billing-accounting__mobile__en__full.png` — F-03 evidence (full-page scroll showing overflow)
- `billing-accounting__mobile__fr__viewport.png` — F-03 evidence
- `crm-opportunities__desktop__en__viewport.png` — F-05 Company ID field
- `crm-opportunity-detail__desktop__en__viewport.png` — F-06 uppercase labels
- `project-project-detail__desktop__en__viewport.png` — F-07 concatenated button labels
- `billing-invoice-detail__desktop__fr__viewport.png` — F-08 back-link position
- `audit__desktop__fr__viewport.png` — F-09 raw action codes
- `approvals__desktop__en__viewport.png` — F-11 UXDR-002 acceptance confirmed
- `login__desktop__en__viewport.png` — F-04 admin nav on pre-auth route
- `findings.json` — machine-readable check results (696 checks, 2 automated issues)
