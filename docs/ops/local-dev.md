# Local Multi-Service Dev

This document describes how to run the full OpenERP stack locally for development, run tests, apply migrations, and optionally wire up the sentropic IdP overlay for AUTH-39-A1 OIDC end-to-end testing.

---

## 1. Overview

Local development uses the `docker-compose.yml` at the repo root. The compose file defines four services:

| Service    | Image / build            | Port (host)        | Notes                              |
|------------|--------------------------|--------------------|------------------------------------|
| `postgres`  | `postgres:16-alpine`     | `127.0.0.1:5432`   | Single shared DB for all services  |
| `api`       | `infra/docker/api.Dockerfile` | `3000`        | Hono API, hot-reload via `npm run dev` |
| `worker`    | `infra/docker/worker.Dockerfile` | —          | Background scheduler, no HTTP port |
| `web`       | `infra/docker/web.Dockerfile` | `8080` (prod build) | Vite dev server runs on `4173` |

For active development, run `api` and `web` outside Docker (via `npm run dev`) so you get hot reload. Keep `postgres` and, optionally, `worker` running inside Docker. All services share the same Postgres instance on `localhost:5432`.

Optional: a sibling sentropic checkout can overlay a local OIDC identity provider on `http://localhost:8787` for AUTH-39-A1 testing.

---

## 2. Prerequisites

- **Node.js** 18 or later (`node --version`)
- **npm** 10 or later (`npm --version`)
- **Docker** with Compose v2 (`docker compose version` — the `docker-compose` v1 binary is also accepted by the examples below)
- **Optional**: a sibling sentropic checkout for the IdP overlay (see section 6)

---

## 3. First-Run Setup

Run this sequence once after cloning:

```sh
# 1. Clone and enter the repo
git clone https://github.com/rhanka/openerp.git && cd openerp

# 2. Install all workspace dependencies
npm install

# 3. Bring up Postgres first and wait for the healthcheck to pass
docker-compose up -d postgres

# 4. Apply all 36 migrations (sorted by filename in apps/api/src/db/migrations/)
npm run migrate -w @sentropic/openerp-api

# 5. Seed demo data (idempotent — safe to re-run)
npm run seed:dev -w @sentropic/openerp-api

# 6. Bring up the rest of the stack (api + worker + web built images)
docker-compose up -d

# 7. Visit the web app
open http://localhost:8080
# Should redirect to /admin login.
# For the Vite dev server (section 4), use http://localhost:4173 instead.
```

---

## 4. Daily Dev Loop

In typical active development, run each service outside Docker so changes are reflected immediately without rebuilding images.

Open three terminals:

```sh
# Terminal 1 — API hot-reload on :3000
npm run dev -w @sentropic/openerp-api

# Terminal 2 — Worker (runs scheduled workflows; logs JSON metrics at each tick)
# The worker package has no dev script; use start or run via Docker.
# To run outside Docker, compile first then start:
npm run build -w @sentropic/openerp-worker && node apps/worker/bin/openerp-worker.mjs

# Terminal 3 — Web Vite dev server on :4173
npm run dev -w @sentropic/openerp-web
```

Visit `http://localhost:4173` for the live-reloading web frontend.

Vitest in watch mode (API unit tests):

```sh
npm test -w @sentropic/openerp-api -- --watch
```

---

## 5. Test Gates

Run this sequence before every commit:

```sh
# TypeScript type-check (no emit)
npm run lint -w @sentropic/openerp-api
npm run lint -w @sentropic/openerp-worker

# API unit tests (disable file parallelism for deterministic DB state)
npm test -w @sentropic/openerp-api -- --no-file-parallelism

# Worker unit tests
npm test -w @sentropic/openerp-worker

# Playwright end-to-end (install browsers once with: npx playwright install)
cd apps/web && npm run test:e2e
```

Current counts: API ~1126 tests, worker ~55 tests.

All gates must be green before opening a PR.

---

## 6. Sentropic IdP Overlay (AUTH-39-A1)

To test OIDC login flows locally, bring up the sentropic identity provider in a sibling directory.

```sh
# Clone sentropic as a sibling of the openerp checkout
git clone https://github.com/rhanka/sentropic.git ../sentropic

# Start the IdP (Hono auth-as on http://localhost:8787)
cd ../sentropic && docker-compose -f docker-compose.idp.yml up -d
# Seed log will print OAUTH_CLIENT_SECRET — copy it.
```

