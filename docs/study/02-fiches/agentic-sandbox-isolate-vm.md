# isolated-vm

## Evidence

- Repository URL: https://github.com/laverdet/isolated-vm.
- Official site: https://github.com/laverdet/isolated-vm.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: pending - to be confirmed by maintainer; `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md` record ISC confirmed through GitHub API on 2026-05-11.
- Declared license: ISC.
- Reuse classification: corpus `usable`; OpenERP posture `cautious inspiration` for sandbox primitive design under `docs/study/12-agentic/license-posture.md`.
- Primary role: Node.js native addon for V8 isolate-based in-process sandboxing with memory and CPU limits and inter-isolate message passing.

## License And Reuse

ISC is compatible with the MIT-targeted OpenERP direction when attribution obligations are tracked. isolated-vm can inform the functional shape of a lightweight in-process isolation boundary for trusted or semi-trusted mini-modules. Isolate setup code, communication schemas, configuration examples, demos, and example libraries are excluded from reuse.

## Functional Role

isolated-vm is the most directly relevant sandbox candidate for a TypeScript and Node.js runtime because `@entropiq` is TypeScript-based. For OpenERP, its role is a possible private-to-tenant or internal extension boundary when a full container boundary is disproportionate and the module does not require broad system access.

## Integration Suitability With `@entropiq`

Integration Suitability With @entropiq: strong for early design.
The fit is strong for early design because it matches the Node.js runtime family and can be considered near the agent-loop process. `@entropiq` would still need an OpenERP-authored module loader, policy hook, data envelope, resource limit policy, timeout handling, result validation, and audit trace. It is not sufficient for highly untrusted public community modules by itself.

## OpenERP Trust Tier Fit

isolated-vm fits private-to-tenant modules and possibly tightly reviewed curated partner modules where a lightweight process-level or in-process boundary is acceptable. Public community modules should use a stricter container or OS-style isolation layer, consistent with the runtime-safety functional map.

## Architecture Notes

The corpus describes isolated-vm as a Node.js native addon around V8 isolates with memory and CPU controls and message passing. In OpenERP terms, that maps to a limited execution chamber for small extension logic, with explicit input serialization, output validation, no ambient tenant secret access, and policy checks around every host capability.

## Self-Hosted And Kubernetes

isolated-vm is not a Kubernetes sandbox by itself. It is a library-level primitive that would run inside the OpenERP service or a companion Node.js worker. The corpus records partial self-hosted and Kubernetes relevance because deployment depends on how OpenERP packages the host process. Exact production deployment evidence is pending - to be confirmed by maintainer.

## Anti-Copy Notes

no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording. isolated-vm configuration examples, isolate lifecycle code, inter-isolate message schemas, safety examples, and demo scripts must not be copied or closely adapted.

## OpenERP Takeaways

isolated-vm is a practical technical match for lightweight `@entropiq` extension isolation, especially before a broader marketplace exists. It should be paired with OpenERP-owned policy, identity, secrets, and audit controls, and reserved for lower-trust-depth tiers unless container or OS-level isolation is layered around it.
