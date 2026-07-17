import {createMiddleware} from "hono/factory";
import {NotFoundException} from "../common/errors";
import {
  closeWadWorkspace,
  hasWadWorkspaceExpired,
  requireWadWorkspace,
  touchWadWorkspace,
  type WadWorkspace,
} from "./wad.workspace";

export type WadWorkspaceEnv = {
  Variables: {wadWorkspace: WadWorkspace; wadWorkspaceId: string};
};

export const requireWadWorkspaceMW = createMiddleware<WadWorkspaceEnv>(
  async (c, next) => {
    const workspaceId = c.req.param("workspaceId");
    if (!workspaceId) {
      throw new NotFoundException({appCode: "WAD_WORKSPACE_NOT_FOUND"});
    }
    const workspace = requireWadWorkspace(workspaceId);
    if (hasWadWorkspaceExpired(workspace)) {
      await closeWadWorkspace(workspace);
      throw new NotFoundException({appCode: "WAD_WORKSPACE_EXPIRED"});
    }
    touchWadWorkspace(workspace);
    c.set("wadWorkspace", workspace);
    c.set("wadWorkspaceId", workspace.id);
    await next();
  },
);
