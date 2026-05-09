export interface Queryable {
  query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export interface TenantContext {
  organizationId: string;
  actorUserId: string;
}

export function assertTenantContext(context: TenantContext): void {
  if (!context.organizationId || !context.actorUserId) {
    throw new Error("Tenant context requires organizationId and actorUserId");
  }
}
