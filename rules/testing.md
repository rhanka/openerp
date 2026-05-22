# Testing Rules

## Defaults
- Test behavior, not implementation details.
- Prefer role/label/text selectors; use CSS only for stable structural anchors.
- Use one focused failing test before production code for bugfixes.
- Keep live tests opt-in when they require local DB/API state.

## Commands
- API focused: `npm test -w @sentropic/openerp-api -- <pattern>`
- Web e2e focused: `npm run test:e2e -w @sentropic/openerp-web -- --grep '<name>'`
- Full API: `npm test -w @sentropic/openerp-api`
- Full web e2e: `npm run test:e2e -w @sentropic/openerp-web`

## Live Demo Slice env
Use live e2e only when these are set:

```text
OPENERP_API_URL=http://127.0.0.1:4000
OPENERP_DEV_ORG_ID=<seed org id>
OPENERP_DEV_USER_ID=<seed user id>
```

Live Playwright tests that mutate data must create their own fixture through the API and verify final state through the API.

## Playwright requirements
- Call `await page.waitForLoadState("domcontentloaded")` after navigation before assertions.
- Attach screenshots for live workflow tests that validate UI state.
- Do not increase timeouts until the root cause is understood.
- If a test fails, read `test-results/**/error-context.md` before changing code.
