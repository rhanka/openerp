# CRM Customer Follow-Up Agent

## Evidence

- Internal OpenERP reference: `docs/study/06-functional-map/agentic-functional-map.md`, section "Customer Follow-Up Agent", used as functional reference for outcome, trigger, tools, supervision, and human handoff.
- Internal OpenERP dated research: `docs/study/12-agentic/agents-by-use-case.md`, section "Customer Follow-Up Drafting", checked 2026-05-11. OpenAI Agents SDK (MIT, checked 2026-05-11), Vercel AI SDK (Apache-2.0, checked 2026-05-11), and Helicone (Apache-2.0, checked 2026-05-11) are functional references only for handoff, streaming, and observability.
- Public benchmark only: Sierra agents-as-a-service article 2024; Decagon Series B note 2024; HubSpot Breeze customer agent company note 2025. These sources validate customer-facing agent demand without authorizing copy of support scripts or product expression.

## Business Outcome

The agent improves response consistency across CRM, project, billing, and service history. It helps sales and account owners prepare timely customer follow-ups, reduce missed renewal or opportunity actions, and keep customer communication grounded in the current OpenERP record.

## Agent Mode

Primary mode is conversational: a user launches the agent from a customer, opportunity, or activity timeline and reviews the draft before send. Autonomous event-driven or scheduled mode is allowed for internal reminders when activity is overdue, a renewal date approaches, or a customer reply is waiting. Workflow-typed mode applies when a renewal or escalation process requires a draft follow-up at a defined gate.

## Trigger

Triggers include lead or opportunity inactivity, stage change, overdue activity, upcoming renewal, customer email needing a reply, meeting note saved to a timeline, or manual user request for a draft response.

## Tools Required (Concept Level)

- CRM account, contact, lead, opportunity, and activity reader contracts.
- Customer timeline reader covering recent emails, notes, decisions, quotes, projects, invoices, and open tasks.
- Message draft contract for email or portal reply creation in pending-review state.
- Activity creation contract for next step, owner, due date, and reminder.
- Language and tone preference contract attached to customer and tenant settings.
- Internal notification, escalation, and audit event contracts.
- Policy check contract for customer-visible send, attachment inclusion, and sensitive finance references.

## Supervision And Human Handoff

Customer-facing messages always require a human send action unless a tenant has approved a narrow acknowledgement pattern. The sales lead, project manager, finance user, or account owner edits the draft, confirms attachments and recipients, and owns the customer relationship. Autonomous reminders are internal only and must link back to the object that triggered them.

## Bilingual FR EN Requirements

The agent must draft in the customer's preferred language, with French and English variants available when the preferred language is absent. It must preserve customer names, date formats, currency, tax terms, and regional wording from the underlying object. Internal rationale and audit notes must remain readable in both French and English for later review.

## Success Metrics

- Follow-up latency after trigger.
- Overdue activity count.
- Accepted draft rate after human review.
- Renewal touch completion before target date.
- Customer response rate after approved follow-up.
- Language correction volume during human review.

## Risks

- A polished draft can overstate commitments, delivery dates, payment status, or commercial terms.
- Pulling context from multiple modules can expose information beyond the recipient's need.
- Customer tone can drift if tenant style and preferred language are not explicit.
- Reminder automation can create alert fatigue for sales teams.
- Public benchmarks often include distinctive service wording that must not be mirrored.

## Anti-Copy Notes

No vendor reply template, customer service script, agent persona, prompt text, demo conversation, screenshot, escalation wording, or portal UI expression may be reused. OpenERP drafts must be generated from OpenERP object facts, tenant communication rules, and bilingual requirements. External products are public benchmarks only.

## OpenERP Takeaways

- Start with human-reviewed drafts and internal reminders; sending remains a human act.
- Tie every suggestion to a customer object and visible source context.
- Use this agent as a bridge between CRM and project delivery, especially for renewal and open-action follow-up.
- Bilingual output quality is part of the core product surface, not a later translation layer.
