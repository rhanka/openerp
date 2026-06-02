# Reporting & Automation UX Review — 2026-05-31

Three-pass review: UI reviewer findings, best-practices, synthesis.
Remediation backlog applied in this commit; deferred items noted.

---

## Pass 1 — UI reviewer findings (implemented code, May 2026)

### Correctness (P0)

**P0-01 rotateSecret: no confirm guard**
`/admin/reporting/webhooks/+page.svelte` ~207: the `?/rotateSecret` form lacked an `onsubmit` confirm guard identical to the delete form. A mis-click would silently rotate the secret, instantly breaking all live integrations.

**P0-02 unreachable rotateSecret reveal branch**
Both `create` and `rotateSecret` server actions returned `{ ok, signingSecret }`, making the svelte title discriminator (`"signingSecret" in form`) always resolve to the "created" title. The rotated-secret reveal title was unreachable.

**P0-03 inactive tags mislabelled "Active"**
`workflows/+page.svelte` ~201-204 and `webhooks/+page.svelte` ~190-193: the inactive `{:else}` branch rendered `t(locale, "workflow.field.isActive")` / `t(locale, "webhook.field.isActive")`, which resolves to "Active" in both locales. Inactive items displayed "Active".

**P0-04 eventTypes multiselect: no required, raw validation code shown**
The event-types `<select multiple>` had no `required` attribute, and the `EVENT_TYPES_REQUIRED` validation failure surfaced the raw code string to the user with no translation.

### i18n / DS token (P1)

**P1-01** `webhooks/+page.svelte` ~242: hardcoded `"Payload + signature"` string in delivery details.

**P1-02** `dashboards/[id]/+page.svelte` ~92: hardcoded `"Error"` in the widget error Tag.

**P1-03** `dashboards/[id]/+page.svelte` ~250: `color: var(--st-semantic-text-danger, red)` — the `--st-semantic-text-danger` token does not exist in the design-system theme (forge, entropic, sent-tech); the fallback `red` was always used. The correct DS danger-text token is `--st-semantic-feedback-error`.

**P1-04 "Shared with team" tag on workflows + webhooks**
`workflow.field.isShared` resolves to "Shared with team" in EN, too long for a compact tag. Mirrored `scheduledDeliveries.tag.shared` = "Shared" was not used.

**P1-05 FR nav collision**
`nav.reportDefinitions` FR = "Rapports" collides with `nav.section.reporting` FR = "Rapports". Both visible simultaneously in the nav, indistinguishable.

### a11y / run-state / money (P2)

**P2-01 tables: missing th scope + accessible name**
`report-definitions/+page.svelte` and `dashboards/[id]/+page.svelte` results tables had no `scope="col"` on `<th>` and no `aria-label` or `<caption>` on `<table>`.

**P2-02 native `<select>` → DS Select/MultiSelect migration**
Raw `<select>` elements used instead of `@sentropic/design-system-svelte` `Select`/`MultiSelect`. Deferred — separate slice per instructions.

**P2-03 run-state: no feedback on failed or zero-row runs**
`report-definitions/+page.svelte` ~212: the result section only rendered on `status === 'completed' && resultColumns.length > 0`. A failed run showed nothing; a completed-with-zero-rows run showed nothing.

**P2-04 money cells: no currency context**
Cells with `dataType === "money"` formatted as `(minor / 100).toFixed(2)` without currency code. The billing reports expose a `currency` column; `Intl.NumberFormat` was not used.

### a11y/UX additive (P3)

**P3-01 secret reveal: no clipboard copy, weak "not shown again" wording**
The one-time signing secret was shown in a `<code>` block with no copy button, and the title was tersely worded ("copy now — not shown again") without making clear what happens after navigation.

---

## Pass 2 — Best-practices (industry standard, 2026)

- **Destructive confirm guards**: Industry standard (Stripe, Linear, GitHub) is to guard irreversible server-side actions (rotate secret, hard delete) with a confirmation dialog. In SvelteKit `use:enhance` forms, the standard pattern is `onsubmit={(e) => { if (!confirm(...)) e.preventDefault(); }}`.
- **One-time secret reveal**: Stripe, GitHub, and Cloudflare all show a copy-to-clipboard button alongside one-time credentials, with explicit "this will not be shown again" language and a warning tone.
- **Status tags**: ERP and SaaS platforms (Salesforce, HubSpot, Linear) use compact labels ("Active", "Inactive", "Shared") not long field labels ("Shared with team", "Active") in list-view tags.
- **a11y table headers**: WCAG 2.1 SC 1.3.1 requires `scope` on `<th>` and an accessible name on data tables (via `<caption>` or `aria-label`).
- **Intl.NumberFormat for money**: Best practice is to always render monetary values with currency symbol/code using the locale's `Intl.NumberFormat` when a currency is available.
- **i18n nav labels**: Identical nav labels in the same section create ambiguity for screen reader and keyboard users as well as visual users. Unique labels are required.

---

## Pass 3 — Synthesis

### Nav grouping: UXDR-007 (deferred, see below)

The review raised the question of splitting the Reporting section into "Reporting" (Saved views, Reports, Dashboards, Scheduled deliveries) and "Automation" (Workflows, Webhooks). After arbitration, the single "Reporting" section (6 items) is kept. The split is NO-GO now (see UXDR-007).

### Remediation status

| Item | Status | Notes |
|------|--------|-------|
| P0-01 rotate-secret confirm guard | **APPLIED** | onsubmit guard + i18n key |
| P0-02 rotateSecret reveal title | **APPLIED** | `rotated: true` discriminator |
| P0-03 inactive tags mislabelled | **APPLIED** | dedicated active/inactive/shared keys |
| P0-04 eventTypes required + translated validation | **APPLIED** | required + errorCodeMessage mapping |
| P1-01 hardcoded payload label | **APPLIED** | `webhook.deliveries.payload` key |
| P1-02 hardcoded Error tag | **APPLIED** | `reporting.dashboards.widget.error` key |
| P1-03 raw `red` fallback | **APPLIED** | `--st-semantic-feedback-error` token |
| P1-04 "Shared with team" tag | **APPLIED** | `workflow.tag.shared` / `webhook.tag.shared` |
| P1-05 FR nav collision | **APPLIED** | nav.reportDefinitions FR → "Rapports personnalisés" |
| P2-01 th scope + table accessible name | **APPLIED** | scope="col" + aria-label on tables |
| P2-02 native select → DS Select/MultiSelect | **DEFERRED** | Separate slice |
| P2-03 failed/zero-row run states | **APPLIED** | Alert + EmptyState branches |
| P2-04 money with currency | **APPLIED** | Intl.NumberFormat when currency column present |
| P3-01 clipboard copy + "not shown again" | **APPLIED** | Copy button + strengthened title wording |
| UXDR-007 nav split | **DEFERRED** | See UXDR-007 in rules/ux-decisions.md |

---

*Review date: 2026-05-31. Remediation commit: fix(reporting) — UX remediation.*
