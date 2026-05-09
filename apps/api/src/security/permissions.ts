import type { PermissionAction, PermissionScope } from "@openerp/domain";

export interface EffectivePermission {
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
}

export function can(
  grants: readonly EffectivePermission[],
  resource: string,
  action: PermissionAction,
  scope: PermissionScope
): boolean {
  return grants.some((grant) => grant.resource === resource && grant.action === action && grant.scope === scope);
}

export function denyByDefault(grants: readonly EffectivePermission[]): boolean {
  return grants.length === 0;
}
