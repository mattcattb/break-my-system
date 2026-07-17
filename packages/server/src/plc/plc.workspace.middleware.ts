import {createMiddleware} from "hono/factory";
import {NotFoundException} from "../common/errors";
import {
  closePlcWorkspace,
  hasPlcWorkspaceExpired,
  requirePlcWorkspace,
  touchPlcWorkspace,
  type PlcWorkspace,
} from "./plc.workspace";

export type PlcWorkspaceEnv = {
  Variables: {plcWorkspace: PlcWorkspace; plcWorkspaceId: string};
};

export const requirePlcWorkspaceMW = createMiddleware<PlcWorkspaceEnv>(
  async (c, next) => {
    const workspaceId = c.req.param("workspaceId");
    if (!workspaceId) {
      throw new NotFoundException({appCode: "PLC_WORKSPACE_NOT_FOUND"});
    }

    const workspace = requirePlcWorkspace(workspaceId);
    if (hasPlcWorkspaceExpired(workspace)) {
      await closePlcWorkspace(workspace);
      throw new NotFoundException({appCode: "PLC_WORKSPACE_EXPIRED"});
    }

    touchPlcWorkspace(workspace);
    c.set("plcWorkspace", workspace);
    c.set("plcWorkspaceId", workspace.id);
    await next();
  },
);
