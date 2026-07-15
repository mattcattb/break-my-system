import {Hono, type Env} from "hono";
import {corsMiddleware} from "./cors";
import {getPinoLogger} from "./logger";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
    session: {
      id: string;
      expiresAt: Date;
    };
  }
}

export const createRouter = <TEnv extends Env = Env>() => {
  return new Hono<TEnv>({
    strict: true,
  });
};

export const addGlobalMiddlewares = (app: Hono) => {
  app
    .use("*", getPinoLogger())
    .use("*", corsMiddleware)
    .get("/health", (c) =>
      c.json({status: "ok", timestamp: new Date().toISOString()}),
    );
};
