import type { ApprovalRequest, AuditEvent, TimelineEntry } from "@sentropic/openerp-domain";
import type {
  WorkflowDefinition,
  CreateWorkflowDefinitionInput,
  UpdateWorkflowDefinitionInput,
  WorkflowRun
} from "@sentropic/openerp-domain/workflow";
import type {
  WebhookEndpoint,
  WebhookDelivery,
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
  CreateWebhookEndpointResult,
  WebhookEventTypeEntry
} from "@sentropic/openerp-domain/webhook";
import type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
  ReportDefinition,
  CreateReportDefinitionInput,
  UpdateReportDefinitionInput,
  ReportRun,
  Dashboard,
  CreateDashboardInput,
  UpdateDashboardInput,
  DashboardWidget,
  CreateDashboardWidgetInput,
  UpdateDashboardWidgetInput,
  ScheduledDelivery,
  CreateScheduledDeliveryInput,
  UpdateScheduledDeliveryInput,
  DeliveryRun
} from "@sentropic/openerp-domain/reporting";
import type {
  Account,
  AccountType,
  CreateAccountInput,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  InvoiceWithLines,
  CreateInvoiceInput,
  BillingMoney,
  JournalEntry,
  JournalEntryWithLines,
  JournalEntryStatus,
  CreateJournalEntryInput,
  Payment,
  PaymentMethod,
  CreatePaymentInput,
  TaxCategory,
  TaxRateVersion,
  CreateTaxCategoryInput,
  UpdateTaxCategoryInput,
  CreateTaxRateVersionInput,
  UpdateTaxRateVersionInput,
  UpdateAccountInput
} from "@sentropic/openerp-domain/billing";
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
    },

    async listInvoices(query: {
      companyId?: string;
      projectId?: string;
      status?: InvoiceStatus;
      limit?: number;
      offset?: number;
    } = {}): Promise<Invoice[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Invoice[] }>(`/billing/invoices${suffix}`);
      return body.items;
    },

    async getInvoice(id: string): Promise<InvoiceWithLines> {
      return request<InvoiceWithLines>(`/billing/invoices/${encodeURIComponent(id)}`);
    },

    async createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithLines> {
      return request<InvoiceWithLines>(`/billing/invoices`, { method: "POST", body: input });
    },

    async createInvoiceFromProposal(invoiceProposalId: string): Promise<InvoiceWithLines> {
      return request<InvoiceWithLines>(`/billing/invoices/from-proposal`, {
        method: "POST",
        body: { invoiceProposalId }
      });
    },

    async issueInvoice(id: string): Promise<Invoice> {
      return request<Invoice>(`/billing/invoices/${encodeURIComponent(id)}/issue`, { method: "POST" });
    },

    async payInvoice(id: string): Promise<Invoice> {
      return request<Invoice>(`/billing/invoices/${encodeURIComponent(id)}/pay`, { method: "POST" });
    },

    async voidInvoice(id: string): Promise<Invoice> {
      return request<Invoice>(`/billing/invoices/${encodeURIComponent(id)}/void`, { method: "POST" });
    },

    async deleteInvoice(id: string): Promise<void> {
      return requestNoContent(`/billing/invoices/${encodeURIComponent(id)}`);
    },

    async listPayments(query: {
      invoiceId?: string;
      companyId?: string;
      limit?: number;
      offset?: number;
    } = {}): Promise<Payment[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Payment[] }>(`/billing/payments${suffix}`);
      return body.items;
    },

    async recordPayment(input: CreatePaymentInput): Promise<Payment> {
      return request<Payment>(`/billing/payments`, { method: "POST", body: input });
    },

    async getPayment(id: string): Promise<Payment> {
      return request<Payment>(`/billing/payments/${encodeURIComponent(id)}`);
    },

    async deletePayment(id: string): Promise<void> {
      return requestNoContent(`/billing/payments/${encodeURIComponent(id)}`);
    },

    // ---------------------------------------------------------------------------
    // Tax categories (DS 4.2)
    // ---------------------------------------------------------------------------

    async listTaxCategories(query: { activeOnly?: boolean } = {}): Promise<TaxCategory[]> {
      const params = new URLSearchParams();
      if (query.activeOnly) params.set("activeOnly", "true");
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: TaxCategory[] }>(`/billing/tax-categories${suffix}`);
      return body.items;
    },

    async createTaxCategory(input: CreateTaxCategoryInput): Promise<TaxCategory> {
      return request<TaxCategory>(`/billing/tax-categories`, { method: "POST", body: input });
    },

    async getTaxCategory(id: string): Promise<TaxCategory> {
      return request<TaxCategory>(`/billing/tax-categories/${encodeURIComponent(id)}`);
    },

    async updateTaxCategory(id: string, patch: UpdateTaxCategoryInput): Promise<TaxCategory> {
      return request<TaxCategory>(`/billing/tax-categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteTaxCategory(id: string): Promise<void> {
      return requestNoContent(`/billing/tax-categories/${encodeURIComponent(id)}`);
    },

    // ---------------------------------------------------------------------------
    // Tax rate versions (DS 4.2)
    // ---------------------------------------------------------------------------

    async listTaxRateVersions(query: { taxCategoryId?: string; activeOnly?: boolean; asOfDate?: string } = {}): Promise<TaxRateVersion[]> {
      const params = new URLSearchParams();
      if (query.taxCategoryId) params.set("taxCategoryId", query.taxCategoryId);
      if (query.activeOnly) params.set("activeOnly", "true");
      if (query.asOfDate) params.set("asOfDate", query.asOfDate);
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: TaxRateVersion[] }>(`/billing/tax-rate-versions${suffix}`);
      return body.items;
    },

    async createTaxRateVersion(input: CreateTaxRateVersionInput): Promise<TaxRateVersion> {
      return request<TaxRateVersion>(`/billing/tax-rate-versions`, { method: "POST", body: input });
    },

    async getTaxRateVersion(id: string): Promise<TaxRateVersion> {
      return request<TaxRateVersion>(`/billing/tax-rate-versions/${encodeURIComponent(id)}`);
    },

    async updateTaxRateVersion(id: string, patch: UpdateTaxRateVersionInput): Promise<TaxRateVersion> {
      return request<TaxRateVersion>(`/billing/tax-rate-versions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteTaxRateVersion(id: string): Promise<void> {
      return requestNoContent(`/billing/tax-rate-versions/${encodeURIComponent(id)}`);
    },

    // ---------------------------------------------------------------------------
    // Invoice compute-taxes action (DS 4.2)
    // ---------------------------------------------------------------------------

    async computeInvoiceTaxes(invoiceId: string, asOfDate?: string): Promise<Invoice> {
      return request<Invoice>(`/billing/invoices/${encodeURIComponent(invoiceId)}/compute-taxes`, {
        method: "POST",
        body: asOfDate ? { asOfDate } : {}
      });
    },

    // ---------------------------------------------------------------------------
    // Accounts (DS 4.3)
    // ---------------------------------------------------------------------------

    async listAccounts(query: { type?: AccountType; active?: boolean; limit?: number; offset?: number } = {}): Promise<{ items: Account[] }> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      return request<{ items: Account[] }>(`/billing/accounts${suffix}`);
    },

    async createAccount(input: CreateAccountInput): Promise<Account> {
      return request<Account>(`/billing/accounts`, { method: "POST", body: input });
    },

    async getAccount(id: string): Promise<Account> {
      return request<Account>(`/billing/accounts/${encodeURIComponent(id)}`);
    },

    async updateAccount(id: string, patch: UpdateAccountInput): Promise<Account> {
      return request<Account>(`/billing/accounts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteAccount(id: string): Promise<void> {
      return requestNoContent(`/billing/accounts/${encodeURIComponent(id)}`);
    },

    // ---------------------------------------------------------------------------
    // Journal Entries (DS 4.3)
    // ---------------------------------------------------------------------------

    async listJournalEntries(query: {
      sourceType?: string;
      sourceId?: string;
      status?: JournalEntryStatus;
      limit?: number;
      offset?: number;
    } = {}): Promise<{ items: JournalEntry[] }> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      return request<{ items: JournalEntry[] }>(`/billing/journal-entries${suffix}`);
    },

    async getJournalEntry(id: string): Promise<JournalEntryWithLines> {
      return request<JournalEntryWithLines>(`/billing/journal-entries/${encodeURIComponent(id)}`);
    },

    async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntryWithLines> {
      return request<JournalEntryWithLines>(`/billing/journal-entries`, { method: "POST", body: input });
    },

    async postJournalEntry(id: string): Promise<JournalEntryWithLines> {
      return request<JournalEntryWithLines>(`/billing/journal-entries/${encodeURIComponent(id)}/post`, { method: "POST" });
    },

    async voidJournalEntry(id: string): Promise<JournalEntryWithLines> {
      return request<JournalEntryWithLines>(`/billing/journal-entries/${encodeURIComponent(id)}/void`, { method: "POST" });
    },

    async deleteJournalEntry(id: string): Promise<void> {
      return requestNoContent(`/billing/journal-entries/${encodeURIComponent(id)}`);
    },

    async postInvoiceToJournal(invoiceId: string): Promise<JournalEntryWithLines> {
      return request<JournalEntryWithLines>(
        `/billing/invoices/${encodeURIComponent(invoiceId)}/post-to-journal`,
        { method: "POST" }
      );
    },

    async postPaymentToJournal(paymentId: string): Promise<JournalEntryWithLines> {
      return request<JournalEntryWithLines>(
        `/billing/payments/${encodeURIComponent(paymentId)}/post-to-journal`,
        { method: "POST" }
      );
    },

    // ---------------------------------------------------------------------------
    // Reporting — SavedViews (DS 5.0)
    // ---------------------------------------------------------------------------

    async listSavedViews(query: {
      resourceType?: string;
      ownerUserId?: string;
      shared?: boolean;
    } = {}): Promise<SavedView[]> {
      const params = new URLSearchParams();
      if (query.resourceType) params.set("resourceType", query.resourceType);
      if (query.ownerUserId) params.set("ownerUserId", query.ownerUserId);
      if (query.shared !== undefined) params.set("shared", String(query.shared));
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: SavedView[] }>(`/reporting/saved-views${suffix}`);
      return body.items;
    },

    async createSavedView(input: CreateSavedViewInput): Promise<SavedView> {
      return request<SavedView>(`/reporting/saved-views`, { method: "POST", body: input });
    },

    async getSavedView(id: string): Promise<SavedView> {
      return request<SavedView>(`/reporting/saved-views/${encodeURIComponent(id)}`);
    },

    async updateSavedView(id: string, patch: UpdateSavedViewInput): Promise<SavedView> {
      return request<SavedView>(`/reporting/saved-views/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteSavedView(id: string): Promise<void> {
      return requestNoContent(`/reporting/saved-views/${encodeURIComponent(id)}`);
    },

    // ---------------------------------------------------------------------------
    // Reporting — ReportDefinition + ReportRun (DS 5.1)
    // ---------------------------------------------------------------------------

    async listReportTypes(): Promise<Array<{
      reportType: string;
      labelKey: string;
      params: Array<{ key: string; type: string; required: boolean }>;
      columns: Array<{ key: string; labelKey: string; dataType: string }>;
    }>> {
      const body = await request<{ items: Array<{
        reportType: string;
        labelKey: string;
        params: Array<{ key: string; type: string; required: boolean }>;
        columns: Array<{ key: string; labelKey: string; dataType: string }>;
      }> }>("/reporting/report-types");
      return body.items;
    },

    async listReportDefinitions(query: {
      reportType?: string;
      ownerUserId?: string;
      shared?: boolean;
    } = {}): Promise<ReportDefinition[]> {
      const params = new URLSearchParams();
      if (query.reportType) params.set("reportType", query.reportType);
      if (query.ownerUserId) params.set("ownerUserId", query.ownerUserId);
      if (query.shared !== undefined) params.set("shared", String(query.shared));
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: ReportDefinition[] }>(`/reporting/report-definitions${suffix}`);
      return body.items;
    },

    async createReportDefinition(input: CreateReportDefinitionInput): Promise<ReportDefinition> {
      return request<ReportDefinition>("/reporting/report-definitions", {
        method: "POST",
        body: input
      });
    },

    async getReportDefinition(id: string): Promise<ReportDefinition> {
      return request<ReportDefinition>(`/reporting/report-definitions/${encodeURIComponent(id)}`);
    },

    async updateReportDefinition(id: string, patch: UpdateReportDefinitionInput): Promise<ReportDefinition> {
      return request<ReportDefinition>(`/reporting/report-definitions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteReportDefinition(id: string): Promise<void> {
      return requestNoContent(`/reporting/report-definitions/${encodeURIComponent(id)}`);
    },

    async runReportDefinition(id: string): Promise<ReportRun> {
      return request<ReportRun>(`/reporting/report-definitions/${encodeURIComponent(id)}/run`, {
        method: "POST"
      });
    },

    async listReportRuns(query: {
      reportDefinitionId?: string;
    } = {}): Promise<ReportRun[]> {
      const params = new URLSearchParams();
      if (query.reportDefinitionId) params.set("reportDefinitionId", query.reportDefinitionId);
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: ReportRun[] }>(`/reporting/report-runs${suffix}`);
      return body.items;
    },

    async getReportRun(id: string): Promise<ReportRun> {
      return request<ReportRun>(`/reporting/report-runs/${encodeURIComponent(id)}`);
    },

    // ---------------------------------------------------------------------------
    // Reporting — Dashboards + DashboardWidgets (DS 5.2)
    // ---------------------------------------------------------------------------

    async listDashboards(query: {
      ownerUserId?: string;
      shared?: boolean;
    } = {}): Promise<Dashboard[]> {
      const params = new URLSearchParams();
      if (query.ownerUserId) params.set("ownerUserId", query.ownerUserId);
      if (query.shared !== undefined) params.set("shared", String(query.shared));
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: Dashboard[] }>(`/reporting/dashboards${suffix}`);
      return body.items;
    },

    async createDashboard(input: CreateDashboardInput): Promise<Dashboard> {
      return request<Dashboard>("/reporting/dashboards", { method: "POST", body: input });
    },

    async getDashboard(id: string): Promise<Dashboard> {
      return request<Dashboard>(`/reporting/dashboards/${encodeURIComponent(id)}`);
    },

    async updateDashboard(id: string, patch: UpdateDashboardInput): Promise<Dashboard> {
      return request<Dashboard>(`/reporting/dashboards/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteDashboard(id: string): Promise<void> {
      return requestNoContent(`/reporting/dashboards/${encodeURIComponent(id)}`);
    },

    async renderDashboard(id: string): Promise<{
      dashboard: Dashboard;
      widgets: Array<{
        widget: DashboardWidget;
        reportType: string;
        columns: Array<{ key: string; labelKey: string; dataType: string }>;
        rows: Record<string, unknown>[];
        rowCount: number;
        error?: string;
      }>;
    }> {
      return request(`/reporting/dashboards/${encodeURIComponent(id)}/render`);
    },

    async listDashboardWidgets(dashboardId: string): Promise<DashboardWidget[]> {
      const body = await request<{ items: DashboardWidget[] }>(
        `/reporting/dashboards/${encodeURIComponent(dashboardId)}/widgets`
      );
      return body.items;
    },

    async addDashboardWidget(dashboardId: string, input: CreateDashboardWidgetInput): Promise<DashboardWidget> {
      return request<DashboardWidget>(
        `/reporting/dashboards/${encodeURIComponent(dashboardId)}/widgets`,
        { method: "POST", body: input }
      );
    },

    async updateDashboardWidget(dashboardId: string, widgetId: string, patch: UpdateDashboardWidgetInput): Promise<DashboardWidget> {
      return request<DashboardWidget>(
        `/reporting/dashboards/${encodeURIComponent(dashboardId)}/widgets/${encodeURIComponent(widgetId)}`,
        { method: "PATCH", body: patch }
      );
    },

    async removeDashboardWidget(dashboardId: string, widgetId: string): Promise<void> {
      return requestNoContent(
        `/reporting/dashboards/${encodeURIComponent(dashboardId)}/widgets/${encodeURIComponent(widgetId)}`
      );
    },

    // ---------------------------------------------------------------------------
    // Reporting — ScheduledDelivery + DeliveryRun (DS 5.3)
    // ---------------------------------------------------------------------------

    async listScheduledDeliveries(query: {
      ownerUserId?: string;
      shared?: boolean;
      active?: boolean;
    } = {}): Promise<ScheduledDelivery[]> {
      const params = new URLSearchParams();
      if (query.ownerUserId) params.set("ownerUserId", query.ownerUserId);
      if (query.shared !== undefined) params.set("shared", String(query.shared));
      if (query.active !== undefined) params.set("active", String(query.active));
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: ScheduledDelivery[] }>(`/reporting/scheduled-deliveries${suffix}`);
      return body.items;
    },

    async createScheduledDelivery(input: CreateScheduledDeliveryInput): Promise<ScheduledDelivery> {
      return request<ScheduledDelivery>("/reporting/scheduled-deliveries", {
        method: "POST",
        body: input
      });
    },

    async getScheduledDelivery(id: string): Promise<ScheduledDelivery> {
      return request<ScheduledDelivery>(`/reporting/scheduled-deliveries/${encodeURIComponent(id)}`);
    },

    async updateScheduledDelivery(id: string, patch: UpdateScheduledDeliveryInput): Promise<ScheduledDelivery> {
      return request<ScheduledDelivery>(`/reporting/scheduled-deliveries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteScheduledDelivery(id: string): Promise<void> {
      const reqHeaders = headers();
      const response = await doFetch(`${options.baseUrl}/reporting/scheduled-deliveries/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: reqHeaders
      });
      if (!response.ok && response.status !== 204) {
        const body = (await safeJson(response)) as { code?: string } | null;
        const err = new Error(`API ${response.status}`) as ApiError;
        err.status = response.status;
        if (body?.code) err.code = body.code;
        throw err;
      }
    },

    async runDueDeliveries(asOfDate?: string): Promise<{ processed: number; results: Array<{ scheduledDeliveryId: string; deliveryRunId: string; status: string }> }> {
      return request("/reporting/scheduled-deliveries/run", {
        method: "POST",
        body: asOfDate ? { asOfDate } : {}
      });
    },

    async runDeliveryNow(id: string): Promise<DeliveryRun> {
      return request<DeliveryRun>(`/reporting/scheduled-deliveries/${encodeURIComponent(id)}/run`, {
        method: "POST"
      });
    },

    async listDeliveryRuns(scheduledDeliveryId: string): Promise<DeliveryRun[]> {
      const body = await request<{ items: DeliveryRun[] }>(
        `/reporting/scheduled-deliveries/${encodeURIComponent(scheduledDeliveryId)}/runs`
      );
      return body.items;
    },

    async getDeliveryRun(id: string): Promise<DeliveryRun> {
      return request<DeliveryRun>(`/reporting/delivery-runs/${encodeURIComponent(id)}`);
    },

    // ---------------------------------------------------------------------------
    // Workflow — WorkflowDefinition + WorkflowRun (DS 5.4)
    // ---------------------------------------------------------------------------

    async listWorkflows(query: {
      triggerType?: string;
      ownerUserId?: string;
      shared?: boolean;
      active?: boolean;
    } = {}): Promise<WorkflowDefinition[]> {
      const params = new URLSearchParams();
      if (query.triggerType) params.set("triggerType", query.triggerType);
      if (query.ownerUserId) params.set("ownerUserId", query.ownerUserId);
      if (query.shared !== undefined) params.set("shared", String(query.shared));
      if (query.active !== undefined) params.set("active", String(query.active));
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: WorkflowDefinition[] }>(`/workflows${suffix}`);
      return body.items;
    },

    async createWorkflow(input: CreateWorkflowDefinitionInput): Promise<WorkflowDefinition> {
      return request<WorkflowDefinition>("/workflows", { method: "POST", body: input });
    },

    async getWorkflow(id: string): Promise<WorkflowDefinition> {
      return request<WorkflowDefinition>(`/workflows/${encodeURIComponent(id)}`);
    },

    async updateWorkflow(id: string, patch: UpdateWorkflowDefinitionInput): Promise<WorkflowDefinition> {
      return request<WorkflowDefinition>(`/workflows/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: patch
      });
    },

    async deleteWorkflow(id: string): Promise<void> {
      const reqHeaders = headers();
      const response = await doFetch(`${options.baseUrl}/workflows/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: reqHeaders
      });
      if (!response.ok && response.status !== 204) {
        const body = (await safeJson(response)) as { code?: string } | null;
        const err = new Error(`API ${response.status}`) as ApiError;
        err.status = response.status;
        if (body?.code) err.code = body.code;
        throw err;
      }
    },

    async runWorkflowNow(id: string): Promise<WorkflowRun> {
      return request<WorkflowRun>(`/workflows/${encodeURIComponent(id)}/run`, { method: "POST" });
    },

    async listWorkflowRuns(workflowId: string): Promise<WorkflowRun[]> {
      const body = await request<{ items: WorkflowRun[] }>(
        `/workflows/${encodeURIComponent(workflowId)}/runs`
      );
      return body.items;
    },

    async getWorkflowCatalog(): Promise<{
      triggers: Array<{ eventType: string; labelKey: string }>;
      actions: Array<{ actionType: string; labelKey: string }>;
    }> {
      return request("/workflows/catalog");
    },

    async listWebhookEndpoints(query: { ownerUserId?: string; shared?: boolean; active?: boolean } = {}): Promise<WebhookEndpoint[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: WebhookEndpoint[] }>(`/webhook/endpoints${suffix}`);
      return body.items;
    },

    async getWebhookEndpoint(id: string): Promise<WebhookEndpoint> {
      return request<WebhookEndpoint>(`/webhook/endpoints/${encodeURIComponent(id)}`);
    },

    async createWebhookEndpoint(input: CreateWebhookEndpointInput): Promise<CreateWebhookEndpointResult> {
      return request<CreateWebhookEndpointResult>(`/webhook/endpoints`, { method: "POST", body: input });
    },

    async updateWebhookEndpoint(id: string, patch: UpdateWebhookEndpointInput): Promise<WebhookEndpoint> {
      return request<WebhookEndpoint>(`/webhook/endpoints/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
    },

    async rotateWebhookSecret(id: string): Promise<{ signingSecret: string }> {
      return request<{ signingSecret: string }>(`/webhook/endpoints/${encodeURIComponent(id)}/rotate-secret`, { method: "POST" });
    },

    async deleteWebhookEndpoint(id: string): Promise<void> {
      return requestNoContent(`/webhook/endpoints/${encodeURIComponent(id)}`);
    },

    async testWebhookEndpoint(id: string): Promise<WebhookDelivery> {
      return request<WebhookDelivery>(`/webhook/endpoints/${encodeURIComponent(id)}/test`, { method: "POST" });
    },

    async listWebhookDeliveries(endpointId: string): Promise<WebhookDelivery[]> {
      const body = await request<{ items: WebhookDelivery[] }>(
        `/webhook/endpoints/${encodeURIComponent(endpointId)}/deliveries`
      );
      return body.items;
    },

    async getWebhookDelivery(id: string): Promise<WebhookDelivery> {
      return request<WebhookDelivery>(`/webhook/deliveries/${encodeURIComponent(id)}`);
    },

    async listWebhookEventTypes(): Promise<WebhookEventTypeEntry[]> {
      const body = await request<{ items: WebhookEventTypeEntry[] }>(`/webhook/event-types`);
      return body.items;
    },

    async listUsers(query: { limit?: number; offset?: number } = {}): Promise<TenantUserSummary[]> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        params.set(key, String(value));
      }
      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const body = await request<{ items: TenantUserSummary[] }>(`/users${suffix}`);
      return body.items;
    }
  };
}

export interface TenantUserSummary {
  id: string;
  email: string;
  displayName: string;
  status: string;
}

// Re-export billing types so web pages can import from the client module
export type {
  Account,
  AccountType,
  CreateAccountInput,
  UpdateAccountInput,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  InvoiceWithLines,
  BillingMoney,
  JournalEntry,
  JournalEntryWithLines,
  JournalEntryStatus,
  CreateJournalEntryInput,
  Payment,
  PaymentMethod,
  CreatePaymentInput,
  TaxCategory,
  TaxRateVersion,
  CreateTaxCategoryInput,
  UpdateTaxCategoryInput,
  CreateTaxRateVersionInput,
  UpdateTaxRateVersionInput
};

// Re-export workflow types so web pages can import from the client module
export type {
  WorkflowDefinition,
  CreateWorkflowDefinitionInput,
  UpdateWorkflowDefinitionInput,
  WorkflowRun
};

// Re-export reporting types so web pages can import from the client module
export type {
  SavedView,
  CreateSavedViewInput,
  UpdateSavedViewInput,
  ReportDefinition,
  CreateReportDefinitionInput,
  UpdateReportDefinitionInput,
  ReportRun,
  Dashboard,
  CreateDashboardInput,
  UpdateDashboardInput,
  DashboardWidget,
  CreateDashboardWidgetInput,
  UpdateDashboardWidgetInput,
  ScheduledDelivery,
  CreateScheduledDeliveryInput,
  UpdateScheduledDeliveryInput,
  DeliveryRun
};

async function safeJson(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
