import type {ClientStatus} from "../common/types";
import {
  getCommandTerminalSnapshot,
  type CommandTerminalTool,
  type CommandTerminalToolSnapshot,
} from "../systems/redis/command-terminal/command-terminal";
import {
  getKeyExplorerSnapshot,
  type KeyExplorerSnapshot,
  type KeyExplorerTool,
} from "../systems/redis/key-explorer/kv-explorer";

export type Tool = CommandTerminalTool | KeyExplorerTool;

export const toToolSnapshot = (
  tool: Tool,
  getConnectionStatus: (connectionId: string) => ClientStatus,
): ToolSnapshot => {
  switch (tool.kind) {
    case "command-terminal":
      return getCommandTerminalSnapshot(
        tool,
        getConnectionStatus(tool.connectionId),
      );
    case "redis-key-explorer":
      return getKeyExplorerSnapshot(
        tool,
        getConnectionStatus(tool.connectionId),
      );
  }
};
export type ToolSnapshot = CommandTerminalToolSnapshot | KeyExplorerSnapshot;
export type ToolKind = Tool["kind"];
