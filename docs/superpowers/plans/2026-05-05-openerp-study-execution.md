# OpenERP Study Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an evidence-backed open source product study that decides which ERP/CRM/back-office modules to build first, which projects can safely inform them, and which research artifacts should feed later Svelte/TypeScript/TypeScript+Rust implementation specs.

**Architecture:** This is a research execution plan, not application code. It creates a structured study workspace under `docs/study/`, keeps cloned source repositories outside git under `research/sources/`, runs Graphify only after the first assessment, and turns raw findings into written functional specs and decision reports.

**Tech Stack:** Markdown, CSV, GitHub CLI, Git, Graphify TypeScript runtime, shell verification commands, optional web/browser research for public product references.

---

## Avancement

Fait: 100%

- Study design spec approved by the user.
- Repository created and pushed to `rhanka/openerp`.
- MIT selected as the target license.
- Assessment wording corrected so no ranking method is promised before this execution plan.

À faire: 0% démarré

- Create study workspace and research templates.
- Define evidence-based assessment method.
- Discover the 15-30 project corpus.
- Produce candidate fiches.
- Select shortlist.
- Clone shortlist repositories.
- Run Graphify on approved shortlist targets.
- Produce final corpus report, positioning report, functional map, MVP recommendation, license dossier, and Graphify dossier.

Attendu: decision/action

- User chooses execution mode after this plan: subagent-driven or inline execution.
- Recommended decision: use subagent-driven execution for discovery and fiche writing, then inline review for shortlist and final synthesis.

## Progress Reporting Rule

Every execution checkpoint must include exactly these three lines:

```text
Fait: completed artifacts and verified facts.
À faire: remaining work and approximate completion percent.
Attendu: decision or action needed, with a recommendation.
```

If no user decision is needed, `Attendu` must say the next action the agent will take and why.

## Scope Check

The study covers multiple business domains: services, recurring services, back office, HR, payroll, accounting, CRM, ERP, manufacturing, MES, WMS, BI/reporting, and workflow automation. This plan does not implement those domains. It only produces research artifacts and first implementation-ready functional specs required to decide the initial product scope.

The plan separates:

- discovery of open source products;
- legal/license risk assessment;
- functional coverage assessment;
- deep source analysis and Graphify;
- written functional specs that can later feed implementation.

## Assessment Method

This plan uses a qualitative evidence grid, not numeric ranking.

Each candidate receives these ratings per criterion:

- `Strong`: clear evidence supports use as a product reference or deeper technical study.
- `Partial`: useful in a narrow domain, but gaps or risks are material.
- `Weak`: limited evidence, poor fit, or poor maturity.
- `Unknown`: not enough evidence gathered yet.
- `Blocked`: license, maintenance, or legal risk prevents technical use for the MIT target.

License is a gate:

- permissive licenses such as MIT, Apache-2.0, and BSD are eligible for deeper technical inspiration after obligation review;
- MPL and weak-copyleft licenses require explicit review before technical reuse;
- GPL and AGPL are allowed as functional references and architecture references, but are treated as higher risk for a future MIT implementation;
- proprietary products are benchmark references only and never reusable sources.

The final corpus report may propose a later prioritization model if useful, but this plan uses qualitative ratings only.

## File Structure

Create and maintain these files and directories:

- `docs/study/README.md`: study index and current status.
- `docs/study/00-methodology/assessment-method.md`: qualitative assessment method, evidence rules, and license gate.
- `docs/study/00-methodology/license-risk-matrix.md`: license obligations and reuse classifications.
- `docs/study/00-methodology/progress-reporting.md`: required progress reporting format.
- `docs/study/01-corpus/candidates.csv`: normalized candidate inventory.
- `docs/study/01-corpus/corpus-report.md`: narrative corpus synthesis.
- `docs/study/02-fiches/`: one candidate fiche per project.
- `docs/study/03-shortlist/shortlist.md`: shortlist and rationale by domain.
- `docs/study/04-proprietary-references/proprietary-reference-map.md`: public benchmark references only.
- `docs/study/05-graphify/README.md`: Graphify run index and provenance.
- `docs/study/06-functional-map/global-functional-map.md`: cross-domain functional map.
- `docs/study/07-mvp/mvp-recommendation.md`: MVP recommendation and deferred domains.
- `docs/study/08-anti-copy/anti-copy-dossier.md`: recoding rules and audit checklist.
- `research/sources/`: local clones of shortlisted repositories, excluded from git.
- `research/graphify/`: Graphify outputs, excluded from git unless a specific report is intentionally summarized into `docs/study/05-graphify/`.

