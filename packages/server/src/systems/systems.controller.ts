import {zValidator} from "@hono/zod-validator";
import {z} from "zod";
import {BadRequestException} from "../common/errors";
import {createRouter} from "../common/hono";

const systems = [
  {
    id: "go-redis",
    name: "Go Redis",
    status: "ready",
    description: "A Redis-like server written from scratch in Go.",
    exampleCommands: ["PING", "SET name matty", "GET name", "DEL name"],
  },
  {
    id: "toy-kv",
    name: "Toy KV",
    status: "planned",
    description: "A tiny key-value store module placeholder.",
    exampleCommands: ["PUT color green", "GET color", "DELETE color"],
  },
] as const;

const runCommandSchema = z.object({
  command: z.string().trim().min(1).max(500),
});

const findSystem = (id: string) => systems.find((system) => system.id === id);

const runMockCommand = (systemId: string, command: string) => {
  const normalized = command.trim();
  const [name = ""] = normalized.split(/\s+/);

  if (systemId === "go-redis" && name.toUpperCase() === "PING") {
    return "PONG";
  }

  return [
    `accepted command for ${systemId}`,
    `$ ${normalized}`,
    "mock runner only; wire this to a real module when the control API is ready",
  ].join("\n");
};

export const systemsController = createRouter()
  .get("/", (c) => c.json({systems}))
  .post("/:id/commands", zValidator("json", runCommandSchema), async (c) => {
    const system = findSystem(c.req.param("id"));

    if (!system) {
      throw new BadRequestException("Unknown system");
    }

    const {command} = c.req.valid("json");
    const startedAt = Date.now();
    const output = runMockCommand(system.id, command);

    return c.json({
      systemId: system.id,
      command,
      output,
      exitCode: 0,
      durationMs: Date.now() - startedAt,
      ranAt: new Date().toISOString(),
    });
  })
  .post("/:id/reset", (c) => {
    const system = findSystem(c.req.param("id"));

    if (!system) {
      throw new BadRequestException("Unknown system");
    }

    return c.json({
      systemId: system.id,
      status: "reset",
      message: `${system.name} reset requested`,
      resetAt: new Date().toISOString(),
    });
  });
