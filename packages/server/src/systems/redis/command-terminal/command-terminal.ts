import {z} from "zod";
import type {ClientStatus} from "../../../common/types";
import {ConnectionRegistry} from "../../../connections/connection-registry";
import {requireTool, type Sandbox} from "../../../sandbox/sandbox";

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

export type CommandTerminalTool = {
  kind: "command-terminal";
  id: string;
  createdAt: string;
  connectionId: string;
  history: CommandExecution[];
};

export type CommandTerminalToolSnapshot = {
  kind: "command-terminal";
  id: string;
  createdAt: string;
  connectionId: string;
  commandCount: number;
  status: ClientStatus;
};

export type CommandExecution = {
  id: string;
  toolId: string;

  input: {
    kind: "redis-command";
    command: string[];
  };

  status: "pending" | "success" | "error";

  outputLines: string[];
  errorMessage?: string;

  startedAt: string;
  completedAt?: string;
};

export const getCommandTerminalSnapshot = (
  tool: CommandTerminalTool,
  status: ClientStatus,
): CommandTerminalToolSnapshot => ({
  commandCount: tool.history.length,
  connectionId: tool.connectionId,
  createdAt: tool.createdAt,
  id: tool.id,
  kind: tool.kind,
  status,
});

export const sendCommandJson = z.object({
  command: z.string().trim().min(1),
});

const createCommandTerminalTool = (
  connectionId: string,
): CommandTerminalTool => ({
  kind: "command-terminal",
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  connectionId,
  history: [],
});

export const createCommandTerminal = (
  sandbox: Sandbox,
): CommandTerminalToolSnapshot => {
  const connection = ConnectionRegistry.createRedisConnection(sandbox.id);
  const tool = createCommandTerminalTool(connection.id);

  sandbox.addTool(tool);

  return getCommandTerminalSnapshot(tool, connection.getStatus());
};

export const executeCommandTerminal = async (
  sandbox: Sandbox,
  terminalId: string,
  input: string,
) => {
  const tool = requireTool(sandbox, terminalId, "command-terminal");
  const command = input.trim().split(/\s+/);
  const execution: CommandExecution = {
    id: crypto.randomUUID(),
    toolId: tool.id,
    input: {
      kind: "redis-command",
      command,
    },
    status: "pending",
    outputLines: [],
    startedAt: new Date().toISOString(),
  };

  tool.history.push(execution);

  try {
    const connection = ConnectionRegistry.require(
      tool.connectionId,
      sandbox.id,
      "redis",
    );
    const redis = await connection.connect();
    const reply = await redis.sendCommand(command);

    execution.status = "success";
    execution.outputLines = redisReplyToLines(reply);
    execution.completedAt = new Date().toISOString();

    return execution;
  } catch (err) {
    execution.status = "error";
    execution.errorMessage =
      err instanceof Error ? err.message : "Command failed";
    execution.completedAt = new Date().toISOString();

    throw err;
  }
};

export const getCommandTerminalHistory = (
  sandbox: Sandbox,
  terminalId: string,
) => requireTool(sandbox, terminalId, "command-terminal").history;
