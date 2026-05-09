export function canSeeAdminNav(permissionKeys: string[]): boolean {
  return permissionKeys.some((key) => key.startsWith("admin.") || key.startsWith("audit."));
}
