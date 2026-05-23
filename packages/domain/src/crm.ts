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

export const CRM_DOMAIN_EVENTS = [
  "crm.company.created",
  "crm.company.updated"
] as const;

export type CrmDomainEvent = (typeof CRM_DOMAIN_EVENTS)[number];
