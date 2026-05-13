# E2B

## Evidence

- Repository URL: https://github.com/e2b-dev/E2B.
- Official site: https://e2b.dev/docs.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: `LICENSE` recorded by `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md` as Apache-2.0 confirmed on 2026-05-11.
- Declared license: Apache-2.0.
- Reuse classification: corpus `usable`; OpenERP posture `cautious inspiration` for sandbox primitive design under `docs/study/12-agentic/license-posture.md`.
- Primary role: cloud sandbox runtime for agent code execution in isolated containers with filesystem, process, network, and SDK access.

## License And Reuse

Apache-2.0 is compatible with the MIT-targeted OpenERP direction when notice and patent obligations are tracked. E2B can inform the functional contract for controlled code execution, resource boundaries, filesystem scope, process lifecycle, and network limits in agent mini-modules. SDK configuration expressions, container templates, examples, demos, and workflow samples are excluded from reuse.

## Functional Role

E2B is the corpus reference for sandboxed code execution in an agent context. For OpenERP, the relevant function is a bounded execution zone for mini-modules that need to run code without receiving direct access to the host application, tenant secrets, or broad network reach.

## Integration Suitability With `@sentropic`

Integration Suitability With @sentropic: strong as a functional reference.
The fit is strong as a functional reference because `@sentropic` lacks a sandboxing shim and already coordinates tool calls and queued work. A future integration would need an OpenERP-authored execution adapter, policy pre-check, secret scoping, result validation, trace capture, and failure handling. Direct dependency suitability remains pending because self-hosting evidence and exact runtime boundaries were not established in the provided corpus.

## OpenERP Trust Tier Fit

E2B maps primarily to curated partner or higher-risk private-to-tenant modules that require containerized code execution. It can inform the public community tier's expected isolation contract, but the OpenERP public tier also needs signing, provenance, compliance checks, and emergency stop. The corpus records partial self-hosted and Kubernetes relevance, so direct tier adoption remains undecided.

## Architecture Notes

The corpus describes E2B as providing isolated container environments with filesystem, process, network, and SDK access. In OpenERP terms, that points to an execution boundary with explicit inputs, controlled outputs, time and resource limits, scoped credentials, tenant audit, and policy decisions before and after execution.

## Self-Hosted And Kubernetes

The corpus identifies E2B as cloud sandbox runtime and records partial self-hosted and Kubernetes relevance. OpenERP should not assume a self-hosted production path without maintainer confirmation. Exact self-hosted deployment and Kubernetes evidence is pending - to be confirmed by maintainer.

## Anti-Copy Notes

no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording. E2B SDK setup, sandbox templates, container definitions, example agents, sample notebooks, and demo workflows must not be copied or closely adapted.

## OpenERP Takeaways

E2B clarifies the sandbox contract OpenERP needs: run untrusted or semi-trusted agent code behind explicit filesystem, process, network, secret, and duration boundaries. The decision to adopt it should wait for confirmed self-hosting and operations evidence; the functional requirement can be written now in OpenERP terms.
