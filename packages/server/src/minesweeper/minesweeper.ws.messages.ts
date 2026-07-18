import {z} from "zod";

const requestIdSchema = z.string().trim().min(1).max(100);
const coordinateSchema = z.number().int().nonnegative();
const tileCoordinatePayloadSchema = z
  .object({
    row: coordinateSchema,
    col: coordinateSchema,
  })
  .strict();

export const minesweeperClientMessageSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("ping")}).strict(),
  z
    .object({
      type: z.literal("tile.reveal"),
      requestId: requestIdSchema,
      payload: tileCoordinatePayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("tile.flag.toggle"),
      requestId: requestIdSchema,
      payload: tileCoordinatePayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("game.restart"),
      requestId: requestIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("game.resync"),
      requestId: requestIdSchema,
    })
    .strict(),
]);

export type MinesweeperClientMessage = z.infer<
  typeof minesweeperClientMessageSchema
>;

const hiddenTileSchema = z
  .object({
    row: coordinateSchema,
    col: coordinateSchema,
    state: z.literal("hidden"),
    flagged: z.boolean(),
  })
  .strict();

const revealedTileSchema = z
  .object({
    row: coordinateSchema,
    col: coordinateSchema,
    state: z.literal("revealed"),
    value: z.union([z.literal("mine"), z.number().int().min(0).max(8)]),
  })
  .strict();

const tileSchema = z.discriminatedUnion("state", [
  hiddenTileSchema,
  revealedTileSchema,
]);

export const minesweeperServerMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("socket.ready"),
      payload: z
        .object({
          gameId: z.string().trim().min(1),
          connectionId: z.string().trim().min(1),
          protocolVersion: z.literal(1),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("game.snapshot"),
      requestId: requestIdSchema.optional(),
      payload: z
        .object({
          gameId: z.string().trim().min(1),
          revision: z.number().int().nonnegative(),
          status: z.enum(["playing", "won", "lost"]),
          elapsedSeconds: z.number().int().nonnegative(),
          remainingMines: z.number().int(),
          rows: z.number().int().positive(),
          cols: z.number().int().positive(),
          tiles: z.array(tileSchema),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      requestId: requestIdSchema.optional(),
      payload: z
        .object({
          code: z.enum([
            "BAD_REQUEST",
            "GAME_NOT_FOUND",
            "INVALID_ACTION",
            "SYSTEM_UNAVAILABLE",
          ]),
          message: z.string(),
        })
        .strict(),
    })
    .strict(),
  z.object({type: z.literal("pong")}).strict(),
]);

export type MinesweeperServerMessage = z.infer<
  typeof minesweeperServerMessageSchema
>;
