# Graphify Anchor Synthesis: Reporting BI And Automation

## Progress

Fait: Four useful Graphify runs are completed for reporting/automation anchors: two Superset AST runs and two Node-RED AST runs.
À faire: Fold reporting and automation findings into the global functional spec, MVP scope, and anti-copy dossier; overall study is about 96% complete.
Attendu: Stop expanding wave A clones for now and write the consolidated product specification, because the core ERP/CRM/HR/finance/manufacturing/reporting/automation evidence is now broad enough.

## Coverage

| Project | Main Structural Signal |
| --- | --- |
| Superset | Advanced BI backend and dashboard/explore frontend: databases, datasets, datasources, charts, dashboards, filters, row-level security, report scheduling, exports, and authoring permissions. |
| Node-RED | Automation runtime and flow editor: flows, subflows, groups, node registry, context, property evaluation, project storage, Git operations, canvas editing, palette, import/export, deployment, and built-in nodes. |

## Findings

- Superset is not an ERP reporting module; it is a full BI platform. The ERP should define operational reporting natively, then integrate or embed advanced BI for customers that need deeper analytics.
- Node-RED is not just a workflow feature; it is a general-purpose automation platform. The ERP should start with domain-safe workflow automation, then consider optional integration for advanced flow use cases.
- Both projects show that reporting and automation become platform services quickly: security, tenancy, credentials, permissions, extension/plugin policy, exports, scheduled jobs, and deployment governance are not optional details.
- Apache-2.0 is favorable compared with AGPL/GPL anchors, but implementation copying remains unnecessary and risky for an original MIT product.

## Product Architecture Implications

- Native reporting should own ERP-aware reports, saved views, dashboard widgets, scheduled exports, audit trails, and role-aware filters.
- Advanced BI should be a separate adapter boundary: Superset-compatible embedding or connector support, not a full clone inside the ERP MVP.
- Native automation should begin with typed triggers and typed actions over ERP entities, with approvals, notifications, sync jobs, scheduled tasks, and webhook calls.
- Generic flow building should be optional and isolated from the ERP core, with strict credential handling, plugin governance, audit logs, and execution limits.
- For self-hosted Kubernetes, BI and automation services should have explicit update, backup, secret rotation, and version-support policies.

## Anti-Copy Notes

- Do not copy Superset code, chart/dashboard schemas, dashboard grid behavior, SQL Lab behavior, report templates, API shapes, import/export YAML, UI text, or permission naming.
- Do not copy Node-RED code, flow JSON, node APIs, palette metadata, canvas behavior, built-in node behavior, credentials UI, examples, shortcut behavior, or docs.
- Keep future Svelte/TypeScript UX original: ERP reports and automations should follow our entity model, permission model, audit model, and bilingual FR/EN terminology.

## Next Spec Work

- Global functional map across CRM, sales, project/service delivery, accounting, billing, HR/time/payroll, inventory, manufacturing/WMS, reporting, and automation.
- MVP recommendation for service companies first, with manufacturing packs separated from the core.
- Legal/anti-copy dossier per anchor, separating permissive integration candidates from functional-only references.
- Canada/Quebec statutory research for accounting, payroll, taxes, leaves, remittances, and required records.