## Task 1: Repository Study Workspace

**Files:**

- Modify: `.gitignore`
- Create: `docs/study/README.md`
- Create: `docs/study/00-methodology/progress-reporting.md`

- [ ] **Step 1: Add research output ignores**

Modify `.gitignore` so it contains these lines:

```gitignore
.git-local/
.playwright-mcp/
.superpowers/
openerp-scope-map-viewport.png
*.swp
research/sources/
research/graphify/
```

- [ ] **Step 2: Create study index**

Create `docs/study/README.md` with a title, a `Current Status` section using `Fait`, `À faire`, and `Attendu`, and an artifact index for every file listed in the File Structure section.

- [ ] **Step 3: Create progress reporting rules**

Create `docs/study/00-methodology/progress-reporting.md` with:

- the exact three-line progress format;
- one example for a completed methodology checkpoint;
- one example for a corpus discovery checkpoint;
- the rule that every checkpoint must include a proposed next action.

- [ ] **Step 4: Verify workspace files**

Run:

```bash
test -f docs/study/README.md
test -f docs/study/00-methodology/progress-reporting.md
rg -n "Fait:|À faire:|Attendu:" docs/study/README.md docs/study/00-methodology/progress-reporting.md
```

Expected: both files exist and `rg` prints all three reporting labels.

- [ ] **Step 5: Commit workspace setup**

Run:

```bash
git --git-dir=.git-local --work-tree=. add .gitignore docs/study/README.md docs/study/00-methodology/progress-reporting.md
git --git-dir=.git-local --work-tree=. commit -m "Add study workspace"
```

## Task 2: Methodology And License Matrix

**Files:**

- Create: `docs/study/00-methodology/assessment-method.md`
- Create: `docs/study/00-methodology/license-risk-matrix.md`

- [ ] **Step 1: Create assessment method**

Create `docs/study/00-methodology/assessment-method.md` with these sections:

- `Ratings`: define `Strong`, `Partial`, `Weak`, `Unknown`, and `Blocked`.
- `Criteria`: list license, reuse status, functional coverage, maturity, architecture, UX, i18n/l10n, Quebec/Canada relevance, SaaS/self-hosted/Kubernetes relevance, integration/API maturity, security, maintenance, and dependency risk.
- `Evidence Rules`: every rating must cite repository URL, checked commit/tag/branch, license evidence, documentation or source path, and date checked.
- `License Gate`: license is the only hard gate in this phase.
- `No Numeric Weighting In This Phase`: qualitative assessment only.

- [ ] **Step 2: Create license risk matrix**

Create `docs/study/00-methodology/license-risk-matrix.md` with:

- a table for MIT, Apache-2.0, BSD, MPL, LGPL, GPL, AGPL, and proprietary references;
- one row per license family covering technical reuse posture, functional study posture, MIT target risk, and required handling;
- reuse classifications: `usable`, `cautious inspiration`, `functional reference only`, and `excluded`;
- anti-copy boundary for code, UI text, docs, assets, tests, demo data, internal names, and unusually specific schemas/APIs.

- [ ] **Step 3: Verify methodology**

Run:

```bash
rg -n "No Numeric Weighting|License Gate|AGPL|functional reference only|Anti-Copy" docs/study/00-methodology
```

Expected: output includes the non-numeric assessment rule, the license gate, AGPL handling, and anti-copy boundary.

