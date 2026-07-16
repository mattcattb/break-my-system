import {afterEach, describe, expect, test} from "bun:test";
import {testClient} from "hono/testing";
import {api} from "../app";
import {ConnectionRegistry} from "../connections/connection-registry";
import {clearAllSandboxes} from "./sandbox.runtime";

afterEach(clearAllSandboxes);
const client = testClient(api);

describe("sandbox routes", () => {
  test("creates a sandbox and reads its snapshot", async () => {
    const createResponse = await client.api.redis.sandbox.$post();
    const created = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(created.tools).toEqual([]);

    const response = await client.api.redis.sandbox[":sandboxId"].$get({
      param: {sandboxId: created.id},
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({id: created.id, tools: []});
  });

  test("creates a terminal and exposes its empty history", async () => {
    const sandbox = await (await client.api.redis.sandbox.$post()).json();
    const createTerminalResponse = await client.api.redis.sandbox[
      ":sandboxId"
    ].terminal.$post({param: {sandboxId: sandbox.id}});
    const terminal = await createTerminalResponse.json();

    expect(createTerminalResponse.status).toBe(200);
    expect(terminal).toMatchObject({kind: "command-terminal", status: "idle"});

    const historyResponse = await client.api.redis.sandbox[":sandboxId"].terminal[
      ":terminalId"
    ].history.$get({
      param: {sandboxId: sandbox.id, terminalId: terminal.id},
    });

    expect(historyResponse.status).toBe(200);
    expect(await historyResponse.json()).toEqual([]);
  });

  test("rejects an empty command before contacting Redis", async () => {
    const sandbox = await (await client.api.redis.sandbox.$post()).json();
    const terminal = await (
      await client.api.redis.sandbox[":sandboxId"].terminal.$post({
        param: {sandboxId: sandbox.id},
      })
    ).json();

    const response = await client.api.redis.sandbox[":sandboxId"].terminal[
      ":terminalId"
    ].command.$post({
      param: {sandboxId: sandbox.id, terminalId: terminal.id},
      json: {command: "   "},
    });

    expect(Number(response.status)).toBe(400);
  });

  test("disconnects an idle terminal without deleting its history", async () => {
    const sandbox = await (await client.api.redis.sandbox.$post()).json();
    const terminal = await (
      await client.api.redis.sandbox[":sandboxId"].terminal.$post({
        param: {sandboxId: sandbox.id},
      })
    ).json();

    const response = await client.api.redis.sandbox[":sandboxId"].terminal[
      ":terminalId"
    ].disconnect.$post({
      param: {sandboxId: sandbox.id, terminalId: terminal.id},
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: terminal.id,
      status: "disconnected",
      commandCount: 0,
    });

    const statusResponse = await client.api.redis.sandbox[":sandboxId"].terminal[
      ":terminalId"
    ].redis.status.$get({
      param: {sandboxId: sandbox.id, terminalId: terminal.id},
    });

    expect(await statusResponse.json()).toEqual({
      pong: null,
      keyCount: null,
      supportedCommandCount: null,
      status: "disconnected",
    });
  });

  test("creates a key explorer and rejects an empty key inspection", async () => {
    const sandbox = await (await client.api.redis.sandbox.$post()).json();
    const explorer = await (
      await client.api.redis.sandbox[":sandboxId"]["key-explorer"].$post({
        param: {sandboxId: sandbox.id},
      })
    ).json();

    expect(explorer).toMatchObject({
      kind: "redis-key-explorer",
      pattern: "*",
      status: "idle",
    });

    const response = await client.api.redis.sandbox[":sandboxId"]["key-explorer"][
      ":explorerId"
    ].inspect.$post({
      param: {sandboxId: sandbox.id, explorerId: explorer.id},
      json: {key: ""},
    });

    expect(Number(response.status)).toBe(400);
  });

  test("deletes a terminal without deleting its sandbox", async () => {
    const sandbox = await (await client.api.redis.sandbox.$post()).json();
    const terminal = await (
      await client.api.redis.sandbox[":sandboxId"].terminal.$post({
        param: {sandboxId: sandbox.id},
      })
    ).json();

    expect(ConnectionRegistry.get(terminal.connectionId)).not.toBeNull();

    const response = await client.api.redis.sandbox[":sandboxId"].terminal[
      ":terminalId"
    ].$delete({
      param: {sandboxId: sandbox.id, terminalId: terminal.id},
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({removed: true});
    expect(ConnectionRegistry.get(terminal.connectionId)).toBeNull();

    const snapshot = await (
      await client.api.redis.sandbox[":sandboxId"].$get({
        param: {sandboxId: sandbox.id},
      })
    ).json();
    expect(snapshot.tools).toEqual([]);
  });

  test("does not remove a key explorer through the terminal route", async () => {
    const sandbox = await (await client.api.redis.sandbox.$post()).json();
    const explorer = await (
      await client.api.redis.sandbox[":sandboxId"]["key-explorer"].$post({
        param: {sandboxId: sandbox.id},
      })
    ).json();

    const response = await client.api.redis.sandbox[":sandboxId"].terminal[
      ":terminalId"
    ].$delete({
      param: {sandboxId: sandbox.id, terminalId: explorer.id},
    });

    expect(Number(response.status)).toBe(409);
    expect(ConnectionRegistry.get(explorer.connectionId)).not.toBeNull();
  });

  test("deletes a sandbox and closes its tools", async () => {
    const sandbox = await (await client.api.redis.sandbox.$post()).json();

    const deleteResponse = await client.api.redis.sandbox[":sandboxId"].$delete({
      param: {sandboxId: sandbox.id},
    });

    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual({removed: true});
    expect(
      (
        await client.api.redis.sandbox[":sandboxId"].$get({
          param: {sandboxId: sandbox.id},
        })
      ).status as number,
    ).toBe(404);
  });
});
