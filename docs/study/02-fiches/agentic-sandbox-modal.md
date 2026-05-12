# Modal

## Evidence

- Repository URL: https://github.com/modal-labs/modal-client.
- Official site: https://modal.com/docs.
- Checked branch/tag/commit: pending - to be confirmed by maintainer.
- License evidence path: pending - to be confirmed by maintainer; `docs/study/01-corpus/candidates.csv` and `docs/study/01-corpus/agentic-corpus-report.md` record the client SDK as Apache-2.0 on 2026-05-11 and the platform as proprietary.
- Declared license: proprietary platform / Apache-2.0 SDK.
- Reuse classification: `functional reference only`.
- Primary role: managed serverless cloud execution platform for compute workloads, GPU containers, scheduled functions, and Python-first sandbox-like execution patterns.

## License And Reuse

Modal is not a reuse candidate for OpenERP runtime implementation because the platform is proprietary and cloud-only in the corpus evidence. The Apache-2.0 SDK does not change the platform posture. Modal may be used only as a public benchmark or functional reference for managed execution boundaries, scheduling, and compute packaging. SDK configuration, deployment expression, platform constructs, examples, demos, and documentation wording are excluded from reuse.

## Functional Role

Modal is useful as a public benchmark for managed execution: it illustrates how a platform can package code, run it remotely, schedule it, and attach specialized compute. For OpenERP, the relevant functional question is which of those capabilities are needed for agent mini-modules, and which must remain self-hosted or tenant-controlled.

## Integration Suitability With `@entropiq`

Integration Suitability With @entropiq: weak for direct integration.
The fit is weak for direct OpenERP integration because the `@entropiq` audit and design posture require self-hostable runtime primitives for a governed OpenERP product, while Modal is recorded as proprietary cloud-only. It can still help frame what an execution adapter would need to expose: job submission, bounded runtime, result capture, failure reporting, and audit linkage.

## OpenERP Trust Tier Fit

Modal does not fit the OpenERP trust tiers as an adoptable primitive under the provided evidence. It is a public benchmark for the managed-compute experience, not a private-to-tenant, curated-partner, or public-community sandbox. Any future use would require a separate legal and deployment review.

## Architecture Notes

The corpus describes Modal as a serverless cloud platform for AI and compute workloads with GPU-backed containers and scheduled functions. OpenERP should translate that only into requirements: remote execution lifecycle, resource class selection, tenant policy, audit, and rollback. No Modal-specific platform model should appear in OpenERP architecture.

## Self-Hosted And Kubernetes

The corpus records Modal as proprietary cloud-only with no self-hosted option and weak self-hosted or Kubernetes relevance. OpenERP's self-hosted deployment posture means Modal remains outside the direct runtime candidate set unless maintainers later provide a portable option.

## Anti-Copy Notes

no DSL surface syntax, no sandbox configuration template, no example library, and no demos may be copied; only functional descriptions in OpenERP wording. Modal SDK usage, deployment definitions, function examples, platform constructs, documentation examples, and demos must not be copied or closely adapted.

## OpenERP Takeaways

Modal is a useful public benchmark for what managed execution feels like, but it is not a direct OpenERP building block under the current evidence. OpenERP should express its execution requirements independently and preserve a self-hosted path for tenant-governed deployments.
