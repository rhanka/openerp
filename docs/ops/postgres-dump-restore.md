# PostgreSQL dump / restore / census

`tools/pg-ops.mjs` drives `pg_dump`, `pg_restore`, `pg_dumpall` and `psql` for the OpenERP tenant
database. It is the prerequisite that `docs/ops/postgres-18-upgrade-plan.md` §7 described as missing,
and it is also the ordinary dump path once the upgrade is done.

Node and the PostgreSQL image's own binaries, nothing else. No Python, per the owner's supply-chain
rule: a Python job would mean a new unvalidated container image.

---

## 1. Why a census, and not just a dump

A `pg_restore` that exits 0 proves nothing. It can skip objects, it can restore an empty table, and
with `force row level security` in play it can do both while reporting success.

So the tool's acceptance gate is a structural census taken on both sides and compared:

```
census source  →  globals-dump  →  dump  →  globals-restore  →  restore  →  census target  →  diff
```

`diff` exits 0 only when the two structures are identical. It compares schemas, roles, tables,
columns, indexes, constraints, triggers, policies, routines, sequences, owners, grants, partition
parentage, RLS flags and per-table row counts.

## 2. Backends

One code path, three ways to reach the client binaries.

| `--target` | Where the binaries run | Credentials |
|---|---|---|
| `local` | this machine's `PATH` | DSN read from an environment variable named by `--dsn-env`, split into `PG*` variables |
| `docker` | inside `--container` | the container's own `$POSTGRES_PASSWORD` |
| `k8s` | inside `--pod`, via `kubectl exec -i` | the pod's own `$POSTGRES_PASSWORD` |

No credential is ever an argv element. For the exec backends the shell inside the container
dereferences the password by name, so the value never appears in our process table, our logs, or the
apiserver audit record of the exec. The exec backends use the binaries the PostgreSQL image already
ships, so no new image enters the supply chain.

`--host` and `--port` point the client at a server other than the one hosting it. That is how a
cross-version dump is taken correctly: PostgreSQL supports a **newer** `pg_dump` reading an **older**
server, never the reverse, so a 16 → 18 move is dumped by the 18 client.

## 3. Two traps the tool handles for you

### 3.1 Forced row-level security

Protected tables carry `force row level security`, which applies to the table owner too. A `pg_dump`
by a role without `BYPASSRLS` either fails or dumps only the rows its policies expose. `dump` runs a
preflight and refuses when forced-RLS tables exist and the role cannot bypass them; `--force` accepts
a deliberately partial export.

The same applies to counting: the census records `rows_trustworthy`, false when the role cannot
bypass forced RLS, so row counts are never silently compared when they cannot be trusted.

In our clusters `openerp` is the container's `POSTGRES_USER` and therefore the cluster superuser, so
the preflight passes. `openerp_app` (`nologin nobypassrls`, migration `0003`) would not.

### 3.2 Roles live in the cluster, not in the database

A database dump carries no roles. Migrations `0003` and `0042` create the nologin service roles
`openerp_app` and `openerp_auth_system`, and functions are owned by the latter, so a restore into a
fresh server fails on the first `ALTER FUNCTION ... OWNER TO`:

```
pg_restore: error: could not execute query: ERROR:  role "openerp_auth_system" does not exist
```

`globals-dump` / `globals-restore` carry the roles across, using `pg_dumpall --globals-only
--no-role-passwords`. Password hashes are deliberately excluded: the service roles are `nologin` and
have none, the login role already exists on any target worth restoring into, and an artifact that
carries no secret is one fewer thing to protect.

`globals-restore` tolerates `already exists` — the target cluster has its own login role — and fails
on anything else. Its exit code is not the proof; the census diff is.

## 4. Cross-version diffs report representation changes, not loss

A naive structural comparison across majors produces false alarms. A verified 16 → 18 rehearsal
produced 699 differences, every one of them a representation change with nothing lost:

| Differences | Cause | Handling |
|---|---|---|
| 558 | PostgreSQL 18 materialises `NOT NULL` as `pg_constraint` rows of type `n`; 16 holds the same fact only in `pg_attribute.attnotnull` | type `n` excluded from the census — `columns[].notnull` is the version-stable source for the same constraint |
| 140 | `MAINTAIN`, a privilege added in PostgreSQL 17, widens the owner's implicit grant from `arwdDxt` to `arwdDxtm` | `diff` compares in the older server's privilege vocabulary and prints a `note:` line saying which letters it dropped from both sides |
| 1 | `pgcrypto` 1.3 → 1.4 adds `fips_mode()` | routines an extension owns are reported under `environment.extension_objects`, where a delta is information rather than a failure |

Zero constraints, columns, indexes, triggers, policies or rows were lost. Nothing is normalised
silently: every normalisation prints what it did.

