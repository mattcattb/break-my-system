import {appEnv} from "../common/env";
import {
  BadRequestException,
  NotFoundException,
} from "../common/errors";
import type {WadWorkspace} from "./wad.workspace";
import {runWadOperation} from "./wad.client";

export type WadArtifact = {
  id: string;
  workspaceId: string;
  originalName: string;
  sizeBytes: number;
  magic: "IWAD" | "PWAD";
  descriptorCount: number;
  descriptorOffset: number;
  createdAt: string;
  modifiedAt?: string;
};

const artifacts = new Map<string, WadArtifact>();

export const getWadArtifactSnapshot = (artifact: WadArtifact) => ({
  id: artifact.id,
  originalName: artifact.originalName,
  sizeBytes: artifact.sizeBytes,
  magic: artifact.magic,
  descriptorCount: artifact.descriptorCount,
  descriptorOffset: artifact.descriptorOffset,
  createdAt: artifact.createdAt,
  modifiedAt: artifact.modifiedAt ?? null,
  modified: artifact.modifiedAt !== undefined,
});
export type WadArtifactSnapshot = ReturnType<typeof getWadArtifactSnapshot>;

export const createWadArtifact = async (
  workspace: WadWorkspace,
  file: File,
) => {
  if (file.size === 0) {
    throw new BadRequestException({
      message: "Upload a non-empty WAD file",
      appCode: "WAD_INVALID",
    });
  }
  if (file.size > appEnv.WAD_MAX_UPLOAD_BYTES) {
    throw new BadRequestException({
      appCode: "WAD_UPLOAD_TOO_LARGE",
      details: {maxBytes: appEnv.WAD_MAX_UPLOAD_BYTES},
    });
  }

  const id = crypto.randomUUID();
  const payload = new Uint8Array(await file.arrayBuffer());
  const inspection = await runWadOperation((client) =>
    client.createArtifact(id, payload),
  );
  const artifact: WadArtifact = {
    id,
    workspaceId: workspace.id,
    originalName: file.name || "upload.wad",
    sizeBytes: inspection.fileSizeBytes,
    magic: inspection.magic,
    descriptorCount: inspection.descriptorCount,
    descriptorOffset: inspection.descriptorOffset,
    createdAt: new Date().toISOString(),
  };

  artifacts.set(id, artifact);
  return getWadArtifactSnapshot(artifact);
};

const refreshWadArtifact = async (
  artifact: WadArtifact,
  modified: boolean,
) => {
  const inspection = await runWadOperation((client) =>
    client.inspect(artifact.id),
  );
  artifact.sizeBytes = inspection.fileSizeBytes;
  artifact.magic = inspection.magic;
  artifact.descriptorCount = inspection.descriptorCount;
  artifact.descriptorOffset = inspection.descriptorOffset;
  artifact.modifiedAt = modified ? new Date().toISOString() : undefined;
  return getWadArtifactSnapshot(artifact);
};

export const createWadNamespace = async (
  artifact: WadArtifact,
  path: string,
) => {
  const entry = await runWadOperation((client) =>
    client.createNamespace(artifact.id, path),
  );
  await refreshWadArtifact(artifact, true);
  return entry;
};

export const createWadItem = async (
  artifact: WadArtifact,
  path: string,
  file?: File,
) => {
  const payload = file
    ? new Uint8Array(await file.arrayBuffer())
    : new Uint8Array();
  if (payload.byteLength > appEnv.WAD_MAX_UPLOAD_BYTES) {
    throw new BadRequestException({
      appCode: "WAD_UPLOAD_TOO_LARGE",
      details: {maxBytes: appEnv.WAD_MAX_UPLOAD_BYTES},
    });
  }

  const entry = await runWadOperation((client) =>
    client.put(artifact.id, path, payload),
  );
  await refreshWadArtifact(artifact, true);
  return entry;
};

export const resetWadArtifact = async (artifact: WadArtifact) => {
  await runWadOperation((client) => client.reset(artifact.id));
  return refreshWadArtifact(artifact, false);
};

export const downloadWadArtifact = (artifact: WadArtifact) =>
  runWadOperation((client) => client.download(artifact.id));

export const listWadArtifacts = (workspace: WadWorkspace) =>
  [...artifacts.values()]
    .filter((artifact) => artifact.workspaceId === workspace.id)
    .map(getWadArtifactSnapshot);

export const requireWadArtifact = (
  workspace: WadWorkspace,
  wadId: string,
) => {
  const artifact = artifacts.get(wadId);
  if (!artifact || artifact.workspaceId !== workspace.id) {
    throw new NotFoundException({
      appCode: "WAD_NOT_FOUND",
      details: {wadId},
    });
  }
  return artifact;
};

export const removeWadArtifact = async (
  workspace: WadWorkspace,
  wadId: string,
) => {
  const artifact = requireWadArtifact(workspace, wadId);
  await runWadOperation((client) => client.deleteArtifact(artifact.id));
  artifacts.delete(artifact.id);
};

export const removeWadArtifactsForWorkspace = async (
  workspace: WadWorkspace,
) => {
  for (const artifact of [...artifacts.values()]) {
    if (artifact.workspaceId !== workspace.id) continue;
    await runWadOperation((client) => client.deleteArtifact(artifact.id));
    artifacts.delete(artifact.id);
  }
};
