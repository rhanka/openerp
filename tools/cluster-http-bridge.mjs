// Local HTTP bridge to in-cluster services, built on `kubectl exec` rather than
// `kubectl port-forward`.
//
// The deploy pipeline's ci-deployer ServiceAccount is granted pods/exec but not
// pods/portforward, deliberately: exec is what the smoke checks already needed.
// Port-forwarding would be a second, broader grant for the same job. This
// bridge gets the cut-over smoke what it needs without asking for it.
//
// Two listeners:
//   - Mailpit, which no ingress exposes, reached from the API pod over the
//     cluster network because the Mailpit image is a single Go binary with no
//     node to exec into.
//   - The API. Paths the ingress publishes (/api, /readyz) go straight to the
//     public origin; everything else — protected routes at the API root — goes
//     through exec.
//
// Request bodies and bearer tokens travel on stdin, never in a command line.
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const NAMESPACE = required("OPENERP_BRIDGE_NAMESPACE");
const PUBLIC_ORIGIN = required("OPENERP_BRIDGE_PUBLIC_ORIGIN");
const MAILPIT_PORT = Number(process.env.OPENERP_BRIDGE_MAILPIT_PORT ?? "18025");
const API_PORT = Number(process.env.OPENERP_BRIDGE_API_PORT ?? "13000");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/** Run a fetch from inside the cluster and return its status, type and body. */
function fetchInCluster(pod, spec) {
  return new Promise((resolve, reject) => {
    const script = `
      let raw = "";
      process.stdin.on("data", (chunk) => { raw += chunk; });
      process.stdin.on("end", async () => {
        const spec = JSON.parse(raw);
        try {
          const response = await fetch(spec.url, {
            method: spec.method,
            headers: spec.headers,
            ...(spec.body ? { body: Buffer.from(spec.body, "base64") } : {}),
          });
          const body = Buffer.from(await response.arrayBuffer()).toString("base64");
          process.stdout.write(JSON.stringify({
            status: response.status,
            contentType: response.headers.get("content-type") || "application/json",
            body,
          }));
        } catch (error) {
          process.stdout.write(JSON.stringify({
            status: 502,
            contentType: "text/plain",
            body: Buffer.from(String(error)).toString("base64"),
          }));
        }
      });
    `;
    const child = spawn(
      "kubectl",
      ["-n", NAMESPACE, "exec", "-i", pod, "--", "node", "-e", script],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("close", (code) => {
      if (code !== 0 && !out) return reject(new Error(`kubectl exec failed (${code}): ${err}`));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`unparseable bridge response: ${out.slice(0, 200)} ${err.slice(0, 200)}`));
      }
    });
    child.stdin.end(JSON.stringify(spec));
  });
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : null;
}

function serve(port, handler, label) {
  createServer((request, response) => {
    handler(request, response).catch((error) => {
      response.writeHead(502, { "content-type": "text/plain" });
      response.end(String(error));
    });
  }).listen(port, "127.0.0.1", () => console.log(`bridge ${label} on 127.0.0.1:${port}`));
}

serve(MAILPIT_PORT, async (request, response) => {
  const result = await fetchInCluster("deploy/openerp-api", {
    url: `http://openerp-mailpit:8025${request.url}`,
    method: "GET",
    headers: { accept: "application/json" },
  });
  response.writeHead(result.status, { "content-type": result.contentType });
  response.end(Buffer.from(result.body, "base64"));
}, "mailpit");

serve(API_PORT, async (request, response) => {
  const body = await readBody(request);
  const headers = {};
  for (const name of ["accept", "authorization", "content-type", "cookie", "x-app-locale"]) {
    if (request.headers[name]) headers[name] = request.headers[name];
  }

  const publishedByIngress = request.url.startsWith("/api/") || request.url.startsWith("/readyz");
  const result = publishedByIngress
    ? await viaPublicOrigin(request, headers, body)
    : await fetchInCluster("deploy/openerp-api", {
        url: `http://127.0.0.1:3000${request.url}`,
        method: request.method,
        headers,
        ...(body ? { body: body.toString("base64") } : {}),
      });

  response.writeHead(result.status, { "content-type": result.contentType });
  response.end(Buffer.from(result.body, "base64"));
}, "api");

async function viaPublicOrigin(request, headers, body) {
  const upstream = await fetch(`${PUBLIC_ORIGIN}${request.url}`, {
    method: request.method,
    headers,
    ...(body ? { body } : {}),
  });
  return {
    status: upstream.status,
    contentType: upstream.headers.get("content-type") || "application/json",
    body: Buffer.from(await upstream.arrayBuffer()).toString("base64"),
  };
}
