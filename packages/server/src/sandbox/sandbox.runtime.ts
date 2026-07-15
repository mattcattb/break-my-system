import {z} from "zod";
import {NotFoundException} from "../common/errors";
import type {
  CommandTerminalToolSnapshot,
  SandboxSnapshot,
} from "../common/types";
import {ConnectionRegistry} from "./client-registry";
import {Sandbox} from "./sandbox";
import {
  createCommandTerminalTool,
  execCommandTerminalTool,
  getCommandTerminalToolSnapshot,
  toToolSnapshot,
  type CommandTerminalTool,
  type Tool,
} from "./tool";

const SANDBOX_IDLE_MS = 10 * 60 * 1000;
const SANDBOX_TTL_MS = 60 * 60 * 1000;

const sandboxes = new Map<string, Sandbox>();

export const getSandboxSnapshot = (sandbox: Sandbox): SandboxSnapshot => ({
  id: sandbox.id,
  createdAt: sandbox.createdAt,
  lastSeenAt: sandbox.lastSeenAt,
  tools: sandbox
    .getTools()
    .map((tool) =>
      toToolSnapshot(tool, (connectionId) =>
        ConnectionRegistry.getStatus(connectionId),
      ),
    ),
});

export const listSandboxSnapshots = () =>
  Array.from(sandboxes.values()).map(getSandboxSnapshot);

const getCommandTerminalSnapshot = (
  tool: CommandTerminalTool,
): CommandTerminalToolSnapshot =>
  getCommandTerminalToolSnapshot(
    tool,
    ConnectionRegistry.getStatus(tool.connectionId),
  );

export function createSandbox(): Sandbox {
  const sandbox = new Sandbox();
  sandboxes.set(sandbox.id, sandbox);
  return sandbox;
}

export const getSandbox = (sandboxId: string): Sandbox | null => {
  return sandboxes.get(sandboxId) ?? null;
};

export const closeSandbox = async (sandbox: Sandbox) => {
  sandboxes.delete(sandbox.id);
  await ConnectionRegistry.closeMany(sandbox.getConnectionIds());
};

export const createSandboxCommandTerminal = (
  sandbox: Sandbox,
): CommandTerminalToolSnapshot => {
  const connection = ConnectionRegistry.createRedisConnection(sandbox.id);
  const tool = createCommandTerminalTool({
    connectionId: connection.id,
  });

  sandbox.addConnection(connection.id);
  sandbox.addTool(tool);

  return getCommandTerminalSnapshot(tool);
};

const getRequiredTool = (sandbox: Sandbox, toolId: string): Tool => {
  const tool = sandbox.getTool(toolId);

  if (!tool) {
    throw new NotFoundException({
      appCode: "TERMINAL_NOT_FOUND",
      details: {toolId},
    });
  }

  return tool;
};

const getRequiredCommandTerminalTool = (
  sandbox: Sandbox,
  toolId: string,
): CommandTerminalTool => {
  const tool = getRequiredTool(sandbox, toolId);

  if (tool.kind !== "command-terminal") {
    throw new NotFoundException({
      appCode: "TERMINAL_NOT_FOUND",
      details: {toolId},
    });
  }

  return tool;
};

export const sendCommandJson = z.object({
  command: z.string().trim().min(1),
});

export const sendCommand = async (
  sandbox: Sandbox,
  terminalId: string,
  command: string,
) => {
  const tool = getRequiredCommandTerminalTool(sandbox, terminalId);
  return execCommandTerminalTool(tool, command.trim().split(/\s+/));
};

export const getCommandTerminalHistory = (sandbox: Sandbox, toolId: string) => {
  const tool = getRequiredCommandTerminalTool(sandbox, toolId);
  return tool.history;
};

export const removeSandboxTool = async (sandbox: Sandbox, toolId: string) => {
  const tool = sandbox.removeTool(toolId);

  if (!tool) {
    return false;
  }

  await ConnectionRegistry.close(tool.connectionId);
  return true;
};

export const hasTtlExpired = (sandbox: Sandbox): boolean => {
  return Date.now() - new Date(sandbox.lastSeenAt).getTime() > SANDBOX_IDLE_MS;
};

export const hasDurationExceeded = (sandbox: Sandbox): boolean => {
  return (
    Date.now() - new Date(sandbox.createdAt).getTime() >
    SANDBOX_TTL_MS
  );
};

export const cleanupExpiredSandboxes = async () => {
  for (const sandbox of sandboxes.values()) {
    if (hasDurationExceeded(sandbox) || hasTtlExpired(sandbox)) {
      await closeSandbox(sandbox);
    }
  }
};

export const clearAllSandboxes = async () => {
  for (const sandbox of sandboxes.values()) {
    await closeSandbox(sandbox);
  }
};
