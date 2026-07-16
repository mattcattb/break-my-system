import {z} from "zod";
import {NotFoundException} from "../../../common/errors";
import type {ClientStatus} from "../../../common/types";
import {ConnectionRegistry} from "../../../connections/connection-registry";
import type {Sandbox} from "../../../sandbox/sandbox";
import type {TerminalEvent} from "../../../ws/ws.messages";
type TerminalEventListener = (event: TerminalEvent) => void;

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

const listeners = new Set<TerminalEventListener>();

export const TerminalEmitter = {
  emit(event: TerminalEvent) {
    for (const listener of listeners) {
      listener(event);
    }
  },

  subscribe(listener: TerminalEventListener) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
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
  status = ConnectionRegistry.getStatus(tool.connectionId),
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

const requireCommandTerminal = (
  sandbox: Sandbox,
  terminalId: string,
): CommandTerminalTool => {
  const tool = sandbox.getTool(terminalId);

  if (!tool || tool.kind !== "command-terminal") {
    throw new NotFoundException({
      appCode: "TERMINAL_NOT_FOUND",
      details: {toolId: terminalId},
    });
  }

  return tool;
};

export const createCommandTerminal = (
  sandbox: Sandbox,
): CommandTerminalToolSnapshot => {
  const connection = ConnectionRegistry.createRedisConnection(sandbox.id);
  const tool = createCommandTerminalTool(connection.id);

  sandbox.addConnection(connection.id);
  sandbox.addTool(tool);

  return getCommandTerminalSnapshot(tool);
};

export const executeCommandTerminal = async (
  tool: CommandTerminalTool,
  input: string,
) => {
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
    const connection = ConnectionRegistry.requireRedis(tool.connectionId);
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
) => requireCommandTerminal(sandbox, terminalId).history;

export const connectCommandTerminal = async (
  sandbox: Sandbox,
  terminalId: string,
) => {
  const tool = requireCommandTerminal(sandbox, terminalId);
  const connection = ConnectionRegistry.requireRedis(
    tool.connectionId,
    sandbox.id,
  );
  await connection.connect();
  return getCommandTerminalSnapshot(tool);
};

export const disconnectCommandTerminal = async (
  sandbox: Sandbox,
  terminalId: string,
) => {
  const tool = requireCommandTerminal(sandbox, terminalId);
  const connection = ConnectionRegistry.requireRedis(
    tool.connectionId,
    sandbox.id,
  );
  await connection.disconnect();
  return getCommandTerminalSnapshot(tool);
};

export const reconnectCommandTerminal = async (
  sandbox: Sandbox,
  terminalId: string,
) => {
  const tool = requireCommandTerminal(sandbox, terminalId);
  const connection = ConnectionRegistry.requireRedis(
    tool.connectionId,
    sandbox.id,
  );
  await connection.disconnect();
  await connection.connect();
  return getCommandTerminalSnapshot(tool);
};

export const getCommandTerminalRedisStatus = async (
  sandbox: Sandbox,
  terminalId: string,
) => {
  const tool = requireCommandTerminal(sandbox, terminalId);
  const connection = ConnectionRegistry.requireRedis(
    tool.connectionId,
    sandbox.id,
  );

  if (connection.getStatus() !== "connected") {
    return {
      pong: null,
      keyCount: null,
      supportedCommandCount: null,
      status: connection.getStatus(),
    };
  }

  const redis = await connection.connect();
  const [pong, keyCount, supportedCommandCount] = await Promise.all([
    redis.ping(),
    redis.dbSize(),
    redis.sendCommand(["COMMAND", "COUNT"]),
  ]);

  return {
    pong,
    keyCount,
    supportedCommandCount: Number(supportedCommandCount),
    status: connection.getStatus(),
  };
};

export const removeCommandTerminal = async (
  sandbox: Sandbox,
  terminalId: string,
) => {
  const tool = sandbox.removeTool(terminalId);

  if (!tool) {
    return false;
  }

  await ConnectionRegistry.close(tool.connectionId);
  return true;
};
