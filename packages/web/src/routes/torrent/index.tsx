import {useQuery} from "@tanstack/react-query";
import {createFileRoute} from "@tanstack/react-router";
import {parseResponse} from "hono/client";
import {
  Check,
  Download,
  HardDrive,
  Info,
  Minus,
  Network,
  Plus,
  Radio,
  RotateCcw,
  Server,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useRef,
  useState,
} from "react";
import {cn} from "../../lib/cn";
import {AppHeader} from "../../components/common/SystemShell";
import {rpcClient} from "../../lib/rpc.client";

export const Route = createFileRoute("/torrent/")({
  component: TorrentExperienceLab,
});

const stages = [
  {
    name: "Connect the observer",
    description:
      "The BMS API is polling private read-only endpoints on each Go process.",
  },
  {
    name: "Find the processes",
    description:
      "The tracker and torrent clients report their independently owned state.",
  },
  {
    name: "Observe tracker announces",
    description:
      "Announce the info hash. The tracker introduces the client to peers in this swarm.",
  },
  {
    name: "Observe piece transfer",
    description:
      "Learners request blocks from connected peers and verify completed pieces before storing them.",
  },
  {
    name: "Swarm complete",
    description:
      "Both learners have every verified piece and remain available to upload.",
  },
] as const;

type NodeId = "tracker" | "atlas" | "client" | "beacon";

const nodeDescriptions = {
  tracker: {
    title: "BMS Tracker",
    kind: "Discovery service",
    description:
      "The tracker knows which peers announced this info hash. It introduces peers, but artifact bytes never pass through it.",
  },
  atlas: {
    title: "Official Seeder",
    kind: "Official peer",
    description:
      "This managed peer begins with every verified piece and serves requested blocks from its own storage.",
  },
  client: {
    title: "Learner Alpha",
    kind: "Learner peer",
    description:
      "Alpha downloaded the artifact and can upload its verified pieces to other peers in the swarm.",
  },
  beacon: {
    title: "Learner Beta",
    kind: "Learner peer",
    description:
      "Beta is an independent torrent client with its own peer identity, piece store, and protocol connections.",
  },
} as const;

const pieceProgress = (
  snapshot:
    | {
        completePieces: number;
        totalPieces: number;
      }
    | undefined,
) =>
  snapshot?.totalPieces
    ? Math.round((snapshot.completePieces / snapshot.totalPieces) * 100)
    : 0;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
};

const shortID = (value: string | undefined) =>
  value ? `${value.slice(0, 6)}…${value.slice(-6)}` : "Unavailable";

