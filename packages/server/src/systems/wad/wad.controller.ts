import {basename} from "node:path";
import {zValidator} from "@hono/zod-validator";
import {z} from "zod";
import {BadRequestException} from "../../common/errors";
import {createRouter} from "../../common/hono";
import {
  requireSandboxMW,
  type SandboxEnv,
} from "../../sandbox/sandbox.middleware";
import {
  createWadArtifact,
  getWadArtifactSnapshot,
  listWadArtifacts,
  removeWadArtifact,
  requireWadArtifact,
} from "./wad.artifact";
import {
  getWadTree,
  listWadDirectory,
  readWadContent,
  statWadEntry,
} from "./wad-explorer/wad.explorer";

const wadPathQuery = z.object({
  path: z.string().trim().max(1024).default("/"),
});

const attachmentName = (name: string) =>
  name.replaceAll(/[^a-zA-Z0-9._-]/g, "_") || "download.wad";

export const wadController = createRouter<SandboxEnv>()
  .use("/:sandboxId/wads", requireSandboxMW)
  .use("/:sandboxId/wads/*", requireSandboxMW)
  .post("/:sandboxId/wads", async (c) => {
    const upload = (await c.req.formData()).get("file");
    if (!(upload instanceof File)) {
      throw new BadRequestException("Upload a WAD in the 'file' form field");
    }

    return c.json(await createWadArtifact(c.get("sandboxId"), upload), 201);
  })
  .get("/:sandboxId/wads", (c) => {
    return c.json({wads: listWadArtifacts(c.get("sandboxId"))}, 200);
  })
  .get("/:sandboxId/wads/:wadId/tree", async (c) => {
    const artifact = requireWadArtifact(
      c.get("sandboxId"),
      c.req.param("wadId"),
    );
    return c.json(await getWadTree(artifact), 200);
  })
  .get(
    "/:sandboxId/wads/:wadId/list",
    zValidator("query", wadPathQuery),
    async (c) => {
      const artifact = requireWadArtifact(
        c.get("sandboxId"),
        c.req.param("wadId"),
      );
      return c.json(
        await listWadDirectory(artifact, c.req.valid("query").path),
        200,
      );
    },
  )
  .get(
    "/:sandboxId/wads/:wadId/stat",
    zValidator("query", wadPathQuery),
    async (c) => {
      const artifact = requireWadArtifact(
        c.get("sandboxId"),
        c.req.param("wadId"),
      );
      return c.json(
        await statWadEntry(artifact, c.req.valid("query").path),
        200,
      );
    },
  )
  .get(
    "/:sandboxId/wads/:wadId/content",
    zValidator("query", wadPathQuery),
    async (c) => {
      const artifact = requireWadArtifact(
        c.get("sandboxId"),
        c.req.param("wadId"),
      );
      const path = c.req.valid("query").path;
      const content = await readWadContent(artifact, path);
      return c.body(content, 200, {
          "content-type": "application/octet-stream",
          "content-disposition": `attachment; filename="${attachmentName(basename(path))}"`,
      });
    },
  )
  .get("/:sandboxId/wads/:wadId/download", (c) => {
    const artifact = requireWadArtifact(
      c.get("sandboxId"),
      c.req.param("wadId"),
    );
    return c.body(Bun.file(artifact.workingPath).stream(), 200, {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${attachmentName(artifact.originalName)}"`,
    });
  })
  .get("/:sandboxId/wads/:wadId", (c) => {
    return c.json(
      getWadArtifactSnapshot(
        requireWadArtifact(c.get("sandboxId"), c.req.param("wadId")),
      ),
      200,
    );
  })
  .delete("/:sandboxId/wads/:wadId", async (c) => {
    await removeWadArtifact(c.get("sandboxId"), c.req.param("wadId"));
    return c.json({removed: true}, 200);
  });
