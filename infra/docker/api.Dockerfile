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

# Source + build. domain + i18n are dist dependencies of the api; tsx (devDep,
# kept) backs the migrate script run by the migration Job from this same image.
COPY . .
RUN npm run build -w @sentropic/openerp-domain \
 && npm run build -w @sentropic/openerp-i18n \
 && npm run build -w @sentropic/openerp-api

EXPOSE 3000
CMD ["node", "apps/api/dist/src/foundation/service.js"]
