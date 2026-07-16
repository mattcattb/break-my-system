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
  CONFLICT_TOOL_TYPE: "Conflict Tool Type",
  SANDBOX_HEADER_MISSING: "Sandbox header missing",
  SANDBOX_NOT_FOUND: "Sandbox not found",
  SANDBOX_EXPIRED: "Sandbox expired",
  TERMINAL_NOT_FOUND: "Terminal not found",
  TERMINAL_NOT_READY: "Terminal not ready",
  TOOL_NOT_FOUND: "Tool not found",
  UNKNOWN_SYSTEM: "Unknown system",
  WAD_INVALID: "Invalid WAD file",
  WAD_NOT_FOUND: "WAD not found",
  WAD_UPLOAD_TOO_LARGE: "WAD upload is too large",
  BAD_REQUEST: "Bad Request",
} as const;