- [ ] **Step 4: Commit methodology**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/00-methodology/assessment-method.md docs/study/00-methodology/license-risk-matrix.md
git --git-dir=.git-local --work-tree=. commit -m "Define study methodology"
```

## Task 3: Candidate Inventory Schema

**Files:**

- Create: `docs/study/01-corpus/candidates.csv`
- Create: `docs/study/01-corpus/corpus-report.md`

- [ ] **Step 1: Create candidate CSV**

Create `docs/study/01-corpus/candidates.csv` with this header:

```csv
project_slug,project_name,category,repository_url,primary_site,license_declared,reuse_classification,coverage_summary,maturity_rating,license_rating,quebec_canada_relevance,saas_selfhost_k8s_relevance,notes,date_checked
```

Add mandatory seed rows for:

- `odoo`, Odoo, ERP suite, `https://github.com/odoo/odoo`, `https://www.odoo.com`;
- `twenty`, Twenty, CRM, `https://github.com/twentyhq/twenty`, `https://twenty.com`;
- `erpnext`, ERPNext, ERP suite, `https://github.com/frappe/erpnext`, `https://erpnext.com`;
- `dolibarr`, Dolibarr, ERP suite, `https://github.com/Dolibarr/dolibarr`, `https://www.dolibarr.org`.

For seed rows, set unknown evidence fields to `Unknown` and notes to `Initial seed from user-approved spec`.

- [ ] **Step 2: Create corpus report**

Create `docs/study/01-corpus/corpus-report.md` with:

- `Progress` using `Fait`, `À faire`, and `Attendu`;
- `Corpus Rules` explaining 15-30 open source candidates, proprietary separation, and use of `Unknown`;
- `Current Corpus` pointing to `docs/study/01-corpus/candidates.csv`.

- [ ] **Step 3: Verify seed inventory**

Run:

```bash
awk -F, 'NR > 1 {print $1}' docs/study/01-corpus/candidates.csv
```

Expected output:

```text
odoo
twenty
erpnext
dolibarr
```

- [ ] **Step 4: Commit candidate inventory schema**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/01-corpus/candidates.csv docs/study/01-corpus/corpus-report.md
git --git-dir=.git-local --work-tree=. commit -m "Add candidate inventory schema"
```

## Task 4: Open Source Corpus Discovery

**Files:**

- Modify: `docs/study/01-corpus/candidates.csv`
- Modify: `docs/study/01-corpus/corpus-report.md`

- [ ] **Step 1: Run repository discovery searches**

Run GitHub and web searches for these domains:

```text
open source ERP
open source CRM
open source accounting invoicing
open source HR payroll
open source subscription billing
open source project time expenses
open source MRP MES WMS
open source maintenance quality manufacturing
```

When using GitHub CLI, use commands shaped like:

```bash
gh search repos "open source ERP" --limit 30 --json fullName,url,description,license,updatedAt,stargazersCount
gh search repos "open source MES manufacturing" --limit 30 --json fullName,url,description,license,updatedAt,stargazersCount
gh search repos "open source payroll HR" --limit 30 --json fullName,url,description,license,updatedAt,stargazersCount
```

Expected: each command returns JSON results or a clear auth/network error. If auth/network fails, record the blocker in the progress report and use browser/web search as fallback.

- [ ] **Step 2: Add discovered candidates**

Update `docs/study/01-corpus/candidates.csv` until it contains 15-30 rows. Use `Unknown` only for fields whose evidence has not yet been checked. Do not infer license from memory.

- [ ] **Step 3: Update corpus progress**

Update the Progress section in `docs/study/01-corpus/corpus-report.md`.

Use:

- `50%` when 15-19 candidates are listed;
- `65%` when 20-24 candidates are listed;
- `75%` when 25-30 candidates are listed.

- [ ] **Step 4: Verify corpus size**

Run:

```bash
awk -F, 'NR > 1 {count++} END {print count}' docs/study/01-corpus/candidates.csv
```

Expected: a number between 15 and 30.

- [ ] **Step 5: Commit discovered corpus**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/01-corpus/candidates.csv docs/study/01-corpus/corpus-report.md
git --git-dir=.git-local --work-tree=. commit -m "Discover open source corpus"
```

## Task 5: Mandatory Candidate Fiches

**Files:**

- Create: `docs/study/02-fiches/odoo.md`
- Create: `docs/study/02-fiches/twenty.md`
- Create: `docs/study/02-fiches/erpnext.md`
- Create: `docs/study/02-fiches/dolibarr.md`

