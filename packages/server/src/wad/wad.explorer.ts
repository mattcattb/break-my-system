import {readWadByteRange, readWadBytes, runWadCommand, type WadArtifact} from "./wad.artifact";
import {z} from "zod";

const wadEntrySchema = z.object({
  kind: z.enum(["root", "content", "map", "namespace"]),
  name: z.string(),
  path: z.string(),
  sizeBytes: z.number().int().nonnegative().optional(),
  childrenCount: z.number().int().nonnegative().optional(),
});

type WadEntry = z.infer<typeof wadEntrySchema>;
type WadTree = {entry: WadEntry; children: WadTree[]};
const wadTreeSchema: z.ZodType<WadTree> = z.lazy(() =>
  z.object({entry: wadEntrySchema, children: z.array(wadTreeSchema)}),
);
const wadDirectorySchema = z.object({
  path: z.string(),
  entries: z.array(wadEntrySchema),
});

export const listWadDirectory = (artifact: WadArtifact, path: string) => {
  return runWadCommand("LIST", artifact.workingPath, path).then((value) =>
    wadDirectorySchema.parse(value),
  );
};

export const getWadTree = (artifact: WadArtifact) =>
  runWadCommand("TREE", artifact.workingPath).then((value) =>
    wadTreeSchema.parse(value),
  );

export const statWadEntry = (artifact: WadArtifact, path: string) =>
  runWadCommand("STAT", artifact.workingPath, path).then((value) =>
    wadEntrySchema.parse(value),
  );

export const readWadContent = (artifact: WadArtifact, path: string) =>
  readWadBytes(artifact.workingPath, path);

export const readWadContentRange = (
  artifact: WadArtifact,
  path: string,
  offset: number,
  length: number,
) => readWadByteRange(artifact.workingPath, path, offset, length);
