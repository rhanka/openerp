FROM node:22-alpine AS base
WORKDIR /app

# Dependency layer — cached unless a package manifest or the lockfile changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/i18n/package.json packages/i18n/package.json
RUN npm ci

# Source + build. domain + i18n are dist dependencies of the worker.
COPY . .
RUN npm run build -w @sentropic/openerp-domain \
 && npm run build -w @sentropic/openerp-i18n \
 && npm run build -w @sentropic/openerp-worker

# Run via tsx (same runtime as the migrate entrypoint): the source uses
# extensionless relative imports that plain node ESM cannot resolve, while
# tsx resolves them. start.ts calls main() (the runtime loop); worker.ts is
# only a descriptor. dist is still built above as a typecheck.
CMD ["node_modules/.bin/tsx", "apps/worker/src/start.ts"]