- [ ] **Step 1: Write Odoo fiche**

Create `docs/study/02-fiches/odoo.md`. Include these sections with evidence-backed content:

- `Progress`
- `Identity`
- `License`
- `Functional Coverage`
- `Architecture And Operations`
- `Risks`
- `Graphify Eligibility`

Required facts:

- Project: Odoo.
- Repository: `https://github.com/odoo/odoo`.
- Primary site: `https://www.odoo.com`.
- Graphify target: yes.
- Reason: mandatory target from approved spec.

Do not commit until every section contains evidence or an explicit `Unknown` rationale.

- [ ] **Step 2: Write Twenty fiche**

Create `docs/study/02-fiches/twenty.md` using the same sections. Required facts:

- Project: Twenty.
- Repository: `https://github.com/twentyhq/twenty`.
- Primary site: `https://twenty.com`.
- Graphify target: yes.
- Reason: mandatory target from approved spec.

Do not commit until every section contains evidence or an explicit `Unknown` rationale.

- [ ] **Step 3: Write ERPNext fiche**

Create `docs/study/02-fiches/erpnext.md` using the same sections. Required facts:

- Project: ERPNext.
- Repository: `https://github.com/frappe/erpnext`.
- Primary site: `https://erpnext.com`.
- Graphify target: conditional.
- Reason: Graphify if initial assessment keeps ERPNext in the shortlist.

Do not commit until every section contains evidence or an explicit `Unknown` rationale.

- [ ] **Step 4: Write Dolibarr fiche**

Create `docs/study/02-fiches/dolibarr.md` using the same sections. Required facts:

- Project: Dolibarr.
- Repository: `https://github.com/Dolibarr/dolibarr`.
- Primary site: `https://www.dolibarr.org`.
- Graphify target: conditional.
- Reason: Graphify if initial assessment keeps Dolibarr in the shortlist for ERP/back-office coverage.

Do not commit until every section contains evidence or an explicit `Unknown` rationale.

- [ ] **Step 5: Verify first fiches**

Run:

```bash
rg -n "Project: Odoo|Project: Twenty|Project: ERPNext|Project: Dolibarr|Graphify target" docs/study/02-fiches
```

Expected: output proves all four fiches exist and declare Graphify eligibility.

- [ ] **Step 6: Commit first fiches**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/02-fiches/odoo.md docs/study/02-fiches/twenty.md docs/study/02-fiches/erpnext.md docs/study/02-fiches/dolibarr.md
git --git-dir=.git-local --work-tree=. commit -m "Assess mandatory seed candidates"
```

## Task 6: Remaining Candidate Fiches

**Files:**

- Create: one `docs/study/02-fiches/PROJECT_SLUG.md` file for each non-seed candidate.
- Modify: `docs/study/01-corpus/candidates.csv`

- [ ] **Step 1: Create one fiche per remaining candidate**

For each remaining row in `docs/study/01-corpus/candidates.csv`, create one fiche with the same sections used in Task 5.

Each fiche must include evidence for:

- license;
- functional coverage;
- maturity;
- architecture;
- localization;
- SaaS/self-hosted/Kubernetes relevance;
- integration/API maturity;
- risks;
- Graphify eligibility.

- [ ] **Step 2: Update candidate CSV from fiches**

For each fiche, update these columns in `docs/study/01-corpus/candidates.csv`:

```text
license_declared,reuse_classification,coverage_summary,maturity_rating,license_rating,quebec_canada_relevance,saas_selfhost_k8s_relevance,notes,date_checked
```

Use the fiche as the source of truth.

- [ ] **Step 3: Verify fiche coverage**

Run:

```bash
candidate_count=$(awk -F, 'NR > 1 {count++} END {print count}' docs/study/01-corpus/candidates.csv)
fiche_count=$(find docs/study/02-fiches -name '*.md' | wc -l)
printf 'candidates=%s fiches=%s\n' "$candidate_count" "$fiche_count"
```

Expected: both counts are equal.

- [ ] **Step 4: Commit remaining fiches**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/02-fiches docs/study/01-corpus/candidates.csv
git --git-dir=.git-local --work-tree=. commit -m "Assess remaining corpus candidates"
```

