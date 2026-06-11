# OpenERP — Deploy CI + Smoke Runbook

Slice: DOC-DEPLOYMENT-STANDALONE SUB-5 (01KTQ2J4R5J268TJ11S8HGDE13)

---

## 1. Overview

This runbook covers the end-to-end deployment lifecycle for OpenERP on the
shared Scaleway Kapsule cluster (`rhanka/k8s-ops`). It describes:

- the GitHub Actions pipeline contract (to be authored in a follow-up WP);
- the manual deploy fallback for pre-CI or emergency situations;
- post-deploy smoke checks;
- rollback procedures;
- the AUTH-39-A1 OIDC cutover playbook; and
- operational alert expectations.

Two permanent environments are in scope:

| Environment | Namespace     | Hostname                          |
|-------------|---------------|-----------------------------------|
| dev         | `openerp-dev` | `openerp-dev.sent-tech.ca`        |
| prod        | `openerp-prod`| `openerp.sent-tech.ca`            |

For cluster topology and manifest layout, see `docs/ops/k8s-deployment.md`.
For worker-specific configuration, see `docs/ops/worker-deploy.md`.

---

## 2. Pipeline contract

The future `.github/workflows/deploy.yml` (to be authored once Kustomize
overlays land — see Section 10) will implement the following contract.

### 2.1 Triggers

| Event | Target environment |
|-------|--------------------|
| `push` to `main` | Automatic deploy to **dev** |
| `workflow_dispatch` (manual, with environment confirm) | Deploy to **prod** |

Prod deploys require the `production` GitHub Environment to be configured with
a required reviewer so that a human approval gates the `migrate-prod` +
`deploy-prod` + `smoke-prod` job chain.

### 2.2 Job chain

```
build
  └── migrate-dev
        └── deploy-dev
              └── smoke-dev
                    └── [approval gate]
                          └── migrate-prod
                                └── deploy-prod
                                      └── smoke-prod
```

**`build`**
- `npm ci --workspace=apps/api --workspace=apps/web --workspace=apps/worker`
- ESLint + TypeScript type-check across all workspaces.
- `npm test` — runs the full test suite.
- `npm run build` for api, web, and worker.
- Pushes Docker images tagged `sha-${{ github.sha }}` to the Scaleway
  container registry.

**`migrate-dev`**
- Applies `infra/k8s/overlays/dev/migration-job.yaml` via `kubectl apply`.
- Waits: `kubectl -n openerp-dev wait --for=condition=complete job/openerp-migrate --timeout=180s`.
- Fails fast if the Job exits non-zero (migration error blocks the deploy).

**`deploy-dev`**
- `kubectl apply -k infra/k8s/overlays/dev`
- Waits for rollout: `kubectl -n openerp-dev rollout status deploy/openerp-api --timeout=120s` (repeated for worker + web).

**`smoke-dev`**
- `curl --fail https://openerp-dev.sent-tech.ca/healthz` → `{"ok":true}`.
- `curl --fail https://openerp-dev.sent-tech.ca/readyz` → `{"ready":true}`.
- `curl -I https://openerp-dev.sent-tech.ca/` → HTTP 200.
- OIDC kick-off check (only when `OPENERP_OIDC_ENABLED=1`):
  `curl -I -L --max-redirs 0 https://openerp-dev.sent-tech.ca/auth/login` → 302.

**`migrate-prod` / `deploy-prod` / `smoke-prod`**
- Same pattern as dev, targeting namespace `openerp-prod` and hostname
  `openerp.sent-tech.ca`. Gated by `production` environment approval.

### 2.3 GitHub secrets required

