import {describe, expect, spyOn, test} from "bun:test";
import {app} from "../app";

const infoHash = "a".repeat(40);
const peerIds = ["1".repeat(40), "2".repeat(40), "3".repeat(40)];

const trackerSnapshot = {
  intervalSeconds: 1,
  peerTtlSeconds: 3,
  swarms: [
    {
      infoHash,
      peers: peerIds.map((peerId, index) => ({
        peerId,
        address: `192.0.2.${index + 1}:6881`,
        lastSeen: "2026-07-26T19:26:42.358Z",
        bytesLeft: 0,
      })),
    },
  ],
};

const clientSnapshot = (
  peerId: string,
  downloadedBytes: number,
  state: "downloading" | "seeding" | "paused" = "seeding",
) => ({
  peerId,
  torrent: {
    state,
    infoHash,
    name: "lesson-payload-v1.bin",
    tracker: "http://tracker:6969/announce",
    totalBytes: 5_242_880,
    pieceLength: 262_144,
    totalPieces: 20,
    completePieces: 20,
    bytesLeft: 0,
    downloadedBytes,
    uploadedBytes: 0,
    pendingRequests: 0,
    peers: [],
  },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json"},
  });

describe("torrent lab observation route", () => {
  test("aggregates tracker and client snapshots", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      ((input: string | Request | URL) => {
        const url = String(input);
        if (url.includes(":18080/")) {
          return Promise.resolve(jsonResponse(trackerSnapshot));
        }
        const peerIndex = url.includes(":18081/")
          ? 0
          : url.includes(":18082/")
            ? 1
            : 2;
        return Promise.resolve(
          jsonResponse(
            clientSnapshot(
              peerIds[peerIndex],
              peerIndex === 0 ? 0 : 5_242_880,
              peerIndex === 2 ? "paused" : "seeding",
            ),
          ),
        );
      }) as typeof fetch,
    );

    try {
      const response = await app.request("/api/torrent/lab");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
      expect(body).toMatchObject({
        tracker: {
          id: "tracker",
          status: "online",
          snapshot: {swarms: [{infoHash}]},
        },
        clients: [
          {
            id: "seeder",
            role: "seeder",
            status: "online",
            snapshot: {torrent: {state: "seeding"}},
          },
          {
            id: "learner-1",
            role: "learner",
            status: "online",
            snapshot: {torrent: {state: "seeding"}},
          },
          {
            id: "learner-2",
            role: "learner",
            status: "online",
            snapshot: {torrent: {state: "paused"}},
          },
        ],
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("keeps healthy observations when other nodes fail", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      ((input: string | Request | URL) => {
        const url = String(input);
        if (url.includes(":18080/")) {
          return Promise.resolve(jsonResponse(trackerSnapshot));
        }
        if (url.includes(":18082/")) {
          return Promise.resolve(jsonResponse({unexpected: true}));
        }
        if (url.includes(":18083/")) {
          return Promise.resolve(jsonResponse({message: "offline"}, 503));
        }
        return Promise.resolve(jsonResponse(clientSnapshot(peerIds[0], 0)));
      }) as typeof fetch,
    );

    try {
      const response = await app.request("/api/torrent/lab");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        tracker: {status: "online"},
        clients: [
          {id: "seeder", status: "online"},
          {id: "learner-1", status: "offline", error: "invalid snapshot"},
          {
            id: "learner-2",
            status: "offline",
            error: "status endpoint returned HTTP 503",
          },
        ],
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
