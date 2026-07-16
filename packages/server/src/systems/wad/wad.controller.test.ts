import {afterEach, describe, expect, test} from "bun:test";
import {app} from "../../app";
import {clearAllSandboxes} from "../../sandbox/sandbox.runtime";

afterEach(clearAllSandboxes);

const createTestWad = () => {
  const content = new TextEncoder().encode("hello");
  const descriptorOffset = 12 + content.length;
  const bytes = new Uint8Array(descriptorOffset + 3 * 16);
  const view = new DataView(bytes.buffer);
  const writeName = (offset: number, name: string) => {
    bytes.set(new TextEncoder().encode(name), offset);
  };

  writeName(0, "PWAD");
  view.setUint32(4, 3, true);
  view.setUint32(8, descriptorOffset, true);
  bytes.set(content, 12);

  writeName(descriptorOffset + 8, "AA_START");
  view.setUint32(descriptorOffset + 16, 12, true);
  view.setUint32(descriptorOffset + 20, content.length, true);
  writeName(descriptorOffset + 24, "HELLO");
  writeName(descriptorOffset + 40, "AA_END");

  return new File([bytes], "sample.wad", {
    type: "application/octet-stream",
  });
};

const createSandbox = async () => {
  const response = await app.request("/api/redis/sandbox", {method: "POST"});
  expect(response.status).toBe(200);
  return (await response.json()) as {id: string};
};

describe("WAD routes", () => {
  test("uploads, browses, reads, and downloads a WAD", async () => {
    const sandbox = await createSandbox();
    const form = new FormData();
    form.set("file", createTestWad());

    const uploadResponse = await app.request(
      `/api/wad/${sandbox.id}/wads`,
      {method: "POST", body: form},
    );
    const wad = (await uploadResponse.json()) as {
      id: string;
      magic: string;
      descriptorCount: number;
    };

    expect(uploadResponse.status).toBe(201);
    expect(wad).toMatchObject({magic: "PWAD", descriptorCount: 3});

    const root = await (
      await app.request(`/api/wad/${sandbox.id}/wads/${wad.id}/list`)
    ).json();
    expect(root).toMatchObject({
      path: "/",
      entries: [{kind: "namespace", name: "AA", path: "/AA"}],
    });

    const directory = await (
      await app.request(
        `/api/wad/${sandbox.id}/wads/${wad.id}/list?path=%2FAA`,
      )
    ).json();
    expect(directory).toMatchObject({
      path: "/AA",
      entries: [{kind: "content", name: "HELLO", sizeBytes: 5}],
    });

    const contentResponse = await app.request(
      `/api/wad/${sandbox.id}/wads/${wad.id}/content?path=%2FAA%2FHELLO`,
    );
    expect(await contentResponse.text()).toBe("hello");

    const downloadResponse = await app.request(
      `/api/wad/${sandbox.id}/wads/${wad.id}/download`,
    );
    expect((await downloadResponse.text()).slice(0, 4)).toBe("PWAD");
  });

  test("rejects an invalid WAD and does not retain it", async () => {
    const sandbox = await createSandbox();
    const form = new FormData();
    form.set("file", new File(["not a wad"], "invalid.wad"));

    const response = await app.request(`/api/wad/${sandbox.id}/wads`, {
      method: "POST",
      body: form,
    });
    expect(response.status).toBe(400);

    const list = await (
      await app.request(`/api/wad/${sandbox.id}/wads`)
    ).json();
    expect(list).toEqual({wads: []});
  });
});
