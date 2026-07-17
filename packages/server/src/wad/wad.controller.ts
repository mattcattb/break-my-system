import {basename} from "node:path";
import {zValidator} from "@hono/zod-validator";
import {z} from "zod";
import {createRouter} from "../common/hono";
import {
  createWadArtifact,
  createWadItem,
  createWadNamespace,
  getWadArtifactSnapshot,
  listWadArtifacts,
  removeWadArtifact,
  resetWadArtifact,
  requireWadArtifact,
} from "./wad.artifact";
import {getWadTree, listWadDirectory, readWadContent, readWadContentRange, statWadEntry} from "./wad.explorer";
import {
  closeWadWorkspace,
  createWadWorkspace,
  getWadWorkspaceSnapshot,
  listWadWorkspaceSnapshots,
} from "./wad.workspace";
import {requireWadWorkspaceMW, type WadWorkspaceEnv} from "./wad.workspace.middleware";

const wadPathQuery = z.object({path: z.string().trim().max(1024).default("/")});
const wadUploadForm = z.object({file: z.instanceof(File)});
const wadNamespaceBody = z.object({path: z.string().trim().startsWith("/").max(1024)});
const wadItemForm = z.object({
  path: z.string().trim().startsWith("/").max(1024),
  file: z.instanceof(File).optional(),
});
const wadRangeQuery = wadPathQuery.extend({
  offset: z.coerce.number().int().nonnegative().default(0),
  length: z.coerce.number().int().positive().max(64 * 1024).default(64 * 1024),
});
const attachmentName = (name: string) => name.replaceAll(/[^a-zA-Z0-9._-]/g, "_") || "download.wad";

export const wadController = createRouter<WadWorkspaceEnv>()
  .get("/workspaces", (c) => c.json({workspaces: listWadWorkspaceSnapshots()}, 200))
  .post("/workspaces", (c) => c.json(getWadWorkspaceSnapshot(createWadWorkspace()), 201))
  .use("/workspaces/:workspaceId", requireWadWorkspaceMW)
  .use("/workspaces/:workspaceId/*", requireWadWorkspaceMW)
  .get("/workspaces/:workspaceId", (c) => c.json(getWadWorkspaceSnapshot(c.get("wadWorkspace")), 200))
  .delete("/workspaces/:workspaceId", async (c) => {
    await closeWadWorkspace(c.get("wadWorkspace"));
    return c.json({removed: true}, 200);
  })
  .post("/workspaces/:workspaceId/wads", zValidator("form", wadUploadForm), async (c) =>
    c.json(await createWadArtifact(c.get("wadWorkspace"), c.req.valid("form").file), 201),
  )
  .get("/workspaces/:workspaceId/wads", (c) => c.json({wads: listWadArtifacts(c.get("wadWorkspace"))}, 200))
  .post("/workspaces/:workspaceId/wads/:wadId/namespaces", zValidator("json", wadNamespaceBody), async (c) =>
    c.json(await createWadNamespace(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId")), c.req.valid("json").path), 201),
  )
  .post("/workspaces/:workspaceId/wads/:wadId/items", zValidator("form", wadItemForm), async (c) => {
    const form = c.req.valid("form");
    return c.json(await createWadItem(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId")), form.path, form.file), 201);
  })
  .post("/workspaces/:workspaceId/wads/:wadId/reset", async (c) =>
    c.json(await resetWadArtifact(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId"))), 200),
  )
  .get("/workspaces/:workspaceId/wads/:wadId/tree", async (c) => c.json(await getWadTree(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId"))), 200))
  .get("/workspaces/:workspaceId/wads/:wadId/list", zValidator("query", wadPathQuery), async (c) => c.json(await listWadDirectory(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId")), c.req.valid("query").path), 200))
  .get("/workspaces/:workspaceId/wads/:wadId/stat", zValidator("query", wadPathQuery), async (c) => c.json(await statWadEntry(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId")), c.req.valid("query").path), 200))
  .get("/workspaces/:workspaceId/wads/:wadId/content", zValidator("query", wadPathQuery), async (c) => {
    const content = await readWadContent(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId")), c.req.valid("query").path);
    return c.body(content, 200, {"content-type": "application/octet-stream", "content-disposition": `attachment; filename="${attachmentName(basename(c.req.valid("query").path))}"`});
  })
  .get("/workspaces/:workspaceId/wads/:wadId/bytes", zValidator("query", wadRangeQuery), async (c) => {
    const query = c.req.valid("query");
    const content = await readWadContentRange(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId")), query.path, query.offset, query.length);
    return c.body(content, 200, {"content-type": "application/octet-stream"});
  })
  .get("/workspaces/:workspaceId/wads/:wadId/download", (c) => {
    const artifact = requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId"));
    return c.body(Bun.file(artifact.workingPath).stream(), 200, {"content-type": "application/octet-stream", "content-disposition": `attachment; filename="${attachmentName(artifact.originalName)}"`});
  })
  .get("/workspaces/:workspaceId/wads/:wadId", (c) => c.json(getWadArtifactSnapshot(requireWadArtifact(c.get("wadWorkspace"), c.req.param("wadId"))), 200))
  .delete("/workspaces/:workspaceId/wads/:wadId", async (c) => {
    await removeWadArtifact(c.get("wadWorkspace"), c.req.param("wadId"));
    return c.json({removed: true}, 200);
  });
