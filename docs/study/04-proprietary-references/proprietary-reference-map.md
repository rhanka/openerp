# Proprietary Public Reference Map

## Progress

Fait: Public proprietary benchmark references are mapped by domain from official product pages checked on 2026-05-06; these references are separated from the open-source corpus and are not reuse sources.
À faire: Run hands-on UX review only if accounts/trials are intentionally created later, gather statutory Canada/Quebec sources, and reconcile these benchmarks with Graphify outputs; overall study is about 70% complete.
Attendu: Use this map as product-positioning and requirements context only, then continue with Graphify wave A because open-source structural evidence is the next blocker.

## Boundary

- These products are proprietary references only. Do not copy code, UI, documentation text, screenshots, icons, data models, demo data, workflows expressed in product-specific language, pricing tables, or help-center structures.
- Public pages can inform market expectations, product packaging, onboarding patterns, localization gaps, and feature vocabulary at a generic level.
- For Canada/Quebec payroll, tax, and employment compliance, official statutory sources must be used in a later compliance pack. Vendor pages are only product benchmarks.

## Finance, Accounting, Payroll

| Reference | Public Signals To Benchmark | Product Implication |
| --- | --- | --- |
| QuickBooks Canada | Canadian small-business accounting, payroll, time tracking, payments, inventory, federal/provincial tax language, GST/HST reporting language, and app integrations. Source: https://quickbooks.intuit.com/ca/ | Treat QuickBooks as the main Canada small-business accounting/payroll UX benchmark. Do not infer Quebec payroll completeness without statutory validation. |
| Wave | Accounting, invoicing, estimates/deposits, payments, payroll, advisors, mobile app, and very small-business positioning. Source: https://www.waveapps.com/ and https://www.waveapps.com/payroll | Use for solopreneur and micro-business onboarding simplicity, invoice/payment flows, and low-friction finance UX. |
| Xero Canada | Accounting, bills, expenses, bank connections, invoicing, payroll app integrations, projects, reporting, and app-store ecosystem. Source: https://www.xero.com/ca/ and https://www.xero.com/ca/accounting-software/payroll/ | Use for app-ecosystem strategy and accounting-first UX. Xero Canada payroll appears integration-led, which supports keeping payroll connectors separate from local payroll engine early. |
| Zoho Books and Zoho Payroll Canada | Cloud accounting plus payroll integration that posts journal entries and exposes payroll reports. Sources: https://www.zoho.com/ca/books/ and https://www.zoho.com/en-ca/payroll/ | Use as a benchmark for suite integration between payroll, expenses, accounting journals, and reports. |
| Dayforce Powerpay | Canadian small-business payroll and HR benchmark, with CRA/RQ remittance language, year-end forms, HR records, onboarding, time off, and employee self-service. Sources: https://www.dayforce.com/ca/how-we-help/powerpay/pay-accurately-efficiently/payroll and https://www.dayforce.com/ca/how-we-help/powerpay/streamline-hr-and-empower-people/hr | Use as the most relevant Canada/Quebec payroll benchmark. Later requirements must be grounded in CRA, Revenu Quebec, CNESST, and employment-standard sources. |

## HR And Workforce

| Reference | Public Signals To Benchmark | Product Implication |
| --- | --- | --- |
| Workday GO | SMB/midsize HR, finance, payroll, and planning on one platform, with packaged implementation and AI positioning. Sources: https://www.workday.com/en-us/midsize-business.html and https://www.workday.com/en-us/midsize-business/financial-management-software.html | Use for upper-SMB/midsize positioning, unified HR-finance narrative, packaged onboarding, and implementation-scope language. |
| BambooHR Canada | HR data, hiring/onboarding, time and attendance, performance, compensation, integrations, and data-hosting/security claims for Canada-facing customers. Source: https://www.bamboohr.com/ca/ | Use for HRIS usability, employee self-service, reporting, onboarding, and HR workflow expectations. Payroll product details are US-focused on the public payroll page, so Canada payroll assumptions should not be imported. |
| Dayforce Powerpay HR | Canadian small-business HR records, time off, document storage, onboarding, and payroll integration. Source: https://www.dayforce.com/ca/how-we-help/powerpay/streamline-hr-and-empower-people/hr | Use for Canada-specific HR/payroll packaging and employee self-service patterns. |

## CRM And Go-To-Market