## Task 7: Shortlist And Proprietary Reference Map

**Files:**

- Create: `docs/study/03-shortlist/shortlist.md`
- Create: `docs/study/04-proprietary-references/proprietary-reference-map.md`

- [ ] **Step 1: Create shortlist**

Create `docs/study/03-shortlist/shortlist.md` with:

- `Progress`
- `Selection Rules`
- `Shortlisted Projects`
- `Excluded From Deep Analysis`
- `User Decision`

Selection rules:

- include Odoo and Twenty because the approved spec requires them;
- include at least one candidate for ERP/back office if evidence supports it;
- include at least one candidate for services/recurring operations if evidence supports it;
- include at least one candidate for MRP/MES/WMS if evidence supports it;
- include accounting, HR, or payroll candidates only when evidence shows meaningful localization or extensibility value;
- exclude projects blocked by license or maintenance risk from technical reuse, while preserving them as functional references when useful.

- [ ] **Step 2: Create proprietary reference map**

Create `docs/study/04-proprietary-references/proprietary-reference-map.md` with rows for:

- Workday: HR, payroll, finance;
- Wave: small business invoicing/accounting;
- QuickBooks: accounting, invoicing, payroll ecosystem;
- Sage: accounting and ERP;
- SAP Business One: SME ERP.

For each row, state public benchmark use and reuse boundary. The reuse boundary must say no code, docs, UI text, assets, or private behavior.

- [ ] **Step 3: Verify shortlist and proprietary boundary**

Run:

```bash
rg -n "Odoo|Twenty|Graphify|Workday|Wave|QuickBooks|No code|no code" docs/study/03-shortlist docs/study/04-proprietary-references
```

Expected: output shows mandatory shortlist entries and proprietary reuse boundary.

- [ ] **Step 4: Commit shortlist**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/03-shortlist/shortlist.md docs/study/04-proprietary-references/proprietary-reference-map.md
git --git-dir=.git-local --work-tree=. commit -m "Select study shortlist"
```

## Task 8: Clone Shortlist Sources

**Files:**

- Create: `research/sources/README.md`
- Create or modify: `docs/study/05-graphify/README.md`

- [ ] **Step 1: Create local source README**

Create `research/sources/README.md` explaining:

- local clones are used for study analysis;
- the directory is excluded from git;
- every clone must be documented in `docs/study/05-graphify/README.md`;
- required clone metadata: repository URL, branch, commit, clone date, license file path, Graphify run status.

- [ ] **Step 2: Clone shortlisted repositories**

For each project marked for Graphify in `docs/study/03-shortlist/shortlist.md`, run:

```bash
mkdir -p research/sources
git clone REPOSITORY_URL research/sources/PROJECT_SLUG
git -C research/sources/PROJECT_SLUG rev-parse HEAD
git -C research/sources/PROJECT_SLUG branch --show-current
```

Replace `REPOSITORY_URL` and `PROJECT_SLUG` in the command before execution.

- [ ] **Step 3: Create Graphify run index**

Create `docs/study/05-graphify/README.md` with:

- `Progress`
- one run table with project, repository, local path, branch, commit, license path, Graphify status, and notes;
- Odoo and Twenty rows;
- rows for every additional Graphify target approved by shortlist.

- [ ] **Step 4: Verify clone documentation**

Run:

```bash
find research/sources -maxdepth 2 -name .git -type d | sort
rg -n "Odoo|Twenty|research/sources|Graphify status" docs/study/05-graphify/README.md
```

Expected: the `find` command prints one `.git` directory per cloned target; the Graphify index names each target.

- [ ] **Step 5: Commit clone documentation**

Run:

```bash
git --git-dir=.git-local --work-tree=. add research/sources/README.md docs/study/05-graphify/README.md
git --git-dir=.git-local --work-tree=. commit -m "Document shortlist source clones"
```

## Task 9: Graphify Runs

**Files:**

- Modify: `docs/study/05-graphify/README.md`
- Create: one `docs/study/05-graphify/PROJECT_SLUG-summary.md` file per Graphify target.

- [ ] **Step 1: Verify Graphify runtime**

Run:

```bash
GRAPHIFY_BIN=$(command -v graphify 2>/dev/null || true)
NODE_BIN=$(command -v node 2>/dev/null || true)
test -n "$GRAPHIFY_BIN"
test -n "$NODE_BIN"
```

Expected: both `test` commands pass. If either fails, stop and report the missing dependency in the required progress format.

- [ ] **Step 2: Run Graphify on each approved target**

For each approved target:

```bash
graphify research/sources/PROJECT_SLUG --scope auto
```

Replace `PROJECT_SLUG` before execution.

Expected:

- `.graphify/.graphify_runtime.json` exists in the Graphify working context;
- the runtime JSON contains `"runtime": "typescript"`;
- Graphify produces HTML, JSON, and report artifacts.

- [ ] **Step 3: Archive run outputs outside git**

For each project, copy or move Graphify generated outputs to:

```text
research/graphify/PROJECT_SLUG/
```

Do not commit large generated Graphify artifacts unless the user explicitly asks.

- [ ] **Step 4: Write Graphify summaries**

For each project, create `docs/study/05-graphify/PROJECT_SLUG-summary.md` with:

- provenance: repository, local path, commit, Graphify output path, and TypeScript runtime proof;
- key communities;
- architecture signals;
- functional signals;
- reuse and anti-copy notes;
- impact on future functional specs.

- [ ] **Step 5: Update Graphify index**

In `docs/study/05-graphify/README.md`, mark each completed run and link its summary file.

- [ ] **Step 6: Verify Graphify summaries**

Run:

```bash
rg -n "TypeScript runtime|completed|Graphify output path|anti-copy" docs/study/05-graphify
```

Expected: runtime and completion evidence appears for each run.

- [ ] **Step 7: Commit Graphify summaries**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/05-graphify
git --git-dir=.git-local --work-tree=. commit -m "Summarize Graphify analysis"
```

