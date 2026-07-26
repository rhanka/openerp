import { randomUUID } from "node:crypto";

import type { StpConnectorContext } from "./fdx.js";

/** Fixed only for this short-lived connector process; no client supplies it. */
const SERVER_SESSION_ID = randomUUID();

async function getSecret(name: string): Promise<string> {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`bank-connector: secret "${name}" is not set in the environment`);
  }
  return value;
}

/**
 * Trusted process resolver (ARCH-11). It deliberately takes zero client
 * arguments, so a caller cannot select or override the connector tenant.
 */
export function resolveServerContext(): StpConnectorContext {
  const tenantRef = process.env.STP_TENANT_REF ?? "local";
  return {
    requestId: randomUUID(),
    principal: {
      sub: process.env.STP_PRINCIPAL_SUB ?? "bank-connector-server",
      tenantRef,
      roles: [],
    },
    session: {
      mcpSessionId: SERVER_SESSION_ID,
      clientId: process.env.STP_CLIENT_ID ?? "openerp-bank-connector-mcp",
      source: process.env.STP_MCP_SOURCE ?? "claude-code",
    },
    tenantRef,
    consentRefs: [],
    getSecret,
  };
}
