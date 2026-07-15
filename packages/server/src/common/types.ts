import type {APP_ERROR_CODES, ERROR_MESSAGES} from "./consts";

export type ErrorCode = keyof typeof ERROR_MESSAGES;
export type AppErrorCode = keyof typeof APP_ERROR_CODES;

export type AppErrorPayload = {
  code: ErrorCode;
  message: string;
  details?: unknown;
  appCode?: AppErrorCode;
};

export type ClientStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type ToolKind = "command-terminal";

export type ToolSnapshot = CommandTerminalToolSnapshot;

export type CommandTerminalToolSnapshot = {
  kind: "command-terminal";
  id: string;
  createdAt: string;
  connectionId: string;
  commandCount: number;
  status: ClientStatus;
};

export type ExecutionStatus = "pending" | "success" | "error";

export type ExecutionInput = {
  kind: "redis-command";
  command: string[];
};

export type Execution = {
  id: string;
  toolId: string;
  input: ExecutionInput;
  status: ExecutionStatus;
  outputLines: string[];
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
};

export type SandboxSnapshot = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  tools: ToolSnapshot[];
};

export type Terminal = CommandTerminalToolSnapshot;
export type TerminalHistoryEntry = Execution;
