// CRM canon entities — shared-entities-v1 Article 4.2.
// Only Company landed for Demo Slice 2; Contact / Lead / Opportunity follow.

import type { LocaleCode } from "./foundation";

export type CompanyStatus = "active" | "archived";

export interface Company {
  id: string;
  organizationId: string;
  displayName: string;
  legalName: string | null;
  status: CompanyStatus;
  ownerUserId: string | null;
  teamId: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  language: LocaleCode | null;
  taxRegion: string | null;
  /** Address fields stored as a structured jsonb at the DB layer. */
  billingAddress: AddressPayload | null;
  shippingAddress: AddressPayload | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddressPayload {
  line1?: string;
  line2?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  country?: string;
}

export interface CreateCompanyInput {
  displayName: string;
  legalName?: string | null;
  ownerUserId?: string | null;
  teamId?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: LocaleCode | null;
  taxRegion?: string | null;
  billingAddress?: AddressPayload | null;
  shippingAddress?: AddressPayload | null;
}

export interface UpdateCompanyInput {
  displayName?: string;
  legalName?: string | null;
  status?: CompanyStatus;
  ownerUserId?: string | null;
  teamId?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: LocaleCode | null;
  taxRegion?: string | null;
  billingAddress?: AddressPayload | null;
  shippingAddress?: AddressPayload | null;
}

export type ContactStatus = "active" | "inactive";

export interface Contact {
  id: string;
  organizationId: string;
  companyId: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  language: LocaleCode | null;
  status: ContactStatus;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactInput {
  companyId?: string | null;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  language?: LocaleCode | null;
  ownerUserId?: string | null;
}

export interface UpdateContactInput {
  companyId?: string | null;
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  language?: LocaleCode | null;
  status?: ContactStatus;
  ownerUserId?: string | null;
}

// PipelineStage canon (Article 4.2). Tenant-configurable stage ordering with
// is_initial / is_won / is_lost markers driving the funnel transitions.
export interface PipelineStage {
  id: string;
  organizationId: string;
  name: string;
  orderIndex: number;
  isInitial: boolean;
  isWon: boolean;
  isLost: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePipelineStageInput {
  name: string;
  orderIndex: number;
  isInitial?: boolean;
  isWon?: boolean;
  isLost?: boolean;
}

export interface UpdatePipelineStageInput {
  name?: string;
  orderIndex?: number;
  isInitial?: boolean;
  isWon?: boolean;
  isLost?: boolean;
  active?: boolean;
}

export type OpportunityStatus = "open" | "won" | "lost" | "archived";

// Money snapshot stored as jsonb on the opportunity row; aligned on the
// foundation Money contract (amountMinor + currency + scale).
export interface MoneySnapshot {
  amountMinor: number;
  currency: string;
  scale: number;
}

export interface Opportunity {
  id: string;
  organizationId: string;
  companyId: string;
  primaryContactId: string | null;
  name: string;
  stageId: string;
  status: OpportunityStatus;
  ownerUserId: string | null;
  teamId: string | null;
  expectedValue: MoneySnapshot | null;
  currency: string | null;
  expectedCloseDate: string | null;
  probabilityBand: "low" | "medium" | "high" | null;
  serviceSummary: string | null;
  lossReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityInput {
  companyId: string;
  primaryContactId?: string | null;
  name: string;
  stageId: string;
  ownerUserId?: string | null;
  teamId?: string | null;
  expectedValue?: MoneySnapshot | null;
  currency?: string | null;
  expectedCloseDate?: string | null;
  probabilityBand?: "low" | "medium" | "high" | null;
  serviceSummary?: string | null;
}

export interface UpdateOpportunityInput {
  primaryContactId?: string | null;
  name?: string;
  stageId?: string;
  status?: OpportunityStatus;
  ownerUserId?: string | null;
  teamId?: string | null;
  expectedValue?: MoneySnapshot | null;
  currency?: string | null;
  expectedCloseDate?: string | null;
  probabilityBand?: "low" | "medium" | "high" | null;
  serviceSummary?: string | null;
  lossReason?: string | null;
}

// Lead canon (Article 4.2). Entry to the funnel: capture an unqualified
// prospect, then convert into the Company + Contact + Opportunity triple in
// one transaction.
export type LeadStatus = "new" | "working" | "converted" | "disqualified";

export interface Lead {
  id: string;
  organizationId: string;
  source: string | null;
  displayName: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  status: LeadStatus;
  ownerUserId: string | null;
  teamId: string | null;
  /** Set when status transitions to "converted". */
  convertedAt: string | null;
  /** Targets populated by the conversion path; null otherwise. */
  convertedCompanyId: string | null;
  convertedContactId: string | null;
  convertedOpportunityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadInput {
  displayName: string;
  source?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  ownerUserId?: string | null;
  teamId?: string | null;
}

export interface UpdateLeadInput {
  source?: string | null;
  displayName?: string;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  status?: Exclude<LeadStatus, "converted">;
  ownerUserId?: string | null;
  teamId?: string | null;
}

export interface ConvertLeadResult {
  lead: Lead;
  company: Company;
  contact: Contact | null;
  opportunity: Opportunity;
}

export const CRM_DOMAIN_EVENTS = [
  "crm.company.created",
  "crm.company.updated",
  "crm.contact.created",
  "crm.contact.updated",
  "crm.pipeline_stage.created",
  "crm.pipeline_stage.updated",
  "crm.opportunity.created",
  "crm.opportunity.updated",
  "crm.opportunity.stage_changed",
  "crm.opportunity.won",
  "crm.opportunity.lost",
  "crm.lead.created",
  "crm.lead.updated",
  "crm.lead.converted"
] as const;

export type CrmDomainEvent = (typeof CRM_DOMAIN_EVENTS)[number];
