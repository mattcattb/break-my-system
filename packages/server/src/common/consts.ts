export const ERROR_MESSAGES = {
  BAD_REQUEST: "Bad request",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Not found",
  VALIDATION_ERROR: "Validation failed",
  SERVICE_ERROR: "Service error",
  INTERNAL_ERROR: "Internal server error",
  CONFLICT_ERROR: "Server conflict error",
} as const;

export const APP_ERROR_CODES = {
  SANDBOX_HEADER_MISSING: "Sandbox header missing",
  SANDBOX_NOT_FOUND: "Sandbox not found",
  SANDBOX_EXPIRED: "Sandbox expired",
  TERMINAL_NOT_FOUND: "Terminal not found",
  TERMINAL_NOT_READY: "Terminal not ready",
  UNKNOWN_SYSTEM: "Unknown system",
} as const;
