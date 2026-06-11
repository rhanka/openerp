# OpenERP — Kubernetes Deployment Guide

Operator-facing guide for deploying OpenERP on the shared Scaleway Kapsule
cluster managed by `rhanka/k8s-ops`.

---

## 1. Overview

OpenERP deploys as a tenant on the shared Scaleway Kapsule cluster. Two
environments are provided:

| Environment | Namespace | Ingress hostname |
|-------------|-----------|-----------------|
| dev | `openerp-dev` | `openerp-dev.sent-tech.ca` |
| prod | `openerp-prod` | `openerp.sent-tech.ca` |

The deployment pattern targets a Kustomize `base` + per-environment `overlays`
layout (see Section 5). This differs from the `radar-immobilier` pattern, which
uses a flat `deploy/k8s/` directory with a single kustomization; the overlay
structure is chosen here because OpenERP operates two permanent, differently
configured environments (dev vs. prod) rather than a single-target POC. The
Ingress, TLS, and OIDC auth delegation to `auth.sent-tech.ca` follow the same
sentropic conventions used across the platform.

---

## 2. Repo split

Platform-level concerns live in `rhanka/k8s-ops`. Application-level concerns
live in this repo (`rhanka/openerp`).

### `rhanka/k8s-ops` (platform repo, operator-managed)

- `Namespace` — `openerp-dev` and `openerp-prod`.
- `ResourceQuota` + `LimitRange` — per-namespace budget.
- `NetworkPolicy` — baseline tenant isolation.
- `ServiceAccount` + `RoleBinding` — `openerp-app` SA with registry pull
  secret.
