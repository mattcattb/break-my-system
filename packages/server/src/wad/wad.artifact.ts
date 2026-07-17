import {mkdir, rm} from "node:fs/promises";
import {createConnection} from "node:net";
import {isAbsolute, join, relative, sep} from "node:path";
import {z} from "zod";
import {appEnv} from "../common/env";
import {
  BadRequestException,
  NotFoundException,
  ServiceException,
} from "../common/errors";
import type {WadWorkspace} from "./wad.workspace";

const wadInspectionSchema = z.object({
  valid: z.literal(true),
  magic: z.enum(["IWAD", "PWAD"]),
  descriptorCount: z.number().int().nonnegative(),
  descriptorOffset: z.number().int().nonnegative(),
  fileSizeBytes: z.number().int().nonnegative(),
});

export type WadArtifact = {
  id: string;
  workspaceId: string;
  originalName: string;
  originalPath: string;
  workingPath: string;
  sizeBytes: number;
  magic: "IWAD" | "PWAD";
  descriptorCount: number;
  descriptorOffset: number;
  createdAt: string;
  modifiedAt?: string;
};

const artifacts = new Map<string, WadArtifact>();

class WadServerError extends BadRequestException {
  constructor(message: string) {
    super({message, appCode: "WAD_INVALID"});
  }
}

const wadRelativePath = (filePath: string) => {
  const result = relative(appEnv.WAD_DATA_DIR, filePath);
  if (
    !result ||
    isAbsolute(result) ||
    result === ".." ||
    result.startsWith(`..${sep}`)
  ) {
    throw new ServiceException("WAD path is outside the configured data directory");
  }
  return result;
};

const requestWadServer = (fields: string[], requestPayload?: Uint8Array) =>
  new Promise<Buffer>((resolve, reject) => {
    if (
      fields.some(
        (field) =>
          field.includes("\n") || field.includes("\r") || field.includes("\t"),
      )
    ) {
      reject(new ServiceException("WAD request contains an invalid control character"));
      return;
    }

    const socket = createConnection({host: appEnv.WAD_HOST, port: appEnv.WAD_PORT});
    let received = Buffer.alloc(0);
    let expectedLength: number | null = null;
    let responseStatus = "";
    let settled = false;

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(
        error instanceof WadServerError
          ? error
          : new ServiceException({
              message: "Unable to communicate with the WAD server",
              details: error instanceof Error ? error.message : error,
            }),
      );
    };

    socket.setTimeout(5_000, () => fail(new Error("WAD server request timed out")));
    socket.on("connect", () => {
      socket.write(`${fields.join("\t")}\n`);
      if (requestPayload?.byteLength) socket.write(requestPayload);
    });
    socket.on("data", (chunk) => {
      received = Buffer.concat([received, chunk]);

      if (expectedLength === null) {
        const headerEnd = received.indexOf("\n");
        if (headerEnd === -1) {
          if (received.length > 128) fail(new Error("WAD server response header is too long"));
          return;
        }

        const header = received.subarray(0, headerEnd).toString("utf8");
        const match = /^(OK|ERR) (\d+)$/.exec(header);
        if (!match) {
          fail(new Error("WAD server returned an invalid response header"));
          return;
        }

        responseStatus = match[1];
        expectedLength = Number(match[2]);
        if (
          !Number.isSafeInteger(expectedLength) ||
          expectedLength > appEnv.WAD_MAX_UPLOAD_BYTES * 4
        ) {
          fail(new Error("WAD server response is too large"));
          return;
        }
        received = received.subarray(headerEnd + 1);
      }

      if (received.length < expectedLength) return;
      const payload = received.subarray(0, expectedLength);
      settled = true;
      socket.destroy();
      if (responseStatus === "ERR") {
        reject(new WadServerError(payload.toString("utf8") || "WAD operation failed"));
      } else {
        resolve(payload);
      }
    });
    socket.on("error", fail);
    socket.on("close", () => {
      if (!settled) fail(new Error("WAD server closed the connection early"));
    });
  });

export const runWadCommand = async (
  command: "INSPECT" | "TREE" | "LIST" | "STAT",
  filePath: string,
  virtualPath?: string,
): Promise<unknown> => {
  const payload = await requestWadServer([
    command,
    wadRelativePath(filePath),
    ...(virtualPath === undefined ? [] : [virtualPath]),
  ]);
  try {
    return JSON.parse(payload.toString("utf8"));
  } catch {
    throw new ServiceException("The WAD server returned invalid JSON");
  }
};

