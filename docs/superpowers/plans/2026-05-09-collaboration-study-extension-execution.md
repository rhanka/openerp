# OpenERP Collaboration Study Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing OpenERP study with an evidence-backed collaboration domain covering docs/wiki, work management, async communication, permissions, licensing, anti-copy controls, and final MD/PPTX synthesis updates.

**Architecture:** This is a research execution plan, not application implementation. It extends the existing `docs/study/` structure, keeps raw clones under ignored `research/sources/`, runs Graphify only on selected repositories, and converts findings into OpenERP-written functional analysis before any later implementation work.

**Tech Stack:** Markdown, CSV, Git, GitHub/web evidence, Graphify, shell verification, optional Playwright visual checks for diagrams and PPTX previews, Python or office tooling for PPTX update if needed.

---

## Avancement

Fait: collaboration extension design is approved and pushed as `docs/superpowers/specs/2026-05-09-collaboration-study-extension-design.md`.
À faire: execute corpus extension, fiches, clone evidence, Graphify, functional map, MVP addendum, anti-copy addendum, final synthesis MD, and PPTX; execution planning is 100% once this file is committed.
Attendu: execute this plan with parallel agents where file ownership is independent, because corpus/fiches/benchmarks can be researched concurrently before synthesis.

## Progress Reporting Rule

Every checkpoint must use exactly this format:

```text
Fait: completed artifacts and verified facts.
À faire: remaining work and approximate completion percent.
Attendu: decision or action needed, with a recommendation.
```

If no user decision is needed, `Attendu` must state the next action the agent will take and why.

## Scope Check

This plan studies collaboration as an ERP/CRM support layer. It does not implement collaboration features in the Svelte/TypeScript application.

The plan covers:

- embedded collaboration on ERP/CRM objects;
- knowledge workspace and wiki patterns;
- work management and task/board patterns;
- async team communication patterns;
- public proprietary benchmarks;
- open source/source-available licensing;
- Graphify for selected candidates;
- final synthesis and PPTX updates.

The plan excludes:

- building a Notion clone;
- building a ClickUp clone;
- building full chat/calling infrastructure;
- copying source code, UI strings, templates, schemas, tests, demo data, screenshots, or proprietary UX flows.

## Source Inputs

Use these OpenERP-authored documents as the primary inputs:

- `docs/superpowers/specs/2026-05-09-collaboration-study-extension-design.md`
- `docs/superpowers/specs/2026-05-05-openerp-study-design.md`
- `docs/study/00-methodology/assessment-method.md`
- `docs/study/00-methodology/license-risk-matrix.md`
- `docs/study/00-methodology/progress-reporting.md`
- `docs/study/01-corpus/candidates.csv`
- `docs/study/01-corpus/corpus-report.md`
- `docs/study/03-shortlist/shortlist.md`
- `docs/study/04-proprietary-references/proprietary-reference-map.md`
- `docs/study/05-graphify/README.md`
- `docs/study/06-functional-map/global-functional-map.md`
- `docs/study/07-mvp/mvp-recommendation.md`
- `docs/study/08-anti-copy/anti-copy-dossier.md`
- `docs/study/11-final-package/final-synthesis.md`
- `docs/study/11-final-package/openerp-final-synthesis.pptx`

External projects are evidence sources only. GPL, AGPL, BSL, Sustainable Use, source-available, and proprietary projects must remain functional references or benchmarks.

## Commit And Push Rule

Each task must end with:

```bash
git status --short --branch
git add <task files>
git commit -m "<imperative task message>"
git push origin main
```

Keep commits atomic. Do not combine independent tasks in one commit unless a later synthesis task explicitly depends on multiple artifacts.

## File Structure

Create or modify these paths:

