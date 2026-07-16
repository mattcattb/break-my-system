import type {SandboxSnapshot} from "../common/types";
import {ConnectionRegistry} from "../connections/connection-registry";
import {toToolSnapshot, type ToolKind} from "../tools/tool";
import {requireTool, Sandbox} from "./sandbox";
import {removeWadArtifactsForSandbox} from "../systems/wad/wad.artifact";
import {PlcRegistry} from "../connections/plc-registry";

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
  await Promise.all([
    ConnectionRegistry.closeForSandbox(sandbox.id),
    PlcRegistry.closeForSandbox(sandbox.id),
    removeWadArtifactsForSandbox(sandbox.id),
  ]);
};

export const removeSandboxTool = async <K extends ToolKind>(
  sandbox: Sandbox,
  toolId: string,
  expectedKind: K,
) => {
  const tool = requireTool(sandbox, toolId, expectedKind);
  sandbox.removeTool(tool.id);

  const connectionIsStillUsed = sandbox
    .getTools()
    .some((candidate) => candidate.connectionId === tool.connectionId);

  if (!connectionIsStillUsed) {
    await ConnectionRegistry.close(tool.connectionId);
  }
};

export const hasTtlExpired = (sandbox: Sandbox): boolean => {
  return Date.now() - new Date(sandbox.lastSeenAt).getTime() > SANDBOX_IDLE_MS;
};

export const hasDurationExceeded = (sandbox: Sandbox): boolean => {
  return Date.now() - new Date(sandbox.createdAt).getTime() > SANDBOX_TTL_MS;
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