| Reference | Public Signals To Benchmark | Product Implication |
| --- | --- | --- |
| Salesforce Starter Suite | Small-business CRM combining leads, customers, support, marketing, commerce, Slack, AI, lead routing, sales flows, case management, and storefront/payments. Source: https://www.salesforce.com/small-business/starter/ | Use for CRM breadth, simple onboarding, AI-assist expectations, and connected sales/service/marketing packaging. |
| HubSpot CRM | Free CRM positioning for startups and small businesses, contacts, automation, sales/service/marketing platform, setup without IT, and app integrations. Source: https://www.hubspot.com/products/crm/small-business | Use for freemium/onboarding expectations and small-business CRM simplicity. |
| QuickBooks CRM-adjacent signals | QuickBooks Canada public FAQ mentions CRM tools and integrations with HubSpot/Salesforce. Source: https://quickbooks.intuit.com/ca/ | Use to validate that accounting-first SMB platforms increasingly expose customer-management surfaces, but keep full CRM in a dedicated module. |

## ERP, Operations, Manufacturing

| Reference | Public Signals To Benchmark | Product Implication |
| --- | --- | --- |
| Microsoft Dynamics 365 Business Central | SMB ERP for finance, sales/service, projects, supply chain, manufacturing/procurement, Copilot/agents, Microsoft 365 integration, languages/countries, marketplace extensions, and Power Automate. Source: https://www.microsoft.com/en-us/dynamics-365/products/business-central | Use for SMB ERP packaging, Microsoft-stack expectations, workflow automation, and extension marketplace strategy. |
| Oracle NetSuite ERP | Integrated cloud ERP for accounting, order management, inventory, supply chain, warehouse, procurement, CRM, HCM, PSA, analytics, platform customization, and internationalization. Source: https://www.netsuite.com/portal/products/erp.shtml | Use as upper-SMB/midsize suite benchmark. Avoid making NetSuite-like breadth a first MVP requirement. |
| Acumatica Manufacturing | Manufacturing ERP for discrete/process manufacturing, production planning, inventory control, supply chain, product definitions, revisions, material requirements, and resource utilization. Source: https://www.acumatica.com/industries/manufacturing/ | Use for manufacturing vertical packaging and the boundary between ERP, MRP, and operations execution. |
| Katana | Manufacturing and inventory management, BOM control, production scheduling, subcontracting, and real-time operational visibility. Source: https://katanamrp.com/use-cases/manufacturing/ | Use for small-manufacturer UX and the "production plus inventory" vertical pack. |
| MRPeasy | MRP for small manufacturers, production planning/reporting, inventory overview, purchasing, CRM, and ideal company size messaging. Source: https://www.mrpeasy.com/ | Use for small manufacturing scope discipline. This supports not overbuilding full MES before MRP/inventory basics. |

## BI, Reporting, Workflow Automation

| Reference | Public Signals To Benchmark | Product Implication |
| --- | --- | --- |
| Power BI | Data visualization, source-of-truth, embedding, Microsoft 365/Fabric integration, governance, AI-generated reports, and free/Pro/embedded packaging. Source: https://www.microsoft.com/en-us/power-platform/products/power-bi | Use for embedded BI expectations and governance model. Compare against Superset before deciding build vs integrate. |
| Tableau | Cloud and server analytics, visual exploration, governed analytics, AI/trusted-data positioning, and action-oriented analytics. Source: https://www.tableau.com/ | Use as a mature BI UX benchmark, not as a functional source. |
| Power Automate | Low-code cloud flows, desktop flows, process mining, connectors, Teams/SharePoint/email integrations, ALM, and admin/governance. Source: https://www.microsoft.com/en-us/power-platform/products/power-automate | Use for automation governance, connector strategy, and workflow builder expectations. Compare against Node-RED for self-hosted implementation. |
| Zapier | SMB automation, app integrations, no-code workflows, AI orchestration, tables/forms, and security positioning. Sources: https://zapier.com/smb and https://help.zapier.com/hc/en-us/articles/37518970271245-What-is-Zapier | Use for integration marketplace expectations and nontechnical workflow authoring. |

## Collaboration Benchmarks

### Notion

