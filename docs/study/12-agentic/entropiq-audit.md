# `@entropiq` Audit

## Progress

Fait: repository verified at `github.com/rhanka/entropiq` (HEAD `ab88a68`, 2026-05-09); license file retrieved and analyzed; top-level directory layout confirmed; declared capabilities cross-checked against user-supplied known facts and README; npm registry status confirmed as not yet published under any scoped name; all required sections written.
À faire: remaining Phase 1 artifacts (corpus update, proprietary references, startups deep research, license posture); Phase 1 completion at approximately 28%.
Attendu: no decision needed from the user at this step. The license finding below requires attention before any commercial deployment of OpenERP on top of this runtime; the user (who is also the copyright holder) should resolve that point during implementation planning. Next action is Task 3 (agentic open source corpus update), which is independent of this file.

## Purpose

This document records the current state of `@entropiq` — the user-owned TypeScript runtime that the OpenERP design specification (section 7 of `docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`) designates as the agent runtime base for the future product. The audit answers four questions: what exists today, what is missing relative to OpenERP needs, what license posture applies, and what constraints flow from those findings into the agentic extension. It is a factual record for Phase 1 of the study, not a recommendation to adopt or replace the runtime. That decision belongs to implementation planning.

## Evidence

The repository examined is `https://github.com/rhanka/entropiq`, owned by GitHub user `rhanka` (Fabien Antoine). It is public, unfurked, and written in TypeScript. The HEAD commit at the time of this audit is `ab88a68ab8e149885a4f1d5b5ef46901f739dc04`, merged on 2026-05-09. No release tags are present; the project has not yet cut a versioned release. No npm package is published under the name `@entropiq` or `entropiq`; the npm registry returns a `MethodNotAllowedError` for the scoped name and a `Not found` for the unscoped name, confirming that npm publication has not yet occurred as of this audit date.

The root workspace manifest (`package.json`) declares the monorepo name as `entropic-workspace` and a private flag, meaning no package in the workspace is currently intended for direct public consumption. The application server package (`api/package.json`) carries the name `top-ai-ideas-api` at version `0.1.0`. The README identifies the planned publishable packages as `@entropic/llm-mesh` (model access), `@entropic/chat` (chat surface), `@entropic/flow` (agentic workflow engine), and `@entropic/ui` (template layer), none of which are extracted yet. The extraction roadmap is tracked as branch sequence BR-14c → BR-14b → BR-14a in the project's `PLAN.md`.

The repository was created on 2025-09-30 and last pushed on 2026-05-10. The primary language is TypeScript. The GitHub API reports the license as `NOASSERTION`, indicating that GitHub's license detector did not classify the file as a standard SPDX identifier.

Top-level layout (overview only): configuration directories (`.claude`, `.cursor`, `.github`, `.security`, `.graphify`), application roots (`api/`, `ui/`), a `packages/` workspace for future extractions, a `plan/` directory for branch specifications, a `spec/` directory for functional specifications, and supporting files (`Makefile`, `README.md`, `README.fr.md`, `PLAN.md`, `AGENTS.md`, `CLAUDE.md`, `TRANSITION.md`). The `api/src/` tree contains a services layer with clearly separated concerns: `llm-runtime/`, `providers/` (five provider files: Claude, OpenAI, Gemini, Mistral, Cohere), a queue manager, chat and session services, tool orchestration, workflow state management, and streaming infrastructure.

## Declared License

The `LICENSE` file at the repository root is titled "MIT License with Commercial Use Restrictions." It is based structurally on the MIT License but adds a Section 3 that prohibits commercial use by for-profit entities without prior written permission from the copyright holder (Fabien Antoine). Non-profit organizations and public administrations receive unrestricted free use. An evaluation and testing exception grants all entities, including for-profit companies, unrestricted use for internal testing, proof-of-concept development, and non-production evaluation.

