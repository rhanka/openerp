# gVisor

## Evidence

- Repository URL: https://github.com/google/gvisor.
- Official site: https://gvisor.dev.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: pending - to be confirmed by maintainer; `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md` record Apache-2.0 confirmed through GitHub API on 2026-05-11.
- Declared license: Apache-2.0.
- Reuse classification: corpus `usable`; OpenERP posture `cautious inspiration` for sandbox primitive design under `docs/study/12-agentic/license-posture.md`.
- Primary role: Linux kernel emulation sandbox for OCI-compatible container workloads using syscall interception as an additional isolation boundary.

## License And Reuse

Apache-2.0 is compatible with the MIT-targeted OpenERP direction when notice and patent obligations are tracked. gVisor can inform the functional requirements for strict OS-level isolation of untrusted mini-module containers. Runtime flags, sandbox configuration files, security profile expression, examples, demos, and deployment templates are excluded from reuse.

## Functional Role

gVisor is the high-isolation sandbox candidate in this group. For OpenERP, its role is a reference for isolating public-community or otherwise high-risk mini-modules in container form, where process-level isolation is not enough and host kernel exposure must be reduced.

## Integration Suitability With `@sentropic`

Integration Suitability With @sentropic: strong for the future public-community tier.
The fit is strong for the future public-community tier but indirect for the current `@sentropic` runtime. `@sentropic` has no module loader or sandbox shim, so OpenERP would need an execution service that packages mini-modules as containers, applies tenant policy before launch, captures results and traces, and links failures to rollback and emergency stop controls.

## OpenERP Trust Tier Fit

gVisor maps primarily to the public community tier and stricter curated partner use cases. Private-to-tenant modules may not need this depth unless tenant policy requires it. The runtime-safety functional map calls for container or OS-style isolation at the public-community trust-exposure level; gVisor is a documented corpus reference for that requirement.

## Architecture Notes

The corpus describes gVisor as an OCI-compatible container security boundary using Linux kernel emulation and syscall interception rather than hardware virtualization. In OpenERP architecture terms, the useful pattern is a hardened execution tier separated from the web and agent-loop process, with explicit job handoff, scoped credentials, trace export, and emergency stop.

## Self-Hosted And Kubernetes

The corpus records strong self-hosted and Kubernetes relevance for gVisor. OpenERP can evaluate it for self-hosted deployments that need strict container isolation, while keeping all cluster configuration and runtime setup OpenERP-authored. Exact checked deployment evidence is pending - to be confirmed by maintainer.

## Anti-Copy Notes

no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording. gVisor runtime flags, sandbox configuration files, security profiles, deployment examples, and demonstration workloads must not be copied or closely adapted.

## OpenERP Takeaways

gVisor is a documented reference for the high-isolation OpenERP tier. It should be considered after OpenERP defines its module packaging, identity, policy, observability, and revocation model, because the isolation layer only works as part of a complete runtime safety system.