- `docs/study/01-corpus/candidates.csv`: add collaboration candidates.
- `docs/study/01-corpus/corpus-report.md`: add collaboration corpus section.
- `docs/study/02-fiches/*.md`: add one fiche per selected collaboration candidate.
- `docs/study/03-shortlist/shortlist.md`: add collaboration shortlist section.
- `docs/study/04-proprietary-references/proprietary-reference-map.md`: add public collaboration benchmarks.
- `docs/study/05-graphify/README.md`: add collaboration Graphify index.
- `docs/study/05-graphify/<candidate-scope>/summary.md`: add selected Graphify summaries.
- `docs/study/06-functional-map/collaboration-functional-map.md`: create collaboration map.
- `docs/study/06-functional-map/global-functional-map.md`: link collaboration map into global map.
- `docs/study/07-mvp/collaboration-mvp-addendum.md`: create MVP addendum.
- `docs/study/07-mvp/mvp-recommendation.md`: link collaboration addendum.
- `docs/study/08-anti-copy/collaboration-anti-copy-addendum.md`: create anti-copy addendum.
- `docs/study/08-anti-copy/anti-copy-dossier.md`: link collaboration addendum.
- `docs/study/11-final-package/final-synthesis.md`: update final synthesis.
- `docs/study/11-final-package/openerp-final-synthesis.pptx`: update final deck.
- `research/sources/`: ignored local clone directory.
- `research/graphify/`: ignored raw Graphify output directory.

## Parallelization Map

Safe parallel work:

- docs/wiki/workspace candidates: AFFiNE, AppFlowy, BookStack, Docmost, Logseq, Outline, Anytype.
- work management candidates: Baserow, Focalboard, Huly, NocoDB, OpenProject, Plane, Taiga, Vikunja.
- communication candidates: Zulip, Rocket.Chat, Mattermost, Slack/Teams benchmark.
- proprietary benchmarks: Notion, ClickUp, Airtable, Monday.com, Asana.

Do not let two agents edit the same file concurrently. Agents should return notes or write owned fiche files. The controller integrates shared files: `candidates.csv`, corpus report, shortlist, final synthesis, and PPTX.

## Task 1: Corpus Extension Baseline

**Files:**

- Modify: `docs/study/01-corpus/candidates.csv`
- Modify: `docs/study/01-corpus/corpus-report.md`

- [ ] **Step 1: Record current corpus header**

Run:

```bash
head -n 1 docs/study/01-corpus/candidates.csv
```

Expected: output includes `project_slug,project_name,category,repository_url,primary_site,license_declared,reuse_classification`.

- [ ] **Step 2: Add collaboration candidate rows**

Append rows for these slugs, using `Unknown` only where evidence has not yet been verified in this execution pass:

```text
affine
appflowy
baserow
bookstack
docmost
focalboard
huly
logseq
mattermost
nocodb
outline
plane
rocketchat
taiga
vikunja
zulip
anytype
```

Use categories from this controlled set:

```text
Collaboration workspace
Knowledge base
Work management
Team communication
Database workspace
```

Reuse classifications must use the existing controlled values:

```text
usable
cautious inspiration
functional reference only
excluded
Unknown
```

- [ ] **Step 3: Add corpus narrative section**

Add `## Collaboration Extension` to `docs/study/01-corpus/corpus-report.md` with:

- scope: docs/wiki, work management, async communication, database workspaces;
- license posture: permissive first, copyleft/source-available functional only;
- ERP/CRM alignment: collaboration must attach to customers, projects, tasks, invoices, support, files, decisions, and audit;
- explicit note that proprietary products are public benchmarks only.

- [ ] **Step 4: Verify corpus extension**

Run:

```bash
rg -n "affine|appflowy|baserow|bookstack|docmost|focalboard|huly|logseq|mattermost|nocodb|outline|plane|rocketchat|taiga|vikunja|zulip|anytype" docs/study/01-corpus/candidates.csv
rg -n "Collaboration Extension|public benchmarks only|ERP/CRM" docs/study/01-corpus/corpus-report.md
```

Expected: all candidate slugs appear in the CSV and the narrative section appears in the corpus report.

- [ ] **Step 5: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/01-corpus/candidates.csv docs/study/01-corpus/corpus-report.md
git commit -m "Extend corpus with collaboration candidates"
git push origin main
```

## Task 2: Proprietary Collaboration Benchmarks

**Files:**

- Modify: `docs/study/04-proprietary-references/proprietary-reference-map.md`

- [ ] **Step 1: Add benchmark section**

Add `## Collaboration Benchmarks` with one subsection each for:

