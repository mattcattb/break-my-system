import {type RedisClientType} from "redis";
import {ConflictException, NotFoundException} from "../common/errors";
import {TerminalRuntime, type Terminal} from "./terminal.runtime";
import {commandStringSchema} from "../lib/commands";
import z from "zod";

const MAX_TERMINALS_PER_SANDBOX = 4;
const SANDBOX_IDLE_MS = 10 * 60 * 1000;
const SANDBOX_TTL_MS = 60 * 60 * 1000;
const MAX_COMMAND_LENGTH = 2_000;

type ClientState = "none" | "disconnected" | "connected" | "connecting";

export type Sandbox = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  terminals: Map<string, Terminal>;
};

const sandboxeMap = new Map<string, Sandbox>();

export function getClientStatus(client: RedisClientType | null): ClientState {
  if (!client) return "none";
  if (client.isReady) return "connected";
  if (client.isOpen) return "connecting";
  return "disconnected";
}

export function createSandbox(): Sandbox {
  const s: Sandbox = {
    createdAt: new Date(),
    lastSeenAt: new Date(),
    id: crypto.randomUUID(),
    terminals: new Map(),
  };
  sandboxeMap.set(s.id, s);

  return s;
}

export const getSandbox = (tId: string): Sandbox | null => {
  // if past, delete
  const sandbox = sandboxeMap.get(tId);

  // deletes if ttl exceeded

  if (sandbox) {
    sandbox.lastSeenAt = new Date();
  }

  return sandbox ?? null;
};

export const getRequiredSandbox = async (tId: string): Promise<Sandbox> => {
  const sandbox = getSandbox(tId);

  if (!sandbox) {
    throw new NotFoundException(`Sandbox ${tId} not found`);
  }

  if (hasDurationExceeded(sandbox)) {
    await closeSandbox(sandbox);
    throw new NotFoundException("Sandbox has expired");
  }

  if (hasTtlExpired(sandbox)) {
    await closeSandbox(sandbox).catch((err) => {
      console.log({err}, "error closing sandbox connection");
    });
  }
  return sandbox;
};

export const closeSandbox = async (sandbox: Sandbox) => {
  // close all terminals

  sandboxeMap.delete(sandbox.id);
  const terminals = [...sandbox.terminals.values()];
  sandbox.terminals.clear();

  await Promise.allSettled(terminals.map((t) => TerminalRuntime.close(t)));
};

export const getTerminals = (sandbox: Sandbox) => {
  const terminals = sandbox.terminals;

  const terminalData = [];
  for (const [tId, term] of terminals) {
    const {connection, ...rest} = term;
    const termDate = {...rest, state: getClientStatus(connection)};
    terminalData.push(termDate);
  }

  return terminalData;
};

export const getRequiredTerminal = (s: Sandbox, tId: string) => {
  const t = s.terminals.get(tId);

  if (!t) {
    throw new NotFoundException("Terminal does not exist!");
  }

  t.lastUsed = new Date().toISOString();

  return t;
};

export const sendCommandJson = z.object({
  terminalId: z.string(),
  command: commandStringSchema,
});

export const sendCommand = async (
  sandbox: Sandbox,
  {command, terminalId}: z.infer<typeof sendCommandJson>,
) => {
  // !ARGGGG RAAA

  const term = getRequiredTerminal(sandbox, terminalId);

  await TerminalRuntime.requireTerminalClient(term);

  if (term.connection?.isReady) {
    throw new ConflictException("client is not in ready connected state");
  }

  // TODO add state management here!!!

  term.lastUsed = new Date().toISOString();

  const resp = await term.connection?.sendCommand(command);

  return {
    requestCommand: command,
    response: resp,
  };
};

export const hasTtlExpired = (sandbox: Sandbox): boolean => {
  const lastUsedMs = Date.now() - sandbox.lastSeenAt.getMilliseconds();

  if (lastUsedMs > SANDBOX_IDLE_MS) {
    return true;
  }
  return false;
};

export const hasDurationExceeded = (sandbox: Sandbox): boolean => {
  const durationMs =
    sandbox.lastSeenAt.getMilliseconds() - sandbox.createdAt.getMilliseconds();

  if (durationMs > SANDBOX_TTL_MS) {
    return true;
  }

  return false;
};

export const removeSandboxTerminal = async (sandbox: Sandbox, tId: string) => {
  const terminal = sandbox.terminals.get(tId);

  if (!terminal) {
    return false;
  }

  await TerminalRuntime.close(terminal, sandbox);

  return true;
};

export const cleanupExpiredSandboxes = async () => {
  // remove unused sandboxes past interval

  for (const [sId, sandbox] of sandboxeMap) {
    if (hasDurationExceeded(sandbox) || hasTtlExpired(sandbox)) {
      // ! THIS NEEDS TO BE CHANGED HMM
      await closeSandbox(sandbox);
    }
  }
};

export const clearAllSandboxes = async () => {
  for (const [sId, sandbox] of sandboxeMap) {
    // ! THIS NEEDS TO BE CHANGED HMM
    await closeSandbox(sandbox);
  }
};
