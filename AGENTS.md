# AI Assistant Bootstrap

Read `rules/MASTER.md` before any repo action. It is the consolidated project contract.

## Mandatory read order
1. `rules/MASTER.md` - always
2. `rules/testing.md` - when adding, fixing, or validating tests
3. `rules/ui-review.md` - when touching or reviewing `apps/web`
4. `.claude/skills/openerp-ux-decision/SKILL.md` - before any UI/UX/product decision or user arbitration
5. `rules/ux-decisions.md` - when checking or changing an existing UX decision
6. `.claude/skills/*/SKILL.md` - when the task matches a local skill trigger

## Quick reference
- Keep scratch artifacts in `./tmp/`, not `/tmp`.
- Use repo scripts and focused commands first; broaden verification before completion.
- UI must use `@sentropic/design-system-*` primitives and tokens.
- Demo Slice UI checks must include Playwright and a reviewer-style snapshot pass.
- UX decisions require the MASTER UX Decision Gate and 2/3-agent orientation before arbitration.
- Progress reports use `Fait / Publication / A faire / Attendus`; `Attendus` must include actionable preconisations.
