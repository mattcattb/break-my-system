import {createMiddleware} from "hono/factory";
import {NotFoundException} from "../common/errors";
import {
  closeRedisWorkspace,
  hasRedisWorkspaceExpired,
  requireRedisWorkspace,
  touchRedisWorkspace,
  type RedisWorkspace,
} from "./redis.workspace";

export type RedisWorkspaceEnv = {
  Variables: {
    redisWorkspace: RedisWorkspace;
    redisWorkspaceId: string;
  };
};

export const requireRedisWorkspaceMW = createMiddleware<RedisWorkspaceEnv>(
  async (c, next) => {
    const workspaceId = c.req.param("workspaceId");

    if (!workspaceId) {
      throw new NotFoundException({
        appCode: "REDIS_WORKSPACE_NOT_FOUND",
        message: "Redis workspace missing workspaceId parameter",
      });
    }

    const workspace = requireRedisWorkspace(workspaceId);

    if (hasRedisWorkspaceExpired(workspace)) {
      await closeRedisWorkspace(workspace);
      throw new NotFoundException({
        appCode: "REDIS_WORKSPACE_EXPIRED",
        details: {workspaceId},
      });
    }

    touchRedisWorkspace(workspace);
    c.set("redisWorkspace", workspace);
    c.set("redisWorkspaceId", workspace.id);
    await next();
  },
);
