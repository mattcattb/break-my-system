import {NotFoundException} from "../common/errors";
import {
  listWadArtifacts,
  removeWadArtifactsForWorkspace,
  type WadArtifactSnapshot,
} from "./wad.artifact";

const WAD_WORKSPACE_IDLE_MS = 10 * 60 * 1000;
const WAD_WORKSPACE_TTL_MS = 60 * 60 * 1000;

export type WadWorkspace = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
};

export type WadWorkspaceSnapshot = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  wads: WadArtifactSnapshot[];
};

const workspaces = new Map<string, WadWorkspace>();

export const getWadWorkspaceSnapshot = (
  workspace: WadWorkspace,
): WadWorkspaceSnapshot => ({
  id: workspace.id,
  createdAt: workspace.createdAt,
  lastSeenAt: workspace.lastSeenAt,
  wads: listWadArtifacts(workspace),
});

export const createWadWorkspace = () => {
  const createdAt = new Date().toISOString();
  const workspace: WadWorkspace = {
    id: crypto.randomUUID(),
    createdAt,
    lastSeenAt: createdAt,
  };
  workspaces.set(workspace.id, workspace);
  return workspace;
};

export const requireWadWorkspace = (workspaceId: string) => {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) {
    throw new NotFoundException({
      appCode: "WAD_WORKSPACE_NOT_FOUND",
      details: {workspaceId},
    });
  }
  return workspace;
};

export const listWadWorkspaceSnapshots = () =>
  [...workspaces.values()].map(getWadWorkspaceSnapshot);

export const touchWadWorkspace = (workspace: WadWorkspace) => {
  workspace.lastSeenAt = new Date().toISOString();
};

export const closeWadWorkspace = async (workspace: WadWorkspace) => {
  workspaces.delete(workspace.id);
  await removeWadArtifactsForWorkspace(workspace);
};

export const hasWadWorkspaceExpired = (workspace: WadWorkspace) =>
  Date.now() - new Date(workspace.createdAt).getTime() > WAD_WORKSPACE_TTL_MS ||
  Date.now() - new Date(workspace.lastSeenAt).getTime() > WAD_WORKSPACE_IDLE_MS;
