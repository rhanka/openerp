# infra/k8s/base — OpenERP Kustomize base manifests

This directory contains the base Kustomize manifests for all OpenERP
workloads. They are designed to be composed by environment-specific overlays
at `infra/k8s/overlays/{dev,prod}/` (to be added in SUB-5).

For the full deployment guide, see `docs/ops/k8s-deployment.md`.

---

## Manifest catalog

| File | Kind | Resource name | Port(s) | Key env / volumes |
|------|------|---------------|---------|-------------------|
| `api-deployment.yaml` | `Deployment` | `openerp-api` | 3000 (http) | `DATABASE_URL`, `SESSION_SECRET` from Secret `openerp-runtime`; `APP_VERSION`, `OPENERP_CURRENT_VERSION`, `OPENERP_LATEST_SUPPORTED_VERSION`, `OPENERP_SUPPORT_WINDOW` from ConfigMap `openerp-update-state`. readinessProbe: tcpSocket :3000. |
| `worker-deployment.yaml` | `Deployment` | `openerp-worker` | — | Same Secret + ConfigMap as api. Health via `OPENERP_WORKER_HEALTH_PORT` (default `3001`). readinessProbe: node exec. replicas=1 (multi-replica safe). |
| `web-deployment.yaml` | `Deployment` | `openerp-web` | 8080 (http) | `API_BASE_URL=http://openerp-api:3000`. readinessProbe: tcpSocket :8080. |
| `postgres-statefulset.yaml` | `StatefulSet` | `openerp-postgres` | 5432 | `POSTGRES_PASSWORD` from Secret `openerp-runtime` key `postgresPassword`. 10Gi PVC `postgres-data` (ReadWriteOnce). |
| `update-state-configmap.yaml` | `ConfigMap` | `openerp-update-state` | — | Keys: `currentVersion`, `latestSupportedVersion`, `supportWindow`. |

Files expected in this directory after SUB-5:

| File | Kind | Notes |
|------|------|-------|
| `migration-job.yaml` | `Job` | Drizzle schema migration; runs before rollout, idempotent. |
| `ingress.yaml` | `Ingress` | Traefik + cert-manager TLS; host and issuer overridden per overlay. |
| `kustomization.yaml` | `Kustomization` | References all resources in this directory for overlay composition. |

---

## Dependencies

```
openerp-api
  requires:
    Secret: openerp-runtime        (DATABASE_URL, SESSION_SECRET)
    ConfigMap: openerp-update-state
    Service: openerp-postgres      (in-cluster DB)

openerp-worker
  requires:
    Secret: openerp-runtime        (DATABASE_URL, SESSION_SECRET)
    ConfigMap: openerp-update-state

openerp-web
  requires:
    Service: openerp-api           (API_BASE_URL targets port 3000)

openerp-postgres
  requires:
    Secret: openerp-runtime        (postgresPassword key)
    PersistentVolumeClaim: postgres-data (provisioned by StatefulSet volumeClaimTemplate)
```

The `openerp-runtime` Secret must be created in the target namespace before
any of the workloads above will start. See `docs/ops/k8s-deployment.md`
Section 6 for the full key list and creation command.

---

## Pre-A1 cutover state

Until the OIDC client is registered at `auth.sent-tech.ca` (sentropic#288) and
`OPENERP_OIDC_ENABLED` is flipped to `1` in the `openerp-runtime` Secret:

- `OPENERP_OIDC_ENABLED=0` — the four `/auth/*` routes handled by the OIDC
  relying-party middleware return `503 Service Unavailable`.
- The existing WebAuthn credential flow remains active and is the only login
  path.
- No change to workload manifests is needed for the flip; only the Secret
  value changes.

---

## Adding a new manifest

1. Create the file in this directory following the existing naming and label
   conventions (`app.kubernetes.io/name: openerp`,
   `app.kubernetes.io/component: <component>`).
2. Add it to the `resources:` list in `infra/k8s/base/kustomization.yaml`
   (once that file exists — SUB-5).
3. If the new workload reads from `openerp-runtime` or `openerp-update-state`,
   document it in the dependency table above.
4. Update `docs/ops/k8s-deployment.md` Section 4 manifest catalog accordingly.
