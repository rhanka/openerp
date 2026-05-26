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

// ---------------------------------------------------------------------------
// Tax entities (DS 4.2)
// ---------------------------------------------------------------------------

export interface TaxCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxCategoryInput {
  name: string;
  code: string;
  description?: string | null;
  active?: boolean;
}

export interface UpdateTaxCategoryInput {
  name?: string;
  code?: string;
  description?: string | null;
  active?: boolean;
}

export interface TaxRateVersion {
  id: string;
  organizationId: string;
  taxCategoryId: string;
  jurisdiction: string;
  label: string;
  /** Integer basis points: 500 = 5.00 %, 9975 = 9.975 %. */
  rateBps: number;
  /**
   * When false (default): rate applies on the pre-tax subtotal base.
   * When true: rate applies on subtotal + sum of prior taxes (compounded).
   * Expressed as a per-rate flag so the engine stays general.
   */
  compound: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRateVersionInput {
  taxCategoryId: string;
  jurisdiction: string;
  label: string;
  rateBps: number;
  compound?: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  active?: boolean;
}

export interface UpdateTaxRateVersionInput {
  jurisdiction?: string;
  label?: string;
  rateBps?: number;
  compound?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  active?: boolean;
}

/** One line of the per-invoice tax breakdown stored as jsonb. */
export interface TaxBreakdownLine {
  jurisdiction: string;
  label: string;
  rateBps: number;
  amount: BillingMoney;
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
  /** Default tax category applied to the whole invoice subtotal. */
  taxCategoryId: string | null;
  /** Per-jurisdiction computed breakdown from computeInvoiceTaxes. */
  taxBreakdown: TaxBreakdownLine[] | null;
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
  taxCategoryId?: string | null;
  lines: CreateInvoiceLineInput[];
}

export interface ConvertProposalInput {
  invoiceProposalId: string;
}

export type PaymentMethod = "bank_transfer" | "card" | "cheque" | "cash" | "other";

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string;
  companyId: string | null;
  amount: BillingMoney;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  invoiceId: string;
  amount: BillingMoney;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string | null;
}

export const BILLING_DOMAIN_EVENTS = [
  "billing.invoice.created",
  "billing.invoice.issued",
  "billing.invoice.paid",
  "billing.invoice.partially_paid",
  "billing.invoice.void",
  "billing.invoice.deleted",
  "billing.invoice.updated",
  "billing.payment.created",
  "billing.payment.deleted",
  "billing.tax_category.created",
  "billing.tax_category.updated",
  "billing.tax_category.deleted",
  "billing.tax_rate_version.created",
  "billing.tax_rate_version.updated",
  "billing.tax_rate_version.deleted"
] as const;

export type BillingDomainEvent = (typeof BILLING_DOMAIN_EVENTS)[number];