```text
Notion
ClickUp
Airtable
Monday.com
Asana
Slack
Microsoft Teams
```

Each subsection must include:

- public reference role;
- capabilities to observe;
- what must not be reused;
- ERP/CRM relevance;
- date checked.

- [ ] **Step 2: Apply anti-copy language**

Every subsection must include this sentence:

```text
This reference is a public benchmark only; do not reuse code, copy, screenshots, templates, workflows, assets, API shapes, schemas, or proprietary product expression.
```

- [ ] **Step 3: Verify benchmark section**

Run:

```bash
rg -n "Collaboration Benchmarks|Notion|ClickUp|Airtable|Monday.com|Asana|Slack|Microsoft Teams|public benchmark only" docs/study/04-proprietary-references/proprietary-reference-map.md
```

Expected: each proprietary reference and anti-copy statement is present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/04-proprietary-references/proprietary-reference-map.md
git commit -m "Add collaboration proprietary benchmarks"
git push origin main
```

## Task 3: Docs And Workspace Candidate Fiches

**Files:**

- Create: `docs/study/02-fiches/affine.md`
- Create: `docs/study/02-fiches/appflowy.md`
- Create: `docs/study/02-fiches/bookstack.md`
- Create: `docs/study/02-fiches/docmost.md`
- Create: `docs/study/02-fiches/logseq.md`
- Create: `docs/study/02-fiches/outline.md`
- Create: `docs/study/02-fiches/anytype.md`

- [ ] **Step 1: Research current evidence**

For each candidate, collect:

- repository URL;
- official site;
- checked branch/tag/commit or release;
- license evidence path;
- declared license;
- reuse classification;
- collaboration capabilities;
- ERP/CRM fit;
- self-hosted posture;
- i18n posture;
- anti-copy notes.

- [ ] **Step 2: Write fiches**

Each fiche must use this exact section list:

```markdown
# <Project Name>

## Evidence

## License And Reuse

## Collaboration Coverage

## ERP CRM Fit

## Architecture Notes

## Self-Hosted And Kubernetes

## I18n And Localization

## Anti-Copy Notes

## OpenERP Takeaways
```

- [ ] **Step 3: Verify fiches**

Run:

```bash
rg -n "License And Reuse|ERP CRM Fit|Anti-Copy Notes|OpenERP Takeaways" docs/study/02-fiches/affine.md docs/study/02-fiches/appflowy.md docs/study/02-fiches/bookstack.md docs/study/02-fiches/docmost.md docs/study/02-fiches/logseq.md docs/study/02-fiches/outline.md docs/study/02-fiches/anytype.md
```

Expected: every fiche contains the required sections.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/02-fiches/affine.md docs/study/02-fiches/appflowy.md docs/study/02-fiches/bookstack.md docs/study/02-fiches/docmost.md docs/study/02-fiches/logseq.md docs/study/02-fiches/outline.md docs/study/02-fiches/anytype.md
git commit -m "Add collaboration workspace fiches"
git push origin main
```

## Task 4: Work Management Candidate Fiches

**Files:**

- Create: `docs/study/02-fiches/baserow.md`
- Create: `docs/study/02-fiches/focalboard.md`
- Create: `docs/study/02-fiches/huly.md`
- Create: `docs/study/02-fiches/nocodb.md`
- Create: `docs/study/02-fiches/plane.md`
- Create: `docs/study/02-fiches/taiga.md`
- Create: `docs/study/02-fiches/vikunja.md`
- Modify: `docs/study/02-fiches/openproject.md`

- [ ] **Step 1: Research current evidence**

For each candidate, collect the same evidence fields as Task 3. For OpenProject, add only a `## Collaboration Extension Notes` section without rewriting the existing fiche.

- [ ] **Step 2: Write fiches**

Use the same section list as Task 3 for new fiches. OpenProject must receive these subsections under its extension notes:

```markdown
### Work Package Collaboration

### ERP CRM Fit

### OpenERP Takeaways
```

- [ ] **Step 3: Verify fiches**

Run:

