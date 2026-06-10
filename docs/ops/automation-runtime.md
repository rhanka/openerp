# Automation Runtime — operating notes

## Overview

Scheduled and recurring work is driven by the `openerp-worker` process. The worker runs three per-domain tick functions on a configurable interval:

- **Reporting tick** — fires due `scheduled_deliveries` rows and produces `delivery_run` records.
- **Billing tick** — fires due `recurring_billing_schedules` rows and emits invoice line-items.
- **Webhook tick** — sweeps `webhook_deliveries` rows in `pending_egress` state and dispatches them via the egress port.

Each tick is idempotent: rows are locked with `SELECT … FOR UPDATE SKIP LOCKED` so concurrent workers do not double-process.

## Env vars

| Variable | Default | Purpose |
|---|---|---|
| `OPENERP_DATABASE_URL` | required | PostgreSQL connection string for the worker process |
| `OPENERP_WORKER_INTERVAL_MS_REPORTING` | 60000 | Reporting tick interval in milliseconds |
| `OPENERP_WORKER_INTERVAL_MS_BILLING` | 60000 | Billing tick interval in milliseconds |
| `OPENERP_WORKER_INTERVAL_MS_WEBHOOK` | 15000 | Webhook delivery sweep interval in milliseconds |
| `OPENERP_DISABLE_ADMIN_TICKS` | unset | Set to `true` to disable legacy HTTP admin-tick endpoints (returns 410) |

## Deprecation — HTTP admin-tick endpoints

The following HTTP endpoints were used in early development to trigger ticks on demand via the API. They are superseded by the worker process and will be removed in a future release.

| Method | Path |
|---|---|
| `POST` | `/reporting/scheduled-deliveries/run` |
| `POST` | `/billing/recurring-schedules/run` |
| `POST` | `/webhook/_admin/tick` |

To disable these endpoints now (recommended for production):

```
OPENERP_DISABLE_ADMIN_TICKS=true
```

When set, each endpoint returns HTTP 410 with:

```json
{
  "code": "ADMIN_TICK_DEPRECATED",
  "message": "This endpoint is disabled. Use the openerp-worker process. See docs/ops/automation-runtime.md."
}
```

When unset (default), the endpoints remain operational for backward compatibility.

## Running the worker

```
npm run start -w @sentropic/openerp-worker
```

The worker connects to `OPENERP_DATABASE_URL`, registers all tick functions, and runs them on their respective intervals until the process exits. Use a process supervisor (systemd, Docker restart policy, PM2) to keep it alive in production.
