FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/i18n/package.json packages/i18n/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @openerp/api build

EXPOSE 3000
CMD ["node", "apps/api/dist/src/foundation/service.js"]
