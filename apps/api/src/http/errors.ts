export interface ApiErrorBody {
  code: string;
  messageKey: string;
  details?: Record<string, unknown>;
}

export function permissionDenied(): ApiErrorBody {
  return {
    code: "permission_denied",
    messageKey: "error.permissionDenied"
  };
}

export function validationError(details: Record<string, unknown>): ApiErrorBody {
  return {
    code: "validation_error",
    messageKey: "error.validation",
    details
  };
}
