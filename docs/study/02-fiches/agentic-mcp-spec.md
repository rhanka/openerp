# MCP Specification

## Evidence

- Repository URL: `https://github.com/modelcontextprotocol/modelcontextprotocol`.
- Official site: `https://modelcontextprotocol.io`.
- Corpus check date: 2026-05-11.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: repository root `LICENSE`, as recorded in the corpus.
- Declared license: Apache-2.0 transition from MIT; new contributions are Apache-2.0 and earlier unrelicensed contributions may remain MIT.
- Reuse classification: usable.
- Role: interoperability specification for tool discovery, invocation, authentication, client posture, and server posture.
- MCP specification version: pending - to be confirmed by maintainer.
- Registry posture: signing pending - to be confirmed by maintainer; identity pending - to be confirmed by maintainer; discoverability pending - to be confirmed by maintainer.

## License And Reuse

The specification is usable as the primary interoperability reference for OpenERP, subject to the license transition noted in the corpus. Because OpenERP targets MIT, the safest posture is to implement an OpenERP-authored client and server surface from the protocol requirements, while avoiding direct source import unless notice obligations are explicitly tracked.

The specification can guide protocol behavior, capability negotiation, authentication posture, and compatibility expectations. It must not provide OpenERP wording, names, examples, or object shapes.

## Functional Role

MCP is the tool interop layer between `@sentropic`, OpenERP modules, and external tool providers. It defines how an agent runtime discovers available capabilities, invokes them, and authenticates to the server that owns the capability.

For OpenERP, the specification matters in both directions: `@sentropic` needs an MCP client so agents can call external tools, and OpenERP needs an MCP server posture so selected ERP capabilities can be exposed through a controlled interface.

## Integration Suitability With `@sentropic`

Suitability is strong at the design level because the `@sentropic` audit identifies MCP as the largest missing interop primitive. The current runtime has internal typed tool calls, but no MCP client, no MCP server, and no protocol-level discovery.

The integration should wrap existing tool contracts rather than rename them after any reference project. The runtime needs a client adapter, a server adapter, tenant-aware authentication, per-call policy checks, and trace emission around every MCP call.

## OpenERP Trust Tier Fit

The specification is a core platform dependency, not a mini-module. It applies to all trust tiers because every tier needs a common tool interop contract.

Private-to-tenant use can start with closed discovery and tenant-bound tool exposure. Curated partner and public community use require signed releases, publisher identity, registry control, revocation, and audit evidence before broad activation.

## Architecture Notes

OpenERP should treat MCP as a boundary contract around tool exposure, not as a source of product vocabulary. The client side should call approved external tools through `@sentropic`; the server side should expose only tenant-approved ERP capabilities.

Policy checks should run before and after each tool call. Observability should record input source, target capability, tenant, acting identity, policy decision, latency, outcome, and rollback or escalation events where relevant.

## Self-Hosted And Kubernetes

The specification is not a deployable service. The deployable OpenERP work is the client/server adapter inside the OpenERP and `@sentropic` services.

Kubernetes concerns belong to the hosting services: secret mounting, tenant isolation, egress controls, policy sidecars where used, and trace export. Any external MCP server must be treated as a separately governed integration.

## Anti-Copy Notes

MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals are forbidden reuse surfaces. No sample server name, tool list, parameter wording, authentication flow expression, or example prompt from any MCP reference may be copied.

OpenERP must use independently authored ERP capability names, tenant policy wording, and bilingual user-facing text.

## OpenERP Takeaways

- Build MCP support as a first-class `@sentropic` adapter pair: client and server.
- Keep OpenERP capability names and descriptions native to OpenERP business objects.
- Treat registry, signing, identity, policy, and observability as required companion primitives before partner or community exposure.
- Use the specification for compatibility, not product expression.