## Task 10: Functional Map

**Files:**

- Create: `docs/study/06-functional-map/global-functional-map.md`

- [ ] **Step 1: Create global functional map**

Create `docs/study/06-functional-map/global-functional-map.md` with:

- `Progress`
- `Domains`
- `Cross-Cutting Requirements`
- `Localization Requirements`
- `Deferred Areas`

The domain table must cover:

- CRM;
- services;
- recurring services;
- accounting;
- HR;
- payroll;
- manufacturing/MES;
- platform;
- BI/reporting and workflow automation.

Cross-cutting requirements must include bilingual French/English, multi-country architecture, Quebec/Canada priority, SaaS multi-tenant, self-hosted Kubernetes, update support windows, MIT target license, and written-spec recoding model.

- [ ] **Step 2: Verify functional map**

Run:

```bash
rg -n "CRM|recurring services|Payroll|Manufacturing/MES|BI/reporting|Quebec|Kubernetes|MIT" docs/study/06-functional-map/global-functional-map.md
```

Expected: every domain and cross-cutting requirement appears.

- [ ] **Step 3: Commit functional map**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/06-functional-map/global-functional-map.md
git --git-dir=.git-local --work-tree=. commit -m "Map global functional scope"
```

## Task 11: MVP Recommendation

**Files:**

- Create: `docs/study/07-mvp/mvp-recommendation.md`

- [ ] **Step 1: Create MVP recommendation**

Create `docs/study/07-mvp/mvp-recommendation.md` with:

- `Progress`
- `Recommendation`
- `Included Modules`
- `Deferred Modules`
- `Integration-First Modules`
- `First Implementation Spec Candidates`

The recommendation must explicitly address:

- services and recurring services as the horizontal core;
- back office feasibility for accounting, HR, and payroll with Quebec/Canada priority;
- manufacturing/MES as a vertical pack;
- modules deferred because open source coverage or localization evidence is weak;
- first implementation-ready functional specs to write.

- [ ] **Step 2: Verify MVP recommendation**

Run:

```bash
rg -n "Recommendation|Included Modules|Deferred Modules|Integration-First Modules|First Implementation Spec Candidates|Quebec|manufacturing" docs/study/07-mvp/mvp-recommendation.md
```

Expected: all key sections and required themes appear.

- [ ] **Step 3: Commit MVP recommendation**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/07-mvp/mvp-recommendation.md
git --git-dir=.git-local --work-tree=. commit -m "Recommend MVP scope"
```

