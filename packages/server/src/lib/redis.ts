import {createClient} from "redis";
import {appEnv} from "../common/env";
import {logger} from "../common/logger";

export const redis = createClient({
  url: appEnv.REDIS_URL,
});

redis.on("error", (error) => {
  logger.error({error}, "Redis error");
});