```bash
rg -n "License And Reuse|ERP CRM Fit|Anti-Copy Notes|OpenERP Takeaways|Collaboration Extension Notes" docs/study/02-fiches/baserow.md docs/study/02-fiches/focalboard.md docs/study/02-fiches/huly.md docs/study/02-fiches/nocodb.md docs/study/02-fiches/plane.md docs/study/02-fiches/taiga.md docs/study/02-fiches/vikunja.md docs/study/02-fiches/openproject.md
```

Expected: required sections appear across all target files.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/02-fiches/baserow.md docs/study/02-fiches/focalboard.md docs/study/02-fiches/huly.md docs/study/02-fiches/nocodb.md docs/study/02-fiches/plane.md docs/study/02-fiches/taiga.md docs/study/02-fiches/vikunja.md docs/study/02-fiches/openproject.md
git commit -m "Add collaboration work management fiches"
git push origin main
```

## Task 5: Communication Candidate Fiches

**Files:**

- Create: `docs/study/02-fiches/zulip.md`
- Create: `docs/study/02-fiches/rocketchat.md`
- Create: `docs/study/02-fiches/mattermost.md`

- [ ] **Step 1: Research current evidence**

For each candidate, collect:

- repository URL and official site;
- license evidence;
- open-core or source boundary;
- threading/channel model;
- notification model;
- API and integration model;
- self-hosted posture;
- ERP/CRM object-linking relevance.

- [ ] **Step 2: Write fiches**

Use the same section list as Task 3. In `OpenERP Takeaways`, explicitly separate:

- object-linked async communication;
- generic chat/channel features that should stay outside MVP unless later evidence requires them.

- [ ] **Step 3: Verify fiches**

Run:

```bash
rg -n "object-linked async communication|outside MVP|License And Reuse|Anti-Copy Notes" docs/study/02-fiches/zulip.md docs/study/02-fiches/rocketchat.md docs/study/02-fiches/mattermost.md
```

Expected: each fiche contains license, anti-copy, and MVP posture notes.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/02-fiches/zulip.md docs/study/02-fiches/rocketchat.md docs/study/02-fiches/mattermost.md
git commit -m "Add collaboration communication fiches"
git push origin main
```

## Task 6: Shortlist And Clone Plan

**Files:**

- Modify: `docs/study/03-shortlist/shortlist.md`
- Modify: `docs/study/05-graphify/README.md`

- [ ] **Step 1: Add collaboration shortlist section**

Add `## Collaboration Extension` to the shortlist with:

- candidates eligible for deeper technical study;
- candidates kept as functional reference only;
- candidates kept as proprietary benchmark only;
- reason each candidate is included or limited.

Do not introduce a comparative point system.

- [ ] **Step 2: Add source clone inventory section**

Add `## Collaboration Source Inventory` to `docs/study/05-graphify/README.md` with:

- target clone path under `research/sources/`;
- intended Graphify or no-Graphify treatment;
- license caution;
- evidence still needed.

- [ ] **Step 3: Verify shortlist and Graphify index**

Run:

```bash
rg -n "Collaboration Extension|functional reference only|proprietary benchmark only|deeper technical study" docs/study/03-shortlist/shortlist.md
rg -n "Collaboration Source Inventory|research/sources|Graphify" docs/study/05-graphify/README.md
```

