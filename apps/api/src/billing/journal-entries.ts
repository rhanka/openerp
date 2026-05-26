import type {
  BillingMoney,
  JournalEntry,
  JournalEntryLine,
  JournalEntrySourceType,
  JournalEntryStatus,
  JournalEntryWithLines
} from "@sentropic/openerp-domain/billing";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for JournalEntry + JournalEntryLine.
// Entries support soft-delete via deleted_at.

const ENTRY_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  entry_date as "entryDate",
  reference,
  description,
  source_type as "sourceType",
  source_id as "sourceId",
  status,
  posted_at as "postedAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const LINE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  journal_entry_id as "journalEntryId",
  account_id as "accountId",
  debit,
  credit,
  description,
  created_at as "createdAt"
`;

export async function insertJournalEntry(
  db: Queryable,
  context: TenantContext,
  input: {
    entryDate: string;
    reference: string | null;
    description: string | null;
    sourceType: JournalEntrySourceType;
    sourceId: string | null;
    status: JournalEntryStatus;
    postedAt?: string | null;
  }
): Promise<JournalEntry> {
  assertTenantContext(context);
  const result = await db.query<JournalEntry>(
    `insert into journal_entries (
       organization_id, entry_date, reference, description,
       source_type, source_id, status, posted_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning ${ENTRY_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.entryDate,
      input.reference ?? null,
      input.description ?? null,
      input.sourceType,
      input.sourceId ?? null,
      input.status,
      input.postedAt ?? null
    ]
  );
  return result.rows[0]!;
}

export async function insertJournalEntryLine(
  db: Queryable,
  context: TenantContext,
  input: {
    journalEntryId: string;
    accountId: string;
    debit: BillingMoney;
    credit: BillingMoney;
    description: string | null;
  }
): Promise<JournalEntryLine> {
  assertTenantContext(context);
  const result = await db.query<JournalEntryLine>(
    `insert into journal_entry_lines (
       organization_id, journal_entry_id, account_id, debit, credit, description
     ) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
     returning ${LINE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.journalEntryId,
      input.accountId,
      JSON.stringify(input.debit),
      JSON.stringify(input.credit),
      input.description ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findJournalEntryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<JournalEntry | null> {
  assertTenantContext(context);
  const result = await db.query<JournalEntry>(
    `select ${ENTRY_RETURN_COLUMNS}
       from journal_entries
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function findJournalEntryBySource(
  db: Queryable,
  context: TenantContext,
  sourceType: JournalEntrySourceType,
  sourceId: string
): Promise<JournalEntry | null> {
  assertTenantContext(context);
  const result = await db.query<JournalEntry>(
    `select ${ENTRY_RETURN_COLUMNS}
       from journal_entries
      where source_type = $1 and source_id = $2 and organization_id = $3 and deleted_at is null
      order by created_at desc
      limit 1`,
    [sourceType, sourceId, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listJournalEntriesRepo(
  db: Queryable,
  context: TenantContext,
  options: {
    sourceType?: JournalEntrySourceType;
    sourceId?: string;
    status?: JournalEntryStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<JournalEntry[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterSourceType = options.sourceType ?? null;
  const filterSourceId = options.sourceId ?? null;
  const filterStatus = options.status ?? null;
  const result = await db.query<JournalEntry>(
    `select ${ENTRY_RETURN_COLUMNS}
       from journal_entries
      where organization_id = $1
        and ($2::text is null or source_type = $2)
        and ($3::uuid is null or source_id = $3)
        and ($4::text is null or status = $4)
        and deleted_at is null
      order by entry_date desc, created_at desc
      limit $5 offset $6`,
    [context.organizationId, filterSourceType, filterSourceId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function listLinesForJournalEntry(
  db: Queryable,
  context: TenantContext,
  journalEntryId: string
): Promise<JournalEntryLine[]> {
  assertTenantContext(context);
  const result = await db.query<JournalEntryLine>(
    `select ${LINE_RETURN_COLUMNS}
       from journal_entry_lines
      where journal_entry_id = $1 and organization_id = $2
      order by created_at asc`,
    [journalEntryId, context.organizationId]
  );
  return result.rows;
}

export async function updateJournalEntryStatus(
  db: Queryable,
  context: TenantContext,
  id: string,
  status: JournalEntryStatus,
  extra: { postedAt?: string | null } = {}
): Promise<JournalEntry | null> {
  assertTenantContext(context);
  const sets = ["status = $3", "updated_at = now()"];
  const values: unknown[] = [id, context.organizationId, status];
  if (extra.postedAt !== undefined) {
    sets.push(`posted_at = $${values.length + 1}`);
    values.push(extra.postedAt);
  }
  const result = await db.query<JournalEntry>(
    `update journal_entries
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${ENTRY_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteJournalEntry(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update journal_entries
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function findJournalEntryWithLines(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<JournalEntryWithLines | null> {
  const entry = await findJournalEntryById(db, context, id);
  if (!entry) return null;
  const lines = await listLinesForJournalEntry(db, context, id);
  return { ...entry, lines };
}
