import {createClient, type RedisClientType} from "redis";
import type {ClientStatus} from "../../public";
import {appEnv} from "../../common/env";

export const createRedisConnection = (sandboxId: string) => {
  const id = crypto.randomUUID();
  let client: RedisClientType | null = null;
  let connectPromise: Promise<RedisClientType> | null = null;
  let errorMessage: string | null = null;
  let explicitlyDisconnected = false;

  const getStatus = (): ClientStatus => {
    if (errorMessage) return "error";
    if (client?.isReady) return "connected";
    if (connectPromise || client?.isOpen) return "connecting";
    if (explicitlyDisconnected) return "disconnected";
    return "idle";
  };

  const connect = async () => {
    if (client?.isReady) return client;
    if (connectPromise) return connectPromise;

    errorMessage = null;
    explicitlyDisconnected = false;

    const redisClient = createClient({
      url: appEnv.REDIS_URL,
    }) as RedisClientType;
    redisClient.on("error", (error) => {
      errorMessage = error.message;
    });
    client = redisClient;
    connectPromise = redisClient.connect().then(() => redisClient);

    try {
      return await connectPromise;
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Redis connection failed";
      client = null;
      throw error;
    } finally {
      connectPromise = null;
    }
  };

  const disconnect = async () => {
    const pendingConnection = connectPromise;

    if (pendingConnection) {
      await pendingConnection.catch(() => undefined);
    }

    if (client?.isOpen) {
      await client.close();
    }

    client = null;
    errorMessage = null;
    explicitlyDisconnected = true;
  };

  return {
    kind: "redis" as const,
    id,
    sandboxId,
    connect,
    disconnect,
    close: disconnect,
    getStatus,
  };
};

export type RedisConnection = ReturnType<typeof createRedisConnection>;
