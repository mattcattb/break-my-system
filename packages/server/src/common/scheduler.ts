import {logger} from "./logger";

type IntervalTaskOptions = {
  runImmediately?: boolean;
};

export type IntervalTask = {
  name: string;
  start: () => void;
  stop: () => void;
};

export const createIntervalTask = (
  name: string,
  handler: () => Promise<void> | void,
  intervalMs: number,
  options: IntervalTaskOptions = {},
): IntervalTask => {
  let timer: ReturnType<typeof setInterval> | null = null;

  const run = () => {
    void Promise.resolve(handler()).catch((error) => {
      logger.error({error, task: name}, "Scheduled task failed");
    });
  };

  return {
    name,
    start() {
      if (timer) {
        return;
      }

      if (options.runImmediately) {
        run();
      }

      timer = setInterval(run, intervalMs);
    },
    stop() {
      if (!timer) {
        return;
      }

      clearInterval(timer);
      timer = null;
    },
  };
};
