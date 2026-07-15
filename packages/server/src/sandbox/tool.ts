import type {
  ClientStatus,
  CommandTerminalToolSnapshot,
  Execution,
  ToolSnapshot,
} from "../common/types";
import {ConnectionRegistry} from "./client-registry";

export type CommandTerminalTool = {
  kind: "command-terminal";
  id: string;
  createdAt: string;
  connectionId: string;
  history: Execution[];
};

export type Tool = CommandTerminalTool;

export const toToolSnapshot = (
  tool: Tool,
  getConnectionStatus: (connectionId: string) => ClientStatus,
): ToolSnapshot => {
  switch (tool.kind) {
    case "command-terminal":
      return getCommandTerminalToolSnapshot(
        tool,
        getConnectionStatus(tool.connectionId),
      );
  }
};

export const getCommandTerminalToolSnapshot = (
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

export function createCommandTerminalTool(args: {
  connectionId: string;
}): CommandTerminalTool {
  return {
    kind: "command-terminal",
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    connectionId: args.connectionId,
    history: [],
  };
}

export async function execCommandTerminalTool(
  tool: CommandTerminalTool,
  command: string[],
) {
  const execution: Execution = {
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
    const output = await ConnectionRegistry.executeRedisCommand(
      tool.connectionId,
      command,
    );

    execution.status = "success";
    execution.outputLines = output.lines;
    execution.completedAt = new Date().toISOString();

    return execution;
  } catch (err) {
    execution.status = "error";
    execution.errorMessage =
      err instanceof Error ? err.message : "Command failed";
    execution.completedAt = new Date().toISOString();

    throw err;
  }
}
