import {appEvents} from "./events";
import {logger} from "./logger";
import type {IntervalTask} from "./scheduler";

type RuntimeConnection = {
  name: string;
  connect: () => Promise<void> | void;
  disconnect?: () => Promise<void> | void;
};

type ServerRuntimeOptions = {
  name: string;
  port: number;
  connections?: RuntimeConnection[];
  backgroundTasks?: IntervalTask[];
};

export const startServerRuntime = async ({
  name,
  port,
  connections = [],
  backgroundTasks = [],
}: ServerRuntimeOptions) => {
  for (const connection of connections) {
    await connection.connect();
    logger.info({connection: connection.name}, "Runtime connection ready");
  }

  for (const task of backgroundTasks) {
    task.start();
    logger.info({task: task.name}, "Scheduled task started");
  }

  let stopping = false;

  const stop = async (reason: string) => {
    if (stopping) {
      return;
    }

    stopping = true;
    appEvents.emit("app:stopping", {reason});

    for (const task of [...backgroundTasks].reverse()) {
      task.stop();
      logger.info({task: task.name}, "Scheduled task stopped");
    }

    for (const connection of [...connections].reverse()) {
      if (connection.disconnect) {
        await connection.disconnect();
        logger.info({connection: connection.name}, "Runtime connection closed");
      }
    }
  };

  const shutdown = (reason: string) => {
    void stop(reason)
      .catch((error) => {
        logger.error({error, reason}, "Runtime shutdown failed");
      })
      .finally(() => {
        process.exit(0);
      });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  appEvents.emit("app:started", {port});
  logger.info({name, port}, "Server runtime started");

  return {stop};
};