export const readWadBytes = async (filePath: string, virtualPath: string) =>
  Uint8Array.from(
    await requestWadServer(["READ", wadRelativePath(filePath), virtualPath]),
  ).buffer;

export const readWadByteRange = async (
  filePath: string,
  virtualPath: string,
  offset: number,
  length: number,
) =>
  Uint8Array.from(
    await requestWadServer([
      "READ_RANGE",
      wadRelativePath(filePath),
      virtualPath,
      String(offset),
      String(length),
    ]),
  ).buffer;

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

export const createWadArtifact = async (workspace: WadWorkspace, file: File) => {
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
  const artifactDirectory = join(appEnv.WAD_DATA_DIR, workspace.id, id);
  const originalPath = join(artifactDirectory, "original.wad");
  const workingPath = join(artifactDirectory, "working.wad");

  await mkdir(artifactDirectory, {recursive: true});

  try {
    await Bun.write(originalPath, file);
    await Bun.write(workingPath, Bun.file(originalPath));
    const inspection = wadInspectionSchema.parse(
      await runWadCommand("INSPECT", workingPath),
    );
    const artifact: WadArtifact = {
      id,
      workspaceId: workspace.id,
      originalName: file.name || "upload.wad",
      originalPath,
      workingPath,
      sizeBytes: inspection.fileSizeBytes,
      magic: inspection.magic,
      descriptorCount: inspection.descriptorCount,
      descriptorOffset: inspection.descriptorOffset,
      createdAt: new Date().toISOString(),
    };

    artifacts.set(id, artifact);
    return getWadArtifactSnapshot(artifact);
  } catch (error) {
    await rm(artifactDirectory, {recursive: true, force: true});
    if (error instanceof WadServerError || error instanceof z.ZodError) {
      throw new BadRequestException({
        message: error.message,
        appCode: "WAD_INVALID",
      });
    }
    throw error;
  }
};

const refreshWadArtifact = async (artifact: WadArtifact, modified: boolean) => {
  const inspection = wadInspectionSchema.parse(
    await runWadCommand("INSPECT", artifact.workingPath),
  );
  artifact.sizeBytes = inspection.fileSizeBytes;
  artifact.magic = inspection.magic;
  artifact.descriptorCount = inspection.descriptorCount;
  artifact.descriptorOffset = inspection.descriptorOffset;
  artifact.modifiedAt = modified ? new Date().toISOString() : undefined;
  return getWadArtifactSnapshot(artifact);
};

const runWadMutation = async (
  artifact: WadArtifact,
  fields: string[],
  payload?: Uint8Array,
) => {
  const response = await requestWadServer(
    [fields[0], wadRelativePath(artifact.workingPath), ...fields.slice(1)],
    payload,
  );
  try {
    return JSON.parse(response.toString("utf8"));
  } catch {
    throw new ServiceException("The WAD server returned invalid JSON");
  }
};

export const createWadNamespace = async (artifact: WadArtifact, path: string) => {
  const entry = await runWadMutation(artifact, ["MKDIR", path]);
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
  const entry = await runWadMutation(
    artifact,
    ["PUT", path, String(payload.byteLength)],
    payload,
  );
  await refreshWadArtifact(artifact, true);
  return entry;
};

export const resetWadArtifact = async (artifact: WadArtifact) => {
  await requestWadServer([
    "RESET",
    wadRelativePath(artifact.workingPath),
    wadRelativePath(artifact.originalPath),
  ]);
  return refreshWadArtifact(artifact, false);
};

export const listWadArtifacts = (workspace: WadWorkspace) =>
  [...artifacts.values()]
    .filter((artifact) => artifact.workspaceId === workspace.id)
    .map(getWadArtifactSnapshot);

export const requireWadArtifact = (workspace: WadWorkspace, wadId: string) => {
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
  artifacts.delete(wadId);
  await rm(join(appEnv.WAD_DATA_DIR, artifact.workspaceId, artifact.id), {
    recursive: true,
    force: true,
  });
};

export const removeWadArtifactsForWorkspace = async (workspace: WadWorkspace) => {
  for (const artifact of artifacts.values()) {
    if (artifact.workspaceId === workspace.id) artifacts.delete(artifact.id);
  }
  await rm(join(appEnv.WAD_DATA_DIR, workspace.id), {
    recursive: true,
    force: true,
  });
};