| Secret name | Source | Notes |
|---|---|---|
| `KUBE_CONFIG_DATA` | k8s-ops#26 | Base64-encoded kubeconfig. Delivered by platform operator. |
| `OPENERP_DEV_DATABASE_URL` | Scaleway Database | Dev PostgreSQL connection string. |
| `OPENERP_PROD_DATABASE_URL` | Scaleway Database | Prod PostgreSQL connection string. |
| `OPENERP_DEV_SESSION_SECRET` | Generated | 32+ byte random hex. |
| `OPENERP_PROD_SESSION_SECRET` | Generated | 32+ byte random hex. |
| `OPENERP_DEV_OAUTH_CLIENT_SECRET` | sentropic#288 | Delivered when dev OIDC client registered. Required from A1 cutover onward. |
| `OPENERP_PROD_OAUTH_CLIENT_SECRET` | sentropic#288 | Delivered when prod OIDC client registered. Required from A1 cutover onward. |

The two OAUTH_CLIENT_SECRET entries are intentionally absent until the
AUTH-39-A1 cutover PR lands (they are not required while `OPENERP_OIDC_ENABLED`
remains `0`).

### 2.4 Concurrency

```yaml
concurrency:
  group: deploy-${{ inputs.environment || 'dev' }}
  cancel-in-progress: false
```

This prevents two simultaneous deploys to the same environment. `cancel-in-progress:
false` ensures a mid-flight migration is never cancelled.

---

## 3. Manual deploy (fallback)

Use when CI is not yet in place, when the pipeline is broken, or for
emergency hotfixes that must bypass the normal queue.

```sh
# 1. Set kubeconfig
export KUBECONFIG=<path to k8s-ops-delivered kubeconfig>
kubectl config use-context openerp

# 2. Verify connectivity
kubectl -n openerp-dev get pods

# 3. Refresh Secret (run whenever any secret value changes)
kubectl -n openerp-dev create secret generic openerp-runtime \
  --from-literal=DATABASE_URL='...' \
  --from-literal=SESSION_SECRET='...' \
  --from-literal=OPENERP_OIDC_ENABLED='0' \
  --from-literal=OAUTH_ISSUER_URL='https://auth.sent-tech.ca' \
  --from-literal=OAUTH_CLIENT_ID='openerp-dev' \
  --from-literal=OAUTH_CLIENT_SECRET='...' \
  --from-literal=OAUTH_REDIRECT_URI='https://openerp-dev.sent-tech.ca/auth/oauth/callback' \
  --from-literal=OPENERP_DISABLE_ADMIN_TICKS='true' \
  --from-literal=OPENERP_WORKER_HEALTH_PORT='3001' \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Apply manifests (Kustomize overlay — available once overlays WP lands)
kubectl apply -k infra/k8s/overlays/dev

# 5. Wait for migration Job
kubectl -n openerp-dev wait --for=condition=complete job/openerp-migrate --timeout=180s

# 6. Wait for rollouts
kubectl -n openerp-dev rollout status deploy/openerp-api    --timeout=120s
kubectl -n openerp-dev rollout status deploy/openerp-worker --timeout=120s
kubectl -n openerp-dev rollout status deploy/openerp-web    --timeout=120s
```

Until Kustomize overlays land, apply the base manifests individually:

```sh
kubectl apply -f infra/k8s/base/
```

This bypasses overlay-level config patches; only use for infrastructure
verification, not for real application deploys.

---

## 4. Smoke checklist

Run these checks after every deploy — CI runs a subset automatically; the full
list is for manual verification or incident response.

### 4.1 Pods Ready

```sh
kubectl -n openerp-dev get pods
```

Expected: all Pods (`openerp-api-*`, `openerp-worker-*`, `openerp-web-*`,
`openerp-postgres-*`) in `Running` state, all containers `Ready`.

### 4.2 API liveness

```sh
curl https://openerp-dev.sent-tech.ca/healthz
```

Expected response: `{"ok":true}` with HTTP 200.

### 4.3 API readiness

```sh
curl https://openerp-dev.sent-tech.ca/readyz
```

