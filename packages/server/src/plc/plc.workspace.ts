import {NotFoundException} from "../common/errors";
import {appEnv} from "../common/env";
import {PlcClient} from "./plc.client";

const PLC_WORKSPACE_IDLE_MS = 10 * 60 * 1000;
const PLC_WORKSPACE_TTL_MS = 60 * 60 * 1000;

export type PlcWorkspace = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  client: PlcClient;
};

export type PlcWorkspaceSnapshot = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  status: ReturnType<PlcClient["getStatus"]>;
};

const workspaces = new Map<string, PlcWorkspace>();

export const getPlcWorkspaceSnapshot = (
  workspace: PlcWorkspace,
): PlcWorkspaceSnapshot => ({
  id: workspace.id,
  createdAt: workspace.createdAt,
  lastSeenAt: workspace.lastSeenAt,
  status: workspace.client.getStatus(),
});

export const createPlcWorkspace = async () => {
  const createdAt = new Date().toISOString();
  const plcClient = new PlcClient({
    hostname: appEnv.PLC_HOST,
    port: appEnv.PLC_PORT,
  });
  try {
    await plcClient.connect();
    await plcClient.ping();
  } catch (error) {
    await plcClient.close();
    throw error;
  }
  const workspace: PlcWorkspace = {
    id: crypto.randomUUID(),
    createdAt,
    lastSeenAt: createdAt,
    client: plcClient,
  };
  workspaces.set(workspace.id, workspace);
  return workspace;
};

export const requirePlcWorkspace = (workspaceId: string) => {
  const workspace = workspaces.get(workspaceId);
  if (!workspace) {
    throw new NotFoundException({
      appCode: "PLC_WORKSPACE_NOT_FOUND",
      details: {workspaceId},
    });
  }
  return workspace;
};

export const listPlcWorkspaceSnapshots = () =>
  [...workspaces.values()].map(getPlcWorkspaceSnapshot);

export const touchPlcWorkspace = (workspace: PlcWorkspace) => {
  workspace.lastSeenAt = new Date().toISOString();
};

export const closePlcWorkspace = async (workspace: PlcWorkspace) => {
  workspaces.delete(workspace.id);
  await workspace.client.close();
};

export const hasPlcWorkspaceExpired = (workspace: PlcWorkspace) =>
  Date.now() - new Date(workspace.createdAt).getTime() > PLC_WORKSPACE_TTL_MS ||
  Date.now() - new Date(workspace.lastSeenAt).getTime() > PLC_WORKSPACE_IDLE_MS;
