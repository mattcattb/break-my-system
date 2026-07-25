import type {WadArtifact} from "./wad.artifact";
import {runWadOperation} from "./wad.client";

export const listWadDirectory = (artifact: WadArtifact, path: string) =>
  runWadOperation((client) => client.list(artifact.id, path));

export const getWadTree = (artifact: WadArtifact) =>
  runWadOperation((client) => client.tree(artifact.id));

export const statWadEntry = (artifact: WadArtifact, path: string) =>
  runWadOperation((client) => client.stat(artifact.id, path));

export const readWadContent = (artifact: WadArtifact, path: string) =>
  runWadOperation((client) => client.read(artifact.id, path));

export const readWadContentRange = (
  artifact: WadArtifact,
  path: string,
  offset: number,
  length: number,
) =>
  runWadOperation((client) =>
    client.readRange(artifact.id, path, offset, length),
  );
