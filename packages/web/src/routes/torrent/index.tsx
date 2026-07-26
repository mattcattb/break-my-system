import {createFileRoute, Link} from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
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

export const Route = createFileRoute("/torrent/")({
  component: TorrentExperienceLab,
});

const stages = [
  {
    name: "Create your client",
    description:
      "Give this workspace a peer identity and an empty piece store.",
    action: "Create Client Alpha",
  },
  {
    name: "Load the lesson torrent",
    description:
      "The metadata identifies the artifact and its pieces, but contains none of the artifact bytes.",
    action: "Load metadata",
  },
  {
    name: "Ask the tracker",
    description:
      "Announce the info hash. The tracker introduces the client to peers in this swarm.",
    action: "Discover peers",
  },
  {
    name: "Transfer the pieces",
    description:
      "Client Alpha requests blocks from both seeders and verifies each completed piece.",
    action: "Start transfer",
  },
  {
    name: "Join the seeders",
    description:
      "Once every piece is verified, Client Alpha can upload the artifact to a new learner.",
    action: "Verify and seed",
  },
] as const;

type NodeId = "tracker" | "atlas" | "client" | "beacon" | "learner";

const nodeDescriptions = {
  tracker: {
    title: "BMS Tracker",
    kind: "Discovery service",
    description:
      "The tracker knows which peers announced this info hash. It introduces peers, but artifact bytes never pass through it.",
  },
  atlas: {
    title: "Seeder Atlas",
    kind: "Official peer",
    description:
      "Atlas has every verified piece and serves requested blocks from its own storage.",
  },
  client: {
    title: "Client Alpha",
    kind: "Your workspace peer",
    description:
      "This is the client you control. Its role changes from empty peer, to leecher, to seeder as the lesson progresses.",
  },
  beacon: {
    title: "Seeder Beacon",
    kind: "Official peer",
    description:
      "Beacon is a second independent source. The client can continue when Atlas disconnects.",
  },
  learner: {
    title: "Client Nova",
    kind: "Later learner",
    description:
      "Nova demonstrates the final transition: your completed client is now useful to another member of the swarm.",
  },
} as const;

