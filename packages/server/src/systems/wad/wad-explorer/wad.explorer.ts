import {rm} from "node:fs/promises";
import {runWadctl, type WadArtifact} from "../wad.artifact";

export const listWadDirectory = (artifact: WadArtifact, path: string) => {
  return runWadctl(["list", artifact.workingPath, path]);
};

export const getWadTree = (artifact: WadArtifact) =>
  runWadctl(["tree", artifact.workingPath]);

export const statWadEntry = (artifact: WadArtifact, path: string) =>
  runWadctl(["stat", artifact.workingPath, path]);

export const readWadContent = async (artifact: WadArtifact, path: string) => {
  const outputPath = `${artifact.workingPath}.${crypto.randomUUID()}.read`;
  try {
    await runWadctl(["read", artifact.workingPath, path, outputPath]);
    return await Bun.file(outputPath).arrayBuffer();
  } finally {
    await rm(outputPath, {force: true});
  }
};
