import {z} from "zod";
import {NotFoundException} from "../common/errors";
import type {ClientStatus} from "../common/types";
import type {RedisWorkspace} from "./redis.workspace";

const redisReplyToLines = (reply: unknown): string[] => {
  if (reply === null) return ["(nil)"];
  if (reply === undefined) return [];

  if (Array.isArray(reply)) {
    if (reply.length === 0) return ["(empty array)"];

    return reply.flatMap((item, index) =>
      redisReplyToLines(item).map((line) => `${index + 1}) ${line}`),
    );
  }

  if (Buffer.isBuffer(reply)) return [reply.toString("utf8")];
  if (typeof reply === "object") return [JSON.stringify(reply, null, 2)];
  return [String(reply)];
};

export type RedisTerminal = {
  id: string;
  createdAt: string;
  history: RedisTerminalExecution[];
};

export type RedisTerminalExecution = {
  id: string;
  terminalId: string;
  input: {kind: "redis-command"; command: string[]};
  status: "pending" | "success" | "error";
  outputLines: string[];
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
};

export type RedisTerminalSnapshot = {
  kind: "redis-terminal";
  id: string;
  createdAt: string;
  commandCount: number;
  status: ClientStatus;
};

export const sendRedisCommandJson = z.object({
  command: z.string().trim().min(1),
});

export const getRedisTerminalSnapshot = (
  terminal: RedisTerminal,
  status: ClientStatus,
): RedisTerminalSnapshot => ({
  kind: "redis-terminal",
  id: terminal.id,
  createdAt: terminal.createdAt,
  commandCount: terminal.history.length,
  status,
});

export const createRedisTerminal = (workspace: RedisWorkspace) => {
  const terminal: RedisTerminal = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    history: [],
  };

  workspace.terminals.set(terminal.id, terminal);
  return terminal;
};

export const requireRedisTerminal = (
  workspace: RedisWorkspace,
  terminalId: string,
) => {
  const terminal = workspace.terminals.get(terminalId);

  if (!terminal) {
    throw new NotFoundException({
      appCode: "TERMINAL_NOT_FOUND",
      details: {terminalId, workspaceId: workspace.id},
    });
  }

  return terminal;
};

export const removeRedisTerminal = (
  workspace: RedisWorkspace,
  terminalId: string,
) => {
  const terminal = requireRedisTerminal(workspace, terminalId);
  workspace.terminals.delete(terminal.id);
  return terminal;
};

export const getRedisTerminalHistory = (
  workspace: RedisWorkspace,
  terminalId: string,
) => requireRedisTerminal(workspace, terminalId).history;

export const executeRedisTerminalCommand = async (
  workspace: RedisWorkspace,
  terminalId: string,
  input: string,
) => {
  const terminal = requireRedisTerminal(workspace, terminalId);
  const execution: RedisTerminalExecution = {
    id: crypto.randomUUID(),
    terminalId,
    input: {kind: "redis-command", command: input.trim().split(/\s+/)},
    status: "pending",
    outputLines: [],
    startedAt: new Date().toISOString(),
  };

  terminal.history.push(execution);

  try {
    const redis = await workspace.connection.connect();
    const reply = await redis.sendCommand(execution.input.command);

    execution.status = "success";
    execution.outputLines = redisReplyToLines(reply);
    execution.completedAt = new Date().toISOString();
    return execution;
  } catch (error) {
    execution.status = "error";
    execution.errorMessage =
      error instanceof Error ? error.message : "Redis command failed";
    execution.completedAt = new Date().toISOString();
    throw error;
  }
};
