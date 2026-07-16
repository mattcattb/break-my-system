import {NotFoundException} from "../common/errors";
import {
  createRedisConnection,
  type RedisConnection,
} from "../systems/redis/redis.connection";

type Connection = RedisConnection;
type ConnectionKind = Connection["kind"];

const connections = new Map<string, Connection>();

export const ConnectionRegistry = {
  createRedisConnection(sandboxId: string) {
    const connection = createRedisConnection(sandboxId);
    connections.set(connection.id, connection);
    return connection;
  },

  get(connectionId: string) {
    return connections.get(connectionId) ?? null;
  },

  require<K extends ConnectionKind>(
    connectionId: string,
    sandboxId: string,
    expectedKind: K,
  ): Extract<Connection, {kind: K}> {
    const connection = connections.get(connectionId);

    if (
      !connection ||
      connection.kind !== expectedKind ||
      connection.sandboxId !== sandboxId
    ) {
      throw new NotFoundException({
        appCode: "UNKNOWN_SYSTEM",
        message: "Connection not found",
        details: {connectionId, expectedKind},
      });
    }

    return connection as Extract<Connection, {kind: K}>;
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

  async closeForSandbox(sandboxId: string) {
    await this.closeMany(
      [...connections.values()]
        .filter((connection) => connection.sandboxId === sandboxId)
        .map((connection) => connection.id),
    );
  },
};
