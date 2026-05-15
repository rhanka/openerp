# @sentropic/openerp-domain

OpenERP domain canon entities and abstraction contracts.

Pure TypeScript types and small helpers shared across the `@sentropic/openerp-*` workspace. No runtime dependency on a database or framework — implementations live in the consuming packages (`@sentropic/openerp-api`, `@sentropic/openerp-worker`, etc.).

## Install

```sh
npm install @sentropic/openerp-domain
```

## What's inside

- **Canon entities** (`shared-entities-v1.md` of OpenERP): `Organization`, `User`, `UserIdentity`, `OrganizationMember`, `Money`, `FxRateSnapshot`, `AuditEvent`, `DomainEvent`, `TimelineEntry`, `ApprovalRequest`, `IdempotencyRecord`, `TranslationKey`, and more.
- **Abstraction contracts** (re-exported from `./contracts`): `JobQueue`, `TenantIsolationStrategy`, `IdentityProvider`, `ApprovalService`, `CurrencyResolver`, `IdempotencyStore`.
- **Small helpers**: `makeMoney`, `sameCurrency`, `createPermissionKey`, `requiresAudit`.

## Versioning

This package follows the OpenERP project release cycle. See the [OpenERP repository](https://github.com/rhanka/openerp) for the source of truth and the decision pack that froze the canon (2026-05-14).

## License

MIT — see [LICENSE](../../LICENSE) at the repository root.
