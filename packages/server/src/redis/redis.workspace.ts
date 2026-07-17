import {NotFoundException} from "../common/errors";
import {getKeyExplorerSnapshot, type RedisKeyExplorer} from "./key-explorer";
import {getRedisTerminalSnapshot, type RedisTerminal} from "./command-terminal";
import {createRedisConnection, type RedisConnection} from "./redis.connection";

const REDIS_WORKSPACE_IDLE_MS = 10 * 60 * 1000;
const REDIS_WORKSPACE_TTL_MS = 60 * 60 * 1000;

export type RedisWorkspace = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  connection: RedisConnection;
  terminals: Map<string, RedisTerminal>;
  keyExplorers: Map<string, RedisKeyExplorer>;
};

export type RedisWorkspaceSnapshot = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  connectionStatus: ReturnType<RedisConnection["getStatus"]>;
  terminals: ReturnType<typeof getRedisTerminalSnapshot>[];
  keyExplorers: ReturnType<typeof getKeyExplorerSnapshot>[];
};

const workspaces = new Map<string, RedisWorkspace>();

export const touchRedisWorkspace = (workspace: RedisWorkspace) => {
  workspace.lastSeenAt = new Date().toISOString();
};

export const getRedisWorkspaceSnapshot = (
  workspace: RedisWorkspace,
): RedisWorkspaceSnapshot => ({
  id: workspace.id,
  createdAt: workspace.createdAt,
  lastSeenAt: workspace.lastSeenAt,
  connectionStatus: workspace.connection.getStatus(),
  terminals: [...workspace.terminals.values()].map((terminal) =>
    getRedisTerminalSnapshot(terminal, workspace.connection.getStatus()),
  ),
  keyExplorers: [...workspace.keyExplorers.values()].map((explorer) =>
    getKeyExplorerSnapshot(explorer, workspace.connection.getStatus()),
  ),
});

export const createRedisWorkspace = (): RedisWorkspace => {
  const createdAt = new Date().toISOString();
  const workspace: RedisWorkspace = {
    id: crypto.randomUUID(),
    createdAt,
    lastSeenAt: createdAt,
    connection: createRedisConnection(),
    terminals: new Map(),
    keyExplorers: new Map(),
  };

  workspaces.set(workspace.id, workspace);
  return workspace;
};

const getRedisWorkspace = (workspaceId: string) =>
  workspaces.get(workspaceId) ?? null;

export const requireRedisWorkspace = (workspaceId: string) => {
  const workspace = getRedisWorkspace(workspaceId);

  if (!workspace) {
    throw new NotFoundException({
      appCode: "REDIS_WORKSPACE_NOT_FOUND",
      details: {workspaceId},
    });
  }

  return workspace;
};

export const listRedisWorkspaceSnapshots = () =>
  [...workspaces.values()].map(getRedisWorkspaceSnapshot);

export const closeRedisWorkspace = async (workspace: RedisWorkspace) => {
  workspaces.delete(workspace.id);
  await workspace.connection.close();
};

export const hasRedisWorkspaceExpired = (workspace: RedisWorkspace) =>
  Date.now() - new Date(workspace.createdAt).getTime() > REDIS_WORKSPACE_TTL_MS ||
  Date.now() - new Date(workspace.lastSeenAt).getTime() > REDIS_WORKSPACE_IDLE_MS;
