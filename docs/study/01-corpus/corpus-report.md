# Corpus Report

## Progress

Fait: 27 open source-oriented candidate projects with public repositories are listed in `candidates.csv`; mandatory seed rows are preserved; evidence-backed fiches exist for all candidates; license-file and checked-revision review is recorded in the fiches; shortlist v1 and proprietary public references are now linked study artifacts.
À faire: Clone and Graphify selected repositories, synthesize cross-domain functional requirements, define MVP boundaries, and complete anti-copy controls; corpus and fiche discovery are 100% complete, while the wider study is about 70% complete.
Attendu: Use `03-shortlist/shortlist.md` as the control document for Graphify scope, because the corpus is broad enough and deeper work should now be selective.

## Corpus Rules

- The open source corpus should contain 15-30 candidates covering ERP, CRM, accounting, HR, payroll, recurring services, project/service delivery, MRP, MES, WMS, BI, reporting, and workflow automation.
- Closed or non-open products are kept separate from this open source corpus. They may be used only as public functional, UX, pricing, and positioning references, not as reusable sources.
- Use `Unknown` when evidence has not yet been checked or documented. Replace `Unknown` only after recording the relevant source, license, version or commit, and date checked in the candidate fiche or related study artifact.

## Current Corpus

The normalized candidate inventory is maintained in `docs/study/01-corpus/candidates.csv`.

## Discovery Notes

- GitHub CLI repository searches were attempted first inside the sandbox and initially failed with `error connecting to api.github.com`; rerunning with approved network access succeeded.
- GitHub searches returning JSON results: `open source ERP`, `open source CRM`, `open source HR payroll`, and `open source subscription billing`.
- GitHub searches returning empty JSON arrays for the exact requested terms: `open source accounting invoicing`, `open source project time expenses`, `open source MRP MES WMS`, and `open source maintenance quality manufacturing`.
- Web searches were used as fallback discovery support for accounting/invoicing, project/time/expenses, MRP/MES/WMS, maintenance/quality/manufacturing, subscription billing, CRM, ERP, and HR/payroll.
- `license_declared` uses GitHub metadata or public project metadata only. All candidates require exact license-file and checked-revision review before technical reuse classification in the fiche phase; rows with `Other` or `Unknown` are the highest priority for that review.

## Collaboration Extension

The collaboration extension adds docs/wiki, work management, async communication,
and database workspace candidates to the corpus. The added candidates are meant
to complement the ERP, CRM, project, billing, reporting, automation, HR, and
manufacturing research already completed.

The product filter remains ERP/CRM first. Collaboration capabilities should be
evaluated for their ability to attach to customers, contacts, opportunities,
quotes, contracts, projects, tasks, time entries, invoices, support cases,
files, decisions, notifications, and audit events.

The license posture is stricter than the product discovery posture:

- MIT, Apache-2.0, BSD, and similarly permissive candidates can be considered
  for deeper technical study after exact license evidence is recorded.
- MPL, EPL, LGPL, mixed-license, and open-core candidates require cautious
  file-level review before any technical reuse.
- GPL, AGPL, BSL, Sustainable Use, source-available, and proprietary products
  remain functional references or public benchmarks only.

Proprietary collaboration products such as Notion, ClickUp, Airtable,
Monday.com, Asana, Slack, and Microsoft Teams are public benchmarks only. They
must not be treated as reusable sources for code, copy, screenshots, templates,
workflows, assets, API shapes, schemas, or proprietary product expression.