This license is not standard MIT. It is a custom source-available license, which places it in the "Proprietary / restricted-source" row of the `docs/study/00-methodology/license-risk-matrix.md` posture grid for purposes of third-party use. However, the copyright holder is the same individual who owns the OpenERP study, which means the constraint is self-imposed and can be waived by the holder for the OpenERP product. The study treats the runtime as `usable` for the OpenERP product under the owner's own authority, while noting that the license text as written would prohibit any commercial for-profit partner, tenant, or mini-module publisher from bundling or depending on the package without a separate written agreement. This has direct implications documented in the Marketplace Implications section below.

The design specification (section 7) refers to `@entropiq` as "MIT (TypeScript, Node + Svelte compatible, queue-based, alpha)." The license file retrieved from the repository is not plain MIT; the user should either simplify the license to plain MIT before any external-facing npm publication or document the explicit waiver that covers OpenERP commercial deployment. This is flagged as a known-facts discrepancy — pending resolution by the maintainer.

## Capabilities Present

The runtime already operates as a functioning application backend for the "Top AI Ideas" product, which provides the concrete evidence base for the following capabilities, all observed directly in the repository structure and service files:

**Multi-provider LLM client.** The `providers/` directory contains five discrete provider adapters (Claude via Anthropic SDK, OpenAI, Google Gemini, Mistral, Cohere). The `llm-runtime/` service abstracts over them. Provider credentials and model selection are handled at the service layer, supporting token-based and Codex-account-based authentication modes per the README.

**Typed tool calling.** The `tool-service.ts` and `tools.ts` service files, combined with the chat service's streaming loop, implement typed tool invocation within agent turns. Tool results flow back into the conversation context before the next model call.

**Agent loop.** The `todo-orchestration.ts` service manages task-graph execution with explicit state transitions (todo → planned → in\_progress → done/blocked/cancelled), fanout/join patterns, and steering mechanisms. The workflow runtime supports multiple workflow definitions per workspace type and generic transition-driven execution, as documented in `PLAN.md` section on BR-04/04B.

**Conversational memory.** The `chat-session-history.ts` service and the session manager maintain per-session turn history. Context is enriched from business objects (organization, initiative, matrix, document sources) via dedicated context-enrichment services before each model call.

**Durability.** The `queue-manager.ts` service and a `jobQueue` database table (visible in the schema imports across service files) provide queue-based job persistence. Background tasks survive server restarts by being recorded in the database rather than held in memory. This is consistent with the user-stated design of "queue-based execution, no separate workers."

**Streaming.** The `stream-service.ts` provides server-sent event streaming from the LLM loop to connected clients. The chat service wires streaming events to the frontend transport.

**Multi-agent coordination.** The `todo-orchestration.ts` and workflow runtime support multi-task graphs with inter-task dependencies, which constitutes the foundation for multi-agent supervision patterns. The README explicitly names this layer as the precursor to `@entropic/flow`, described in spirit as comparable to LangGraph or Temporal but adapted to this project.

**Observability infrastructure.** The `chat-trace.ts` and `chat-trace-sweep.ts` services record per-turn traces and manage their lifecycle. This is the foundation for GenAI observability as defined in the glossary.

## Capabilities Missing For OpenERP

The OpenERP agentic design specification (section 7) identifies two primary gaps — MCP support and policy hooks — along with three further categories: multi-tenant identity primitives, marketplace publication primitives, and supervision integration points. The evidence from the repository confirms all five gaps as absent from the current codebase.

**MCP (Model Context Protocol) — client and server.** No MCP client, no MCP server surface, and no protocol-level tool-discovery mechanism exists in the repository. Tool invocation is currently internal, via direct TypeScript function calls registered within the application. For OpenERP, MCP is the required interop standard between the `@entropiq` runtime and external tool providers, and OpenERP must also be able to expose its ERP surface as an MCP server. Both the client posture and the server posture are absent. This is the most significant technical gap relative to the Phase 3 runtime safety and interop requirements.

