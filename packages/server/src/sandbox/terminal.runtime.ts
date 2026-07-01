import {createClient, type RedisClientType} from "redis";
import type {Sandbox} from "./sandbox.runtime";
import {appEnv} from "../common/env";

export type TermClientState =
  | "none"
  | "disconnected"
  | "connected"
  | "connecting";

export type Terminal = {
  id: string;
  createdAt: string;
  lastUsed: string;
  connection: RedisClientType | null;
  commandCount: number;
  state: TermClientState;
};

export const TerminalRuntime = {
  async createNew(sandbox?: Sandbox): Promise<Terminal> {
    const now = new Date().toISOString();
    const terminal: Terminal = {
      connection: null,
      createdAt: now,
      lastUsed: now,
      state: "none",
      id: crypto.randomUUID(),
      commandCount: 0,
    };
    if (sandbox) {
      sandbox.terminals.set(terminal.id, terminal);
    }

    return terminal;
  },

  async close(t: Terminal, s?: Sandbox) {
    if (t.connection) {
      await t.connection.close();
    }

    t.connection = null;
    if (s) {
      s.terminals.delete(t.id);
    }
  },

  async requireTerminalClient(terminal: Terminal, url?: string) {
    if (terminal.connection?.isReady) {
      return terminal.connection;
    }

    const client = createClient({
      url: url ?? appEnv.redisThingUrl,
    }) as RedisClientType;
    terminal.connection = client;

    await client.connect();
    return client;
  },

  async runCommand(terminal: Terminal, command: string[]) {
    const client = await this.requireTerminalClient(terminal);
    terminal.lastUsed = new Date().toISOString();
    const response = await client.sendCommand(command);
    terminal.commandCount++;
    terminal.lastUsed = new Date().toISOString();

    return {
      terminalId: terminal.id,
      requestCommand: command,
      response,
    };
  },
};
