import {afterEach, describe, expect, test} from "bun:test";
import {app} from "../app";
import {closeWadWorkspace, createWadWorkspace} from "./wad.workspace";

const workspaces = new Set<ReturnType<typeof createWadWorkspace>>();
afterEach(async () => {
  await Promise.all([...workspaces].map(closeWadWorkspace));
  workspaces.clear();
});

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

const createWorkspace = async () => {
  const workspace = createWadWorkspace();
  workspaces.add(workspace);
  return workspace;
};

describe("WAD routes", () => {
  test("uploads, browses, reads, and downloads a WAD", async () => {
    const workspace = await createWorkspace();
    const form = new FormData();
    form.set("file", createTestWad());

    const uploadResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads`,
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
      await app.request(`/api/wad/workspaces/${workspace.id}/wads/${wad.id}/list`)
    ).json();
    expect(root).toMatchObject({
      path: "/",
      entries: [{kind: "namespace", name: "AA", path: "/AA"}],
    });

    const directory = await (
      await app.request(
        `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/list?path=%2FAA`,
      )
    ).json();
    expect(directory).toMatchObject({
      path: "/AA",
      entries: [{kind: "content", name: "HELLO", sizeBytes: 5}],
    });

    const contentResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/content?path=%2FAA%2FHELLO`,
    );
    expect(await contentResponse.text()).toBe("hello");

    const rangeResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/bytes?path=%2FAA%2FHELLO&offset=1&length=3`,
    );
    expect(await rangeResponse.text()).toBe("ell");

    const downloadResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/download`,
    );
    expect((await downloadResponse.text()).slice(0, 4)).toBe("PWAD");
  });

  test("rejects an invalid WAD and does not retain it", async () => {
    const workspace = await createWorkspace();
    const form = new FormData();
    form.set("file", new File(["not a wad"], "invalid.wad"));

    const response = await app.request(`/api/wad/workspaces/${workspace.id}/wads`, {
      method: "POST",
      body: form,
    });
    expect(response.status).toBe(400);

    const list = await (
      await app.request(`/api/wad/workspaces/${workspace.id}/wads`)
    ).json();
    expect(list).toEqual({wads: []});
  });

  test("creates namespaces and items, then resets the working WAD", async () => {
    const workspace = await createWorkspace();
    const upload = new FormData();
    upload.set("file", createTestWad());
    const wad = (await (
      await app.request(`/api/wad/workspaces/${workspace.id}/wads`, {
        method: "POST",
        body: upload,
      })
    ).json()) as {id: string};

    const namespaceResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/namespaces`,
      {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({path: "/TX"}),
      },
    );
    expect(namespaceResponse.status).toBe(201);

    const item = new FormData();
    item.set("path", "/TX/README");
    item.set("file", new File(["hello mod"], "README"));
    const itemResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/items`,
      {method: "POST", body: item},
    );
    expect(itemResponse.status).toBe(201);

    const contentResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/content?path=%2FTX%2FREADME`,
    );
    expect(await contentResponse.text()).toBe("hello mod");

    const modified = await (
      await app.request(`/api/wad/workspaces/${workspace.id}/wads/${wad.id}`)
    ).json();
    expect(modified).toMatchObject({modified: true});

    const resetResponse = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/reset`,
      {method: "POST"},
    );
    expect(resetResponse.status).toBe(200);
    expect(await resetResponse.json()).toMatchObject({modified: false});

    const root = await (
      await app.request(`/api/wad/workspaces/${workspace.id}/wads/${wad.id}/list`)
    ).json();
    expect(root).toMatchObject({
      entries: [{kind: "namespace", name: "AA", path: "/AA"}],
    });
  });

  test("leaves the working WAD unchanged when a mutation is rejected", async () => {
    const workspace = await createWorkspace();
    const upload = new FormData();
    upload.set("file", createTestWad());
    const wad = (await (
      await app.request(`/api/wad/workspaces/${workspace.id}/wads`, {
        method: "POST",
        body: upload,
      })
    ).json()) as {id: string};
    const downloadUrl = `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/download`;
    const before = new Uint8Array(await (await app.request(downloadUrl)).arrayBuffer());

    const response = await app.request(
      `/api/wad/workspaces/${workspace.id}/wads/${wad.id}/namespaces`,
      {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({path: "/TOOLONG"}),
      },
    );
    expect(response.status).toBe(400);

    const after = new Uint8Array(await (await app.request(downloadUrl)).arrayBuffer());
    expect(after).toEqual(before);
  });
});
