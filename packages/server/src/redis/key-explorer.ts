import {z} from "zod";
import {NotFoundException} from "../common/errors";
import type {ClientStatus} from "../common/types";
import type {RedisWorkspace} from "./redis.workspace";

export type RedisKeyExplorer = {
  id: string;
  createdAt: string;
  pattern: string;
};

export type RedisKeyExplorerSnapshot = {
  kind: "redis-key-explorer";
  id: string;
  createdAt: string;
  pattern: string;
  status: ClientStatus;
};

export const scanKeysJson = z.object({
  pattern: z.string().default("*"),
  cursor: z.string().default("0"),
  count: z.number().int().positive().max(500).default(100),
});

export const inspectKeyJson = z.object({
  key: z.string().trim().min(1).max(512),
});

export const getKeyExplorerSnapshot = (
  explorer: RedisKeyExplorer,
  status: ClientStatus,
): RedisKeyExplorerSnapshot => ({
  kind: "redis-key-explorer",
  id: explorer.id,
  createdAt: explorer.createdAt,
  pattern: explorer.pattern,
  status,
});

export const createKeyExplorer = (workspace: RedisWorkspace) => {
  const explorer: RedisKeyExplorer = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    pattern: "*",
  };

  workspace.keyExplorers.set(explorer.id, explorer);
  return explorer;
};

const requireKeyExplorer = (
  workspace: RedisWorkspace,
  explorerId: string,
) => {
  const explorer = workspace.keyExplorers.get(explorerId);

  if (!explorer) {
    throw new NotFoundException({
      appCode: "KEY_EXPLORER_NOT_FOUND",
      details: {explorerId, workspaceId: workspace.id},
    });
  }

  return explorer;
};

export const removeKeyExplorer = (
  workspace: RedisWorkspace,
  explorerId: string,
) => {
  const explorer = requireKeyExplorer(workspace, explorerId);
  workspace.keyExplorers.delete(explorer.id);
  return explorer;
};

export const scanKeyExplorer = async (
  workspace: RedisWorkspace,
  explorerId: string,
  input: z.infer<typeof scanKeysJson>,
) => {
  const explorer = requireKeyExplorer(workspace, explorerId);
  const redis = await workspace.connection.connect();

  explorer.pattern = input.pattern;
  return redis.scan(input.cursor, {
    MATCH: input.pattern,
    COUNT: input.count,
  });
};

export const inspectKeyExplorer = async (
  workspace: RedisWorkspace,
  explorerId: string,
  key: string,
) => {
  requireKeyExplorer(workspace, explorerId);
  const redis = await workspace.connection.connect();
  const exists = await redis.exists(key);

  if (!exists) {
    return {
      key,
      exists: false,
      type: "none" as const,
      ttlSeconds: -2,
      value: null,
      size: null,
    };
  }

  const [type, ttlSeconds] = await Promise.all([redis.type(key), redis.ttl(key)]);
  let value: unknown = null;
  let size: number | null = null;

  if (type === "string") value = await redis.get(key);
  else if (type === "hash") value = await redis.hGetAll(key);
  else if (type === "set") size = await redis.sCard(key);
  else if (type === "list") size = await redis.lLen(key);
  else if (type === "zset") size = await redis.zCard(key);
  else if (type === "stream") size = await redis.xLen(key);

  return {key, exists: true, type, ttlSeconds, value, size};
};
