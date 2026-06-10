import type {
  AuthHonoAccountStatus,
  AuthHonoCreateUserInput,
  AuthHonoUpdateUserInput,
  AuthHonoUserPort,
  AuthHonoUserRecord,
} from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";

// AuthHonoUserPort adapter — raw pg queries against user_identities.
//
// Field mapping:
//   user_identities.status (invited|active|deactivated) → AuthHonoAccountStatus
//   user_identities.actor_type (human|agent|system) → role ("user" for human, type otherwise)
//   user_identities.display_name → displayName
//   email_verified is derived: active status implies verified in OpenERP's model.

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  actor_type: string;
  status: string;
  created_at: Date;
  updated_at: Date | null;
}

function actorTypeToRole(actorType: string): string {
  return actorType === "human" ? "user" : actorType;
}

function statusToAccountStatus(status: string): AuthHonoAccountStatus {
  switch (status) {
    case "active":
      return "active";
    case "deactivated":
      return "disabled_by_admin";
    default:
      // "invited" and any unknown status → pending_admin_approval
      return "pending_admin_approval";
  }
}

function toRecord(row: UserRow): AuthHonoUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: actorTypeToRole(row.actor_type),
    emailVerified: row.status === "active",
    accountStatus: statusToAccountStatus(row.status),
    approvalDueAt: null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at ?? row.created_at),
  };
}

export function createOpenERPUserPort(db: Queryable): AuthHonoUserPort {
  return {
    async findById(userId: string): Promise<AuthHonoUserRecord | null> {
      const result = await db.query<UserRow>(
        `select id, email, display_name, actor_type, status, created_at, updated_at
           from user_identities
          where id = $1`,
        [userId]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async findByEmail(email: string): Promise<AuthHonoUserRecord | null> {
      const result = await db.query<UserRow>(
        `select id, email, display_name, actor_type, status, created_at, updated_at
           from user_identities
          where lower(email) = lower($1)`,
        [email]
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async create(input: AuthHonoCreateUserInput): Promise<AuthHonoUserRecord> {
      // Map AuthHono role back to actor_type for storage.
      const actorType = input.role === "user" ? "human" : (input.role ?? "human");
      // Map accountStatus back to user_identities.status.
      const status =
        input.accountStatus === "active"
          ? "active"
          : input.accountStatus === "disabled_by_admin" || input.accountStatus === "disabled_by_user"
          ? "deactivated"
          : "invited";

      const result = await db.query<UserRow>(
        `insert into user_identities (
           email, display_name, preferred_locale, mfa_state, status, actor_type
         ) values ($1, $2, $3, $4, $5, $6)
         returning id, email, display_name, actor_type, status, created_at, updated_at`,
        [
          input.email.toLowerCase(),
          input.displayName ?? input.email.split("@")[0],
          "en",
          "not_configured",
          status,
          actorType,
        ]
      );
      return toRecord(result.rows[0]!);
    },

    async update(userId: string, input: AuthHonoUpdateUserInput): Promise<AuthHonoUserRecord | null> {
      const sets: string[] = [];
      const values: unknown[] = [userId];

      if (input.email !== undefined) {
        values.push(input.email ? input.email.toLowerCase() : null);
        sets.push(`email = $${values.length}`);
      }
      if (input.displayName !== undefined) {
        values.push(input.displayName);
        sets.push(`display_name = $${values.length}`);
      }
      if (input.role !== undefined) {
        const actorType = input.role === "user" ? "human" : input.role;
        values.push(actorType);
        sets.push(`actor_type = $${values.length}`);
      }
      if (input.accountStatus !== undefined) {
        const status =
          input.accountStatus === "active"
            ? "active"
            : input.accountStatus === "disabled_by_admin" || input.accountStatus === "disabled_by_user"
            ? "deactivated"
            : "invited";
        values.push(status);
        sets.push(`status = $${values.length}`);
      }

      if (sets.length === 0) {
        return this.findById(userId);
      }

      sets.push(`updated_at = now()`);

      const result = await db.query<UserRow>(
        `update user_identities
            set ${sets.join(", ")}
          where id = $1
          returning id, email, display_name, actor_type, status, created_at, updated_at`,
        values
      );
      return result.rows[0] ? toRecord(result.rows[0]) : null;
    },

    async count(): Promise<number> {
      const result = await db.query<{ n: string }>(
        `select count(*) as n from user_identities`
      );
      return parseInt(result.rows[0]?.n ?? "0", 10);
    },
  };
}
