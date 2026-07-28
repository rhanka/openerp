import { execFileSync } from "node:child_process";

const FLAGS = {
  api: "OPENERP_PLATFORM_AUTH_ENABLED",
  web: "OPENERP_PLATFORM_AUTH_UI_ENABLED",
};

const expected = {
  dev: { api: "1", web: "1" },
  prod: { api: "0", web: "0" },
};

const rendered = Object.fromEntries(
  Object.keys(expected).map((environment) => [
    environment,
    execFileSync("kubectl", ["kustomize", `infra/k8s/overlays/${environment}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  ]),
);

const actual = Object.fromEntries(
  Object.entries(rendered).map(([environment, manifest]) => [environment, readFlagState(manifest)]),
);

for (const environment of Object.keys(expected)) {
  const state = actual[environment];
  const want = expected[environment];
  if (state.api !== want.api || state.web !== want.web) {
    throw new Error(
      `${environment} platform-auth flags must be API=${want.api}, web=${want.web}; rendered API=${state.api}, web=${state.web}`,
    );
  }
}

if (actual.dev.api !== actual.dev.web || actual.prod.api !== actual.prod.web) {
  throw new Error("Platform-auth API and web flags must move as coordinated pairs.");
}

if (!hasSameOriginAuthIngress(rendered.dev) || !hasSameOriginAuthIngress(rendered.prod)) {
  throw new Error("Both ingress overlays must route /api (including /api/v1/auth) to openerp-api.");
}

console.log("auth cut-over overlays: dev API=1 web=1; prod API=0 web=0 (unset/default-off)");

function readFlagState(manifest) {
  const configMaps = new Map();
  for (const document of documents(manifest)) {
    if (!isKind(document, "ConfigMap")) continue;
    const name = metadataName(document);
    if (!name) continue;
    const data = {};
    for (const line of document.split("\n")) {
      const match = /^  ([A-Za-z0-9_.-]+):\s*["']?([^"'\n]+)["']?\s*$/.exec(line);
      if (match) data[match[1]] = match[2].trim();
    }
    configMaps.set(name, data);
  }

  const apiDeployment = deployment(manifest, "openerp-api");
  const webDeployment = deployment(manifest, "openerp-web");
  return {
    api: environmentFlag(apiDeployment, "api", FLAGS.api, configMaps),
    web: environmentFlag(webDeployment, "web", FLAGS.web, configMaps),
  };
}

function environmentFlag(document, containerName, flag, configMaps) {
  if (!document) return "0";
  const literal = new RegExp(
    `^        - name: ${escapeRegex(flag)}\\n          value: ["']?([^"'\\n]+)["']?\\s*$`,
    "m",
  ).exec(document);
  if (literal) return literal[1].trim();

  const configMap = new RegExp(
    `^        - name: ${escapeRegex(flag)}\\n          valueFrom:\\n            configMapKeyRef:\\n              key: ([^\\n]+)\\n              name: ([^\\n]+)$`,
    "m",
  ).exec(document);
  if (!configMap) return "0";
  return configMaps.get(configMap[2].trim())?.[configMap[1].trim()] ?? "0";
}

function hasSameOriginAuthIngress(manifest) {
  const ingress = documents(manifest).find((document) => isKind(document, "Ingress") && metadataName(document) === "openerp");
  return Boolean(ingress && /- backend:\n[\s\S]*?name: openerp-api[\s\S]*?path: \/api\n/.test(ingress));
}

function deployment(manifest, name) {
  return documents(manifest).find((document) => isKind(document, "Deployment") && metadataName(document) === name);
}

function documents(manifest) {
  return manifest.split(/^---\s*$/m).filter((document) => document.trim());
}

function isKind(document, kind) {
  return new RegExp(`^kind: ${escapeRegex(kind)}$`, "m").test(document);
}

function metadataName(document) {
  return /^  name: ([^\n]+)$/m.exec(document)?.[1].trim() ?? null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
