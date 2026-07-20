import {createConnection, type Socket} from "node:net";
import {z} from "zod";
import {appEnv} from "../common/env";
import type {MinesweeperClientMessage} from "./minesweeper.ws.messages";
import {
  minesweeperErrorSchema,
  minesweeperGameSnapshotSchema,
  type MinesweeperServerMessage,
} from "./minesweeper.ws.messages";

const MAX_FRAME_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;

const runtimeEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("game.snapshot"),
      audience: z.enum(["game", "connection"]),
      gameId: z.string().min(1),
      connectionId: z.string(),
      requestId: z.string().min(1),
      payload: minesweeperGameSnapshotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      connectionId: z.string(),
      requestId: z.string(),
      payload: minesweeperErrorSchema,
    })
    .strict(),
]);

export type MinesweeperRuntimeEvent = z.infer<typeof runtimeEventSchema>;

export const toMinesweeperServerMessage = (
  event: MinesweeperRuntimeEvent,
): MinesweeperServerMessage =>
  event.type === "game.snapshot"
    ? {type: "game.snapshot", payload: event.payload}
    : {type: "error", payload: event.payload};

type PendingRequest = {
  resolve: (event: MinesweeperRuntimeEvent) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

class MinesweeperClient {
  private socket?: Socket;
  private connecting?: Promise<void>;
  private input = Buffer.alloc(0);
  private readonly pending = new Map<string, PendingRequest>();

  createGame(gameId: string, config: {rows: number; cols: number; mines: number}) {
    return this.request({
      type: "game.create",
      gameId,
      payload: config,
    });
  }

  send(
    gameId: string,
    connectionId: string,
    command: Exclude<MinesweeperClientMessage, {type: "ping"}>,
  ) {
    return this.request({...command, gameId, connectionId});
  }

  private async connect() {
    if (this.socket && !this.socket.destroyed) return;
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<void>((resolve, reject) => {
      const socket = createConnection({
        host: appEnv.MINESWEEPER_HOST,
        port: appEnv.MINESWEEPER_PORT,
      });
      const onConnectError = (error: Error) => reject(error);
      socket.once("error", onConnectError);
      socket.once("connect", () => {
        socket.off("error", onConnectError);
        this.socket = socket;
        this.input = Buffer.alloc(0);
        socket.on("data", (chunk) => this.receive(chunk));
        socket.on("error", (error) => this.disconnect(error));
        socket.on("close", () => this.disconnect(new Error("Minesweeper runtime disconnected")));
        resolve();
      });
    }).finally(() => {
      this.connecting = undefined;
    });

    return this.connecting;
  }

  private async request(command: Record<string, unknown>) {
    await this.connect();
    const requestId = crypto.randomUUID();
    const payload = Buffer.from(JSON.stringify({...command, requestId}), "utf8");
    if (payload.byteLength > MAX_FRAME_BYTES) {
      throw new Error("Minesweeper command exceeds the frame limit");
    }

    const header = Buffer.allocUnsafe(4);
    header.writeUInt32BE(payload.byteLength);
    const response = new Promise<MinesweeperRuntimeEvent>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("Minesweeper runtime request timed out"));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, {resolve, reject, timeout});
    });

    this.socket?.write(Buffer.concat([header, payload]));
    return response;
  }

  private receive(chunk: Buffer) {
    this.input = Buffer.concat([this.input, chunk]);
    while (this.input.byteLength >= 4) {
      const frameLength = this.input.readUInt32BE(0);
      if (frameLength === 0 || frameLength > MAX_FRAME_BYTES) {
        this.socket?.destroy(new Error("Minesweeper runtime sent an invalid frame"));
        return;
      }
      if (this.input.byteLength < frameLength + 4) return;

      const frame = this.input.subarray(4, frameLength + 4);
      this.input = this.input.subarray(frameLength + 4);
      let decoded: unknown;
      try {
        decoded = JSON.parse(frame.toString("utf8"));
      } catch {
        this.socket?.destroy(new Error("Minesweeper runtime sent invalid JSON"));
        return;
      }

      const result = runtimeEventSchema.safeParse(decoded);
      if (!result.success) {
        this.socket?.destroy(new Error("Minesweeper runtime sent an invalid event"));
        return;
      }

      const pending = this.pending.get(result.data.requestId);
      if (!pending) continue;
      clearTimeout(pending.timeout);
      this.pending.delete(result.data.requestId);
      pending.resolve(result.data);
    }
  }

  private disconnect(error: Error) {
    this.socket = undefined;
    this.input = Buffer.alloc(0);
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }
}

export const minesweeperClient = new MinesweeperClient();
