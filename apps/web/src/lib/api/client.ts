import type { ApprovalRequest, AuditEvent } from "@sentropic/openerp-domain";
import type {
  Company,
  CompanyStatus,
  Contact,
  ContactStatus,
  CreateCompanyInput,
  CreateContactInput,
  CreateOpportunityInput,
  CreatePipelineStageInput,
  Opportunity,
  OpportunityStatus,
  PipelineStage,
  UpdateCompanyInput,
  UpdateContactInput,
  UpdateOpportunityInput,
  UpdatePipelineStageInput
} from "@sentropic/openerp-domain/crm";

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

  async function request<T>(
    path: string,
    init: { method?: string; body?: unknown; idempotencyKey?: string } = {}
  ): Promise<T> {
    const reqHeaders = headers();
    if (init.idempotencyKey) reqHeaders["idempotency-key"] = init.idempotencyKey;
    const response = await doFetch(`${options.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: reqHeaders,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined
    });
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
    },

    async listPendingApprovalsForApprover(approverUserIdentityId: string): Promise<ApprovalRequest[]> {
      const params = new URLSearchParams({ approver: approverUserIdentityId });
      return request<ApprovalRequest[]>(`/approval-requests?${params.toString()}`);
    },

    async decideApprovalRequest(input: {
      id: string;
      decision: "approved" | "rejected" | "escalated";
      decisionReason: string;
      idempotencyKey: string;
      approverUserIdentityId?: string;
    }): Promise<ApprovalRequest | { code: string }> {
      return request<ApprovalRequest | { code: string }>(
        `/approval-requests/${encodeURIComponent(input.id)}/decide`,
        {
          method: "PATCH",
          idempotencyKey: input.idempotencyKey,
          body: {
            decision: input.decision,
            decisionReason: input.decisionReason,
            approverUserIdentityId: input.approverUserIdentityId
          }
        }
      );
    },

    async listCompanies(query: { limit?: number; offset?: number; status?: CompanyStatus } = {}): Promise<Company[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Company[] }>(`/crm/companies${suffix}`);
      return body.items;
    },

    async createCompany(input: CreateCompanyInput): Promise<Company> {
      return request<Company>(`/crm/companies`, { method: "POST", body: input });
    },

    async updateCompany(id: string, patch: UpdateCompanyInput): Promise<Company> {
      return request<Company>(`/crm/companies/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async listContacts(query: { limit?: number; offset?: number; status?: ContactStatus; companyId?: string } = {}): Promise<Contact[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Contact[] }>(`/crm/contacts${suffix}`);
      return body.items;
    },

    async createContact(input: CreateContactInput): Promise<Contact> {
      return request<Contact>(`/crm/contacts`, { method: "POST", body: input });
    },

    async updateContact(id: string, patch: UpdateContactInput): Promise<Contact> {
      return request<Contact>(`/crm/contacts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async listPipelineStages(query: { activeOnly?: boolean } = {}): Promise<PipelineStage[]> {
      const params = new URLSearchParams();
      if (query.activeOnly) params.set("activeOnly", "true");
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: PipelineStage[] }>(`/crm/pipeline-stages${suffix}`);
      return body.items;
    },

    async createPipelineStage(input: CreatePipelineStageInput): Promise<PipelineStage> {
      return request<PipelineStage>(`/crm/pipeline-stages`, { method: "POST", body: input });
    },

    async updatePipelineStage(id: string, patch: UpdatePipelineStageInput): Promise<PipelineStage> {
      return request<PipelineStage>(`/crm/pipeline-stages/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async listOpportunities(query: {
      limit?: number;
      offset?: number;
      status?: OpportunityStatus;
      companyId?: string;
      stageId?: string;
    } = {}): Promise<Opportunity[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Opportunity[] }>(`/crm/opportunities${suffix}`);
      return body.items;
    },

    async createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
      return request<Opportunity>(`/crm/opportunities`, { method: "POST", body: input });
    },

    async updateOpportunity(id: string, patch: UpdateOpportunityInput): Promise<Opportunity> {
      return request<Opportunity>(`/crm/opportunities/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
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
