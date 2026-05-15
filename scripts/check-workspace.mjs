import { existsSync, readFileSync } from "node:fs";

const requiredPaths = [
  "package.json",
  "apps/api/package.json",
  "apps/worker/package.json",
  "apps/web/package.json",
  "packages/domain/package.json",
  "packages/i18n/package.json",
  "tsconfig.base.json"
];

for (const path of requiredPaths) {
  if (!existsSync(path)) {
    throw new Error(`Missing workspace path: ${path}`);
  }
}

const root = JSON.parse(readFileSync("package.json", "utf8"));
const workspaces = root.workspaces ?? [];
for (const expected of ["apps/*", "packages/*"]) {
  if (!workspaces.includes(expected)) {
    throw new Error(`Root package.json workspaces does not include ${expected}`);
  }
}
