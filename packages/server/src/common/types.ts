import type {APP_ERROR_CODES, ERROR_MESSAGES} from "./consts";

export type ErrorCode = keyof typeof ERROR_MESSAGES;
export type AppErrorCode = keyof typeof APP_ERROR_CODES;

export type AppErrorPayload = {
  code: ErrorCode;
  message: string;
  details?: unknown;
  appCode?: AppErrorCode;
};

export const CLIENT_STATUSES = [
  "idle",
  "connecting",
  "connected",
  "disconnected",
  "error",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];
