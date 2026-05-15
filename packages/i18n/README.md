# @sentropic/openerp-i18n

OpenERP bilingual (FR-CA / EN-CA) catalog helpers for the foundation UI strings.

Static catalog bundled at build time. For tenant-owned data labels (pipeline stages, service activities, etc.) use the `translation_keys` table exposed by `@sentropic/openerp-api`.

## Install

```sh
npm install @sentropic/openerp-i18n
```

## API

```ts
import { catalog, getMessage, validateCatalogPair } from "@sentropic/openerp-i18n";

getMessage("fr", "foundation.login.title"); // "Connexion"
```

## Versioning

This package follows the OpenERP project release cycle. See the [OpenERP repository](https://github.com/rhanka/openerp) for the canonical source.

## License

MIT — see [LICENSE](../../LICENSE) at the repository root.
