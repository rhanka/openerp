import type { DomainEvent, PayloadSummary } from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { assertEntryType } from "./entry-type-grammar";

// DomainEvent outbox repo (PG-06 article 2 separation + Lot 3).
// Producers publish via publishDomainEvent inside their transaction; the worker
// claims unconsumed events FIFO and marks them consumed after side effects fan-out.

const DE_COLUMNS = `
  id,
  organization_id as "organizationId",
  event_type as "eventType",
  resource_type as "resourceType",
  resource_id as "resourceId",
  payload_summary as "payloadSummary",
  emitted_at as "emittedAt",
  consumed_at as "consumedAt"
`;

export interface PublishDomainEventInput {
  eventType: string;
  resourceType: string;
  resourceId: string;
  payloadSummary: PayloadSummary;
  emittedAt?: string;
}

export async function publishDomainEvent(
  db: Queryable,
  context: TenantContext,
  input: PublishDomainEventInput
): Promise<DomainEvent> {
  assertTenantContext(context);
  assertEntryType(input.eventType);
  const emittedAt = input.emittedAt ?? new Date().toISOString();
  const result = await db.query<DomainEvent>(
    `insert into domain_events (
       organization_id, event_type, resource_type, resource_id, payload_summary, emitted_at
     ) values ($1, $2, $3, $4, $5, $6)
     returning ${DE_COLUMNS}`,
    [
      context.organizationId,
      input.eventType,
      input.resourceType,
      input.resourceId,
      input.payloadSummary,
      emittedAt
    ]
  );
  return result.rows[0]!;
}

export async function findDomainEventById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<DomainEvent | null> {
  assertTenantContext(context);
  const result = await db.query<DomainEvent>(
    `select ${DE_COLUMNS}
       from domain_events
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

/** Worker side: claim a batch of unconsumed events ordered FIFO. SELECT FOR UPDATE
 *  SKIP LOCKED so multiple workers can run concurrently without dispatching the
 *  same event twice. Returns claimed events (not yet marked consumed). */
export async function claimUnconsumedEvents(
  db: Queryable,
  context: TenantContext,
  batchSize = 50
): Promise<DomainEvent[]> {
  assertTenantContext(context);
  const result = await db.query<DomainEvent>(
    `select ${DE_COLUMNS}
       from domain_events
      where organization_id = $1
        and consumed_at is null
      order by emitted_at asc
      for update skip locked
      limit $2`,
    [context.organizationId, batchSize]
  );
  return result.rows;
}

export async function markEventConsumed(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<DomainEvent | null> {
  assertTenantContext(context);
  const result = await db.query<DomainEvent>(
    `update domain_events
        set consumed_at = now()
      where id = $1
        and organization_id = $2
        and consumed_at is null
      returning ${DE_COLUMNS}`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export interface ListDomainEventsQuery {
  eventTypes?: string[];
  resourceType?: string;
  resourceId?: string;
  consumedOnly?: boolean;
  unconsumedOnly?: boolean;
  emittedAfter?: string;
  limit?: number;
}

export async function listDomainEvents(
  db: Queryable,
  context: TenantContext,
  query: ListDomainEventsQuery = {}
): Promise<DomainEvent[]> {
  assertTenantContext(context);
  const filters: string[] = ["organization_id = $1"];
  const values: unknown[] = [context.organizationId];
  let i = 2;
  if (query.eventTypes && query.eventTypes.length > 0) {
    for (const t of query.eventTypes) assertEntryType(t);
    filters.push(`event_type = any($${i++}::text[])`);
    values.push(query.eventTypes);
  }
  if (query.resourceType) {
    filters.push(`resource_type = $${i++}`);
    values.push(query.resourceType);
  }
  if (query.resourceId) {
    filters.push(`resource_id = $${i++}`);
    values.push(query.resourceId);
  }
  if (query.consumedOnly) filters.push("consumed_at is not null");
  if (query.unconsumedOnly) filters.push("consumed_at is null");
  if (query.emittedAfter) {
    filters.push(`emitted_at >= $${i++}`);
    values.push(query.emittedAfter);
  }
  const limit = query.limit ?? 100;
  const result = await db.query<DomainEvent>(
    `select ${DE_COLUMNS}
       from domain_events
      where ${filters.join(" and ")}
      order by emitted_at desc
      limit $${i}`,
    [...values, limit]
  );
  return result.rows;
}