- Kubeconfig delivery — `KUBE_CONFIG_DATA` secret injected into GitHub Actions
  Secrets of this repo after tenant onboarding (see issue k8s-ops#26).

### `rhanka/openerp` (this repo, application-managed)

- Workload manifests — `infra/k8s/base/*.yaml`.
- Kustomize overlays — `infra/k8s/overlays/{dev,prod}/` (to be added in
  SUB-5; see Section 5).
- Ingress manifest — `infra/k8s/base/ingress.yaml` (to be added in SUB-5).
- Migration Job — `infra/k8s/base/migration-job.yaml` (to be added in SUB-5).
- Deploy CI — `.github/workflows/deploy.yml` (separate WP, TBD).

---

## 3. Prerequisites

Three prerequisites must be satisfied before the first `kubectl apply`.

### 3.1 Tenant onboarding — k8s-ops#26

Open (or reference) a tenant onboarding ticket on `rhanka/k8s-ops`. The
operator will:

- Create Namespaces `openerp-dev` and `openerp-prod`.
- Apply `ResourceQuota`, `LimitRange`, and baseline `NetworkPolicy`.
- Create the `openerp-app` `ServiceAccount` with registry pull rights.
- Inject `KUBE_CONFIG_DATA` into GitHub Actions Secrets for this repo.

### 3.2 OIDC client registration — sentropic#288

Register an OAuth client at the shared sentropic IdP (`auth.sent-tech.ca`) for
each environment. This yields:

- `OAUTH_CLIENT_ID` — one per environment (e.g. `openerp-dev`, `openerp-prod`).
- `OAUTH_CLIENT_SECRET` — issued at registration time.

The redirect URI must be `https://<ingress-host>/auth/callback`.

This step can be deferred: set `OPENERP_OIDC_ENABLED=0` until the client
registration is complete (see Section 6).

### 3.3 DNS

Create CNAME records pointing to the shared Kapsule load balancer IP (the same
LB used by `auth.sent-tech.ca` and `immo.sent-tech.ca`). Coordinate with the
Cloudflare zone owner:

- `openerp-dev.sent-tech.ca` → shared LB-S.
- `openerp.sent-tech.ca` → shared LB-S.

cert-manager cannot issue the TLS certificate and login redirects will not
resolve until the DNS records are live.

---

## 4. Manifest catalog

All base manifests live in `infra/k8s/base/`. They reference the
`openerp-runtime` Secret and the `openerp-update-state` ConfigMap; both must
exist in the target namespace before workloads start (see Section 6).

| File | Kind | Resource name | Port(s) | Notes |
|------|------|---------------|---------|-------|
| `api-deployment.yaml` | `Deployment` | `openerp-api` | 3000 (http) | Hono API. Reads `openerp-runtime` (DATABASE_URL, SESSION_SECRET) and `openerp-update-state`. readinessProbe: tcpSocket :3000. |
| `worker-deployment.yaml` | `Deployment` | `openerp-worker` | — (no HTTP port; health via `OPENERP_WORKER_HEALTH_PORT`) | Autonomous tick loops, replicas=1 (multi-replica safe but unnecessary). Reads same Secret + ConfigMap as api. |
| `web-deployment.yaml` | `Deployment` | `openerp-web` | 8080 (http) | SvelteKit frontend. `API_BASE_URL=http://openerp-api:3000`. readinessProbe: tcpSocket :8080. |
| `postgres-statefulset.yaml` | `StatefulSet` | `openerp-postgres` | 5432 | Postgres 16-alpine, single-node, 10Gi PVC. Reads `openerp-runtime.postgresPassword`. For prod, consider Scaleway Database for PostgreSQL instead (future migration). |
| `update-state-configmap.yaml` | `ConfigMap` | `openerp-update-state` | — | UI version banner: `currentVersion`, `latestSupportedVersion`, `supportWindow`. |

Files to be added in SUB-5:

| File | Kind | Notes |
|------|------|-------|
| `migration-job.yaml` | `Job` | Drizzle schema migration, runs before rollout, idempotent. |
| `ingress.yaml` | `Ingress` | Traefik + cert-manager TLS. Template in Section 7. |
| `infra/k8s/base/kustomization.yaml` | `Kustomization` | Declares the base resources for overlay composition. |

---

## 5. Kustomize overlay structure

The proposed directory layout:

```
infra/k8s/
  base/
    api-deployment.yaml
    worker-deployment.yaml
    web-deployment.yaml
    postgres-statefulset.yaml
    update-state-configmap.yaml
    kustomization.yaml         # NEW — declares the base resources (SUB-5)
    migration-job.yaml         # NEW — migration Job (SUB-5)
    ingress.yaml               # NEW — Ingress template (SUB-5)
  overlays/
    dev/
      kustomization.yaml       # namespace: openerp-dev, replica patches, env overrides
      ingress-patch.yaml       # host: openerp-dev.sent-tech.ca, issuer letsencrypt-staging
    prod/
      kustomization.yaml       # namespace: openerp-prod, replica patches, env overrides
      ingress-patch.yaml       # host: openerp.sent-tech.ca, issuer letsencrypt-prod
```

The actual overlay files are a SUB-5 follow-up. Once in place, the deploy
command is:

```bash
kubectl apply -k infra/k8s/overlays/dev   # or prod
```

**Divergence note vs. radar-immobilier.** The `radar-immobilier` tenant uses a
flat `deploy/k8s/` directory with a single `kustomization.yaml` and namespace
embedded in `00-namespace.yaml`. OpenERP uses a `base` + `overlays` layout
because it maintains two permanent environments (dev + prod) with different
ingress hosts, TLS issuers, and replica counts. The per-env `overlays/`
structure avoids duplicating manifests and makes namespace promotion explicit.

---

## 6. Secret-injection contract

Each namespace requires one Secret named `openerp-runtime` before any workload
can start. Create it manually for the first deploy; in CI the `deploy.yml`
workflow will recreate or patch it from GitHub Secrets.

### Keys

| Key | Description | Default / notes |
|-----|-------------|-----------------|
| `DATABASE_URL` | Postgres connection string | `postgresql://openerp:$DB_PASSWORD@openerp-postgres:5432/openerp` (in-cluster). Use Scaleway Database URL for prod if migrated. |
| `SESSION_SECRET` | Cookie HMAC key | Random 32+ bytes, generated once per namespace. |
| `OPENERP_OIDC_ENABLED` | Enable OIDC relying-party flow | `0` pre-OIDC cutover (auth routes return 503; WebAuthn flow runs). `1` post-cutover. |
| `OAUTH_ISSUER_URL` | IdP issuer URL | `https://auth.sent-tech.ca` |
| `OAUTH_CLIENT_ID` | OIDC client ID from sentropic#288 | Per-environment value. |
| `OAUTH_CLIENT_SECRET` | OIDC client secret from sentropic#288 | Per-environment value. |
| `OAUTH_REDIRECT_URI` | Callback URL | `https://<ingress-host>/auth/callback` |
| `OAUTH_SCOPES` | Requested scopes | `openid profile email` |
| `OPENERP_WORKER_HEALTH_PORT` | Worker health server port | `3001` |
| `OPENERP_DISABLE_ADMIN_TICKS` | Prevent API from running scheduled ticks | `true` — the worker is the canonical tick source |
| `postgresPassword` | Postgres password for the in-cluster StatefulSet | Referenced by `postgres-statefulset.yaml` as `POSTGRES_PASSWORD`. |

### Manual creation

```bash
kubectl -n openerp-dev create secret generic openerp-runtime \
  --from-literal=databaseUrl='postgresql://openerp:<password>@openerp-postgres:5432/openerp' \
  --from-literal=sessionSecret='<random-32-bytes>' \
  --from-literal=postgresPassword='<db-password>' \
  --from-literal=OPENERP_OIDC_ENABLED='0' \
  --from-literal=OAUTH_ISSUER_URL='https://auth.sent-tech.ca' \
  --from-literal=OAUTH_CLIENT_ID='openerp-dev' \
  --from-literal=OAUTH_CLIENT_SECRET='<secret>' \
  --from-literal=OAUTH_REDIRECT_URI='https://openerp-dev.sent-tech.ca/auth/callback' \
  --from-literal=OAUTH_SCOPES='openid profile email' \
  --from-literal=OPENERP_WORKER_HEALTH_PORT='3001' \
  --from-literal=OPENERP_DISABLE_ADMIN_TICKS='true'
```

Repeat with namespace `openerp-prod` and prod values.

### CI Secret references

In `.github/workflows/deploy.yml` (TBD), the `kubectl create secret` step
reads from GitHub Actions Secrets:

```
secrets.OPENERP_DEV_DATABASE_URL
secrets.OPENERP_DEV_SESSION_SECRET
secrets.OPENERP_DEV_POSTGRES_PASSWORD
secrets.OPENERP_DEV_OAUTH_CLIENT_SECRET
...
```

And the prod equivalents:

```
secrets.OPENERP_PROD_DATABASE_URL
...
```

---

## 7. Ingress configuration

The Ingress routes `/` to the SvelteKit frontend and `/api` + `/auth` to the
Hono API. This is the same-origin pattern used by radar-immobilier (`50-ui.yaml`
+ `60-ingress.yaml`). The manifest below documents the intended shape; the
actual file (`ingress.yaml`) will be added in SUB-5.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openerp
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  tls:
  - hosts: [openerp.sent-tech.ca]
    secretName: openerp-tls
  rules:
  - host: openerp.sent-tech.ca
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: openerp-web
            port:
              number: 8080
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: openerp-api
            port:
              number: 3000
      - path: /auth
        pathType: Prefix
        backend:
          service:
            name: openerp-api
            port:
              number: 3000
```

For the `dev` overlay substitute:

- `host: openerp-dev.sent-tech.ca`
- `secretName: openerp-dev-tls`
- `cert-manager.io/cluster-issuer: letsencrypt-staging`

---

## 8. Deploy commands (manual, pre-CI)

Until `.github/workflows/deploy.yml` lands, use the following sequence.

```bash
# 0. Point at the cluster
export KUBECONFIG=<path-from-k8s-ops>

# 1. Create the Secret (once, or after a rotation)
kubectl -n openerp-dev create secret generic openerp-runtime \
  --from-literal=... \   # see Section 6
  --dry-run=client -o yaml | kubectl apply -f -

# 2. Apply the overlay
kubectl apply -k infra/k8s/overlays/dev

# 3. Wait for the migration Job (once migration-job.yaml exists — SUB-5)
kubectl -n openerp-dev wait \
  --for=condition=complete \
  job/openerp-migrate \
  --timeout=120s

# 4. Check the rollout
kubectl -n openerp-dev rollout status deploy/openerp-api
kubectl -n openerp-dev rollout status deploy/openerp-worker
kubectl -n openerp-dev rollout status deploy/openerp-web
```

Replace `openerp-dev` with `openerp-prod` for the production namespace.

---

## 9. Smoke checks

Run after every deploy to confirm the stack is healthy.

```bash
# All pods running
kubectl -n openerp-dev get pods

# API liveness
curl -I https://openerp-dev.sent-tech.ca/healthz
# Expected: HTTP/2 200

# OIDC redirect (post-OIDC cutover only; OPENERP_OIDC_ENABLED=1)
curl -I -L --max-redirs 0 https://openerp-dev.sent-tech.ca/auth/login
# Expected: HTTP/2 302, Location: https://auth.sent-tech.ca/oauth/authorize?...

# Worker tick output
kubectl -n openerp-dev logs deploy/openerp-worker --tail=20 | grep tick
# Expected: tick log lines from the automation runtime

# TLS certificate issued
kubectl -n openerp-dev get certificate
# Expected: openerp-dev-tls  Ready=True
```

---

## 10. Related documentation

| Document | Location |
|----------|----------|
| Worker architecture and observability | `docs/ops/worker-deploy.md` |
| OIDC relying-party configuration | `docs/ops/auth-oidc-rp.md` |
| Local development setup | `docs/ops/local-dev.md` |
| Automation runtime internals | `docs/ops/automation-runtime.md` |
| Deploy runbook (day-2 ops) | `docs/ops/deploy-runbook.md` — to be added in SUB-5 |

---

## 11. Open issues

| Issue | Blocker for |
|-------|-------------|
| k8s-ops#26 — tenant onboarding (Namespace + quota + KUBE_CONFIG_DATA) | First deploy to any environment |
| sentropic#288 — OIDC client registration for openerp-dev + openerp-prod | Setting `OPENERP_OIDC_ENABLED=1`; can be deferred with `=0` |
