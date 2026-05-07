# Assessment Method

This study uses qualitative, evidence-backed ratings to decide which open source
projects can inform a future MIT ERP/CRM/back-office product. The method is for
research and planning only; it is not a legal opinion or an implementation
authorization.

## Ratings

| Rating | Meaning |
| --- | --- |
| `Strong` | Clear evidence supports use as a product reference or deeper technical study for the criterion. |
| `Partial` | Useful evidence exists, but scope, maturity, localization, architecture, or reuse limits are material. |
| `Weak` | Evidence is thin, the fit is poor, or the project has significant gaps for the criterion. |
| `Unknown` | The study has not gathered enough evidence to rate the criterion yet. |
| `Blocked` | A documented risk prevents use for the criterion. License-related `Blocked` ratings prevent technical reuse in this phase; other `Blocked` ratings are severe findings but are not hard gates by themselves. |

## Criteria

Each candidate fiche must assess the following criteria:

- license;
- reuse status;
- functional coverage;
- maturity;
- architecture;
- UX;
- i18n/l10n;
- Quebec/Canada relevance;
- SaaS/self-hosted/Kubernetes relevance;
- integration/API maturity;
- security;
- maintenance;
- dependency risk.

## Evidence Rules

Every rating must cite evidence. A candidate rating is incomplete until it
records all of the following:

- repository URL;
- checked commit, tag, or branch;
- license evidence, such as `LICENSE`, `COPYING`, package metadata, or official
  project documentation;
- documentation or source path supporting the rating;
- date checked, using ISO 8601 format (`YYYY-MM-DD`).

Evidence should be specific enough that another reviewer can reproduce the
rating from the same repository revision. If a criterion cannot be verified, use
`Unknown` and record what was checked.

## License Gate

License is the only hard gate in this phase. A candidate with license risk that
is incompatible with the MIT target cannot become a technical base or source for
technical reuse, even if it remains useful as a functional reference.

Other risks, including maturity, security, maintenance, dependency, UX, and
architecture concerns, must be documented qualitatively. They may lower the
candidate's usefulness or exclude it from a shortlist, but they do not override
the license gate rule.

## Qualitative Assessment Only

This phase uses qualitative labels only. It does not combine findings into a
formula or comparative point system. Ratings are evidence-backed. Later reports
may propose a prioritization model, but this methodology phase only records
defensible findings and reuse constraints.
