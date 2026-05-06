# License Risk Matrix

This matrix defines the research posture for studying external ERP, CRM, and
back-office products while preserving the option to build the future product
under MIT. It is a planning control, not a legal opinion.

## Reuse Classifications

| Classification | Meaning |
| --- | --- |
| `usable` | Candidate may inform deeper technical study after obligations are recorded and attribution requirements are tracked. |
| `cautious inspiration` | Candidate may inform architecture or implementation ideas only after explicit review of license obligations and anti-copy risk. |
| `functional reference only` | Candidate may inform product behavior, workflows, domain concepts, and high-level architecture, but must not be used for source-level implementation. |
| `excluded` | Candidate must not be used as a technical source or functional reference for the study artifact in question. |

## License Families

| License family | Technical reuse posture | Functional study posture | MIT target risk | Required handling |
| --- | --- | --- | --- | --- |
| MIT | `usable` for deeper technical inspiration when evidence confirms the license applies to the relevant files. | `usable` for functional study. | Low, subject to preserving copyright notices and license text where required. | Record repository URL, checked revision, license file path, and attribution obligations. |
| Apache-2.0 | `usable` for deeper technical inspiration when obligations, notices, and patent terms are understood. | `usable` for functional study. | Low to moderate because notice, attribution, and patent clauses must be tracked. | Record license and notice files; preserve required notices; flag patent-related implications for later legal review. |
| BSD | `usable` for deeper technical inspiration when the exact BSD variant is identified. | `usable` for functional study. | Low, subject to attribution and variant-specific clauses. | Record whether the license is BSD-2-Clause, BSD-3-Clause, or another BSD variant; track attribution obligations. |
| MPL | `cautious inspiration` only after explicit review because file-level copyleft may affect copied or modified files. | `usable` for functional study when findings are rewritten independently. | Moderate for an MIT target if source structure, files, or protected expression are copied or adapted. | Do not copy code; record covered files and license evidence; require review before any technical reuse beyond high-level ideas. |
| LGPL | `cautious inspiration` for library integration patterns only after explicit review; avoid copying implementation code. | `usable` for functional study when findings are rewritten independently. | Moderate, especially if linking, modifications, or copied implementation details could create obligations inconsistent with the target. | Treat as dependency-review material; document dynamic/static linking assumptions if relevant; require review before technical reuse. |
| GPL | `functional reference only` for workflows, domain behavior, and high-level architecture. | `functional reference only` with independent written specs. | High for an MIT target if code, structure, UI text, tests, or distinctive implementation expression are copied or adapted. | Keep source-level implementation out of later specs; rewrite findings as neutral functional requirements; run anti-copy review before implementation. |
| AGPL | `functional reference only` for workflows, domain behavior, and high-level architecture. | `functional reference only` with independent written specs. | High for an MIT target if protected expression is copied or adapted; network-copyleft obligations increase concern for any derivative implementation. | Do not copy code, UI text, docs, assets, tests, demo data, internal names, or unusually specific schemas/APIs; document observations as independent functional specs only. |
| Proprietary references | `excluded` for technical reuse. | `functional reference only` for public product behavior, UX, pricing, positioning, and workflow benchmarking. | High if non-public material, assets, copy, screenshots, documentation, or distinctive product expression are reused. | Use public references only; keep them outside the open source corpus; do not treat proprietary products as reusable sources. |

## Anti-Copy Boundary

For all candidates, and especially GPL, AGPL, and proprietary references, the
study must not copy or closely adapt protected expression. The boundary covers:

- code;
- UI text;
- docs;
- assets;
- tests;
- demo data;
- internal names;
- unusually specific schemas/APIs.

Permitted study output is rewritten analysis: functional behavior, business
rules, workflows, domain concepts, integration expectations, and high-level
architecture expressed in the study's own words. Later implementation must start
from those written specifications, not from copied source or product artifacts.
