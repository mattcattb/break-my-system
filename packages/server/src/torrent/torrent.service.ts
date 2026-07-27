import {appEnv} from "../common/env";
import {
  describeTorrentObservationError,
  fetchTorrentSnapshot,
  fetchTrackerSnapshot,
} from "./torrent.client";

const observationLatency = (startedAt: number) =>
  Math.round((performance.now() - startedAt) * 100) / 100;

const observeTracker = async (url: string | undefined) => {
  const startedAt = performance.now();
  if (!url) {
    return {
      id: "tracker",
      label: "BMS Tracker",
      status: "offline" as const,
      latencyMs: 0,
      error: "status endpoint not configured",
    };
  }

  try {
    const snapshot = await fetchTrackerSnapshot(url);

    return {
      id: "tracker",
      label: "BMS Tracker",
      status: "online" as const,
      latencyMs: observationLatency(startedAt),
      snapshot,
    };
  } catch (error) {
    return {
      id: "tracker",
      label: "BMS Tracker",
      status: "offline" as const,
      latencyMs: observationLatency(startedAt),
      error: describeTorrentObservationError(error),
    };
  }
};

const observeClient = async ({
  id,
  label,
  role,
  url,
}: {
  id: string;
  label: string;
  role: "seeder" | "learner";
  url: string | undefined;
}) => {
  const startedAt = performance.now();
  if (!url) {
    return {
      id,
      label,
      role,
      status: "offline" as const,
      latencyMs: 0,
      error: "status endpoint not configured",
    };
  }

  try {
    const snapshot = await fetchTorrentSnapshot(url);

    return {
      id,
      label,
      role,
      status: "online" as const,
      latencyMs: observationLatency(startedAt),
      snapshot,
    };
  } catch (error) {
    return {
      id,
      label,
      role,
      status: "offline" as const,
      latencyMs: observationLatency(startedAt),
      error: describeTorrentObservationError(error),
    };
  }
};

export const observeTorrentLab = async () => {
  const [tracker, ...clients] = await Promise.all([
    observeTracker(appEnv.TORRENT_TRACKER_STATUS_URL),
    observeClient({
      id: "seeder",
      label: "Official Seeder",
      role: "seeder",
      url: appEnv.TORRENT_SEED_STATUS_URL,
    }),
    observeClient({
      id: "learner-1",
      label: "Learner Alpha",
      role: "learner",
      url: appEnv.TORRENT_LEARNER_1_STATUS_URL,
    }),
    observeClient({
      id: "learner-2",
      label: "Learner Beta",
      role: "learner",
      url: appEnv.TORRENT_LEARNER_2_STATUS_URL,
    }),
  ]);

  return {
    observedAt: new Date().toISOString(),
    tracker,
    clients,
  };
};
