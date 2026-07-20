import {z} from "zod";

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
      payload: tileCoordinatePayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("tile.flag.toggle"),
      payload: tileCoordinatePayloadSchema,
    })
    .strict(),
  z.object({type: z.literal("game.restart")}).strict(),
  z.object({type: z.literal("game.resync")}).strict(),
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

export const minesweeperGameSnapshotSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    status: z.enum(["playing", "won", "lost"]),
    elapsedSeconds: z.number().int().nonnegative(),
    remainingMines: z.number().int(),
    rows: z.number().int().positive(),
    cols: z.number().int().positive(),
    tiles: z.array(tileSchema),
  })
  .strict();

export const minesweeperErrorSchema = z
  .object({
    code: z.enum([
      "BAD_REQUEST",
      "GAME_NOT_FOUND",
      "INVALID_ACTION",
      "SYSTEM_UNAVAILABLE",
    ]),
    message: z.string(),
  })
  .strict();

export const minesweeperServerMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("socket.ready"),
      payload: z
        .object({
          protocolVersion: z.literal(1),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("game.snapshot"),
      payload: minesweeperGameSnapshotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      payload: minesweeperErrorSchema,
    })
    .strict(),
  z.object({type: z.literal("pong")}).strict(),
]);

export type MinesweeperServerMessage = z.infer<
  typeof minesweeperServerMessageSchema
>;
