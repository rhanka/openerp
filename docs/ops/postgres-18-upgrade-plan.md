# PostgreSQL 16 → 18 upgrade plan

Requested by the owner on 2026-10-31, relayed by the `k8s` platform session. The platform provides
the `block-standard-xfs` StorageClass (Cinder Classic, XFS, expandable, Retain) where reflink works;
PostgreSQL 18 can then clone a database instantly with `file_copy_method = clone` and
`CREATE DATABASE … STRATEGY FILE_COPY`.

Per the owner's scope rule, application database backup and cutover are **not** operated by the `k8s`
session: the platform supplies the StorageClass and the quotas, this repository operates the move.

## 1. Current state — verified in this checkout

| Item | Value | Source |
| --- | --- | --- |
| Server image | `postgres:16-alpine`, floating tag, no digest | `infra/k8s/base/postgres-statefulset.yaml:25` |
| `PGDATA` | `/var/lib/postgresql/data/pgdata` — **set explicitly** | same file, env block |
| Volume mount | `/var/lib/postgresql/data` | same file |
| Storage | `block-standard`, 10Gi, RWO, one `volumeClaimTemplates` entry | same file |
| Replicas | 1, no operator, no managed service | same file |
| Service | `openerp-postgres`, ClusterIP, selector `app.kubernetes.io/name: openerp` + `component: postgres` | `infra/k8s/base/services.yaml` |
| Clients | `api`, `worker`, migration job — all by service name | `migration-job.yaml:27` and deployment env |
| Extensions | `pgcrypto` only | `apps/api/src/db/migrations/0001_foundation.sql` |
| Partitioning | `audit_events` RANGE-partitioned monthly, append-only via BEFORE UPDATE/DELETE triggers | `0007_audit_events_partition.sql` |
| RLS | `enable` **and `force row level security`** on protected tables, in 10+ migrations | `0003_rls_policies.sql:71-75` and others |
| Namespace quotas (dev and prod, identical) | `requests.cpu 500m`, `requests.memory 1Gi`, `limits.cpu 1500m`, `limits.memory 2Gi`, `pods 8`, `persistentvolumeclaims 2` | `poc-k8s/tenants/openerp-{dev,prod}/00-namespace.yaml` |

The version is pinned in **five** places, not one:

1. `infra/k8s/base/postgres-statefulset.yaml:25` — the server
2. `infra/k8s/base/migration-job.yaml:23` — `pg_isready` wait container
3. `.github/workflows/ci.yml:87` — the `pg integration smoke` service container
4. `docker-compose.yml:3` — local development
5. `docs/ops/local-dev.md:13` — documentation table

## 2. Four traps, each verified

### 2.1 `volumeClaimTemplates` is immutable — coexistence is forced

A StatefulSet's `volumeClaimTemplates` cannot be edited, so `storageClassName` cannot move from
`block-standard` to `block-standard-xfs` in place, and an existing PVC does not convert. The new
database must therefore be a **second StatefulSet with its own PVC**, which also gives the rollback.

### 2.2 One Service would select both Postgres pods

`openerp-postgres` selects on `app.kubernetes.io/component: postgres`. A second StatefulSet carrying
that same label is selected by the same Service, giving **two write backends behind one name**. The
new StatefulSet must carry a distinguishing label and the Service selector must name the major
version, so that cutover is a one-line selector change that can never match both.

Only the selector is touched. The Service's immutable fields are left alone: making it headless once
broke `kubectl apply` permanently, which is recorded in the manifest's own comment.

### 2.3 `force row level security` can produce a silently empty dump

Protected tables carry `force row level security`, which applies to the table owner too. A `pg_dump`
run by a role without `BYPASSRLS` either fails or dumps only visible rows — that is, nothing.

