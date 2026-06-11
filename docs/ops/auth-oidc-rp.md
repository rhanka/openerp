# OIDC RP Configuration Reference

OpenERP acts as an OIDC Relying Party (RP). The Identity Provider (IdP) is the
sentropic Authorization Server at `auth.sent-tech.ca`. The IdP issues `id_token`
JWTs that OpenERP verifies and exchanges for a first-party session cookie.

The integration uses **PKCE S256 + state + nonce**. State and nonce are
single-use rows written to `oidc_state` with a configurable TTL (default 600 s).

All four OIDC routes are mounted unconditionally but are **flag-gated** via
`OPENERP_OIDC_ENABLED`. When the flag is off (default), every route returns
`503 AUTH_OIDC_DISABLED`. No OAUTH_* secrets are required until cutover.

---

## Environment variables

These are read at startup by `apps/api/src/config/env.ts`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENERP_OIDC_ENABLED` | no | `0` | Set to `1` to activate OIDC routes. Any other value leaves routes returning 503. |
| `OAUTH_ISSUER_URL` | yes (when enabled) | — | IdP base URL. Prod: `https://auth.sent-tech.ca`. Dev local: `http://localhost:8787`. Dev cloud: TBD (deferred — see sentropic#288). |
| `OAUTH_CLIENT_ID` | yes (when enabled) | — | Registered client identifier. Prod: `openerp-prod`. Dev: `openerp-dev`. One client per environment (Q2 decision). |
| `OAUTH_CLIENT_SECRET` | yes (when enabled) | — | Client secret. Stored in k8s Secret `openerp-runtime`. Never committed. Delivered by sentropic team via secure channel (sentropic#288). |
| `OAUTH_REDIRECT_URI` | yes (when enabled) | — | Exact callback URL registered with the IdP. Prod: `https://openerp.sent-tech.ca/auth/oauth/callback`. Dev: `http://localhost:3000/auth/oauth/callback`. Scheme and trailing-slash must match exactly. |
| `OAUTH_SCOPES` | no | `openid profile email` | Space-separated scope list sent in the authorize request. Custom scopes (e.g. per-tenant Q4 claims) are TBD post-cutover. |

> `OPENERP_OIDC_ENABLED` is not in `ApiEnv` — it is read directly from
> `process.env` in the HTTP server bootstrap before the app-level env parse.

---

## Routes mounted

All four routes are registered under the `/auth` prefix. All return
`503 { "code": "AUTH_OIDC_DISABLED" }` when `OPENERP_OIDC_ENABLED != "1"`.

### `GET /auth/login`

Query params: `redirect_to` (optional, e.g. `/admin`).

Generates a PKCE verifier, state token, and nonce. Writes them to `oidc_state`
with an expiry of `ttlSeconds` seconds from now (default 600). Redirects `302`
to `OAUTH_ISSUER_URL/oauth/authorize` with params:

```
response_type=code
client_id=<OAUTH_CLIENT_ID>
redirect_uri=<OAUTH_REDIRECT_URI>
scope=openid profile email
state=<opaque>
nonce=<opaque>
code_challenge=<S256>
code_challenge_method=S256
```

### `GET /auth/oauth/callback`

Query params: `code`, `state`.

1. Looks up and deletes the `oidc_state` row (single-use, TTL enforced).
2. Posts to `OAUTH_ISSUER_URL/oauth/token` with `grant_type=authorization_code`
   + PKCE verifier + `Basic` client credentials.
3. Verifies the `id_token` JWT against `OAUTH_ISSUER_URL/.well-known/jwks.json`
   (audience = `OAUTH_CLIENT_ID`, issuer = `OAUTH_ISSUER_URL`).
4. Checks nonce against the stored value.
5. Looks up active `organization_members` rows for the `sub` claim.
   - **Exactly one membership** → sets session cookie + `302` to `/admin` (or
     `redirect_after` stored in state).
   - **Multiple memberships** → returns `409 ORGANIZATION_SELECTION_REQUIRED`
     + a short-lived `pendingToken` (HS256, 5 min). Client must POST
     `/auth/org-select`.
   - **No active memberships** → `403 NO_ACTIVE_MEMBERSHIPS`.

### `POST /auth/org-select`

Body JSON: `{ "pendingToken": "<jwt>", "organization_id": "<uuid>" }`.

Verifies the pending token, confirms `organization_id` is among the user's
active memberships, then sets the session cookie + `302` to `/admin`.

### `POST /auth/logout`

Revokes the current session, clears the session cookie, returns `200`.

---

## Pre-cutover state (now)

`OPENERP_OIDC_ENABLED=0` (default). All four OIDC routes return `503`. The
WebAuthn flow remains active. No OAUTH_* secrets are required in the Pod spec,
but `OAUTH_ISSUER_URL` and `OAUTH_CLIENT_ID` may be set in advance as a
rehearsal without effect.

---

## Post-cutover (AUTH-39-A1)

Set `OPENERP_OIDC_ENABLED=1` and ensure all four OAUTH_* env vars are present.
WebAuthn handlers and the legacy identity-provider issuer are removed in the
same atomic deployment commit.

**Required secret-injection sequence:**

1. Sentropic team registers the OauthClient in the sentropic AS
   (sentropic#288) and delivers `OAUTH_CLIENT_SECRET` via a secure channel.
2. Ops creates or updates k8s Secret `openerp-runtime` with the secret and
   all other required env vars (`OAUTH_ISSUER_URL`, `OAUTH_CLIENT_ID`,
   `OAUTH_REDIRECT_URI`, `OPENERP_OIDC_ENABLED=1`).
3. CI deploys the new image with `OPENERP_OIDC_ENABLED=1` in the Pod spec.

Rollback: set `OPENERP_OIDC_ENABLED=0` in the Secret + redeploy. The 503
guard is instant.

---

## Local dev — sentropic IdP overlay

For AUTH-39-A1 e2e testing without the production IdP.

**1. Start the sentropic IdP:**

```sh
cd ../sentropic
docker-compose -f docker-compose.idp.yml up -d
```

The sentropic IdP listens on `http://localhost:8787` by default.

**2. Set env vars** (e.g. in a `.env.local` file or your shell):

```sh
OPENERP_OIDC_ENABLED=1
OAUTH_ISSUER_URL=http://localhost:8787
OAUTH_CLIENT_ID=openerp-dev
OAUTH_CLIENT_SECRET=<from sentropic seed fixtures>
OAUTH_REDIRECT_URI=http://localhost:3000/auth/oauth/callback
```

**3. Start the API:**

```sh
npm run dev -w @sentropic/openerp-api
```

**4. Smoke test the local flow:**

Open `http://localhost:3000/auth/login` in a browser. The page should
redirect to `http://localhost:8787/...`. Authenticate with a seed user.
The callback to `http://localhost:3000/auth/oauth/callback` should set a
session cookie and redirect to `/admin`.

---

## Smoke checks

### 1. Confirm login redirect

```sh
curl -I -L --max-redirs 0 https://openerp.sent-tech.ca/auth/login
```

Expected: `HTTP/2 302` with `Location: https://auth.sent-tech.ca/oauth/authorize?...`

### 2. Complete the OIDC flow in a browser

Navigate to `https://openerp.sent-tech.ca/auth/login`. Authenticate at
`https://auth.sent-tech.ca`. Verify that the browser is redirected back to
`https://openerp.sent-tech.ca/auth/oauth/callback?code=...&state=...` and
ultimately lands on `/admin` with a session cookie set.

### 3. Verify the session

After completing step 2, export the session cookie and confirm the API
recognises it:

```sh
# Save the session cookie from your browser as cookie.txt, then:
curl -b cookie.txt https://openerp.sent-tech.ca/api/me
```

Expected: `200 OK` with a JSON body containing `user` and `organization` fields.

---

## Troubleshooting

| Error | Cause | Remediation |
|---|---|---|
| `503 AUTH_OIDC_DISABLED` | `OPENERP_OIDC_ENABLED` is not `"1"` in the running Pod. | Verify the env var in the Pod spec (`kubectl describe pod`) or k8s Secret `openerp-runtime`. |
| `oidc.state_not_found` | State row expired (TTL 600 s) or state was already consumed (replay). | Retry the flow from `/auth/login`. Do not reuse callback URLs. |
| `oidc.token_exchange_failed` | The IdP rejected the authorization code. | Confirm `OAUTH_CLIENT_SECRET` matches the value registered in sentropic (sentropic#288). Confirm `OAUTH_REDIRECT_URI` matches exactly — including scheme, host, port (if non-standard), path, and absence of a trailing slash. |
| `oidc.invalid_id_token` | JWKS verification failed (signature, expiry, audience, or issuer mismatch). | Check `OAUTH_ISSUER_URL` and `OAUTH_CLIENT_ID` match the IdP registration. If the IdP rotated keys, the in-process JWKS cache (keyed by `issuerUrl`) must be cleared: restart the API/worker pods. |
| `oidc.nonce_mismatch` | ID token nonce does not match the stored nonce. Possible stale flow or MITM. | Discard the flow and restart from `/auth/login`. Investigate if this recurs (potential replay attack). |
| `403 NO_ACTIVE_MEMBERSHIPS` | User authenticated to the IdP but has no `active` row in `organization_members`. | An operator must invite the user to an organization before OIDC sign-in will succeed. |
| `409 ORGANIZATION_SELECTION_REQUIRED` | User has more than one active membership. | The client must `POST /auth/org-select` with `{ pendingToken, organization_id }` to complete sign-in. The `pendingToken` expires in 5 minutes. |

---

## Related docs

- `docs/ops/automation-runtime.md` — worker runtime overview, admin tick
  deprecation, background job model.
- `docs/ops/worker-deploy.md` — env vars, health endpoints, replica scaling,
  observability.
- `docs/ops/k8s-deployment.md` — Kubernetes manifests, namespace, Secrets
  management (SUB-4, not yet shipped).
- `docs/ops/local-dev.md` — full local development setup (SUB-3, not yet
  shipped).

---

## Open issues

| Tracker | Blocks | Description |
|---|---|---|
| sentropic#288 | AUTH-39-A1 cutover | OauthClient registration, delivery of `OAUTH_CLIENT_SECRET`, Q4 `tenantId` claim policy, and publication of the dev-cloud IdP base URL. |
| k8s-ops#26 | AUTH-39-A1 cutover | Kubernetes namespace provisioning and `KUBE_CONFIG_DATA` secret injection required for CI-driven k8s deployments. |

Both issues must be resolved before `OPENERP_OIDC_ENABLED=1` can be set in
production.