Expected response: `{"ready":true}` with HTTP 200. A 503 here indicates the
API process started but the database or a critical dependency is unreachable.

### 4.4 OIDC kick-off (post-A1 cutover only)

```sh
curl -I -L --max-redirs 0 https://openerp-dev.sent-tech.ca/auth/login
```

Expected: HTTP 302 with `Location` header pointing to
`https://auth.sent-tech.ca/oauth/authorize?...&client_id=openerp-dev&...`.

Skip this check before the AUTH-39-A1 cutover; `/auth/login` redirects to the
WebAuthn flow instead.

### 4.5 WebAuthn passkey (pre-A1 cutover only)

```sh
curl -I https://openerp-dev.sent-tech.ca/auth/passkey/login/begin
```

Expected: HTTP 200.

### 4.6 Web SPA

```sh
curl -I https://openerp-dev.sent-tech.ca/
```

Expected: HTTP 200 with `content-type: text/html`.

### 4.7 Worker ticks

```sh
kubectl -n openerp-dev logs deploy/openerp-worker --tail=50 --since=2m \
  | grep '"domain"'
```

Expected: at least one tick log line per domain (`scheduled-delivery`,
`recurring-billing`, `webhook-egress`, `workflow`) within the sampling window.
An absent domain after 5+ minutes indicates the loop has stalled or crashed.
See `docs/ops/worker-deploy.md` for tick interval defaults.

### 4.8 TLS certificate

```sh
kubectl -n openerp-dev get certificate openerp-tls \
  -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

Expected: `True`. A `False` value means cert-manager has not yet provisioned
or renewed the certificate; check `kubectl describe certificate openerp-tls`
for the ACME challenge status.

### 4.9 Audit-event pipeline

Trigger a CRM mutation via the web UI (e.g. create or update a contact), then:

```sh
kubectl -n openerp-dev exec deploy/openerp-postgres -- \
  psql -U openerp -c \
  "SELECT count(*) FROM audit_events WHERE created_at > now() - interval '2 minutes';"
```

Expected: count > 0. A zero count after a confirmed mutation indicates the
audit event pipeline is broken.

### 4.10 Webhook egress (when endpoints configured)

```sh
kubectl -n openerp-dev logs deploy/openerp-worker --tail=100 \
  | grep webhook-egress
