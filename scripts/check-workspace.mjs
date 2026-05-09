import { existsSync, readFileSync } from "node:fs";

const requiredPaths = [
  "apps/api/package.json",
  "apps/worker/package.json",
  "apps/web/package.json",
  "packages/domain/package.json",
  "packages/i18n/package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json"
];

for (const path of requiredPaths) {
  if (!existsSync(path)) {
    throw new Error(`Missing workspace path: ${path}`);
  }
}

const workspace = readFileSync("pnpm-workspace.yaml", "utf8");
for (const expected of ["apps/*", "packages/*"]) {
  if (!workspace.includes(expected)) {
    throw new Error(`pnpm workspace does not include ${expected}`);
  }
}
