import {z} from "zod";

export const redisClientMessagesSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("ping")}),
  z.object({
    type: z.literal("terminal.attach"),
    requestId: z.string(),
    terminalId: z.string(),
  }),
  z.object({
    type: z.literal("terminal.detach"),
    requestId: z.string(),
    terminalId: z.string(),
  }),
  z.object({
    type: z.literal("terminal.command"),
    requestId: z.string(),
    terminalId: z.string(),
    payload: z.object({input: z.string().trim().min(1)}),
  }),
]);

export type RedisClientMessage = z.infer<typeof redisClientMessagesSchema>;

const redisServerMessagesSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("socket.ready"),
    payload: z.object({workspaceId: z.string()}),
  }),
  z.object({
    type: z.literal("terminal.attached"),
    requestId: z.string(),
    terminalId: z.string(),
  }),
  z.object({
    type: z.literal("terminal.detached"),
    requestId: z.string(),
    terminalId: z.string(),
  }),
  z.object({
    type: z.literal("terminal.command.result"),
    requestId: z.string(),
    terminalId: z.string(),
    occurredAt: z.string(),
    payload: z.object({lines: z.array(z.string())}),
  }),
  z.object({
    type: z.literal("error"),
    requestId: z.string().optional(),
    terminalId: z.string().optional(),
    payload: z.object({code: z.string(), message: z.string()}),
  }),
  z.object({type: z.literal("pong")}),
]);

export type RedisServerMessage = z.infer<typeof redisServerMessagesSchema>;
