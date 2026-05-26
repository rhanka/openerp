// Billing entity — finance module (billing-accounting.md Article 4.4).
// Invoice is the final revenue document. Payment, taxes, journal entries are later slices.

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "partially_paid"
  | "void"
  | "written_off";

// Money snapshot aligned with CRM + Project ProposalMoney: {amountMinor, currency, scale}.
export interface BillingMoney {
  amountMinor: number;
  currency: string;
  scale: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  companyId: string;
  projectId: string | null;
  invoiceProposalId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: BillingMoney;
  taxTotal: BillingMoney;
  total: BillingMoney;
  issueDate: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id: string;
  organizationId: string;
  invoiceId: string;
  sourceType: string;
  sourceId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: BillingMoney;
  amount: BillingMoney;
  createdAt: string;
}

export interface InvoiceWithLines extends Invoice {
  lines: InvoiceLine[];
}

export interface CreateInvoiceLineInput {
  description?: string | null;
  quantity: number;
  unitPrice: BillingMoney;
  amount: BillingMoney;
}

export interface CreateInvoiceInput {
  companyId: string;
  projectId?: string | null;
  currency?: string;
  lines: CreateInvoiceLineInput[];
}

export interface ConvertProposalInput {
  invoiceProposalId: string;
}

export const BILLING_DOMAIN_EVENTS = [
  "billing.invoice.created",
  "billing.invoice.issued",
  "billing.invoice.paid",
  "billing.invoice.void",
  "billing.invoice.deleted"
] as const;

export type BillingDomainEvent = (typeof BILLING_DOMAIN_EVENTS)[number];