## Task 12: Anti-Copy Dossier

**Files:**

- Create: `docs/study/08-anti-copy/anti-copy-dossier.md`

- [ ] **Step 1: Create anti-copy dossier**

Create `docs/study/08-anti-copy/anti-copy-dossier.md` with:

- `Recoding Model`
- `Do Not Copy`
- `Allowed Research Use`
- `Pre-Merge Audit Checklist`

The dossier must state:

- existing projects may be observed and analyzed;
- future specs must be written in original French and English wording;
- future implementation starts from OpenERP specs, not translated source files;
- no source code, UI text, docs, assets, tests, demo data, internal names, or unusually specific schemas/APIs may be copied;
- AGPL/GPL sources influence functional specs only unless a separate legal decision approves deeper reuse.

- [ ] **Step 2: Verify anti-copy dossier**

Run:

```bash
rg -n "AGPL|GPL|MIT|Do Not Copy|Pre-Merge Audit Checklist|original French and English" docs/study/08-anti-copy/anti-copy-dossier.md
```

Expected: output includes license posture and audit checklist.

- [ ] **Step 3: Commit anti-copy dossier**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/08-anti-copy/anti-copy-dossier.md
git --git-dir=.git-local --work-tree=. commit -m "Add anti-copy dossier"
```

## Task 13: Final Study Package

**Files:**

- Modify: `docs/study/README.md`
- Modify: `docs/study/01-corpus/corpus-report.md`

- [ ] **Step 1: Update study README final status**

Update `docs/study/README.md` Current Status to state:

- methodology completed;
- corpus completed;
- candidate fiches completed;
- shortlist completed;
- Graphify summaries completed;
- functional map completed;
- MVP recommendation completed;
- anti-copy dossier completed;
- user decision needed on the first implementation-ready functional spec.

- [ ] **Step 2: Update corpus report final synthesis**

Update `docs/study/01-corpus/corpus-report.md` with:

- corpus size;
- number of shortlisted candidates;
- number of Graphify runs completed;
- strongest functional references by domain;
- strongest permissive-license references by domain;
- higher-risk copyleft functional references by domain;
- proprietary benchmark references;
- decisions needed.

- [ ] **Step 3: Final verification**

Run:

```bash
rg -n "Fait:|À faire:|Attendu:" docs/study
git --git-dir=.git-local --work-tree=. status -sb
```

Expected: study files include progress labels; git status shows only intended final report changes before commit.

- [ ] **Step 4: Commit final package**

Run:

```bash
git --git-dir=.git-local --work-tree=. add docs/study/README.md docs/study/01-corpus/corpus-report.md
git --git-dir=.git-local --work-tree=. commit -m "Finalize study package"
```

- [ ] **Step 5: Push all commits**

Run:

```bash
git --git-dir=.git-local --work-tree=. push
```

Expected: `main` pushes to `https://github.com/rhanka/openerp.git`.

## Self-Review Checklist

Spec requirement coverage:

- Fully open source MIT target: Task 2 and Task 12.
- French/English and multi-country with Quebec/Canada priority: Task 10 and Task 11.
- SaaS multi-tenant and self-hosted Kubernetes update policy: Task 10.
- Services and recurring-services core: Task 10 and Task 11.
- Manufacturing/MES as vertical pack: Task 4, Task 7, Task 10, and Task 11.
- 15-30 open source corpus: Task 4.
- Odoo, Twenty, ERPNext, Dolibarr mandatory seeds: Task 3 and Task 5.
- Proprietary products as benchmark only: Task 7.
- License and anti-copy policy: Task 2 and Task 12.
- Graphify after assessment on shortlist: Task 8 and Task 9.
- Progressive specs and MVP recommendation: Task 10 and Task 11.
- Progress reporting format: Task 1 and every checkpoint rule.

Commit rule:

- Commit after each task with the exact commit message in that task.
- Keep generated clones and large Graphify outputs out of git unless the user explicitly asks to version them.
