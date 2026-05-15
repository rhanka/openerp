import type { MiddlewareHandler } from "hono";

import type { PermissionAction, PermissionScope } from "@sentropic/openerp-domain";

import type { AppBindings } from "./app";
import {
  type EffectivePermission,
  can,
  denyByDefault
} from "../security/permissions";
import type { Queryable, TenantContext } from "../db/client";

// RBAC middleware for Hono (Lot 2). Loads effective permissions for the current
// tenant + actor (UserIdentity), checks against a required (resource, action, scope)
// triple, and rejects with 403 if denied.

export interface RbacRequirement {
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
}

export type EffectivePermissionResolver = (
  db: Queryable,
  context: TenantContext
) => Promise<readonly EffectivePermission[]>;

const COLUMNS = `
  resource,
  action,
  scope
`;

/** Default resolver: collects all permission grants for the actor (user_id direct + via roles). */
export async function loadEffectivePermissions(
  db: Queryable,
  context: TenantContext
): Promise<readonly EffectivePermission[]> {
  const result = await db.query<EffectivePermission>(
    `select ${COLUMNS}
       from permission_grants
      where organization_id = $1
        and (user_id = $2 or role_id in (
          -- placeholder: in the absence of a user_roles join table on apps/api yet,
          -- direct user_id grants are the only path. Role grants are wired once
          -- the user_roles table lands in Lot 2.
          select id from roles where false
        ))`,
    [context.organizationId, context.actorUserId]
  );
  return result.rows;
}

export function requirePermission(
  requirement: RbacRequirement,
  resolver: EffectivePermissionResolver = loadEffectivePermissions
): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const grants = await resolver(db, tenant);
    if (denyByDefault(grants)) {
      return c.json({ code: "FORBIDDEN", reason: "DENY_BY_DEFAULT" }, 403);
    }
    if (!can(grants, requirement.resource, requirement.action, requirement.scope)) {
      return c.json(
        { code: "FORBIDDEN", reason: "PERMISSION_MISSING", required: requirement },
        403
      );
    }
    await next();
  };
}
