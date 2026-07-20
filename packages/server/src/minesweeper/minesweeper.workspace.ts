import {NotFoundException} from "../common/errors";

const MINESWEEPER_WORKSPACE_IDLE_MS = 10 * 60 * 1000;
const MINESWEEPER_WORKSPACE_TTL_MS = 60 * 60 * 1000;

export type MinesweeperWorkspace = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  rows: number;
  cols: number;
  mines: number;
  connectionIds: Set<string>;
};

export const getMinesweeperWorkspaceSnapshot = (
  workspace: MinesweeperWorkspace,
) => ({
  id: workspace.id,
  gameId: workspace.id,
  createdAt: workspace.createdAt,
  lastSeenAt: workspace.lastSeenAt,
  rows: workspace.rows,
  cols: workspace.cols,
  mines: workspace.mines,
  activeConnections: workspace.connectionIds.size,
});

export type MinesweeperWorkspaceSnapshot = ReturnType<
  typeof getMinesweeperWorkspaceSnapshot
>;

const workspaces = new Map<string, MinesweeperWorkspace>();

export const createMinesweeperWorkspace = (config: {
  rows: number;
  cols: number;
  mines: number;
}) => {
  const createdAt = new Date().toISOString();
  const workspace: MinesweeperWorkspace = {
    id: crypto.randomUUID(),
    createdAt,
    lastSeenAt: createdAt,
    rows: config.rows,
    cols: config.cols,
    mines: config.mines,
    connectionIds: new Set(),
  };

  workspaces.set(workspace.id, workspace);
  return workspace;
};

export const requireMinesweeperWorkspace = (workspaceId: string) => {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) {
    throw new NotFoundException({
      appCode: "MINESWEEPER_WORKSPACE_NOT_FOUND",
      details: {workspaceId},
    });
  }
  return workspace;
};

export const listMinesweeperWorkspaceSnapshots = () =>
  [...workspaces.values()].map(getMinesweeperWorkspaceSnapshot);

export const touchMinesweeperWorkspace = (
  workspace: MinesweeperWorkspace,
) => {
  workspace.lastSeenAt = new Date().toISOString();
};

export const attachMinesweeperConnection = (
  workspace: MinesweeperWorkspace,
  connectionId: string,
) => {
  workspace.connectionIds.add(connectionId);
  touchMinesweeperWorkspace(workspace);
};

export const detachMinesweeperConnection = (
  workspace: MinesweeperWorkspace,
  connectionId: string,
) => {
  workspace.connectionIds.delete(connectionId);
  touchMinesweeperWorkspace(workspace);
};

export const closeMinesweeperWorkspace = (
  workspace: MinesweeperWorkspace,
) => {
  workspaces.delete(workspace.id);
  workspace.connectionIds.clear();
};

export const hasMinesweeperWorkspaceExpired = (
  workspace: MinesweeperWorkspace,
) =>
  Date.now() - new Date(workspace.createdAt).getTime() >
    MINESWEEPER_WORKSPACE_TTL_MS ||
  Date.now() - new Date(workspace.lastSeenAt).getTime() >
    MINESWEEPER_WORKSPACE_IDLE_MS;