Expected: collaboration shortlist and source inventory sections are present.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/03-shortlist/shortlist.md docs/study/05-graphify/README.md
git commit -m "Define collaboration shortlist"
git push origin main
```

## Task 7: Clone And Graphify Selected Candidates

**Files:**

- Modify: `docs/study/05-graphify/README.md`
- Create: `docs/study/05-graphify/<candidate-scope>/summary.md`

- [ ] **Step 1: Clone selected repositories outside git**

Create `research/sources/` if missing. Clone only candidates selected in Task 6 for deeper technical study.

Run one command per repository:

```bash
git clone --depth 1 <repository-url> research/sources/<candidate-slug>
```

Expected: each selected repository exists under `research/sources/`, which remains ignored by git.

- [ ] **Step 2: Record clone evidence**

For each selected repository, record:

- command used;
- HEAD commit;
- license file path;
- date checked;
- reason Graphify is or is not appropriate.

Use `docs/study/05-graphify/README.md` for the clone evidence table.

- [ ] **Step 3: Run Graphify where approved**

For each approved candidate, run Graphify against targeted modules only. Store raw output under:

```text
research/graphify/<candidate-scope>/
```

Create a concise summary under:

```text
docs/study/05-graphify/<candidate-scope>/summary.md
```

Each summary must include:

- repository URL;
- HEAD commit;
- license evidence;
- modules inspected;
- communities or clusters observed;
- functional findings rewritten in OpenERP language;
- anti-copy limitations.

- [ ] **Step 4: Verify Graphify summaries**

Run:

```bash
rg -n "repository URL|HEAD commit|license evidence|modules inspected|OpenERP language|anti-copy" docs/study/05-graphify
git status --short --ignored research/sources research/graphify
```

Expected: summaries contain provenance and ignored raw directories are not staged.

- [ ] **Step 5: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/05-graphify/README.md docs/study/05-graphify
git commit -m "Add collaboration Graphify summaries"
git push origin main
```

## Task 8: Collaboration Functional Map

**Files:**

- Create: `docs/study/06-functional-map/collaboration-functional-map.md`
- Modify: `docs/study/06-functional-map/global-functional-map.md`

- [ ] **Step 1: Create collaboration map**

Create sections for:

- embedded collaboration primitives;
- knowledge workspace;
- work management;
- async communication;
- files and attachments;
- notifications and inbox;
- decisions and approvals;
- customer-visible collaboration;
- permissions and audit;
- search and exports;
- self-hosted concerns;
- bilingual FR/EN behavior.

- [ ] **Step 2: Add ERP/CRM object links**

For each capability, map relationships to:

```text
customer
contact
opportunity
quote
contract
project
task
time entry
invoice
support case
asset
work order
audit event
```

- [ ] **Step 3: Link from global map**

Add a collaboration subsection to `global-functional-map.md` that points to the new map and summarizes how it supports the existing CRM, project, billing, reporting, automation, HR, and manufacturing domains.

- [ ] **Step 4: Verify functional map**

Run:

```bash
rg -n "embedded collaboration|knowledge workspace|work management|async communication|permissions and audit|bilingual" docs/study/06-functional-map/collaboration-functional-map.md
rg -n "collaboration-functional-map|Collaboration" docs/study/06-functional-map/global-functional-map.md
```

Expected: collaboration map and global link are present.

- [ ] **Step 5: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/06-functional-map/collaboration-functional-map.md docs/study/06-functional-map/global-functional-map.md
git commit -m "Add collaboration functional map"
git push origin main
```

## Task 9: MVP And Anti-Copy Addenda

**Files:**

- Create: `docs/study/07-mvp/collaboration-mvp-addendum.md`
- Modify: `docs/study/07-mvp/mvp-recommendation.md`
- Create: `docs/study/08-anti-copy/collaboration-anti-copy-addendum.md`
- Modify: `docs/study/08-anti-copy/anti-copy-dossier.md`

- [ ] **Step 1: Create MVP addendum**

Create sections:

- `MVP-Safe Collaboration`
- `Post-MVP Collaboration`
- `Integration-First Collaboration`
- `Deferred Collaboration`
- `ERP CRM Rationale`
- `Acceptance Questions For Later Specs`

The addendum must state that embedded comments, mentions, files, activity,
notifications, decisions, lightweight tasks, and customer/project pages are
earlier candidates than generic chat, full workspace databases, advanced
whiteboards, or full portfolio management.

- [ ] **Step 2: Link MVP addendum**

Add a short collaboration addendum reference to `mvp-recommendation.md` without replacing the existing MVP recommendation.

- [ ] **Step 3: Create anti-copy addendum**

Create sections:

- `Collaboration-Specific Expression Risks`
- `Permitted Functional Abstractions`
- `Blocked Reuse Examples`
- `Review Checklist`

The addendum must explicitly cover editor UI text, slash commands, block names,
templates, onboarding copy, demo spaces, screenshots, schema/API shapes, and
automation recipes.

- [ ] **Step 4: Link anti-copy addendum**

Add a short reference to the new addendum from `anti-copy-dossier.md`.

- [ ] **Step 5: Verify addenda**

Run:

```bash
rg -n "MVP-Safe Collaboration|Integration-First Collaboration|Deferred Collaboration|ERP CRM Rationale" docs/study/07-mvp/collaboration-mvp-addendum.md docs/study/07-mvp/mvp-recommendation.md
rg -n "Collaboration-Specific Expression Risks|slash commands|templates|schema/API shapes|Review Checklist" docs/study/08-anti-copy/collaboration-anti-copy-addendum.md docs/study/08-anti-copy/anti-copy-dossier.md
```

Expected: MVP and anti-copy addenda exist and are linked from their parent documents.

- [ ] **Step 6: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/07-mvp/collaboration-mvp-addendum.md docs/study/07-mvp/mvp-recommendation.md docs/study/08-anti-copy/collaboration-anti-copy-addendum.md docs/study/08-anti-copy/anti-copy-dossier.md
git commit -m "Add collaboration MVP and anti-copy addenda"
git push origin main
```

