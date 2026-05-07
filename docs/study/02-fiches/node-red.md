# Node-RED

## Progress

Fait: Fiche automation candidate completed from GitHub metadata, checked default-branch commit, Apache-2.0 license endpoint evidence, editor/runtime/registry/admin path evidence, localization evidence, test evidence, and release metadata; fiche phase is 27/27 fiches, 100% complete after this sub-batch.
À faire: Shortlist decision, workflow-engine fit review, Graphify execution, and original integration/automation specs are not started; downstream workflow automation study remains 0% complete.
Attendu: Keep Node-RED as the main permissive low-code workflow automation reference, but decide later whether to embed, integrate, or implement a smaller native automation builder.

## Identity

- Project: Node-RED.
- Repository: https://github.com/node-red/node-red.
- Primary site: http://nodered.org.
- Date checked: 2026-05-06.
- Checked ref: `master` branch at commit `55e6cc9fbc74cd50526b76269aabe78cc16fdcf2`, reported as default branch by `gh repo view node-red/node-red`.
- Repository metadata evidence: `gh repo view node-red/node-red --json nameWithOwner,url,defaultBranchRef,licenseInfo,description,homepageUrl,latestRelease,updatedAt,stargazerCount,primaryLanguage,languages` returned description "Low-code programming for event-driven applications", homepage `http://nodered.org`, latest release `4.1.9: Maintenance Release` published 2026-05-06, licenseInfo Apache-2.0, primary language JavaScript, and updatedAt `2026-05-06T15:27:55Z`.
- Functional evidence paths: `LICENSE`, `README.md`, `package.json`, `packages/node_modules/@node-red/editor-api`, `packages/node_modules/@node-red/editor-client`, `packages/node_modules/@node-red/runtime`, `packages/node_modules/@node-red/registry`, `packages/node_modules/@node-red/nodes`, `packages/node_modules/@node-red/util`, `packages/node_modules/node-red`, `test/unit/@node-red/editor-api`, `test/unit/@node-red/runtime`, `test/unit/@node-red/registry`, `test/nodes`, and editor localization files including `packages/node_modules/@node-red/editor-client/locales/en-US` and `packages/node_modules/@node-red/editor-client/locales/fr`.

## License

- Declared license: Apache-2.0.
- Evidence: `gh api repos/node-red/node-red/license` returned path `LICENSE` with SPDX `Apache-2.0`; GitHub metadata reports Apache License 2.0.
- Reuse classification: `usable`.
- Rationale: Apache-2.0 is compatible with a permissive strategy if notices, attribution, patent-license implications, and dependency licenses are handled. For an ERP product, prefer functional/interface inspiration or integration rather than copying the editor/runtime.

## Functional Coverage

- ERP/general suite rating: `Weak` to `Partial` for integration only. Evidence: Node-RED is a low-code event workflow platform, not an ERP suite.
- CRM rating: `Weak` to `Partial` for automation around external CRM data. Evidence: runtime, nodes, registry, and editor can support automations, but no first-party CRM module was verified.
- Accounting/invoicing/tax rating: `Weak` to `Partial` for automation around external accounting events. Evidence: event workflow and integration runtime can automate notifications, approvals, or syncs. Unknown rationale: no ledger, invoicing, tax, or statutory accounting module was verified.
- HR/time/leave/payroll rating: `Weak` to `Partial` for workflow automation. Evidence: Node-RED can model event-driven flows, but no HR/payroll transaction module was verified.
- Services/subscriptions/projects rating: `Partial` for integration and process automation. Evidence: flow editor, runtime, registry, admin API, local filesystem storage, projects, and plugins can support service workflows and automations. Unknown rationale: no project or subscription business module was verified.
- MRP/MES/WMS/maintenance/quality rating: `Partial` for shop-floor/integration automation only. Evidence: event-driven flows, nodes, runtime, plugins, registry, and editor can connect systems and devices. Unknown rationale: no native MES/WMS/EAM/quality module was verified.

## Architecture And Operations

- Stack: JavaScript/Node.js monorepo with editor API, browser editor client, runtime, registry, nodes, utilities, CLI package, extensive unit tests, and localization files. Evidence: repository metadata primary language JavaScript and `packages/node_modules/@node-red/*` paths.
- SaaS/self-hosted/Kubernetes relevance: `Partial`. Evidence: Node.js runtime and package distribution support self-hosting, and repository scripts reference Docker update automation. Unknown rationale: first-party Kubernetes/Helm deployment and our target self-hosted update policy were not audited.
- API/integration maturity: `Strong`. Evidence: editor/admin APIs for flows, nodes, plugins, settings, diagnostics, auth, projects, SSH keys, library, runtime flows, registry installer/loader, and broad test coverage.
- Internationalization/localization: `Strong` for editor localization. Evidence: editor-client locale files include `en-US` and `fr`, plus other languages.
- Quebec/Canada relevance: `Weak`. Evidence checked: no Quebec/Canada statutory accounting, tax, HR, or payroll support was identified. Workflow automation can orchestrate local systems but does not implement compliance.
- UX and product quality: `Strong` for low-code workflow editing. Evidence: editor-client paths include workspaces, palette, deploy controls, node editor, sidebar, diagnostics, search, plugin UI, projects, keyboard actions, and tests. Unknown rationale: no hands-on UI or accessibility audit was performed.

## Risks

- License risk: `Low` to `Medium`. Apache-2.0 is favorable, but dependency and node-plugin licenses need review for distribution.
- Anti-copy risk: `Medium` to `High`. Do not copy editor UX, flow JSON conventions, node palettes, icons/assets, docs, examples, registry behavior, or runtime internals into an original ERP automation builder.
- Maintenance risk: `Strong`. Evidence: latest release `4.1.9` was published on 2026-05-06 and repository metadata updated on 2026-05-06.
- Security risk: `Partial` to `High`. Evidence: workflow runtime, credentials, auth, plugins, external modules, admin APIs, storage, projects, and arbitrary integration nodes can execute or move sensitive data. Unknown rationale: no advisory, sandboxing, credential handling, or tenancy audit was performed.
- Dependency risk: `High`. Evidence: Node.js monorepo, editor browser dependencies, runtime plugins, registry/external modules, and integration nodes create a broad dependency surface.

## Graphify Eligibility

- Graphify target: conditional.
- Modules/plugins to inspect: `packages/node_modules/@node-red/editor-api`, `packages/node_modules/@node-red/editor-client/src/js`, `packages/node_modules/@node-red/runtime`, `packages/node_modules/@node-red/registry`, `packages/node_modules/@node-red/nodes`, `packages/node_modules/@node-red/util`, and `test/unit/@node-red`.
- Reason: Node-RED can inform the ERP automation/integration layer. Graphify should support an embed/integrate/rewrite decision and original workflow specs.
