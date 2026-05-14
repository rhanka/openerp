// Foundation abstraction contracts — canon shared-entities-v1.md, arbitrage 2026-05-14.
// These interfaces are the wire-protocol between foundation and consumers (CRM, project, billing,
// reporting, agentic). Implementations live in apps/api (and adapters in apps/worker).
//
// No implementation here. Each contract is small, testable, and adapter-friendly.

import type {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalUrgency,
  FxRateSnapshot,
  IdempotencyRecord,
  Money,
  OrganizationMember,
  PayloadSummary,
  UserIdentity
} from "./foundation";

// =============================================================================
// PG-04 — JobQueue abstraction (pgmq MVP, BullMQ/NATS swappable)
// =============================================================================

export interface JobPayload {
  organizationId: string;
  jobType: string;
  payload: PayloadSummary;
  scheduledAt?: string;
  idempotencyKey?: string;
}

export interface JobHandle {
  jobId: string;
  organizationId: string;
  jobType: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  attempts: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface JobQueue {
  /** Enqueue a job. If idempotencyKey is set, replay returns the existing handle. */
  enqueue(job: JobPayload): Promise<JobHandle>;
  /** Fetch a job's current state. Returns null if unknown. */
  get(jobId: string): Promise<JobHandle | null>;
  /** Cancel a queued job before it starts. Idempotent. */
  cancel(jobId: string): Promise<JobHandle | null>;
}

// =============================================================================
// PG-03 — TenantIsolationStrategy (row-level RLS MVP, schema-per-tenant / DB-per-tenant swappable)
// =============================================================================

export interface TenantContext {
  organizationId: string;
  userIdentityId: string | null;
  actorType: "human" | "agent" | "system";
}

export interface TenantIsolationStrategy {
  /** Apply the tenant scope to a connection/session. Implementations differ per strategy. */
  applyScope(ctx: TenantContext): Promise<void>;
  /** Drop the tenant scope after a unit of work. Idempotent. */
  releaseScope(ctx: TenantContext): Promise<void>;
}

// =============================================================================
// PG-09 — IdentityProvider (RFC 8693 token exchange MVP, SPIFFE post-MVP)
// =============================================================================

export interface IdentityToken {
  raw: string;
  subjectUserIdentityId: string;
  actingForUserIdentityId: string | null;
  actorType: "human" | "agent" | "system";
  organizationId: string;
  scopes: string[];
  issuedAt: string;
  expiresAt: string;
  policyDecisionId: string | null;
  approvalRequestId: string | null;
}

export interface TokenExchangeRequest {
  subjectToken: string;
  subjectUserIdentityId: string;
  actingForUserIdentityId: string | null;
  requestedScopes: string[];
  organizationId: string;
  approvalRequestId: string | null;
  policyDecisionId: string | null;
  ttlSeconds?: number;
}

export interface IdentityProvider {
  /** Verify a token's signature and claims. Returns the parsed token or throws. */
  verify(rawToken: string): Promise<IdentityToken>;
  /** Issue a human session token from a successful auth flow. */
  issueHumanSession(identity: UserIdentity, member: OrganizationMember, ttlSeconds: number): Promise<IdentityToken>;
  /** RFC 8693 token exchange: trade a session for a short-lived agent token. */
  exchangeForAgentToken(req: TokenExchangeRequest): Promise<IdentityToken>;
  /** Revoke a token before its natural expiry. Idempotent. */
  revoke(rawToken: string): Promise<void>;
}

// =============================================================================
// PG-07 — ApprovalService (entité partagée, 3 surfaces: REST + MCP tool + SDK)
// =============================================================================

export interface CreateApprovalInput {
  organizationId: string;
  requesterUserIdentityId: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  urgency: ApprovalUrgency;
  expiresAt?: string;
}

export interface DecideApprovalInput {
  approvalRequestId: string;
  approverUserIdentityId: string;
  decision: "approved" | "rejected" | "escalated";
  decisionReason: string;
}

export interface ApprovalService {
  /** Create a new approval request. Idempotent if matching pending request exists for (subjectType, subjectId). */
  create(input: CreateApprovalInput): Promise<ApprovalRequest>;
  /** Decide on an existing pending request. Throws if not pending or not authorised. */
  decide(input: DecideApprovalInput): Promise<ApprovalRequest>;
  /** Fetch a request by id. */
  get(approvalRequestId: string): Promise<ApprovalRequest | null>;
  /** List pending requests for an approver (or role). */
  listPending(approverUserIdentityId: string): Promise<ApprovalRequest[]>;
  /** Update the status (e.g. expire). Reserved for system actors. */
  setStatus(approvalRequestId: string, status: ApprovalStatus): Promise<ApprovalRequest>;
}

// =============================================================================
// PG-06 article 1 — CurrencyResolver (Money + FxRateSnapshot)
// =============================================================================

export interface CurrencyResolver {
  /** Resolve the FX rate between source and target currency at a given moment. */
  resolve(sourceCurrency: string, targetCurrency: string, effectiveAt: string): Promise<FxRateSnapshot>;
  /** Convert a Money value to the target currency using the resolved rate. */
  convert(amount: Money, targetCurrency: string, effectiveAt: string): Promise<Money>;
}

// =============================================================================
// PG-08 — IdempotencyStore (middleware foundation)
// =============================================================================

export interface RecordIdempotencyInput {
  organizationId: string;
  key: string;
  requestHash: string;
  responseBodyHash: string;
  statusCode: number;
  ttlSeconds: number;
}

export interface IdempotencyStore {
  /** Try to register the key. Returns existing record if duplicate within TTL, else null and registers. */
  registerOrReplay(input: RecordIdempotencyInput): Promise<IdempotencyRecord | null>;
  /** Fetch an existing record. */
  get(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
}