**Policy hooks.** No pre-call or post-call policy evaluation mechanism is present. The runtime does not enforce declarative rules on tool invocations; access control is handled at the HTTP route layer, not at the agent-loop layer. OpenERP requires a policy engine that can intercept each tool call, evaluate tenant-defined constraints (amount limits, resource types, schedule windows, prohibited action classes), and either permit, block, or escalate the call before execution. This layer is entirely absent.

**Multi-tenant identity primitives.** The authentication infrastructure uses WebAuthn (passkey-based login) and magic-link email, appropriate for a single-product SaaS. There is no acting-as delegation, no service principal identity, and no on-behalf-of token pattern as defined in the glossary. The current identity model ties sessions to human users; running an autonomous scheduled agent under a non-human service principal identity is not supported by the current runtime.

**Marketplace publication primitives.** The runtime has no module manifest format, no version pinning mechanism for externally authored agent extensions, no signing or provenance chain, no registry interface, and no sandboxing boundary proportional to trust tier. These primitives are required for even the minimal private-to-tenant marketplace tier described in section 8 of the design specification.

**Supervision integration.** While the task-graph and workflow state machinery provides a structural base for tracking agent execution, no explicit human-in-the-loop approval gate, escalation queue, rollback hook, or canary deployment mechanism is present. For conversational agents this means no approval-in-the-loop surface; for autonomous agents it means no canary or rollback path; for workflow-typed agents it means no typed checkpoint interlock. Supervision, as defined in the glossary, is a gap at every agent mode.

## Multi-Tenant Implications

The current runtime is built for a single-product, multi-user SaaS where all users share the same tenant context (the "Top AI Ideas" application). Workspace isolation is implemented at the data-query layer using `workspace_id` filters, but there is no cryptographic tenant boundary, no per-tenant key store, and no runtime-level guarantee that one tenant's agent cannot access another tenant's data through a misconfigured tool.

For OpenERP, which is a multi-tenant ERP/CRM, every agent identity must be scoped to a specific tenant, every tool call must be validated against that tenant's data perimeter, and tenant secrets (API keys, credentials, connection strings) must be stored and rotated per-tenant rather than per-application. The service principal identity pattern — a non-human identity with explicit tenant-scoped grants — does not exist in the current runtime. Building multi-tenancy onto `@entropiq` will require extending the identity and permission model substantially before any agent can act on behalf of an OpenERP tenant in a safe and auditable way.

The license restriction noted in the Declared License section also has a multi-tenant implication: if tenants or third-party publishers are commercial for-profit entities, they could be considered downstream users of the runtime and subject to the commercial use clause. The copyright holder's intent and any commercial-use waiver must be documented explicitly before the runtime is exposed to external tenants or partner publishers.

## Marketplace Implications

The mini-module publication model requires a runtime that can load, validate, and isolate third-party agent extensions at runtime without allowing one extension to interfere with another or with the host application. The current `@entropiq` codebase has no equivalent of a module loader, a manifest validator, or a sandboxing shim. All agent-like behavior is authored directly into the application service layer.

The three-tier marketplace model defined in section 8 of the design specification — private to tenant, curated partners, public community — each requires progressively stricter primitives: signed manifests, registry integration, trust-proportional sandboxing, and automated compliance checks. None of these exist today. Designing and building them is the primary work of Phase 3, Marketplace Design Space (`docs/study/12-agentic/marketplace-design-space.md`), which will specify requirements independently of any chosen runtime implementation.

The npm publication plan (`@entropic/llm-mesh`, `@entropic/chat`, `@entropic/flow`) is in progress but not yet completed. Until these packages are published and versioned, OpenERP cannot pin a stable runtime dependency, which means the runtime base is effectively a source dependency today. This is appropriate for the study phase but must be resolved before implementation planning.

## Supervision Implications

The workflow and task-graph machinery already in the runtime provides the structural substrate for human supervision: execution states are persisted, transitions are typed, and the `todo-orchestration.ts` layer supports multi-step task management. However, bridging this structure to the OpenERP supervision model requires explicit additions at every agent mode.

