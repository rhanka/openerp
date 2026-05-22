---
name: openerp-live-e2e
description: Use when adding or fixing OpenERP browser workflows that cross apps/web, apps/api, seeded local data, or Playwright live validation.
---

# OpenERP Live E2E

## Trigger
Use for passkey, login, approvals, audit, locale, or any browser workflow where the UI calls the API.

## Procedure
1. Reproduce the issue against the running route or API endpoint.
2. Capture the failing layer: browser context, SvelteKit action/loader, API handler, service, repository, DB.
3. Add the smallest regression test:
   - API bug: focused Vitest first.
   - UI workflow: Playwright test.
   - Live DB/API needed: skip unless `OPENERP_API_URL`, `OPENERP_DEV_ORG_ID`, and `OPENERP_DEV_USER_ID` are set.
4. For live Playwright, create a unique fixture via API, drive the UI, attach a screenshot, then verify final state via API.
5. Run the focused test before broader checks.

## Commands
```bash
npm test -w @sentropic/openerp-api -- <pattern>
npm run test:e2e -w @sentropic/openerp-web -- --grep '<test name>'
```

## Review points
- Prefer `getByRole`, `getByLabel`, and `getByText`.
- Read `test-results/**/error-context.md` before changing assertions.
- Do not mask failures by increasing timeouts.
