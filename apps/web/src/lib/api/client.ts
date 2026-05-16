import type { AuditEvent } from "@sentropic/openerp-domain";

export interface ApiClientOptions {
  baseUrl: string;
  /** Tenant context headers — provided by the SSR layer until passkey-based
   *  session cookies land. */
  organizationId: string;
  actorUserId: string;
  /** Hono `app.request()` style fetch override, used by tests. */
  fetch?: typeof fetch;
}

export interface ListAuditEventsQuery {
  limit?: number;
  action?: string;
  resourceType?: string;
  actorUserId?: string;
  fromCreatedAt?: string;
  toCreatedAt?: string;
}

export interface ApiError extends Error {
  status: number;
  code?: string;
}

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? fetch;

  function headers(): Record<string, string> {
    return {
      "x-organization-id": options.organizationId,
      "x-user-identity-id": options.actorUserId,
      "content-type": "application/json"
    };
  }

  async function request<T>(path: string): Promise<T> {
    const response = await doFetch(`${options.baseUrl}${path}`, { headers: headers() });
    if (!response.ok) {
      const body = (await safeJson(response)) as { code?: string } | null;
      const err = new Error(`API ${response.status} for ${path}`) as ApiError;
      err.status = response.status;
      if (body?.code) err.code = body.code;
      throw err;
    }
    return (await response.json()) as T;
  }

  return {
    async listAuditEvents(query: ListAuditEventsQuery = {}): Promise<AuditEvent[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ data: AuditEvent[]; count: number }>(`/audit-events${suffix}`);
      return body.data;
    }
  };
}

async function safeJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
