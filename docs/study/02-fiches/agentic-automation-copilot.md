# Automation Copilot Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Typed Automation Copilot to a conversational assistant inside typed automation configuration with workflow-typed validation before activation. It cites Zapier Agents (2024 beta launch noted), Workato AI (2025-08-19), and UiPath agents (2024-10). Proprietary entries are public benchmark only.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines Automation Exception Agent and cross-family multi-tool orchestration as OpenERP workflow-aware surfaces. This is OpenERP-written functional reference.
- MVP boundary: `docs/study/10-mvp-specs/reporting-automation.md`, checked 2026-05-11, defines typed triggers, typed actions, workflow runs, activation controls, webhook delivery, and non-goals excluding arbitrary code and generic visual flow programming.

## Business Outcome

Help administrators and managers configure safe typed automations faster while keeping actions inside an approved trigger and action catalog. The agent should translate business intent into a reviewable OpenERP workflow proposal and expose permission, object, and side-effect checks before activation.

## Agent Mode

Conversational inside the automation configuration flow. Workflow-typed for validation, activation review, and run diagnostics. Autonomous mode is limited to detecting failed or delayed runs and creating internal notifications.

## Trigger

- Admin opens automation creation or edit flow.
- Manager describes an intended business rule.
- Workflow activation requested.
- Workflow run failed or validation failed.
- Import, webhook, or scheduled job issue requires diagnosis.

## Tools Required (Concept Level)

- Typed trigger catalog reader contract.
- Typed action catalog reader contract.
- Permission and actor-scope validator contract.
- Workflow proposal writer contract for draft definitions only.
- Workflow validation and activation review contract.
- Workflow run log reader, retry proposal, task creation, notification, and audit event contracts.

## Supervision And Human Handoff

The agent can draft a workflow proposal, explain validation failures, and suggest non-destructive next actions. Activation requires an authorized admin or manager. Actions with external side effects, webhook delivery, export scheduling, or changes beyond the creator's scope require explicit approval and audit.

## Bilingual FR EN Requirements

Trigger labels, action labels, validation messages, run explanations, and activation confirmations must be available in French and English. The user interface language controls displayed guidance, while event names and audit identifiers remain stable.

## Success Metrics

- Workflow setup time.
- Activation validation failure count.
- Repeat workflow failure count.
- Mean time to diagnosis for failed runs.
- Admin intervention time.

## Risks

- Encouraging workflows that exceed the user's permission scope.
- Creating broad automation that sends data to the wrong recipient or webhook.
- Masking side effects behind conversational wording.
- Drifting toward arbitrary code execution or generic visual programming.
- Reusing external automation recipe patterns instead of typed OpenERP actions.

## Anti-Copy Notes

Do not reuse automation recipe libraries, node palettes, builder UI, integration directory labels, workflow examples, prompts, schemas, screenshots, policy syntax, sandbox configuration, or external interop catalog naming from automation platforms. OpenERP must keep its own typed trigger/action vocabulary and validation language.

## OpenERP Takeaways

This agent should be positioned as a constrained configuration assistant, not as open-ended agent authoring. Its MVP-safe path is draft proposal, permission validation, explicit activation, and clear run diagnostics.
