FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/i18n/package.json packages/i18n/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
COPY packages packages
RUN pnpm --filter @openerp/web build

EXPOSE 8080
CMD ["node", "--version"]
