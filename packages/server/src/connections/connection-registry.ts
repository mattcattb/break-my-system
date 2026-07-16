import {NotFoundException} from "../common/errors";
import {
  createRedisConnection,
  type RedisConnection,
} from "../systems/redis/redis.connection";

const connections = new Map<string, RedisConnection>();

export const ConnectionRegistry = {
  createRedisConnection(sandboxId: string) {
    const connection = createRedisConnection(sandboxId);
    connections.set(connection.id, connection);
    return connection;
  },

  get(connectionId: string) {
    return connections.get(connectionId) ?? null;
  },

  requireRedis(connectionId: string, sandboxId?: string) {
    const connection = connections.get(connectionId);

    if (
      !connection ||
      connection.kind !== "redis" ||
      (sandboxId && connection.sandboxId !== sandboxId)
    ) {
      throw new NotFoundException("Connection not found", "UNKNOWN_SYSTEM", {
        connectionId,
      });
    }

    return connection;
  },

  getStatus(connectionId: string) {
    return this.get(connectionId)?.getStatus() ?? "disconnected";
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
