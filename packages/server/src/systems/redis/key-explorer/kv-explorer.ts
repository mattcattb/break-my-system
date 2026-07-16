import {z} from "zod";
import type {ClientStatus} from "../../../common/types";
import {ConnectionRegistry} from "../../../connections/connection-registry";
import {requireTool, type Sandbox} from "../../../sandbox/sandbox";

export type KeyExplorerTool = {
  kind: "redis-key-explorer";
  id: string;
  createdAt: string;
  connectionId: string;
  pattern: string;
};

export type KeyExplorerSnapshot = {
  kind: "redis-key-explorer";
  id: string;
  createdAt: string;
  connectionId: string;
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

const createKeyExplorerTool = (connectionId: string): KeyExplorerTool => ({
  kind: "redis-key-explorer",
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  connectionId,
  pattern: "*",
});

export const getKeyExplorerSnapshot = (
  tool: KeyExplorerTool,
  status: ClientStatus,
): KeyExplorerSnapshot => ({
  id: tool.id,
  kind: tool.kind,
  createdAt: tool.createdAt,
  connectionId: tool.connectionId,
  pattern: tool.pattern,
  status,
});

export const createKeyExplorer = (sandbox: Sandbox): KeyExplorerSnapshot => {
  const connection = ConnectionRegistry.createRedisConnection(sandbox.id);
  const tool = createKeyExplorerTool(connection.id);

  sandbox.addTool(tool);

  return getKeyExplorerSnapshot(tool, connection.getStatus());
};

export const scanKeyExplorer = async (
  sandbox: Sandbox,
  explorerId: string,
  input: z.infer<typeof scanKeysJson>,
) => {
  const tool = requireTool(sandbox, explorerId, "redis-key-explorer");
  const connection = ConnectionRegistry.require(
    tool.connectionId,
    sandbox.id,
    "redis",
  );
  const redis = await connection.connect();

  tool.pattern = input.pattern;

  return redis.scan(input.cursor, {
    MATCH: input.pattern,
    COUNT: input.count,
  });
};

export const inspectKeyExplorerKey = async (
  sandbox: Sandbox,
  explorerId: string,
  key: string,
) => {
  const tool = requireTool(sandbox, explorerId, "redis-key-explorer");
  const connection = ConnectionRegistry.require(
    tool.connectionId,
    sandbox.id,
    "redis",
  );
  const redis = await connection.connect();
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

  const [type, ttlSeconds] = await Promise.all([
    redis.type(key),
    redis.ttl(key),
  ]);
  let value: unknown = null;
  let size: number | null = null;

  if (type === "string") {
    value = await redis.get(key);
  } else if (type === "hash") {
    value = await redis.hGetAll(key);
  } else if (type === "set") {
    size = await redis.sCard(key);
  } else if (type === "list") {
    size = await redis.lLen(key);
  } else if (type === "zset") {
    size = await redis.zCard(key);
  } else if (type === "stream") {
    size = await redis.xLen(key);
  }

  return {
    key,
    exists: true,
    type,
    ttlSeconds,
    value,
    size,
  };
};