For conversational agents, an approval-in-the-loop primitive must be added: the agent loop must be able to pause after generating an action proposal, emit a structured approval request to the calling session, and resume only after a human decision is received. For autonomous agents, a canary deployment mechanism must allow a new agent or policy version to run on a bounded fraction of events before full activation, with a rollback hook that can revert to the previous version without manual intervention. For workflow-typed agents, typed checkpoints must allow the agent step to signal success, failure, or escalation back to the typed automation layer in a format the downstream step can interpret deterministically.

None of these supervision connectors exist in the current runtime. They are the primary targets of the human supervision design space (`docs/study/12-agentic/human-supervision-design-space.md`) in Phase 3, and their absence from `@entropiq` today does not block the study — it defines the design work ahead.

## Anti-Copy Notes

No source code, system prompts, tool definitions, tool schemas, function signatures, parameter documentation, example workflows, eval datasets, or any other protected expression from the `rhanka/entropiq` repository may be copied or closely adapted into any OpenERP study artifact, implementation specification, or production codebase. This restriction applies even though the repository is public and the copyright holder is the same individual, because the study discipline requires all output to be expressed in independently authored OpenERP wording. The permitted output of examining this repository is a functional description of what the runtime does and what it is missing, stated in OpenERP's own terminology, as this document provides. Any future implementation that draws on the runtime must begin from the functional specifications produced in this study, not from source copied from the repository.

This rule is consistent with the broader anti-copy posture stated in section 13 of the design specification and in `docs/study/08-anti-copy/anti-copy-dossier.md`. It applies to all external agent frameworks referenced for functional comparison (LangGraph, CrewAI, AutoGen, OpenAI Agents SDK, Mastra, Vercel AI SDK, Genkit, Inngest Agent Kit, BAML, and similar); those projects are functional reference and inspiration only.

## OpenERP Takeaways

The `rhanka/entropiq` repository is a real, working TypeScript application backend, not a skeleton or stub. The capabilities already present — multi-provider LLM routing, typed tool calling, a queue-persisted agent loop, conversational memory, streaming, workflow state management, and trace recording — cover the kernel of what a business agent runtime needs. For OpenERP, this means the foundational plumbing (model access, tool dispatch, job persistence, streaming, basic observability) does not need to be built from scratch; it needs to be extended, extracted into versioned packages, and hardened for multi-tenancy.

The five capability gaps — MCP, policy hooks, multi-tenant identity, marketplace primitives, and supervision connectors — represent the Phase 3 design work and constitute the principal engineering scope for the transition from the current "Top AI Ideas" runtime to a production-ready OpenERP agent runtime. Of these, MCP is both the most widely standardized and the most likely to be served by an open source library; the Phase 1 license posture document and the Phase 3 MCP fiche will assess the candidate ecosystem. Policy hooks and multi-tenant identity are tightly coupled to the OpenERP security model and must be designed OpenERP-first, using the identity design space and runtime safety functional map in Phase 3.

The license discrepancy between the design specification's stated "MIT" and the actual custom commercial-restriction license is the most immediate concern. It does not affect the study but must be resolved — either by simplifying the license to plain MIT or by documenting a standing waiver — before any implementation work begins. The copyright holder is in the best position to resolve it.

The npm extraction sequence (BR-14c → llm-mesh, then BR-14a → chat) is a prerequisite for stable dependency pinning and should complete before the OpenERP implementation planning phase begins.

## Cross-References

- Design specification section 7: [`docs/superpowers/specs/2026-05-10-agentic-study-extension-design.md`](../../superpowers/specs/2026-05-10-agentic-study-extension-design.md)
- Agentic glossary (terminology): [`docs/study/12-agentic/glossary.md`](glossary.md)
- License risk matrix: [`docs/study/00-methodology/license-risk-matrix.md`](../00-methodology/license-risk-matrix.md)
- Anti-copy dossier: [`docs/study/08-anti-copy/anti-copy-dossier.md`](../08-anti-copy/anti-copy-dossier.md)
