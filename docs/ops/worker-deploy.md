# Worker deployment reference

Slice: DOC-DEPLOYMENT-STANDALONE SUB-1 (01KTQ2J4R5J268TJ11S8HGDE13)

## Overview

`apps/worker` runs four per-domain tick loops in a single Node process:

| Domain | Function |
|---|---|
| `scheduled-delivery` | Fires due `scheduled_deliveries` rows and produces `delivery_run` records |
| `recurring-billing` | Fires due `recurring_billing_schedules` rows and emits invoice line-items |
| `webhook-egress` | Sweeps `webhook_deliveries` rows in `pending_egress` state and dispatches them |
| `workflow` | Advances due scheduled-workflow steps |

All four loops run concurrently (`Promise.all`). Within each loop, tenants are processed serially on every iteration. Each tick acquires rows with `SELECT ... FOR UPDATE SKIP LOCKED`, so running multiple replicas is safe — no double-processing per row. The recommended default is `replicas: 1`; see the multi-replica section for when to scale.

For the overview of what each domain does and the deprecation of HTTP admin-tick endpoints, see `docs/ops/automation-runtime.md`.

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENERP_DATABASE_URL` | yes | — | PostgreSQL connection string. The process throws at startup if unset. |
| `OPENERP_WORKER_INTERVAL_MS_SCHEDULED_DELIVERY` | no | `60000` (60 s) | Milliseconds between scheduled-delivery tick cycles. |
| `OPENERP_WORKER_INTERVAL_MS_RECURRING_BILLING` | no | `300000` (5 min) | Milliseconds between recurring-billing tick cycles. |
| `OPENERP_WORKER_INTERVAL_MS_WEBHOOK_EGRESS` | no | `10000` (10 s) | Milliseconds between webhook-egress sweep cycles. |
| `OPENERP_WORKER_INTERVAL_MS_WORKFLOW` | no | `30000` (30 s) | Milliseconds between workflow tick cycles. |
| `OPENERP_WORKER_HEALTH_PORT` | no | `0` (disabled) | TCP port for the health HTTP server. Set to e.g. `3001` in Kubernetes to enable liveness and readiness probes. |
| `OPENERP_DISABLE_ADMIN_TICKS` | no | unset | Set to `true` to make the legacy HTTP `_admin/run` and `_admin/tick` endpoints return 410. Recommended for all production environments. |

---

## Health endpoints

When `OPENERP_WORKER_HEALTH_PORT` is set to a non-zero port, a minimal HTTP server starts on that port.

| Path | Method | Success | Failure | Purpose |
|---|---|---|---|---|
| `/healthz` | GET | 200 `{"ok":true}` | — | Liveness — responds as long as the process is up. |
| `/readyz` | GET | 200 `{"ready":true}` | 503 `{"ready":false}` | Readiness — performs a `SELECT 1` DB ping before responding. |

`/healthz` never returns an error response; if the process is alive the response is 200. `/readyz` returns 503 on any DB connectivity failure, causing Kubernetes to hold traffic until the DB is reachable again.

---

## Restart policy and replicas contract

### Kubernetes

The recommended manifest is `infra/k8s/base/worker-deployment.yaml` (single replica, resource bounds already set). Supplement it with health probes and a graceful-shutdown period:

```yaml
spec:
  replicas: 1
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: worker
          env:
            - name: OPENERP_DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: openerp-runtime
                  key: databaseUrl
            - name: OPENERP_WORKER_HEALTH_PORT
              value: "3001"
            - name: OPENERP_DISABLE_ADMIN_TICKS
              value: "true"
          ports:
            - name: health
              containerPort: 3001
          livenessProbe:
            httpGet:
              path: /healthz
              port: health
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: health
            initialDelaySeconds: 5
            periodSeconds: 10