Back in the openerp directory, configure the API and restart it:

```sh
export OPENERP_OIDC_ENABLED=1
export OAUTH_ISSUER_URL=http://localhost:8787
export OAUTH_CLIENT_ID=openerp-dev
export OAUTH_CLIENT_SECRET=<value from sentropic seed log>
export OAUTH_REDIRECT_URI=http://localhost:3000/auth/oauth/callback

# Restart the API with these envs
npm run dev -w @sentropic/openerp-api
```

Test the flow:

1. Open `http://localhost:3000/auth/login` — the API redirects to `http://localhost:8787`.
2. Authenticate with a seed user (credentials printed by the IdP seed log).
3. The IdP posts back to the redirect URI; the API issues a session cookie.
4. `/api/me` should return the authenticated identity.

---

## 7. Migration Management

Migrations live in `apps/api/src/db/migrations/`, sorted and applied by filename.

```sh
# Apply all pending migrations
npm run migrate -w @sentropic/openerp-api
```

To create a new migration, add a file `NNNN_descriptive_name.sql` in that directory (where `NNNN` is the next sequence number), then re-run the migrate command.

To fully reset the database:

```sh
docker-compose down -v
docker-compose up -d postgres
npm run migrate -w @sentropic/openerp-api
npm run seed:dev -w @sentropic/openerp-api
```

`docker-compose down -v` destroys the `postgres-data` named volume; data is gone.

---

## 8. Seed Data

`npm run seed:dev` is idempotent. Re-running it will not create duplicates. It provisions:

**Organizations**

| Slug     | Internal ID        | Role            |
|----------|--------------------|-----------------|
| `acme`   | `org_acme_inc`     | Demo tenant 1   |
| `globex` | `org_globex_corp`  | Demo tenant 2   |

**Users and memberships**

| Email               | Role in org         |
|---------------------|---------------------|
| `admin@acme.test`   | admin in `acme`     |
| `user@acme.test`    | user in `acme`      |
| `user@globex.test`  | admin in `globex`   |

**Sample data** (per org): CRM companies, contacts, opportunities, billing accounts, reporting dashboards.

---

## 9. Smoke Checks

After a first-run setup or after restarting the stack:

```sh
# 1. API health
curl http://localhost:3000/healthz
# Expected: HTTP 200, body contains "ok"

# 2. Identity endpoint (dev-only header-based auth path, no session needed)
curl http://localhost:3000/api/me \
  -H "x-organization-id: org_acme_inc" \
  -H "x-user-identity-id: admin-user-id"
# Expected: HTTP 200, JSON user identity

# 3. Web (Docker build served on 8080; Vite dev server on 4173)
curl -o /dev/null -sw "%{http_code}\n" http://localhost:8080
# Expected: 200
```

---

## 10. Troubleshooting

**`Connection refused localhost:5432`**
Postgres is not running. Start it and wait for the healthcheck:
```sh
docker-compose up -d postgres
# Wait ~10s for pg_isready to pass, then retry.
```

**`relation "x" does not exist`**
Migrations have not been applied (or were applied against a different database).
```sh
npm run migrate -w @sentropic/openerp-api
```

**`JWT signature invalid`** (on `/auth/login` after enabling OIDC)
`OAUTH_CLIENT_SECRET` does not match the value the IdP was seeded with, or the JWKS cache is stale. Restart the API process (the JWKS cache is in-memory).

**Worker logs nothing for 60 seconds**
- Check `OPENERP_WORKER_INTERVAL_MS_*` env vars — if unset the worker uses its compiled defaults.
- Check Postgres logs for slow or failing queries: `docker-compose logs postgres`.
- Verify active organizations exist: `SELECT id FROM organizations WHERE deleted_at IS NULL;`

---

## 11. Related Docs

| Document                          | Covers                                              |
|-----------------------------------|-----------------------------------------------------|
| `docs/ops/worker-deploy.md`       | Worker production deployment and env reference      |
| `docs/ops/auth-oidc-rp.md`        | OIDC relying-party integration (AUTH-39-A1)         |
| `docs/ops/automation-runtime.md`  | Workflow engine architecture and scheduler design   |
| `docs/ops/k8s-deployment.md`      | Kubernetes deployment (SUB-4, forthcoming)          |
| `docs/ops/deploy-runbook.md`      | Production deploy runbook (SUB-5, forthcoming)      |
