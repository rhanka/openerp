# MCP Registry

## Evidence

- Repository URL: `https://github.com/modelcontextprotocol/registry`.
- Official site: `https://modelcontextprotocol.io`.
- Corpus check date: 2026-05-11.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: repository root `LICENSE`, as recorded in the corpus.
- Declared license: Apache-2.0 transition from MIT; new contributions are Apache-2.0 and earlier unrelicensed contributions may remain MIT.
- Reuse classification: usable.
- Role: registry reference for MCP server listing, discovery API behavior, community discovery, and registry-level controls.
- MCP specification version: pending - to be confirmed by maintainer.
- Registry posture: signing pending - to be confirmed by maintainer; identity pending - to be confirmed by maintainer; discoverability is present as server listing and discovery behavior, with exact contract pending - to be confirmed by maintainer.

## License And Reuse

The registry is usable for protocol and discovery posture study under the license transition recorded in the corpus. Because OpenERP targets MIT, direct source import should be avoided unless legal notice handling is explicitly accepted.

The permitted reuse is functional: registry responsibilities, trust controls, discovery boundaries, and governance checkpoints. Registry expression, onboarding language, list structure, and product-specific catalog wording are not reusable.

## Functional Role

The MCP registry is the discovery layer for available MCP servers. In OpenERP terms, it informs how a tenant, partner, or community module can declare externally callable capabilities and how the platform can find, verify, activate, and later revoke those capabilities.

For the agentic extension, registry design sits between marketplace governance and runtime tool interop.

## Integration Suitability With `@sentropic`

Suitability is partial because the `@sentropic` audit confirms that registry interfaces, signing, provenance, module manifests, and version pinning do not exist today. The registry can guide the missing discovery layer, but OpenERP must own the tenant and marketplace rules.

The integration should add a registry abstraction around approved MCP endpoints, then connect it to identity delegation, policy checks, sandbox posture, and trace capture. The first production path should be tenant-private before any partner or public community exposure.

## OpenERP Trust Tier Fit

Private-to-tenant: use a closed registry view controlled by tenant admins and OpenERP maintainers.

Curated partners: require publisher identity, signed releases, OpenERP review, version pinning, and revocation.

Public community: require registry controls for public visibility, broader provenance evidence, automated compliance checks, and conservative activation defaults.

## Architecture Notes

OpenERP should model the registry as governance metadata plus runtime resolution. The metadata side records publisher identity, license posture, allowed tenants, approved versions, revocation state, and required sandbox depth. The runtime side resolves an approved MCP endpoint for `@sentropic` at call time.

Registry discovery must not bypass tenant approval, budget controls, secrets scoping, or policy checks. Every activation and deactivation should leave an audit trail.

## Self-Hosted And Kubernetes

The registry can be implemented as an OpenERP-owned service or table-backed platform module. Kubernetes deployment details are pending - to be confirmed by maintainer for the reference registry.

For OpenERP, self-hosting should mean tenant-controlled data residency, internal review workflows, secret isolation, and trace export from every registry-mediated call.

## Anti-Copy Notes

MCP server names, tool catalog labels, registry UI, eval dataset schemas, and trace template literals are forbidden reuse surfaces. No registry screen layout, category wording, onboarding copy, server description, or catalog expression may be reused.

OpenERP registry wording must come from OpenERP trust tiers, tenant controls, and ERP module terminology.

## OpenERP Takeaways

- Start with a closed tenant registry, then add partner and community paths only after signing, identity, and revocation are in place.
- Keep registry discovery separate from activation; finding a server must not imply permission to call it.
- Bind registry entries to policy checks, observability, license posture, and sandbox depth.
- Treat public registry material as ecosystem context, not OpenERP product language.
