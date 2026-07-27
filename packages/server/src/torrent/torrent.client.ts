import {z} from "zod";

const trackerSnapshotSchema = z.object({
  intervalSeconds: z.number().int().nonnegative(),
  peerTtlSeconds: z.number().int().nonnegative(),
  swarms: z.array(
    z.object({
      infoHash: z.string().regex(/^[0-9a-f]{40}$/),
      peers: z.array(
        z.object({
          peerId: z.string().regex(/^[0-9a-f]{40}$/),
          address: z.string().min(1),
          lastSeen: z.string().datetime({offset: true}),
          bytesLeft: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});

const torrentSnapshotSchema = z.object({
  peerId: z.string().regex(/^[0-9a-f]{40}$/),
  torrent: z.object({
    infoHash: z.string().regex(/^[0-9a-f]{40}$/),
    name: z.string().min(1),
    tracker: z.string().url(),
    trackerId: z.string().optional(),
    totalBytes: z.number().int().nonnegative(),
    pieceLength: z.number().int().positive(),
    totalPieces: z.number().int().nonnegative(),
    completePieces: z.number().int().nonnegative(),
    bytesLeft: z.number().int().nonnegative(),
    downloadedBytes: z.number().int().nonnegative(),
    uploadedBytes: z.number().int().nonnegative(),
    pendingRequests: z.number().int().nonnegative(),
    peers: z.array(
      z.object({
        peerId: z.string().regex(/^[0-9a-f]{40}$/),
        address: z.string(),
        incoming: z.boolean(),
        amChoking: z.boolean(),
        amInterested: z.boolean(),
        peerChoking: z.boolean(),
        peerInterested: z.boolean(),
        availablePieces: z.number().int().nonnegative(),
        pendingRequests: z.number().int().nonnegative(),
      }),
    ),
  }),
});

const fetchJson = async (url: string) => {
  const response = await fetch(url, {
    headers: {accept: "application/json"},
    signal: AbortSignal.timeout(1_000),
  });
  if (!response.ok) {
    throw new Error(`status endpoint returned HTTP ${response.status}`);
  }
  return response.json();
};

export const fetchTrackerSnapshot = async (url: string) =>
  trackerSnapshotSchema.parse(await fetchJson(url));

export const fetchTorrentSnapshot = async (url: string) =>
  torrentSnapshotSchema.parse(await fetchJson(url));

export const describeTorrentObservationError = (error: unknown) => {
  if (error instanceof z.ZodError) return "invalid snapshot";
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "request timed out";
  }
  if (error instanceof Error && error.message.startsWith("status endpoint")) {
    return error.message;
  }
  return "status endpoint unavailable";
};