## 5. Verified rehearsal, 16.15 → 18.6

Run against two containers on one docker network, with the repository's own 43 migrations and
`seed:dev` data.

```bash
# 1. Source: 43 migrations + seed on postgres:16-alpine
OPENERP_DATABASE_URL=postgresql://openerp:...@127.0.0.1:55432/openerp \
  npm run migrate -w @sentropic/openerp-api
OPENERP_DATABASE_URL=... npm run seed:dev -w @sentropic/openerp-api

# 2. Census the source
node tools/pg-ops.mjs census --target docker --container pgops16 \
  --user openerp --database openerp --out census-16.json

# 3. Roles, then the database — both dumped by the 18 client against the 16 server
node tools/pg-ops.mjs globals-dump --target docker --container pgops18 \
  --host pgops16 --port 5432 --user openerp --database openerp --out globals.sql
node tools/pg-ops.mjs dump --target docker --container pgops18 \
  --host pgops16 --port 5432 --user openerp --database openerp --out openerp-16.dump

# 4. Restore into 18.6, all or nothing
node tools/pg-ops.mjs globals-restore --target docker --container pgops18 \
  --user openerp --database openerp --in globals.sql
node tools/pg-ops.mjs restore --target docker --container pgops18 \
  --user openerp --database openerp --single-transaction --in openerp-16.dump

# 5. Census the target and compare
node tools/pg-ops.mjs census --target docker --container pgops18 \
  --user openerp --database openerp --out census-18.json
node tools/pg-ops.mjs diff census-16.json census-18.json
```

Result, identical on both sides:

| Measure | 16.15 | 18.6 |
|---|---|---|
| Tables | 70 (1 partitioned, 2 partitions) | 70 (1 partitioned, 2 partitions) |
| Forced RLS | 62 | 62 |
| Policies | 124 | 124 |
| Triggers | 7 | 7 |
| Indexes | 186 | 186 |
| Constraints | 339 | 339 |
| Rows | 75 | 75 |
| Locale / provider | `en_US.utf8` / libc | `en_US.utf8` / libc |

`diff` reports `structure identical` and exits 0. The only remaining deltas are the four expected
environment ones: server version, `server_version_num`, `pgcrypto` 1.3 → 1.4, and the `fips_mode()`
that 1.4 brings.

A first attempt at step 4 without step 3 failed exactly as §3.2 describes, and `--single-transaction`
rolled it back to an empty target — 0 tables, verified. The all-or-nothing guarantee holds.

### 5.1 The gate was also proved in the failing direction

A gate that has only ever passed is not a gate. Three degradations were applied to the restored 18.6
target and the diff was re-run:

| Degradation | Detected as |
|---|---|
| `drop index accounts_org_active_idx` | `structure.indexes [missing in after]`, with the full index definition |
| `drop policy accounts_tenant_select on accounts` | `structure.policies [missing in after]`, with the `USING` expression |
| `delete` of 3 of the 6 `accounts` rows | `structure.tables`, `rows` 6 → 3 |

Four structural differences reported, exit code 1. A fourth attempted degradation — dropping a
trigger from a single partition — was refused by PostgreSQL itself, so it is not counted above.

## 6. Cluster use

Same commands, `--target k8s`:

```bash
node tools/pg-ops.mjs census --target k8s --context openerp-prod \
  --namespace openerp-prod --pod openerp-postgres-0 \
  --user openerp --database openerp --out census-before.json
```

Per the upgrade plan §4 the dump stays inside the cluster, written to the new pod's PVC, so no copy
leaves the namespace and the residency guards stay out of the question. Writing to a local file with
`--out` pulls the archive through `kubectl exec` to this machine instead; use it for a rehearsal, not
for the production window.

## 7. Not covered

- **No run against a cluster Postgres yet.** The rehearsal is container-to-container. The `k8s`
  backend is the same code path with a different exec prefix, but it has not been exercised against
  `openerp-dev` or `openerp-prod`, which would be a cluster mutation.
- **Parallel restore** (`--jobs`) is not wired. It conflicts with `--single-transaction`, and the
  all-or-nothing guarantee was judged worth more than restore speed at this data size. Revisit when
  the window is measured.
- **No unit tests.** The repository's convention for `tools/**` is validation by execution, as with
  `check:ingress`. §5 is that validation. The pure helpers (`parseArgs`, `dsnAsEnv`, `shellQuote`,
  `execInnerCommand`, `normalizeAcl`, `diffCensus`) are exported and testable, but `tools/` is not an
  npm workspace, so a test placed there would not run under `npm test --workspaces`.
- **Window duration** is still unmeasured, as the upgrade plan says. The rehearsal dataset is 75
  rows; it says nothing about how long the real one takes.