- Dump and restore run as `openerp` (the container's `POSTGRES_USER`, superuser), **never** as
  `openerp_app` (created `nologin nobypassrls` in migration `0003`).
- Pre-flight assertion: `select rolsuper, rolbypassrls from pg_roles where rolname = current_user`.
- Acceptance gate: **row counts compared table by table**, source against target. A restore exiting 0
  proves nothing by itself.

### 2.4 The PG18 image moves `PGDATA` — Kubernetes is safe here, Compose is not

From version 18 the official image's default `PGDATA` is `/var/lib/postgresql/18/docker` and its
declared `VOLUME` moves up to `/var/lib/postgresql`. Mounting at the old `/var/lib/postgresql/data`
then leaves the volume outside the data directory, and the reported failure mode is inconsistent:
the container may start and write to an anonymous volume, or may fail outright.

- **Kubernetes: already mitigated.** We set `PGDATA` explicitly, which is the documented opt-out, and
  Kubernetes ignores Dockerfile `VOLUME` declarations, so no anonymous volume can appear. The mount
  path stays valid.
- **`docker-compose.yml`: exposed.** It sets no `PGDATA` and mounts `postgres-data` at
  `/var/lib/postgresql/data`. Bumping the tag there without setting `PGDATA` loses the local
  development database on the next recreate. Set `PGDATA` in the same change.
- **CI service container: no data risk** (fresh database per run), tag bump only.

## 3. Image choice

`postgres:18.6-alpine` exists (checked against the registry on 2026-10-31; 18.6 is the current patch).

**Stay on Alpine.** The running instance was `initdb`-ed under `16-alpine`, so its collations come
from musl. Moving to a Debian variant changes the collation provider, which changes text ordering and
index collation across a logical restore. Keeping Alpine keeps that dimension constant; the version
change is then the only variable.

Pin by digest, resolved at implementation time (`docker buildx imagetools inspect postgres:18.6-alpine`
or `crane digest`) and recorded in the manifest beside the human-readable tag. A digest observed on
2026-10-31 for that tag is `sha256:3b0ef735388b2cb097fc29b8bb421d86d57d0ddbe7aa1fbd6493e06d65028503`;
it must be re-resolved and confirmed before use rather than trusted from this document.

## 4. Method

Rejected, with reasons:

- **In-place `pg_upgrade`** — does not move the data to XFS, which is the point of the exercise, and
  needs both binary sets in one container image.
- **Logical replication for near-zero downtime** — `wal_level` is not `logical`, and the partitioned
  `audit_events` would need `publish_via_partition_root`. Disproportionate for a single 10Gi volume.

Retained: **dump and restore into a second StatefulSet, cutover by Service selector.** The old
database stays online and untouched until acceptance, so rollback is a selector change, not a restore.

Use the **18** client tooling to dump the 16 server (`pg_dump` is forward-compatible with older
servers, not the reverse). The dump stays **inside the cluster**, written to the new pod's PVC: no
copy leaves the namespace, which keeps the residency guards out of the question.

## 5. Phases

### P0 — Prove PG18 in CI (no window, no cluster change)

Bump `.github/workflows/ci.yml` to `postgres:18.6-alpine`. The `pg integration smoke` job then runs
the 43 migrations, the RLS policies, the partitioning and the append-only triggers against 18 at zero
risk. Local development follows in the same branch, with `PGDATA` set per §2.4.

Gate: CI green on 18. No cluster phase starts before this.

### P1 — `openerp-dev`

**Precondition discovered on 2026-10-31: the dev namespace is not running.** The platform session
measured `openerp-dev` at **0 pods** (limits 0/0, requests 0/0, one PVC retained). Postgres is not
KEDA-scaled — its StatefulSet declares `replicas: 1` — so a zero-pod namespace is a stopped
namespace, not scale-to-zero. P1 therefore starts by bringing dev back up, which means pushing the
three commits currently unpushed on local `main` so the deploy workflow runs.

Consequence for the gate: a five-day burn-in on an idle namespace proves little. Either dev carries
real or synthetic traffic during the burn-in, or P2 rests on the P0 CI proof plus the P1 row-count
gate alone — which must then be stated as such to the owner rather than presented as a burn-in.

1. Add the second StatefulSet on `block-standard-xfs` with the distinguishing label and the explicit
   `PGDATA`; make the Service selector major-version-explicit. No traffic yet.
2. Rehearsal, application still running: dump, restore, row-count comparison. This measures the real
   window — the duration is **unknown until this is run** and is not estimated here.
3. Window: scale `api`, `web`, `worker` to 0 so writes stop; final dump; restore; row-count gate;
   switch the Service selector; scale back up; run the existing deploy smokes.
4. Burn-in on dev for at least five days before P2.

Rollback: switch the selector back, scale up. The 16 database was never written to during the window.

### P2 — `openerp-prod`

Same sequence. Requires an **explicit owner GO** (it is a production interruption) and the quota
change of §6 applied first.

### P3 — Cleanup, after burn-in

Delete the old StatefulSet and its PVC — which also frees the PVC quota slot — then the one-line
revert of the distinguishing label if the new one is to become canonical. The PV is `Retain`, so the
old data survives the PVC deletion for as long as the platform keeps it.

## 6. Quota needs during coexistence

Both namespaces are capped at `requests 500m/1Gi`, `limits 1500m/2Gi`, `pods 8`,
`persistentvolumeclaims 2`. The figures below were computed from the manifests, then **confirmed
against live readings** taken by the platform session on 2026-10-31 — see §9.

| Namespace | Current totals | Second Postgres | Verdict |
| --- | --- | --- | --- |
| `openerp-dev` (overlay profile) | requests 250m/512Mi, limits 800m/1536Mi | requests 100m/192Mi, limits 250m/512Mi | **Fits, with zero margin** on `limits.memory` (1536+512 = 2Gi exactly). `+256Mi` on `limits.memory` requested as margin, not as a blocker. |
| `openerp-prod` (base profile) | requests 300m/640Mi, limits 1400m/1664Mi | requests 100m/256Mi, limits 500m/640Mi | **Does not fit.** Needs `limits.cpu 1500m → 2000m` and `limits.memory 2Gi → 2560Mi` for the duration of the window. Requests fit as they are. |

PVCs: one today in each namespace, two during coexistence — **within the existing cap of 2**, no
increase needed, provided P3 cleanup happens before any other PVC is introduced.
Pods: four today, five during coexistence, against a cap of 8.

## 7. Prerequisite this repository does not have yet

There is **no `pg_dump` or `pg_restore` tooling anywhere in the repository** — no script, no job, no
runbook section. The dump/restore step has to be built before P1, as a Node/TS orchestration driving
the native binaries through `kubectl exec`, per the owner's rule that bans Python from repositories
and jobs (a Python job would mean a new unvalidated container image in the supply chain).

Minimum surface: dump, restore, the superuser pre-flight of §2.3, and the table-by-table row-count
comparison that constitutes the acceptance gate.

## 8. Not covered

- **Cluster access**: this session has none. The local kubeconfigs
  `~/.kube/poc-openerp-{dev,prod}.yaml` still point at the retired Scaleway cluster
  (`*.api.k8s.fr-par.scw.cloud`), so they cannot reach the OVH cluster. Per the owner's rule each
  tenant holds its own `tenant-admin` account in its `.env`; the platform session is raising the gap.
  Nothing is attempted here, and no credential is requested from a peer.
- **Provider drift, two items found while checking the above, neither blocking this plan**: the
  overlays still pull images from the Scaleway registry (`rg.fr-par.scw.cloud/openerp/*`) although the
  cluster is now OVH, while `deploy.yml` also mirrors every image to `ghcr.io/rhanka/*`; and
  `docs/ops/deploy-runbook.md` still describes a "shared Scaleway Kapsule cluster" with "Scaleway
  Database" connection strings. The deploy workflow itself is sound: lines 169-174 refuse any
  kubeconfig whose server does not contain `hlhedx.c1.bhs5.k8s.ovh.net`.

- **Window duration**: unknown until the P1 rehearsal measures it. Not estimated here.
- **`file_copy_method = clone` itself**: the platform verified reflink live on the StorageClass. The
  benefit for this repository (instant prepared copies for tests and cutovers) is not exercised by
  this plan and would be a separate piece of work.
- **Data volume**: the 10Gi PVC is the request, not the usage. Actual size is to be read on the
  running instances, which this session cannot reach.
- **PG18 behaviour changes beyond the data layout**: only the image data layout was verified against
  an external source. Other 17/18 changes were checked against this repository's own surface
  (one extension, no `md5`/`crypt` usage, one catalog-querying migration) and found inapplicable, but
  the PostgreSQL release notes were not read end to end.

## 9. Live readings — 2026-10-31

Taken read-only on the OVH cluster by the platform session, and reported here as its measurements.

| Reading | Value | Consequence |
| --- | --- | --- |
| `postgres-data-openerp-postgres-0` (prod) | **66 MiB used of 9.7 GiB**, from kubelet stats, no exec | The dump/restore moves tens of megabytes. The window is dominated by stopping and restarting the workloads, not by the data. Actual database size still to be confirmed by the P1 rehearsal. |
| `openerp-prod` quota usage | limits **1400m/1664Mi**, requests **40m/448Mi**, pods 4, pvc 1 | The limits figure matches this plan's computation exactly, so the prod ask stands unchanged: `limits.cpu` 1500m → 2000m, `limits.memory` 2Gi → 2560Mi, temporary, reverted after the window. |
| `openerp-prod` requests drift | live 40m/448Mi against 300m/640Mi declared in the manifests | The live pods predate the committed manifests. A redeploy during the window raises requests to 300m/640Mi, which still fits the 500m/1Gi cap — so this is drift to explain, not a risk for P2. |
| `openerp-dev` quota usage | **0 pods**, limits 0/0, requests 0/0, pvc 1 | The second dev Postgres fits with room to spare while dev stays stopped. The `+256Mi` margin asked for dev becomes necessary only if the whole namespace is restarted during coexistence — which P1 requires. See the P1 precondition in §5. |

The platform session will submit the prod quota change to the owner at P2, to be applied for the
window and reverted afterwards.
