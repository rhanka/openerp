# Platform authentication DEV cut-over and burn-in

This runbook implements the binding authentication-alignment design, sections
5.2 and 5.3. It is limited to `openerp-dev`. Production remains default-off:
the production overlay deliberately has neither platform-auth environment
variable nor the DEV `openerp-auth-cutover` ConfigMap.

## Coordinated flags

`infra/k8s/overlays/dev/auth-cutover-support.yaml` owns one value:
`openerp-auth-cutover.data.enabled`. Both existing runtime flags read that
same key:

| Workload | Runtime flag | DEV resolved value |
| --- | --- | --- |
| `openerp-api` | `OPENERP_PLATFORM_AUTH_ENABLED` | `1` |
| `openerp-web` | `OPENERP_PLATFORM_AUTH_UI_ENABLED` | `1` |

This is the coordination mechanism. A normal overlay release cannot change one
flag without changing the other. `npm run check:auth-cutover` renders both
overlays with `kubectl kustomize`, resolves the ConfigMap reference, verifies
DEV is API=`1`/web=`1`, PROD is API=`0`/web=`0` (unset/default-off), and
verifies the first-party `/api` ingress mapping. It is a deploy-pipeline gate.

The only permitted temporary non-pair state is the design's API-first preflight:
an API pod with its literal API flag set to `1` while already-running web pods
still retain their default-off process environment. It is intentional, bounded
to the API smoke below, and is never a web-on/API-off release. Do not use a
web-only patch or `kubectl set env` on the web deployment.

## Initial DEV sequence

1. Before traffic, verify the DEV database still contains no unexpected real
   identities, credentials, or business data. Stop if it does. Confirm the
   operator recovery/invite owner and the SMTP capture service are available.
2. Deploy migrations, ports, and the retained legacy surface with both flags
   off. The API must have `OPENERP_WEB_ORIGIN=https://openerp-dev.sent-tech.ca`,
   RP ID `openerp-dev.sent-tech.ca`, and the DEV Mailpit SMTP settings from the
   DEV patch before any WebAuthn attempt.
3. Pause the web deployment before applying the DEV overlay. The shared
   ConfigMap then rolls the API to `1` while the already-running legacy web
   pods retain their process-level default-off value. Run:

   ```sh
   kubectl -n openerp-dev exec deploy/openerp-api -- \
     node -e "fetch('http://127.0.0.1:3000/api/v1/auth/health').then(async r => { const b = await r.json(); if (r.status !== 200 || b.service !== 'openerp-auth') process.exit(1); console.log(b) })"
   ```

   This proves that the feature-gated Hono platform router, rather than a
   generic page, is actually serving `/api/v1/auth`.
4. Resume the web deployment only after that API proof. Its new pods then read
   the same committed `enabled: "1"` key. The deploy workflow performs this
   pause → API rollout/smoke → web resume sequence before its full screen
   smoke.
5. Run the screen smoke in the target environment. The workflow creates two
   synthetic, pre-provisioned DEV invitations only; registration still cannot
   create identities or organizations. Mailpit captures their verification
   code and is not exposed by ingress.
6. Observe at least one successful enrollment, login, protected request,
   refresh, logout, and (for the multi-membership fixture) explicit tenant
   selection. Confirm the invite/bootstrap recovery path with its operator
   before retaining the cut-over. Keep the legacy `/webauthn/*` and pages
   mounted throughout the observation window.

The deploy workflow starts the required API proof first. Its screen smoke uses
the public DEV origin plus an in-cluster API port-forward and proves:

- real `AuthRegister` email-code and virtual-authenticator enrollment;
- a raw `openerp_session` JWT with `sub`, `org`, `actor_type=human`, and
  `scopes=["session"]`, plus `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`;
- protected SSR and a direct protected Hono request accepted by the unchanged
  `createJwtTenantResolver`;
- refresh token rotation that retains `org`;
- UI logout clearing both cookies and rejecting replay of the just-issued
  bearer/session token;
- second passkey login with persisted counter and `lastUsedAt` advancement;
- multi-organization pending state: no application session before selection,
  a non-member UUID rejected, then the selected organization signed into the
  final JWT; and
- zero browser calls to the retained four legacy ceremony proxies.

## Emergency rollback

Rollback changes one ConfigMap key and restarts both consumers using their
current images. There is no database migration reversal and no different image
deployment:

```sh
kubectl -n openerp-dev patch configmap openerp-auth-cutover \
  --type merge -p '{"data":{"enabled":"0"}}'
kubectl -n openerp-dev rollout restart deploy/openerp-api deploy/openerp-web
kubectl -n openerp-dev rollout status deploy/openerp-api --timeout=120s
kubectl -n openerp-dev rollout status deploy/openerp-web --timeout=120s
```

Then verify that the old `/webauthn/*` routes and legacy `/login` and
`/register-passkey` pages serve again. Users must authenticate again: old
sessions are deliberately not resurrected. Do not down-migrate or delete
platform credentials, email proofs, sessions, audits, or the legacy routes.
Make the source rollback durable by changing only the same DEV
ConfigMap key to `"0"` before the next `kubectl apply -k`.

Rollback immediately for a failed screen smoke, protected-route 401 after a
successful UI login, an incorrect tenant claim, SSR-invisible cookies, a
successful logout replay, or elevated auth failures. Tenant misbinding is an
immediate rollback, not a burn-in observation.
