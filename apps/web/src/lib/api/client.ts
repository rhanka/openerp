import type { ApprovalRequest, AuditEvent, TimelineEntry } from "@sentropic/openerp-domain";
import type {
  Assignment,
  CreateAssignmentInput,
  CreateInvoiceProposalInput,
  CreateProjectInput,
  CreateProjectTaskInput,
  CreateRateInput,
  CreateTimeEntryInput,
  InvoiceProposal,
  InvoiceProposalStatus,
  InvoiceProposalWithLines,
  Project,
  ProjectStatus,
  ProjectTask,
  ProjectTaskStatus,
  Rate,
  TimeEntry,
  TimeEntryStatus,
  UpdateAssignmentInput,
  UpdateProjectInput,
  UpdateProjectTaskInput,
  UpdateRateInput,
  UpdateTimeEntryInput
} from "@sentropic/openerp-domain/project";
import type {
  Company,
  CompanyStatus,
  Contact,
  ContactStatus,
  ConvertLeadResult,
  CreateCompanyInput,
  CreateContactInput,
  CreateLeadInput,
  CreateOpportunityInput,
  CreatePipelineStageInput,
  Lead,
  LeadStatus,
  Opportunity,
  OpportunityStatus,
  PipelineStage,
  UpdateCompanyInput,
  UpdateContactInput,
  UpdateLeadInput,
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

  async function requestNoContent(
    path: string,
    init: { method?: string; idempotencyKey?: string } = {}
  ): Promise<void> {
    const reqHeaders = headers();
    if (init.idempotencyKey) reqHeaders["idempotency-key"] = init.idempotencyKey;
    const response = await doFetch(`${options.baseUrl}${path}`, {
      method: init.method ?? "DELETE",
      headers: reqHeaders
    });
    if (!response.ok) {
      const body = (await safeJson(response)) as { code?: string } | null;
      const err = new Error(`API ${response.status} for ${path}`) as ApiError;
      err.status = response.status;
      if (body?.code) err.code = body.code;
      throw err;
    }
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
    },

    async getOpportunity(id: string): Promise<Opportunity> {
      return request<Opportunity>(`/crm/opportunities/${encodeURIComponent(id)}`);
    },

    async getCompany(id: string): Promise<Company> {
      return request<Company>(`/crm/companies/${encodeURIComponent(id)}`);
    },

    async getContact(id: string): Promise<Contact> {
      return request<Contact>(`/crm/contacts/${encodeURIComponent(id)}`);
    },

    async getLead(id: string): Promise<Lead> {
      return request<Lead>(`/crm/leads/${encodeURIComponent(id)}`);
    },

    async listLeads(query: { limit?: number; offset?: number; status?: LeadStatus } = {}): Promise<Lead[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Lead[] }>(`/crm/leads${suffix}`);
      return body.items;
    },

    async createLead(input: CreateLeadInput): Promise<Lead> {
      return request<Lead>(`/crm/leads`, { method: "POST", body: input });
    },

    async updateLead(id: string, patch: UpdateLeadInput): Promise<Lead> {
      return request<Lead>(`/crm/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async convertLead(id: string): Promise<ConvertLeadResult> {
      return request<ConvertLeadResult>(`/crm/leads/${encodeURIComponent(id)}/convert`, {
        method: "POST"
      });
    },

    async listCrmTimeline(query: {
      resourceType: "company" | "contact" | "opportunity" | "lead";
      resourceId: string;
      limit?: number;
    }): Promise<TimelineEntry[]> {
      const params = new URLSearchParams({
        resourceType: query.resourceType,
        resourceId: query.resourceId
      });
      if (query.limit !== undefined) params.set("limit", String(query.limit));
      const body = await request<{ items: TimelineEntry[] }>(
        `/crm/timeline?${params.toString()}`
      );
      return body.items;
    },

    async deleteCompany(id: string): Promise<void> {
      return requestNoContent(`/crm/companies/${encodeURIComponent(id)}`);
    },

    async deleteContact(id: string): Promise<void> {
      return requestNoContent(`/crm/contacts/${encodeURIComponent(id)}`);
    },

    async deleteOpportunity(id: string): Promise<void> {
      return requestNoContent(`/crm/opportunities/${encodeURIComponent(id)}`);
    },

    async deleteLead(id: string): Promise<void> {
      return requestNoContent(`/crm/leads/${encodeURIComponent(id)}`);
    },

    async listProjects(query: { limit?: number; offset?: number; status?: ProjectStatus } = {}): Promise<Project[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Project[] }>(`/project/projects${suffix}`);
      return body.items;
    },

    async createProject(input: CreateProjectInput): Promise<Project> {
      return request<Project>(`/project/projects`, { method: "POST", body: input });
    },

    async updateProject(id: string, patch: UpdateProjectInput): Promise<Project> {
      return request<Project>(`/project/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async getProject(id: string): Promise<Project> {
      return request<Project>(`/project/projects/${encodeURIComponent(id)}`);
    },

    async deleteProject(id: string): Promise<void> {
      return requestNoContent(`/project/projects/${encodeURIComponent(id)}`);
    },

    async listProjectTimeline(query: {
      resourceId: string;
      limit?: number;
    }): Promise<TimelineEntry[]> {
      const params = new URLSearchParams({
        resourceType: "project",
        resourceId: query.resourceId
      });
      if (query.limit !== undefined) params.set("limit", String(query.limit));
      const body = await request<{ items: TimelineEntry[] }>(
        `/project/timeline?${params.toString()}`
      );
      return body.items;
    },

    async listProjectTasks(query: {
      projectId?: string;
      status?: ProjectTaskStatus;
      limit?: number;
      offset?: number;
    } = {}): Promise<ProjectTask[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: ProjectTask[] }>(`/project/tasks${suffix}`);
      return body.items;
    },

    async createProjectTask(input: CreateProjectTaskInput): Promise<ProjectTask> {
      return request<ProjectTask>(`/project/tasks`, { method: "POST", body: input });
    },

    async updateProjectTask(id: string, patch: UpdateProjectTaskInput): Promise<ProjectTask> {
      return request<ProjectTask>(`/project/tasks/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async getProjectTask(id: string): Promise<ProjectTask> {
      return request<ProjectTask>(`/project/tasks/${encodeURIComponent(id)}`);
    },

    async deleteProjectTask(id: string): Promise<void> {
      return requestNoContent(`/project/tasks/${encodeURIComponent(id)}`);
    },

    async listTimeEntries(query: {
      projectId?: string;
      projectTaskId?: string;
      userId?: string;
      status?: TimeEntryStatus;
      billable?: boolean;
      limit?: number;
      offset?: number;
    } = {}): Promise<TimeEntry[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: TimeEntry[] }>(`/project/time-entries${suffix}`);
      return body.items;
    },

    async createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
      return request<TimeEntry>(`/project/time-entries`, { method: "POST", body: input });
    },

    async updateTimeEntry(id: string, patch: UpdateTimeEntryInput): Promise<TimeEntry> {
      return request<TimeEntry>(`/project/time-entries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async getTimeEntry(id: string): Promise<TimeEntry> {
      return request<TimeEntry>(`/project/time-entries/${encodeURIComponent(id)}`);
    },

    async deleteTimeEntry(id: string): Promise<void> {
      return requestNoContent(`/project/time-entries/${encodeURIComponent(id)}`);
    },

    async listRates(query: { limit?: number; offset?: number; activeOnly?: boolean } = {}): Promise<Rate[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Rate[] }>(`/project/rates${suffix}`);
      return body.items;
    },

    async createRate(input: CreateRateInput): Promise<Rate> {
      return request<Rate>(`/project/rates`, { method: "POST", body: input });
    },

    async updateRate(id: string, patch: UpdateRateInput): Promise<Rate> {
      return request<Rate>(`/project/rates/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async getRate(id: string): Promise<Rate> {
      return request<Rate>(`/project/rates/${encodeURIComponent(id)}`);
    },

    async deleteRate(id: string): Promise<void> {
      return requestNoContent(`/project/rates/${encodeURIComponent(id)}`);
    },

    async listAssignments(query: { projectId?: string; userId?: string; limit?: number; offset?: number } = {}): Promise<Assignment[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Assignment[] }>(`/project/assignments${suffix}`);
      return body.items;
    },

    async createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
      return request<Assignment>(`/project/assignments`, { method: "POST", body: input });
    },

    async updateAssignment(id: string, patch: UpdateAssignmentInput): Promise<Assignment> {
      return request<Assignment>(`/project/assignments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async getAssignment(id: string): Promise<Assignment> {
      return request<Assignment>(`/project/assignments/${encodeURIComponent(id)}`);
    },

    async deleteAssignment(id: string): Promise<void> {
      return requestNoContent(`/project/assignments/${encodeURIComponent(id)}`);
    },

    async listInvoiceProposals(query: {
      projectId?: string;
      status?: InvoiceProposalStatus;
      limit?: number;
      offset?: number;
    } = {}): Promise<InvoiceProposal[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: InvoiceProposal[] }>(`/project/invoice-proposals${suffix}`);
      return body.items;
    },

    async getInvoiceProposal(id: string): Promise<InvoiceProposalWithLines> {
      return request<InvoiceProposalWithLines>(`/project/invoice-proposals/${encodeURIComponent(id)}`);
    },

    async generateInvoiceProposal(input: CreateInvoiceProposalInput): Promise<InvoiceProposalWithLines> {
      return request<InvoiceProposalWithLines>(`/project/invoice-proposals/generate`, {
        method: "POST",
        body: input
      });
    },

    async submitInvoiceProposal(id: string): Promise<InvoiceProposal> {
      return request<InvoiceProposal>(`/project/invoice-proposals/${encodeURIComponent(id)}/submit`, {
        method: "POST"
      });
    },

    async approveInvoiceProposal(id: string): Promise<InvoiceProposal> {
      return request<InvoiceProposal>(`/project/invoice-proposals/${encodeURIComponent(id)}/approve`, {
        method: "POST"
      });
    },

    async rejectInvoiceProposal(id: string): Promise<InvoiceProposal> {
      return request<InvoiceProposal>(`/project/invoice-proposals/${encodeURIComponent(id)}/reject`, {
        method: "POST"
      });
    },

    async deleteInvoiceProposal(id: string): Promise<void> {
      return requestNoContent(`/project/invoice-proposals/${encodeURIComponent(id)}`);
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