- Public reference role: Public collaboration benchmark for docs, lightweight databases, internal knowledge bases, projects, and AI-assisted team spaces.
- Capabilities to observe: Page hierarchy, database views, comments, mentions, sharing controls, connected docs, task surfaces, permissions, and AI writing assistance.
- What must not be reused: This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
- ERP/CRM relevance: Useful for ERP/CRM notes, customer/account workspaces, internal SOPs, task context, and structured team knowledge attached to operational records.
- Date checked: 2026-05-09.

### ClickUp

- Public reference role: Public collaboration benchmark for project execution, tasks, docs, whiteboards, goals, chat, automations, dashboards, and time tracking.
- Capabilities to observe: Task lists, custom fields, dependencies, comments, docs, whiteboards, views, notifications, automation triggers, dashboards, and workload visibility.
- What must not be reused: This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
- ERP/CRM relevance: Relevant to ERP/CRM implementation projects, sales follow-up tasks, service delivery work, approval queues, and operational task ownership.
- Date checked: 2026-05-09.

### Airtable

- Public reference role: Public collaboration benchmark for relational-style team databases, forms, interfaces, automations, and app-like business trackers.
- Capabilities to observe: Table views, linked records, field types, forms, interfaces, permissions, comments, automations, integrations, and lightweight operational apps.
- What must not be reused: This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
- ERP/CRM relevance: Relevant to configurable ERP/CRM objects, pipeline boards, inventory trackers, approval lists, customer research tables, and team-maintained operational data.
- Date checked: 2026-05-09.

### Monday.com

- Public reference role: Public collaboration benchmark for work management, CRM-adjacent boards, automations, forms, dashboards, and cross-team project operations.
- Capabilities to observe: Boards, columns, item updates, forms, timeline/calendar views, dashboards, automations, integrations, permissions, and status communication.
- What must not be reused: This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
- ERP/CRM relevance: Relevant to sales operations, customer onboarding, project delivery, procurement follow-up, issue tracking, and visual status surfaces around ERP/CRM records.
- Date checked: 2026-05-09.

### Asana

- Public reference role: Public collaboration benchmark for structured work management, team projects, goals, approvals, reporting views, and cross-functional coordination.
- Capabilities to observe: Projects, tasks, subtasks, dependencies, timelines, forms, approvals, comments, rules, portfolios, goals, and team workload views.
- What must not be reused: This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
- ERP/CRM relevance: Relevant to CRM handoffs, service delivery plans, implementation projects, internal approvals, customer success activities, and operational accountability.
- Date checked: 2026-05-09.

### Slack

- Public reference role: Public collaboration benchmark for channel-based messaging, searchable team communication, app integrations, huddles, canvases, and AI-assisted summaries.
- Capabilities to observe: Channels, threads, mentions, reactions, message search, shared channels, app actions, canvases, clips, huddles, notifications, and enterprise controls.
- What must not be reused: This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
- ERP/CRM relevance: Relevant to activity notifications, customer-room collaboration, internal support channels, approval alerts, incident discussion, and contextual messages around ERP/CRM events.
- Date checked: 2026-05-09.

### Microsoft Teams

- Public reference role: Public collaboration benchmark for Microsoft 365-connected chat, meetings, channels, files, apps, webinars, and enterprise communication.
- Capabilities to observe: Teams and channels, chats, meetings, file collaboration, tabs, app integrations, notifications, search, guest access, compliance controls, and Copilot surfaces.
- What must not be reused: This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
- ERP/CRM relevance: Relevant to Microsoft-stack customer environments, meeting-linked CRM notes, service channels, document collaboration, approval alerts, and ERP/CRM notifications in enterprise chat.
- Date checked: 2026-05-09.

## Product Positioning Implications

- The product should not be positioned as a clone of one incumbent. The viable opening is "open, self-hostable, service-company ERP/CRM with Canada-first accounting/HR path and optional manufacturing pack."
- Canada/Quebec is an opportunity because open-source coverage is thin. The compliance path should be explicit and evidence-backed rather than implied by generic localization.
- Payroll should start as HR/payroll data model and integration-ready accounting postings, then become a local payroll engine only after statutory analysis.
- Manufacturing should start with inventory, purchasing, BOM/MRP, production orders, and WMS-lite. Device control, AGV routing, and advanced MES can remain later vertical scope.
- BI and automation should be native enough for common workflows but architected for integration with Superset/Power BI-style reporting and Node-RED/Zapier/Power-Automate-style connectors.