```

SIGTERM is handled by `runOpenERPWorker` via an `AbortController`. When the signal fires, each loop completes its current in-flight iteration then exits; `terminationGracePeriodSeconds: 30` gives that drain time before Kubernetes sends SIGKILL.

### systemd

```ini
[Service]
ExecStart=/usr/bin/node /opt/openerp/worker/dist/main.js
Restart=on-failure
KillSignal=SIGTERM
TimeoutStopSec=30s
EnvironmentFile=/etc/openerp/worker.env
```

### Docker Compose

```yaml
services:
  worker:
    image: openerp/worker:latest
    restart: unless-stopped
    stop_signal: SIGTERM
    stop_grace_period: 30s
    environment:
      OPENERP_DATABASE_URL: "${OPENERP_DATABASE_URL}"
      OPENERP_WORKER_HEALTH_PORT: "3001"
      OPENERP_DISABLE_ADMIN_TICKS: "true"
    ports:
      - "3001:3001"
```

---

## Multi-replica contract

Running `replicas > 1` is safe. Every row-level claim uses `SELECT ... FOR UPDATE SKIP LOCKED`, so two replicas claiming the same queue at the same time will never process the same row twice. The row the second replica cannot lock is simply skipped until the next cycle.

The default recommendation is `replicas: 1` because:

- Per-tenant serial iteration is the current default; parallelism within a single tick cycle is not implemented.
- Additional replicas only reduce latency if a single replica is saturating Postgres I/O, which is not typical for an OpenERP deployment.
- The right signal to scale is a sustained SLO breach visible in the JSON metrics emitted by `withTickInstrumentation` — specifically `durationMs` approaching the configured interval, or `failed > 0` persisting across consecutive ticks.

---

## Observability

Each tick emits one JSON line to stdout per tenant per cycle. Two shapes:

Success line:

```json
{"domain":"webhook-egress","tenantId":"org_abc","metrics":{"processed":3,"succeeded":3,"failed":0,"durationMs":42,"asOf":"2026-06-10T16:00:00Z"}}
```

Error line (unhandled tick exception):

```json
{"domain":"webhook-egress","tenantId":"org_abc","error":{"message":"connect ECONNREFUSED 127.0.0.1:5432"}}
```

Recommended alerting rules:

- Alert when `failed > 0` for the same `tenantId` and `domain` for more than N consecutive ticks.
- Alert when `durationMs` exceeds 80% of the configured interval for that domain (tick saturation).
- Ship stdout to a log aggregator (Loki, CloudWatch Logs, Datadog, etc.) and index on `domain` and `tenantId` for per-tenant SLO dashboards.

---

## Kubernetes manifest reference

Base manifest: `infra/k8s/base/worker-deployment.yaml`

The manifest references two cluster objects:

| Object | Kind | Key | Mounted as |
|---|---|---|---|
| `openerp-runtime` | Secret | `databaseUrl` | `OPENERP_DATABASE_URL` env var (add this mapping — the current base manifest uses the old `DATABASE_URL` key name) |
| `openerp-update-state` | ConfigMap | `currentVersion`, `latestSupportedVersion`, `supportWindow` | `OPENERP_CURRENT_VERSION`, `OPENERP_LATEST_SUPPORTED_VERSION`, `OPENERP_SUPPORT_WINDOW` |

The cluster-owner repo (rhanka/k8s-ops) holds the Namespace, Quota, LimitRange, and NetworkPolicy objects for each environment. This repo owns the workload manifests only.

---

## Smoke checks post-rollout

Run these after deploying to confirm the worker is live and connected.

```bash
# 1. Forward the health port locally
kubectl -n openerp-<env> port-forward deploy/openerp-worker 3001:3001

# 2. Liveness check — expect 200 {"ok":true}
curl -s http://localhost:3001/healthz

# 3. Readiness check — expect 200 {"ready":true}
curl -s http://localhost:3001/readyz

# 4. Confirm tick output — expect at least one line per domain within the configured interval
kubectl -n openerp-<env> logs deploy/openerp-worker --tail=20 | grep '"domain"'
```

Replace `<env>` with `prod` or `dev` as appropriate (`openerp-prod` / `openerp-dev` for openerp.sent-tech.ca and openerp-dev.sent-tech.ca respectively).

---

## Related docs

| Document | Status |
|---|---|
| `docs/ops/automation-runtime.md` | Available — domain overview and HTTP admin-tick deprecation |
| `docs/ops/auth-oidc-rp.md` | Pending SUB-2 — OIDC RP configuration for auth.sent-tech.ca |
| `docs/ops/k8s-deployment.md` | Pending SUB-4 — full Kubernetes deployment guide (Traefik, cert-manager, Cloudflare DNS-01) |