```

Expected: delivery attempt log lines for any configured webhook endpoints.
If the circuit-breaker has disabled an endpoint, an INFO line naming the
endpoint and its `DISABLED` state appears instead. Both are acceptable;
a total absence of `webhook-egress` lines when endpoints are configured
indicates the domain loop is not running.

---

## 5. Rollback procedure

### 5.1 Application rollback (most common)

```sh
kubectl -n openerp-dev rollout undo deploy/openerp-api
kubectl -n openerp-dev rollout undo deploy/openerp-worker
kubectl -n openerp-dev rollout undo deploy/openerp-web
```

Kubernetes reactivates the previous ReplicaSet's image. The rollout is
immediate and zero-downtime for the API and web components. Confirm with the
Pod Ready check (Section 4.1) and the API readiness check (Section 4.3).

### 5.2 Schema rollback — NOT SUPPORTED

The migration runner is forward-only. There is no `migrate:down` command.

**Hard constraint**: never merge a migration without a forward-compatible code
change. Every schema change must be readable by both the version being deployed
and the version immediately before it, for the duration of the rollout window.

Recovery from a bad migration:

- **Dev**: drop and recreate the namespace, re-apply base manifests, re-run
  migrations from scratch. Dev data loss is acceptable.
- **Prod**: restore from the last Scaleway Database snapshot (automated daily
  snapshots once we migrate off in-cluster postgres). No automated point-in-time
  recovery is available from in-cluster postgres — this is a known gap, tracked
  in `docs/ops/k8s-deployment.md` Section 4.

### 5.3 Secret rollback

If a bad secret value was applied, re-create the Secret with the correct values
(Section 3, step 3), then force a pod restart to pick up the new value:

```sh
kubectl -n openerp-dev rollout restart deploy/openerp-api
kubectl -n openerp-dev rollout restart deploy/openerp-worker
```

---

## 6. AUTH-39-A1 cutover playbook

This section describes the one-time procedure for activating the OIDC RP flow
(flipping `OPENERP_OIDC_ENABLED` from `0` to `1`). For the OIDC RP
configuration reference, see `docs/ops/auth-oidc-rp.md`.

### Pre-flight checklist

- [ ] sentropic#288 is closed: OauthClient registered for both `openerp-dev`
  and `openerp-prod`, `OAUTH_CLIENT_SECRET` values delivered via secure channel,
  dev IdP URL confirmed.
- [ ] k8s-ops#26 is closed: `KUBE_CONFIG_DATA` secret injected into GitHub
  Actions with write access to both namespaces.
- [ ] DNS CNAME for `openerp-dev.sent-tech.ca` confirmed pointing at the
  Kapsule ingress load-balancer IP.
- [ ] CI pipeline is green on `main` (pre-cutover, with `OPENERP_OIDC_ENABLED=0`).

### Step 1 — Update the k8s Secret

Re-create `openerp-runtime` in `openerp-dev` with all OAUTH_* values populated
and `OPENERP_OIDC_ENABLED=1`:

```sh
kubectl -n openerp-dev create secret generic openerp-runtime \
  --from-literal=DATABASE_URL='...' \
  --from-literal=SESSION_SECRET='...' \
  --from-literal=OPENERP_OIDC_ENABLED='1' \
  --from-literal=OAUTH_ISSUER_URL='https://auth.sent-tech.ca' \
  --from-literal=OAUTH_CLIENT_ID='openerp-dev' \
  --from-literal=OAUTH_CLIENT_SECRET='<from sentropic#288>' \
  --from-literal=OAUTH_REDIRECT_URI='https://openerp-dev.sent-tech.ca/auth/oauth/callback' \
  --from-literal=OPENERP_DISABLE_ADMIN_TICKS='true' \
  --from-literal=OPENERP_WORKER_HEALTH_PORT='3001' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 2 — Merge the AUTH-39-A1 cutover PR

The PR must be atomic: remove WebAuthn routes, remove identity-provider module,
flip `OPENERP_OIDC_ENABLED` to `1` in the overlay patch. Merging to `main`
triggers the CI pipeline which deploys to dev automatically.

### Step 3 — Wait for migration Job + rollout

Either wait for CI to complete, or apply manually following Section 3.

### Step 4 — Smoke the A1 path

```sh
# Confirm OIDC redirect
curl -I -L --max-redirs 0 https://openerp-dev.sent-tech.ca/auth/login
# Expected: 302 to https://auth.sent-tech.ca/oauth/authorize?...
```

Then, in a browser:

1. Navigate to `https://openerp-dev.sent-tech.ca/auth/login`.
2. Complete the OIDC flow at `auth.sent-tech.ca`.
3. Confirm redirect back to `/admin` with the session cookie set.
4. Verify the session in the database:

```sh
kubectl -n openerp-dev exec deploy/openerp-postgres -- \
  psql -U openerp -c \
  "SELECT id, user_id, created_at FROM openerp_sessions ORDER BY created_at DESC LIMIT 5;"
```

Expected: a row with a recent `created_at` timestamp matching the login event.

### Step 5 — Promote to prod

After dev verification has been stable for at least 1 hour, trigger a prod
deploy via `workflow_dispatch` on `main`. The `production` environment approval
gate requires a manual reviewer sign-off.

Repeat the smoke checks from Section 4 against `openerp-prod` namespace and
`openerp.sent-tech.ca`.

### Rollback (if A1 cutover fails)

