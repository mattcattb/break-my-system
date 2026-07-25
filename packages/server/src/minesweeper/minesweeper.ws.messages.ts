import {
  minesweeperCommandSchema,
  minesweeperErrorSchema,
  minesweeperGameSnapshotSchema,
} from "@break-my-system/minesweeper-client/messages";
import {z} from "zod";
import type {
  MinesweeperClientMessage,
  MinesweeperServerMessage,
} from "./minesweeper.ws.types";

export const minesweeperClientMessageSchema = z.union([
  z.object({type: z.literal("ping")}).strict(),
  minesweeperCommandSchema,
]) satisfies z.ZodType<MinesweeperClientMessage>;

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
]) satisfies z.ZodType<MinesweeperServerMessage>;
