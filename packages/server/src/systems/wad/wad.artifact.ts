import {mkdir, rm} from "node:fs/promises";
import {join} from "node:path";
import {z} from "zod";
import {appEnv} from "../../common/env";
import {
  BadRequestException,
  NotFoundException,
  ServiceException,
} from "../../common/errors";

const wadInspectionSchema = z.object({
  valid: z.literal(true),
  magic: z.enum(["IWAD", "PWAD"]),
  descriptorCount: z.number().int().nonnegative(),
  descriptorOffset: z.number().int().nonnegative(),
  fileSizeBytes: z.number().int().nonnegative(),
});

export type WadArtifact = {
  id: string;
  sandboxId: string;
  originalName: string;
  originalPath: string;
  workingPath: string;
  sizeBytes: number;
  magic: "IWAD" | "PWAD";
  descriptorCount: number;
  descriptorOffset: number;
  createdAt: string;
};

const artifacts = new Map<string, WadArtifact>();

class WadctlError extends BadRequestException {
  constructor(message: string) {
    super({message, appCode: "WAD_INVALID"});
  }
}

const getWadctlError = (stderr: string) => {
  try {
    const parsed = JSON.parse(stderr) as {error?: unknown};
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // The native process may fail before it can emit its JSON error format.
  }

  return stderr.trim() || "WAD operation failed";
};

export const runWadctl = async (args: string[]): Promise<unknown> => {
  let process: Bun.Subprocess<"ignore", "pipe", "pipe">;

  try {
    process = Bun.spawn([appEnv.WADCTL_PATH, ...args], {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      timeout: 5_000,
    });
  } catch (error) {
    throw new ServiceException({
      message: "Unable to start the WAD reader",
      details: error instanceof Error ? error.message : error,
    });
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new WadctlError(getWadctlError(stderr));
  }

  try {
    return JSON.parse(stdout);
  } catch {
    throw new ServiceException("The WAD reader returned invalid JSON");
  }
};

export const getWadArtifactSnapshot = (artifact: WadArtifact) => ({
  id: artifact.id,
  originalName: artifact.originalName,
  sizeBytes: artifact.sizeBytes,
  magic: artifact.magic,
  descriptorCount: artifact.descriptorCount,
  descriptorOffset: artifact.descriptorOffset,
  createdAt: artifact.createdAt,
});

export const createWadArtifact = async (sandboxId: string, file: File) => {
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
  const artifactDirectory = join(appEnv.WAD_DATA_DIR, sandboxId, id);
  const originalPath = join(artifactDirectory, "original.wad");
  const workingPath = join(artifactDirectory, "working.wad");

  await mkdir(artifactDirectory, {recursive: true});

  try {
    await Bun.write(originalPath, file);
    await Bun.write(workingPath, Bun.file(originalPath));
    const inspection = wadInspectionSchema.parse(
      await runWadctl(["inspect", workingPath]),
    );
    const artifact: WadArtifact = {
      id,
      sandboxId,
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
    if (error instanceof WadctlError || error instanceof z.ZodError) {
      throw new BadRequestException({
        message: error.message,
        appCode: "WAD_INVALID",
      });
    }
    throw error;
  }
};

export const listWadArtifacts = (sandboxId: string) =>
  [...artifacts.values()]
    .filter((artifact) => artifact.sandboxId === sandboxId)
    .map(getWadArtifactSnapshot);

export const requireWadArtifact = (sandboxId: string, wadId: string) => {
  const artifact = artifacts.get(wadId);
  if (!artifact || artifact.sandboxId !== sandboxId) {
    throw new NotFoundException({
      appCode: "WAD_NOT_FOUND",
      details: {wadId},
    });
  }
  return artifact;
};

export const removeWadArtifact = async (
  sandboxId: string,
  wadId: string,
) => {
  const artifact = requireWadArtifact(sandboxId, wadId);
  artifacts.delete(wadId);
  await rm(join(appEnv.WAD_DATA_DIR, artifact.sandboxId, artifact.id), {
    recursive: true,
    force: true,
  });
};

export const removeWadArtifactsForSandbox = async (sandboxId: string) => {
  for (const artifact of artifacts.values()) {
    if (artifact.sandboxId === sandboxId) artifacts.delete(artifact.id);
  }
  await rm(join(appEnv.WAD_DATA_DIR, sandboxId), {
    recursive: true,
    force: true,
  });
};
