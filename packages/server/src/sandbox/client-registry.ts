import {createClient, type RedisClientType} from "redis";
import {appEnv} from "../common/env";
import {NotFoundException} from "../common/errors";
import type {ClientStatus} from "../common/types";

const connections = new Map<string, RedisConnection>();

const redisReplyToLines = (reply: unknown): string[] => {
  if (reply === null) {
    return ["(nil)"];
  }

  if (reply === undefined) {
    return [];
  }

  if (Array.isArray(reply)) {
    if (reply.length === 0) {
      return ["(empty array)"];
    }

    return reply.flatMap((item, index) =>
      redisReplyToLines(item).map((line) => `${index + 1}) ${line}`),
    );
  }

  if (Buffer.isBuffer(reply)) {
    return [reply.toString("utf8")];
  }

  if (typeof reply === "object") {
    return [JSON.stringify(reply, null, 2)];
  }

  return [String(reply)];
};

const normalizeRedisReply = (reply: unknown): unknown => {
  if (Buffer.isBuffer(reply)) {
    return reply.toString("utf8");
  }

  if (Array.isArray(reply)) {
    return reply.map(normalizeRedisReply);
  }

  return reply;
};

const redisReplyToString = (reply: unknown) => {
  const normalized = normalizeRedisReply(reply);
  return normalized === null || normalized === undefined
    ? null
    : String(normalized);
};

const redisReplyToNumber = (reply: unknown) => {
  const text = redisReplyToString(reply);
  if (text === null) return null;

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

const tryRedisCommand = async (
  client: RedisClientType,
  command: string[],
) => {
  try {
    return await client.sendCommand(command);
  } catch {
    return null;
  }
};

export const ConnectionRegistry = {
  createRedisConnection(sandboxId: string) {
    const connection = new RedisConnection(sandboxId);
    connections.set(connection.id, connection);
    return connection;
  },

  get(connectionId: string) {
    return connections.get(connectionId) ?? null;
  },

  require(connectionId: string) {
    const connection = connections.get(connectionId);

    if (!connection) {
      throw new NotFoundException("Connection not found", "UNKNOWN_SYSTEM", {
        connectionId,
      });
    }

    return connection;
  },

  getStatus(connectionId: string) {
    return this.get(connectionId)?.getStatus() ?? "disconnected";
  },

  async executeRedisCommand(connectionId: string, command: string[]) {
    return this.require(connectionId).executeRedisCommand(command);
  },

  async connect(connectionId: string) {
    const connection = this.require(connectionId);
    await connection.connect();
    return connection.getStatus();
  },

  async disconnect(connectionId: string) {
    const connection = this.require(connectionId);
    await connection.disconnect();
    return connection.getStatus();
  },

  async reconnect(connectionId: string) {
    const connection = this.require(connectionId);
    await connection.disconnect();
    await connection.connect();
    return connection.getStatus();
  },

  async getRedisStatus(connectionId: string) {
    return this.require(connectionId).getRedisStatus();
  },

  async inspectRedisKey(connectionId: string, key: string) {
    return this.require(connectionId).inspectRedisKey(key);
  },

  async close(connectionId: string) {
    const connection = connections.get(connectionId);

    if (!connection) {
      return;
    }

    await connection.close();
    connections.delete(connectionId);
  },

  async closeMany(connectionIds: string[]) {
    await Promise.allSettled(
      connectionIds.map((connectionId) => this.close(connectionId)),
    );
  },
};
class RedisConnection {
  readonly id = crypto.randomUUID();
  readonly kind = "redis" as const;

  private client: RedisClientType | null = null;
  private errorMessage: string | null = null;
  private explicitlyDisconnected = false;

  constructor(readonly sandboxId: string) {}

  getStatus(): ClientStatus {
    if (this.errorMessage) return "error";
    if (!this.client) return this.explicitlyDisconnected ? "disconnected" : "idle";
    if (!this.client.isOpen) return "disconnected";
    if (this.client.isReady) return "connected";
    return "connecting";
  }

  getErrorMessage() {
    return this.errorMessage;
  }

  async connect() {
    if (this.client?.isReady) {
      return this.client;
    }

    this.errorMessage = null;
    this.explicitlyDisconnected = false;

    const client = createClient({url: appEnv.REDIS_URL}) as RedisClientType;
    client.on("error", (err) => {
      this.errorMessage = err.message;
    });
    this.client = client;

    try {
      await client.connect();
      return client;
    } catch (err) {
      this.errorMessage =
        err instanceof Error ? err.message : "Redis connection failed";
      throw err;
    }
  }

  async executeRedisCommand(command: string[]) {
    const client = await this.connect();
    const reply = await client.sendCommand(command);

    return {
      lines: redisReplyToLines(reply),
    };
  }

  async getRedisStatus() {
    if (!this.client?.isReady) {
      return {
        pong: null,
        keyCount: null,
        supportedCommandCount: null,
        status: this.getStatus(),
      };
    }

    const client = this.client;
    const pong = await client.sendCommand(["PING"]);
    const keyCount = await tryRedisCommand(client, ["DBSIZE"]);
    const supportedCommandCount = await tryRedisCommand(client, [
      "COMMANDCOUNT",
    ]);

    return {
      pong: redisReplyToString(pong),
      keyCount: redisReplyToNumber(keyCount),
      supportedCommandCount: redisReplyToNumber(supportedCommandCount),
      status: this.getStatus(),
    };
  }

  async inspectRedisKey(key: string) {
    const client = await this.connect();
    const exists = redisReplyToNumber(
      await client.sendCommand(["EXISTS", key]),
    );

    if (!exists) {
      return {
        key,
        exists: false,
        type: "none",
        ttlSeconds: -2,
        encoding: null,
        value: null,
        size: null,
      };
    }

    const type = redisReplyToString(await client.sendCommand(["TYPE", key]));
    const ttlSeconds = redisReplyToNumber(
      await tryRedisCommand(client, ["TTL", key]),
    );
    const encoding = redisReplyToString(
      await tryRedisCommand(client, ["OBJECTENCODING", key]),
    );
    let value: unknown = null;
    let size: number | null = null;

    if (type === "string") {
      value = normalizeRedisReply(await client.sendCommand(["GET", key]));
    } else if (type === "hash") {
      value = normalizeRedisReply(await client.sendCommand(["HGETALL", key]));
    } else if (type === "set") {
      size = redisReplyToNumber(await client.sendCommand(["SCARD", key]));
    }

    return {
      key,
      exists: true,
      type: type ?? "unknown",
      ttlSeconds,
      encoding,
      value,
      size,
    };
  }

  async disconnect() {
    if (this.client?.isOpen) {
      await this.client.close();
    }

    this.client = null;
    this.errorMessage = null;
    this.explicitlyDisconnected = true;
  }

  async close() {
    await this.disconnect();
  }
}