## Task 10: Final Synthesis And PPTX Update

**Files:**

- Modify: `docs/study/11-final-package/final-synthesis.md`
- Modify: `docs/study/11-final-package/openerp-final-synthesis.pptx`

- [ ] **Step 1: Update final Markdown synthesis**

Add or update sections:

- `Collaboration Extension`
- `Collaboration Corpus Evidence`
- `Collaboration MVP Impact`
- `Collaboration License And Anti-Copy`
- `Updated Next Step`

The final synthesis must keep the product decision: ERP/CRM/back-office first, collaboration as a transverse layer.

- [ ] **Step 2: Update PPTX**

Update the existing PPTX with a concise collaboration addendum:

- one slide for scope and product positioning;
- one slide for license posture and anti-copy;
- one slide for MVP impact.

Use existing visual style where possible. If a visual companion or Playwright preview is used, save only durable project artifacts that belong in git; keep temporary preview files ignored.

- [ ] **Step 3: Verify final package**

Run:

```bash
test -f docs/study/11-final-package/final-synthesis.md
test -f docs/study/11-final-package/openerp-final-synthesis.pptx
rg -n "Collaboration Extension|Collaboration MVP Impact|transverse layer|anti-copy" docs/study/11-final-package/final-synthesis.md
```

Expected: Markdown synthesis contains the collaboration extension and PPTX exists.

- [ ] **Step 4: Commit and push**

Run:

```bash
git status --short --branch
git add docs/study/11-final-package/final-synthesis.md docs/study/11-final-package/openerp-final-synthesis.pptx
git commit -m "Update final synthesis with collaboration extension"
git push origin main
```

## Task 11: Final Verification

**Files:**

- Read: all files changed by this plan.

- [ ] **Step 1: Verify required artifacts**

Run:

```bash
test -f docs/study/06-functional-map/collaboration-functional-map.md
test -f docs/study/07-mvp/collaboration-mvp-addendum.md
test -f docs/study/08-anti-copy/collaboration-anti-copy-addendum.md
test -f docs/study/11-final-package/openerp-final-synthesis.pptx
```

Expected: all files exist.

- [ ] **Step 2: Verify terminology guardrail**

Run:

```bash
rg -n "sco""re|sco""ring|wei""ghted|pond[eé]""r|ran""king|ran""ked|ran""kings" docs/study docs/superpowers/specs docs/superpowers/plans
```

Expected: no matches. `rg` exit code `1` is acceptable here because it means no matches.

- [ ] **Step 3: Verify anti-copy posture**

Run:

```bash
rg -n "functional reference only|public benchmark only|do not reuse|anti-copy|MIT|AGPL|BSL|source-available" docs/study/02-fiches docs/study/04-proprietary-references docs/study/08-anti-copy docs/study/11-final-package/final-synthesis.md
```

Expected: output shows reuse boundaries across fiches, proprietary references, anti-copy docs, and final synthesis.

- [ ] **Step 4: Verify git state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
```

Expected: branch is `main`, aligned with `origin/main`, with collaboration commits visible.

- [ ] **Step 5: Push final state**

Run:

```bash
git push origin main
```

Expected: push succeeds or reports everything up to date.