1. Revert the AUTH-39-A1 commit on `main` (or open a revert PR and merge it).
2. Re-create the Secret with `OPENERP_OIDC_ENABLED=0` and cleared OAUTH_*
   values.
3. CI deploys the reverted code automatically.

Data loss note: any sessions issued via OIDC will be invalid after rollback.
Users will need to re-authenticate via the WebAuthn passkey flow. OIDC sessions
in `openerp_sessions` can be purged:

```sql
DELETE FROM openerp_sessions WHERE auth_provider = 'oidc';
```

---

## 7. Operational alerts

These alerts are not yet wired to any alerting backend. They document the
intended policy for the first observability WP.

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| API readiness down | `/readyz` returns non-200 for > 2 minutes | PagerDuty / on-call page | #openerp-ops + pager |
| Worker tick failures | Tick failure count > 5 in any 1-hour window | Warning | #openerp-ops Slack |
| Webhook circuit-breaker | Any endpoint auto-disabled by W0 circuit-breaker | Info | Webhook owner (daily digest) |
| TLS cert not ready | Certificate `Ready=False` for > 24 hours | Warning | #openerp-ops Slack |
| Migration Job failed | CI `migrate-dev` or `migrate-prod` job exits non-zero | Blocking | CI build failure + Slack |

cert-manager renews certificates 30 days before expiry by default. If renewal
fails (e.g. ACME DNS-01 challenge blocked by a network policy change), the
`Ready=False` condition will appear well before the cert expires, giving
operational time to intervene.

---

## 8. Related docs

| Document | Path |
|---|---|
| Worker deployment reference | `docs/ops/worker-deploy.md` |
| OIDC RP configuration | `docs/ops/auth-oidc-rp.md` |
| Kubernetes deployment guide | `docs/ops/k8s-deployment.md` |
| Local development | `docs/ops/local-dev.md` |
| Automation runtime | `docs/ops/automation-runtime.md` |
| Base manifest README | `infra/k8s/base/README.md` |

---

## 9. Open issues

| Issue | Repo | Status (last checked 2026-06-11) | Blocks |
|-------|------|----------------------------------|--------|
| sentropic#288 | `rhanka/sentropic` | Open — OauthClient registration + secret delivery pending | AUTH-39-A1 cutover |
| k8s-ops#26 | `rhanka/k8s-ops` | Open — `KUBE_CONFIG_DATA` secret delivery pending | CI pipeline + manual deploy from CI |

Both issues must be closed before the AUTH-39-A1 cutover can proceed. Until
then, manual deploys using a locally held kubeconfig remain the fallback (see
Section 3).

---

## 10. DOC-DEPLOYMENT-STANDALONE complete

This document completes the **DOC-DEPLOYMENT-STANDALONE** workpackage
(slice ID 01KTQ2J4R5J268TJ11S8HGDE13).

### Shipped deliverables

| File | Slice |
|------|-------|
| `docs/ops/worker-deploy.md` | SUB-1 |
| `docs/ops/auth-oidc-rp.md` | SUB-2 |
| `docs/ops/local-dev.md` | SUB-3 |
| `docs/ops/k8s-deployment.md` | SUB-4 |
| `infra/k8s/base/README.md` | SUB-4 |
| `docs/ops/deploy-runbook.md` | SUB-5 (this file) |

### Deferred to follow-up work-packages

The following were intentionally excluded from DOC-DEPLOYMENT-STANDALONE and
are tracked as separate work-packages:

- **`.github/workflows/deploy.yml`** — pipeline implementation. Blocked on
  Kustomize overlays landing and k8s-ops#26 closing.
- **`infra/k8s/overlays/dev/` + `infra/k8s/overlays/prod/`** — Kustomize
  overlay directories with per-environment patches, `kustomization.yaml`,
  `migration-job.yaml`, and `ingress.yaml`.
- **AUTH-39-A1 cutover** — OIDC RP activation. Blocked on sentropic#288 +
  k8s-ops#26.
