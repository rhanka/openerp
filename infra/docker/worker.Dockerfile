FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/i18n/package.json packages/i18n/package.json
RUN pnpm install --frozen-lockfile

COPY apps/worker apps/worker
COPY packages packages
RUN pnpm --filter @openerp/worker build

CMD ["node", "apps/worker/dist/src/worker.js"]
