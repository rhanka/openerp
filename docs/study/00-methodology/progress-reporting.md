# Progress Reporting

Every execution checkpoint must use exactly this three-line format:

```text
Fait: completed artifacts and verified facts.
À faire: remaining work and approximate completion percent.
Attendu: decision or action needed, with a recommendation.
```

Every checkpoint must include a proposed next action. If no user decision is needed, `Attendu` must state the next action the agent will take and why.

## Example: Completed Methodology Checkpoint

```text
Fait: assessment method, license risk matrix, and progress reporting rules are drafted and verified.
À faire: candidate inventory and corpus report remain; approximate completion 15%.
Attendu: proceed to candidate inventory setup, because corpus discovery depends on a normalized schema.
```

## Example: Corpus Discovery Checkpoint

```text
Fait: mandatory seed candidates are recorded with repository URLs, primary sites, and unknown evidence fields marked.
À faire: discover additional open source candidates to reach the 15-30 project target; approximate completion 25%.
Attendu: continue discovery in accounting, HR, payroll, MES, WMS, and service operations, because coverage gaps remain.
```
