export interface CreateAuditEventParams {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary?: Record<string, unknown>;
  afterSummary?: Record<string, unknown>;
}

export function createAuditEventInput(params: CreateAuditEventParams) {
  return {
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    actorType: "user",
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    beforeSummary: params.beforeSummary ?? null,
    afterSummary: params.afterSummary ?? null
  };
}
