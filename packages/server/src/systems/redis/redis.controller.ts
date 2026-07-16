import {createRouter} from "../../common/hono";
import {sandboxController} from "../../sandbox/sandbox.controller";

export const redisController = createRouter().route(
  "/sandbox",
  sandboxController,
);
