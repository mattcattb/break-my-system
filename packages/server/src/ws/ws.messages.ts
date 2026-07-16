import {z} from "zod/v4";
import {CLIENT_STATUSES} from "../common/types";
import {APP_ERROR_CODES} from "../public";

export const clientMessagesSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("ping")}),
  z.object({
    type: z.literal("tool.attach"),
    toolId: z.string(),
    requestId: z.string(),
    payload: z.object({
      afterSequence: z.number().int().nonnegative().optional(),
    }),
  }),
  z.object({
    type: z.literal("tool.detatch"),
    terminalId: z.string(),
  }),
  z.object({
    type: z.literal("terminal.command"),
    terminalId: z.string(),
    requestId: z.string(),
    payload: z.object({
      input: z.string().trim().min(1),
    }),
  }),
]);

export type ClientMessage = z.infer<typeof clientMessagesSchema>;
export type ClientMessageType = ClientMessage["type"];

export type ClientMessageOf<T extends ClientMessageType> = Extract<
  ClientMessage,
  {type: T}
>;

export const terminalEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("terminal.command.result"),
    toolId: z.string(),
    requestId: z.string(),
    sequence: z.number(),
    occuredAt: z.string(),
    payload: z.object({
      lines: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal("tool.attached"),
    toolId: z.string(),
    requestId: z.string(),
  }),
  z.object({
    type: z.literal("connection.status.changed"),
    toolId: z.string(),
    sequence: z.number().int().nonnegative(),
    occurredAt: z.string(),

    payload: z.object({
      status: z.enum(CLIENT_STATUSES),
    }),
  }),
]);

export const kvEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(""),
  }),
]);

export const serverMessageSchema = z.discriminatedUnion("type", [
  terminalEventSchema,
  z.object({
    type: z.literal("error"),
    payload: z.object({
      message: z.string(),
      code: z.enum(APP_ERROR_CODES),
    }),
  }),
  z.object({
    type: z.literal("pong"),
  }),

  z.object({
    type: z.literal("redis.pubsub.message"),
    payload: z.object({
      terminalId: z.string(),
      sequence: z.number().int().nonnegative(),
      occurredAt: z.string(),

      channel: z.string(),
      message: z.string(),
    }),
  }),

  z.object({
    type: z.literal("plc.value.changed"),
    terminalId: z.string(),
    sequence: z.number().int().nonnegative(),
    occurredAt: z.string(),
    payload: z.object({
      address: z.string(),
      value: z.unknown(),
    }),
  }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;
export type TerminalEvent = z.infer<typeof terminalEventSchema>;