function TorrentExperienceLab() {
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [view, setView] = useState({x: 0, y: 0, scale: 1});
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const lab = useQuery({
    queryKey: ["torrent-lab"],
    queryFn: () => parseResponse(rpcClient.api.torrent.lab.$get()),
    refetchInterval: 1_000,
    retry: false,
  });
  const tracker = lab.data?.tracker;
  const trackerSnapshot =
    tracker?.status === "online" ? tracker.snapshot : undefined;
  const trackerOnline = Boolean(trackerSnapshot);
  const trackerSwarm = trackerSnapshot?.swarms[0];
  const seeder = lab.data?.clients.find((client) => client.id === "seeder");
  const learnerAlpha = lab.data?.clients.find(
    (client) => client.id === "learner-1",
  );
  const learnerBeta = lab.data?.clients.find(
    (client) => client.id === "learner-2",
  );
  const seederTorrent =
    seeder?.status === "online" ? seeder.snapshot.torrent : undefined;
  const alphaTorrent =
    learnerAlpha?.status === "online"
      ? learnerAlpha.snapshot.torrent
      : undefined;
  const betaTorrent =
    learnerBeta?.status === "online"
      ? learnerBeta.snapshot.torrent
      : undefined;
  const seederPeerId =
    seeder?.status === "online" ? seeder.snapshot.peerId : undefined;
  const alphaPeerId =
    learnerAlpha?.status === "online"
      ? learnerAlpha.snapshot.peerId
      : undefined;
  const betaPeerId =
    learnerBeta?.status === "online"
      ? learnerBeta.snapshot.peerId
      : undefined;
  const seederAlphaConnected = Boolean(
    seederPeerId &&
      alphaPeerId &&
      (seederTorrent?.peers.some((peer) => peer.peerId === alphaPeerId) ||
        alphaTorrent?.peers.some((peer) => peer.peerId === seederPeerId)),
  );
  const seederBetaConnected = Boolean(
    seederPeerId &&
      betaPeerId &&
      (seederTorrent?.peers.some((peer) => peer.peerId === betaPeerId) ||
        betaTorrent?.peers.some((peer) => peer.peerId === seederPeerId)),
  );
  const learnersConnected = Boolean(
    alphaPeerId &&
      betaPeerId &&
      (alphaTorrent?.peers.some((peer) => peer.peerId === betaPeerId) ||
        betaTorrent?.peers.some((peer) => peer.peerId === alphaPeerId)),
  );
  const alphaProgress = pieceProgress(alphaTorrent);
  const betaProgress = pieceProgress(betaTorrent);
  const alphaTransferring = (alphaTorrent?.bytesLeft ?? 0) > 0;
  const betaTransferring = (betaTorrent?.bytesLeft ?? 0) > 0;
  const transferring =
    alphaTransferring || betaTransferring;
  const complete =
    alphaTorrent?.bytesLeft === 0 && betaTorrent?.bytesLeft === 0;
  const hasOfflineNode = Boolean(
    lab.data &&
      (!trackerOnline ||
        seeder?.status === "offline" ||
        learnerAlpha?.status === "offline" ||
        learnerBeta?.status === "offline"),
  );
  const stage = !lab.data
    ? 0
    : !trackerOnline
      ? 1
      : !trackerSwarm?.peers.length
        ? 2
        : transferring
          ? 4
          : complete
            ? stages.length
            : 3;
  const currentStage = stages[Math.min(stage, stages.length - 1)];
  const connectedPeers = alphaTorrent?.peers.length ?? 0;
  const downloaded = formatBytes(alphaTorrent?.downloadedBytes ?? 0);
  const uploaded = formatBytes(alphaTorrent?.uploadedBytes ?? 0);
  const onlineNodeCount =
    Number(trackerOnline) +
    [seeder, learnerAlpha, learnerBeta].filter(
      (node) => node?.status === "online",
    ).length;
  const torrentRows = (
    peerId: string | undefined,
    snapshot: typeof alphaTorrent,
  ) =>
    snapshot
      ? [
          ["Peer ID", shortID(peerId)],
          [
            "Verified",
            `${snapshot.completePieces} / ${snapshot.totalPieces} pieces`,
          ],
          ["Connections", String(snapshot.peers.length)],
          ["Downloaded", formatBytes(snapshot.downloadedBytes)],
          ["Uploaded", formatBytes(snapshot.uploadedBytes)],
          ["Pending requests", String(snapshot.pendingRequests)],
        ]
      : [["Status", "Unavailable"]];
  const inspectorRows =
    selectedNode === "tracker"
      ? trackerOnline
        ? [
            ["Info hash", shortID(trackerSwarm?.infoHash)],
            ["Known peers", String(trackerSwarm?.peers.length ?? 0)],
            [
              "Announce interval",
              `${trackerSnapshot?.intervalSeconds ?? 0}s`,
            ],
            ["Artifact traffic", "None"],
          ]
        : [["Status", "Unavailable"]]
      : selectedNode === "atlas"
        ? torrentRows(seederPeerId, seederTorrent)
        : selectedNode === "client"
          ? torrentRows(alphaPeerId, alphaTorrent)
          : torrentRows(betaPeerId, betaTorrent);

  function zoomBy(amount: number) {
    setView((current) => ({
      ...current,
      scale: Math.min(1.6, Math.max(0.65, current.scale + amount)),
    }));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setView((current) => ({
      ...current,
      x: drag.current!.originX + event.clientX - drag.current!.startX,
      y: drag.current!.originY + event.clientY - drag.current!.startY,
    }));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleWheel(event: ReactWheelEvent<HTMLElement>) {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -0.08 : 0.08);
  }

  return (
    <div className="system-interface flex h-screen min-h-[640px] flex-col overflow-hidden bg-background text-foreground">
      <AppHeader
        currentSystem="torrent"
        trailing={<div className="flex shrink-0 items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              onlineNodeCount === 4
                ? "bg-success"
                : lab.isError
                  ? "bg-destructive"
                  : "bg-warning",
            )}
          />
          <span className="hidden sm:inline">Live API · </span>
          {lab.isError ? "Unavailable" : `${onlineNodeCount} / 4 online`}
        </div>}
      />

      <main
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        style={{
          touchAction: "none",
          backgroundImage:
            "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-label="Interactive torrent swarm map"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[650px] w-[1000px]"
          style={{
            marginLeft: -500,
            marginTop: -325,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "500px 325px",
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            viewBox="0 0 1000 650"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="arrow-muted"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill="hsl(var(--muted-foreground))"
                />
              </marker>
              <marker
                id="arrow-primary"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill="hsl(var(--primary))"
                />
              </marker>
            </defs>

            <path
              d="M 500 115 C 420 155, 300 170, 215 238"
              className={cn(
                "fill-none stroke-muted-foreground stroke-1 [stroke-dasharray:5_7] transition-opacity",
                trackerOnline && seeder?.status === "online"
                  ? "opacity-45"
                  : "opacity-10",
              )}
              markerEnd="url(#arrow-muted)"
            />
            <path
              d="M 500 115 C 530 170, 690 150, 785 205"
              className={cn(
                "fill-none stroke-muted-foreground stroke-1 [stroke-dasharray:5_7] transition-opacity",
                trackerOnline && learnerBeta?.status === "online"
                  ? "opacity-45"
                  : "opacity-10",
              )}
              markerEnd="url(#arrow-muted)"
            />
            <path
              d="M 500 115 C 500 180, 505 245, 505 300"
              className={cn(
                "fill-none stroke-muted-foreground stroke-1 [stroke-dasharray:5_7] transition-opacity",
                trackerOnline && learnerAlpha?.status === "online"
                  ? "opacity-45"
                  : "opacity-10",
              )}
              markerEnd="url(#arrow-muted)"
            />

            <path
              id="atlas-transfer"
              d="M 280 290 C 340 295, 390 325, 430 345"
              className={cn(
                "fill-none stroke-primary stroke-2 transition-opacity",
                seederAlphaConnected ? "opacity-60" : "opacity-10",
              )}
              markerEnd="url(#arrow-primary)"
            />
            <path
              id="seeder-beta-transfer"
              d="M 280 255 C 420 180, 600 185, 720 230"
              className={cn(
                "fill-none stroke-primary stroke-2 transition-opacity",
                seederBetaConnected ? "opacity-60" : "opacity-10",
              )}
              markerEnd="url(#arrow-primary)"
            />
            <path
              id="learner-transfer"
              d="M 575 345 C 635 315, 675 285, 720 255"
              className={cn(
                "fill-none stroke-primary stroke-2 transition-opacity",
                learnersConnected ? "opacity-60" : "opacity-10",
              )}
              markerEnd="url(#arrow-primary)"
            />

            {alphaTransferring && seederAlphaConnected && (
              <circle r="5" fill="hsl(var(--primary))">
                <animateMotion dur="1.8s" repeatCount="indefinite">
                  <mpath href="#atlas-transfer" />
                </animateMotion>
              </circle>
            )}
            {betaTransferring && seederBetaConnected && (
              <circle r="5" fill="hsl(var(--primary))">
                <animateMotion dur="1.35s" repeatCount="indefinite">
                  <mpath href="#seeder-beta-transfer" />
                </animateMotion>
              </circle>
            )}
            {betaTransferring && learnersConnected && (
              <circle r="5" fill="hsl(var(--primary))">
                <animateMotion dur="1.7s" repeatCount="indefinite">
                  <mpath href="#learner-transfer" />
                </animateMotion>
              </circle>
            )}
          </svg>

          <GraphNode
            id="tracker"
            icon={trackerOnline ? Radio : WifiOff}
            label="BMS Tracker"
            eyebrow="Discovery"
            status={
              trackerOnline
                ? `${trackerSwarm?.peers.length ?? 0} announced peers`
                : tracker?.status === "offline"
                  ? tracker.error
                  : "Waiting for API"
            }
            active={trackerOnline}
            warning={Boolean(lab.data && !trackerOnline)}
            selected={selectedNode === "tracker"}
            className="left-[415px] top-[40px]"
            onSelect={setSelectedNode}
          />
          <GraphNode
            id="atlas"
            icon={seederTorrent ? Server : WifiOff}
            label="Official Seeder"
            eyebrow="Official peer"
            status={
              seederTorrent
                ? `${seederTorrent.completePieces} / ${seederTorrent.totalPieces} pieces · ${formatBytes(seederTorrent.uploadedBytes)} up`
                : seeder?.status === "offline"
                  ? seeder.error
                  : "Waiting for API"
            }
            progress={pieceProgress(seederTorrent)}
            active={Boolean(seederTorrent)}
            warning={Boolean(seeder && !seederTorrent)}
            selected={selectedNode === "atlas"}
            className="left-[110px] top-[230px]"
            onSelect={setSelectedNode}
          />
          <GraphNode
            id="client"
            icon={alphaTorrent ? HardDrive : WifiOff}
            label="Learner Alpha"
            eyebrow={
              alphaTorrent?.bytesLeft === 0 ? "Seeder" : "Learner peer"
            }
            status={
              alphaTorrent
                ? `${alphaTorrent.completePieces} / ${alphaTorrent.totalPieces} pieces · ${downloaded} down`
                : learnerAlpha?.status === "offline"
                  ? learnerAlpha.error
                  : "Waiting for API"
            }
            progress={alphaProgress}
            active={Boolean(alphaTorrent)}
            warning={Boolean(learnerAlpha && !alphaTorrent)}
            primary
            selected={selectedNode === "client"}
            className="left-[410px] top-[290px]"
            onSelect={setSelectedNode}
          />
          <GraphNode
            id="beacon"
            icon={betaTorrent ? HardDrive : WifiOff}
            label="Learner Beta"
            eyebrow={betaTorrent?.bytesLeft === 0 ? "Seeder" : "Learner peer"}
            status={
              betaTorrent
                ? `${betaTorrent.completePieces} / ${betaTorrent.totalPieces} pieces · ${formatBytes(betaTorrent.downloadedBytes)} down`
                : learnerBeta?.status === "offline"
                  ? learnerBeta.error
                  : "Waiting for API"
            }
            progress={betaProgress}
            active={Boolean(betaTorrent)}
            warning={Boolean(learnerBeta && !betaTorrent)}
            selected={selectedNode === "beacon"}
            className="left-[720px] top-[190px]"
            onSelect={setSelectedNode}
          />

          {trackerSwarm && (
            <>
              <EdgeLabel className="left-[275px] top-[145px]">
                peer list
              </EdgeLabel>
              <EdgeLabel className="left-[650px] top-[135px]">
                peer list
              </EdgeLabel>
            </>
          )}
          {(seederAlphaConnected ||
            seederBetaConnected ||
            learnersConnected) && (
            <>
              {seederAlphaConnected && (
                <EdgeLabel className="left-[320px] top-[300px]">
                  peer connection
                </EdgeLabel>
              )}
              {learnersConnected && (
                <EdgeLabel className="left-[630px] top-[290px]">
                  peer connection
                </EdgeLabel>
              )}
            </>
          )}
        </div>

        <section className="pointer-events-auto absolute left-3 top-3 w-[min(20rem,calc(100%-1.5rem))] border border-border bg-surface/95 shadow-2xl backdrop-blur sm:left-4 sm:top-4">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
              Live observation · Stage {Math.min(stage + 1, stages.length)} of{" "}
              {stages.length}
            </p>
            <div className="flex gap-1">
              {stages.map((item, index) => (
                <span
                  key={item.name}
                  className={cn(
                    "h-1 w-4",
                    stage > index
                      ? "bg-success"
                      : stage === index
                        ? "bg-primary"
                        : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="p-3">
            <h2 className="text-base font-semibold">
              {lab.isError
                ? "Observer unavailable"
                : hasOfflineNode
                  ? "A swarm node is offline"
                  : complete
                    ? "The swarm is complete"
                    : currentStage.name}
            </h2>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              {lab.isError
                ? "The web application could not reach the BMS API. The Go processes may still be running."
                : hasOfflineNode
                  ? "Healthy nodes remain visible while the unavailable process is marked independently. Tracker peers expire after their announce TTL."
                  : complete
                    ? "Both learners verified all 20 pieces. Their upload counters show when they subsequently served another peer."
                    : currentStage.description}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void lab.refetch()}
                disabled={lab.isFetching}
                className="flex min-h-9 flex-1 items-center justify-between bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:brightness-110"
              >
                {lab.isFetching ? "Observing…" : "Refresh snapshot"}
                <RotateCcw
                  className={cn("size-3.5", lab.isFetching && "animate-spin")}
                />
              </button>
            </div>
          </div>
        </section>

        <div className="pointer-events-auto absolute right-3 top-3 hidden border border-border bg-surface/95 sm:right-4 sm:top-4 sm:flex">
          <button
            type="button"
            onClick={() => zoomBy(-0.12)}
            className="icon-button border-0 border-r border-border"
            aria-label="Zoom out"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="flex min-w-12 items-center justify-center border-r border-border font-mono text-[8px] text-muted-foreground">
            {Math.round(view.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(0.12)}
            className="icon-button border-0 border-r border-border"
            aria-label="Zoom in"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView({x: 0, y: 0, scale: 1})}
            className="icon-button border-0"
            aria-label="Center graph"
          >
            <Network className="size-3.5" />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-16 left-3 hidden items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground sm:flex">
          <Info className="size-3" />
          Drag empty space to pan · Scroll to zoom · Select a node to inspect
        </div>

        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            rows={inspectorRows}
            onClose={() => setSelectedNode(null)}
          />
        )}

        <section className="pointer-events-auto absolute inset-x-0 bottom-0 grid h-14 grid-cols-4 divide-x divide-border border-t border-border bg-surface/95 backdrop-blur">
          <StatusMetric
            icon={Download}
            label="Downloaded"
            value={downloaded}
          />
          <StatusMetric icon={Upload} label="Uploaded" value={uploaded} />
          <StatusMetric
            icon={Network}
            label="Peers"
            value={String(connectedPeers)}
          />
          <StatusMetric
            icon={Check}
            label="Verified"
            value={`${alphaTorrent?.completePieces ?? 0} / ${alphaTorrent?.totalPieces ?? 0}`}
          />
        </section>
      </main>
    </div>
  );
}

function GraphNode({
  id,
  icon: Icon,
  label,
  eyebrow,
  status,
  progress,
  active,
  warning = false,
  primary = false,
  selected,
  className,
  onSelect,
}: {
  id: NodeId;
  icon: typeof Server;
  label: string;
  eyebrow: string;
  status: string;
  progress?: number;
  active: boolean;
  warning?: boolean;
  primary?: boolean;
  selected: boolean;
  className: string;
  onSelect: (node: NodeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
      }}
      className={cn(
        "absolute w-[170px] border bg-surface p-3 text-left shadow-xl transition-[opacity,border-color,transform] hover:-translate-y-0.5",
        active ? "opacity-100" : "border-dashed opacity-40",
        primary && active
          ? "border-primary shadow-[0_0_32px_hsl(var(--primary)/0.09)]"
          : "border-border",
        warning && "border-warning bg-warning/5 opacity-100",
        selected && "ring-1 ring-primary",
        className,
      )}
      aria-label={`Inspect ${label}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center border",
            warning
              ? "border-warning/40 bg-warning/10 text-warning"
              : active
                ? "border-primary/35 bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-mono text-[7px] uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </span>
          <span className="mt-1 block truncate text-[11px] font-semibold">
            {label}
          </span>
        </span>
      </div>
      <span
        className={cn(
          "mt-3 flex items-center gap-1.5 font-mono text-[8px]",
          warning
            ? "text-warning"
            : active
              ? "text-foreground/75"
              : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            warning
              ? "bg-warning"
              : active
                ? "bg-success"
                : "bg-muted-foreground",
          )}
        />
        {status}
      </span>
      {progress !== undefined && (
        <span className="mt-2 block h-1 overflow-hidden bg-muted">
          <span
            className="block h-full bg-primary transition-[width]"
            style={{width: `${progress}%`}}
          />
        </span>
      )}
    </button>
  );
}

function EdgeLabel({
  className,
  children,
}: {
  className: string;
  children: string;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bg-background/80 px-1.5 py-1 font-mono text-[7px] uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function NodeInspector({
  node,
  rows,
  onClose,
}: {
  node: NodeId;
  rows: string[][];
  onClose: () => void;
}) {
  const details = nodeDescriptions[node];

  return (
    <aside className="pointer-events-auto absolute bottom-[4.5rem] left-3 right-3 border border-border bg-surface/95 shadow-2xl backdrop-blur sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 sm:w-72">
      <div className="flex items-start justify-between border-b border-border px-3 py-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-primary">
            {details.kind}
          </p>
          <h2 className="mt-1 text-sm font-semibold">{details.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-button size-7"
          aria-label="Close node inspector"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="border-b border-border px-3 py-3 text-[10px] leading-5 text-muted-foreground">
        {details.description}
      </p>
      <dl className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5 text-[10px]"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono text-[9px]">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function StatusMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Network;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2 px-2 sm:justify-start sm:px-4">
      <Icon className="hidden size-3.5 shrink-0 text-primary sm:block" />
      <div className="min-w-0">
        <p className="truncate font-mono text-[7px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate font-mono text-[8px] sm:text-[9px]">
          {value}
        </p>
      </div>
    </div>
  );
}
