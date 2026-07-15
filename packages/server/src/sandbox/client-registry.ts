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

  constructor(readonly sandboxId: string) {}

  getStatus(): ClientStatus {
    if (this.errorMessage) return "error";
    if (!this.client) return "idle";
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

    const client = createClient({url: appEnv.REDIS_URL}) as RedisClientType;
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

  async close() {
    if (!this.client) {
      return;
    }

    await this.client.close();
    this.client = null;
  }
}