function TorrentExperienceLab() {
  const [stage, setStage] = useState(0);
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [atlasOffline, setAtlasOffline] = useState(false);
  const [view, setView] = useState({x: 0, y: 0, scale: 1});
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const complete = stage === stages.length;
  const currentStage = stages[Math.min(stage, stages.length - 1)];
  const progress = stage < 4 ? 0 : complete ? 100 : atlasOffline ? 52 : 68;
  const connectedPeers = stage >= 3 ? (atlasOffline ? 1 : 2) : 0;
  const downloadRate =
    stage === 4 ? (atlasOffline ? "620 KB/s" : "1.4 MB/s") : "0 KB/s";
  const uploadRate = complete ? "420 KB/s" : "0 KB/s";

  function advance() {
    setStage((current) => Math.min(current + 1, stages.length));
  }

  function resetLesson() {
    setStage(0);
    setAtlasOffline(false);
    setSelectedNode(null);
    setView({x: 0, y: 0, scale: 1});
  }

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
      <header className="z-40 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="icon-button shrink-0"
            aria-label="Back to system directory"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
              Go Torrent / Swarm Lab
            </p>
            <h1 className="truncate text-xs font-semibold sm:text-sm">
              Peer protocol map
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          <span className="size-1.5 rounded-full bg-warning" />
          <span className="hidden sm:inline">Static prototype · </span>
          No backend
        </div>
      </header>

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
                stage >= 3 ? "opacity-45" : "opacity-10",
              )}
              markerEnd="url(#arrow-muted)"
            />
            <path
              d="M 500 115 C 530 170, 690 150, 785 205"
              className={cn(
                "fill-none stroke-muted-foreground stroke-1 [stroke-dasharray:5_7] transition-opacity",
                stage >= 3 ? "opacity-45" : "opacity-10",
              )}
              markerEnd="url(#arrow-muted)"
            />
            <path
              d="M 500 115 C 500 180, 505 245, 505 300"
              className={cn(
                "fill-none stroke-muted-foreground stroke-1 [stroke-dasharray:5_7] transition-opacity",
                stage >= 3 ? "opacity-45" : "opacity-10",
              )}
              markerEnd="url(#arrow-muted)"
            />

            <path
              id="atlas-transfer"
              d="M 280 290 C 340 295, 390 325, 430 345"
              className={cn(
                "fill-none stroke-primary stroke-2 transition-opacity",
                stage >= 4 && !atlasOffline ? "opacity-60" : "opacity-10",
              )}
              markerEnd="url(#arrow-primary)"
            />
            <path
              id="beacon-transfer"
              d="M 720 255 C 650 270, 590 315, 575 345"
              className={cn(
                "fill-none stroke-primary stroke-2 transition-opacity",
                stage >= 4 ? "opacity-60" : "opacity-10",
              )}
              markerEnd="url(#arrow-primary)"
            />
            <path
              id="client-upload"
              d="M 570 400 C 625 440, 690 485, 730 510"
              className={cn(
                "fill-none stroke-success stroke-2 transition-opacity",
                complete ? "opacity-70" : "opacity-0",
              )}
              markerEnd="url(#arrow-primary)"
            />

            {stage === 4 && !atlasOffline && (
              <circle r="5" fill="hsl(var(--primary))">
                <animateMotion dur="1.8s" repeatCount="indefinite">
                  <mpath href="#atlas-transfer" />
                </animateMotion>
              </circle>
            )}
            {stage === 4 && (
              <circle r="5" fill="hsl(var(--primary))">
                <animateMotion dur="1.35s" repeatCount="indefinite">
                  <mpath href="#beacon-transfer" />
                </animateMotion>
              </circle>
            )}
            {complete && (
              <circle r="5" fill="hsl(var(--success))">
                <animateMotion dur="1.7s" repeatCount="indefinite">
                  <mpath href="#client-upload" />
                </animateMotion>
              </circle>
            )}
          </svg>

          <GraphNode
            id="tracker"
            icon={Radio}
            label="BMS Tracker"
            eyebrow="Discovery"
            status={stage >= 3 ? "2 peers returned" : "Waiting for announce"}
            active={stage >= 3}
            selected={selectedNode === "tracker"}
            className="left-[415px] top-[40px]"
            onSelect={setSelectedNode}
          />
          <GraphNode
            id="atlas"
            icon={atlasOffline ? WifiOff : Server}
            label="Seeder Atlas"
            eyebrow="Official peer"
            status={
              atlasOffline
                ? "Offline"
                : stage === 4
                  ? "Uploading · 780 KB/s"
                  : "12 / 12 pieces"
            }
            active={stage >= 3 && !atlasOffline}
            warning={atlasOffline}
            selected={selectedNode === "atlas"}
            className="left-[110px] top-[230px]"
            onSelect={setSelectedNode}
          />
          <GraphNode
            id="client"
            icon={stage === 0 ? Network : HardDrive}
            label={stage === 0 ? "Your client" : "Client Alpha"}
            eyebrow={
              complete ? "Seeder" : stage >= 4 ? "Leecher" : "Workspace peer"
            }
            status={
              stage === 0
                ? "Not created"
                : complete
                  ? "Uploading · 420 KB/s"
                  : stage >= 4
                    ? `${progress}% · ${downloadRate}`
                    : "0 / 12 pieces"
            }
            progress={progress}
            active={stage >= 1}
            primary
            selected={selectedNode === "client"}
            className="left-[410px] top-[290px]"
            onSelect={setSelectedNode}
          />
          <GraphNode
            id="beacon"
            icon={Server}
            label="Seeder Beacon"
            eyebrow="Official peer"
            status={
              stage === 4 ? "Uploading · 920 KB/s" : "12 / 12 pieces"
            }
            active={stage >= 3}
            selected={selectedNode === "beacon"}
            className="left-[720px] top-[190px]"
            onSelect={setSelectedNode}
          />
          {complete && (
            <GraphNode
              id="learner"
              icon={Download}
              label="Client Nova"
              eyebrow="New learner"
              status="Receiving from you"
              active
              selected={selectedNode === "learner"}
              className="left-[720px] top-[475px]"
              onSelect={setSelectedNode}
            />
          )}

          {stage >= 3 && (
            <>
              <EdgeLabel className="left-[275px] top-[145px]">
                peer list
              </EdgeLabel>
              <EdgeLabel className="left-[650px] top-[135px]">
                peer list
              </EdgeLabel>
            </>
          )}
          {stage === 4 && (
            <>
              {!atlasOffline && (
                <EdgeLabel className="left-[320px] top-[300px]">
                  pieces 0–5
                </EdgeLabel>
              )}
              <EdgeLabel className="left-[630px] top-[290px]">
                pieces 6–11
              </EdgeLabel>
            </>
          )}
          {complete && (
            <EdgeLabel className="left-[635px] top-[445px]">
              your upload
            </EdgeLabel>
          )}
        </div>

        <section className="pointer-events-auto absolute left-3 top-3 w-[min(20rem,calc(100%-1.5rem))] border border-border bg-surface/95 shadow-2xl backdrop-blur sm:left-4 sm:top-4">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
              Lesson 01 · Stage {Math.min(stage + 1, stages.length)} of{" "}
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
              {complete ? "You are part of the swarm" : currentStage.name}
            </h2>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              {complete
                ? "The artifact is unlocked, and Client Alpha is now sending verified pieces to Client Nova."
                : currentStage.description}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={complete ? resetLesson : advance}
                className="flex min-h-9 flex-1 items-center justify-between bg-primary px-3 text-[11px] font-semibold text-primary-foreground hover:brightness-110"
              >
                {complete ? "Restart lesson" : currentStage.action}
                {complete ? (
                  <RotateCcw className="size-3.5" />
                ) : (
                  <ArrowRight className="size-3.5" />
                )}
              </button>
              {stage >= 3 && !complete && (
                <button
                  type="button"
                  onClick={() => setAtlasOffline((offline) => !offline)}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center border",
                    atlasOffline
                      ? "border-warning bg-warning/10 text-warning"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={
                    atlasOffline
                      ? "Bring Seeder Atlas online"
                      : "Take Seeder Atlas offline"
                  }
                  title={
                    atlasOffline
                      ? "Bring Seeder Atlas online"
                      : "Take Seeder Atlas offline"
                  }
                >
                  <WifiOff className="size-3.5" />
                </button>
              )}
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
            stage={stage}
            progress={progress}
            connectedPeers={connectedPeers}
            atlasOffline={atlasOffline}
            downloadRate={downloadRate}
            uploadRate={uploadRate}
            onClose={() => setSelectedNode(null)}
          />
        )}

        <section className="pointer-events-auto absolute inset-x-0 bottom-0 grid h-14 grid-cols-4 divide-x divide-border border-t border-border bg-surface/95 backdrop-blur">
          <StatusMetric
            icon={Download}
            label="Download"
            value={downloadRate}
          />
          <StatusMetric icon={Upload} label="Upload" value={uploadRate} />
          <StatusMetric
            icon={Network}
            label="Peers"
            value={String(connectedPeers)}
          />
          <StatusMetric
            icon={Check}
            label="Verified"
            value={`${progress}%`}
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
  stage,
  progress,
  connectedPeers,
  atlasOffline,
  downloadRate,
  uploadRate,
  onClose,
}: {
  node: NodeId;
  stage: number;
  progress: number;
  connectedPeers: number;
  atlasOffline: boolean;
  downloadRate: string;
  uploadRate: string;
  onClose: () => void;
}) {
  const details = nodeDescriptions[node];
  const rows =
    node === "tracker"
      ? [
          ["Info hash", stage >= 2 ? "8f7a…c241" : "Not announced"],
          ["Known peers", stage >= 3 ? "3" : "0"],
          ["Artifact traffic", "None"],
        ]
      : node === "client"
        ? [
            ["Peer ID", stage >= 1 ? "-BMS01-a83f…" : "Not created"],
            ["Verified", `${progress}%`],
            ["Connections", String(connectedPeers)],
            ["Download", downloadRate],
            ["Upload", uploadRate],
          ]
        : node === "atlas"
          ? [
              ["Availability", atlasOffline ? "Offline" : "100%"],
              ["Pieces", "12 / 12"],
              ["Upload", stage === 4 && !atlasOffline ? "780 KB/s" : "0 KB/s"],
            ]
          : node === "beacon"
            ? [
                ["Availability", "100%"],
                ["Pieces", "12 / 12"],
                ["Upload", stage === 4 ? "920 KB/s" : "0 KB/s"],
              ]
            : [
                ["Verified", "18%"],
                ["Source", "Client Alpha"],
                ["Download", "420 KB/s"],
              ];

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
