import {queryOptions, useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, redirect, useNavigate} from "@tanstack/react-router";
import {
  Bomb,
  Clock3,
  Flag,
  Info,
  MousePointer2,
  RotateCcw,
  Trophy,
} from "lucide-react";
import {DetailedError, parseResponse} from "hono/client";
import {useEffect, useState} from "react";
import {ResourceState} from "../../components/common/ResourceState";
import {Button} from "../../components/ui/button";
import {LeaderboardModal} from "../../features/minesweeper/LeaderboardModal";
import {MinesweeperBoard} from "../../features/minesweeper/MinesweeperBoard";
import {MinesweeperHeader} from "../../features/minesweeper/MinesweeperShell";
import {useMinesweeperClient} from "../../features/minesweeper/useMinesweeperClient";
import {cn} from "../../lib/cn";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

const workspaceQueryOptions = (gameId: string) =>
  queryOptions({
    queryKey: ["minesweeper-workspace", gameId],
    queryFn: async () => {
      try {
        return await parseResponse(
          rpcClient.api.minesweeper.workspaces[":workspaceId"].$get({
            param: {workspaceId: gameId},
          }),
        );
      } catch (error) {
        if (error instanceof DetailedError && error.statusCode === 404) {
          throw redirect({to: "/minesweeper"});
        }

        throw error;
      }
    },
  });

export const Route = createFileRoute("/minesweeper/$gameId")({
  loader: ({context, params}) =>
    context.queryClient.ensureQueryData(workspaceQueryOptions(params.gameId)),
  pendingComponent: MinesweeperGamePending,
  errorComponent: MinesweeperGameError,
  component: MinesweeperGamePage,
});

function MinesweeperGamePending() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#091018] p-6 text-[#edf7f5]">
      <ResourceState
        className="w-full max-w-md rounded-2xl border-[#26394a] bg-[#111c28]"
        title="Loading game…"
        description="Retrieving the workspace before connecting to its runtime."
      />
    </main>
  );
}

function MinesweeperGameError() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#091018] p-6 text-[#edf7f5]">
      <ResourceState
        className="w-full max-w-md rounded-2xl border-[#26394a] bg-[#111c28]"
        title="Game unavailable"
        description="The workspace could not be loaded. Return to Minesweeper and try again."
        actionLabel="Back to Minesweeper"
        onAction={() => navigate({to: "/minesweeper"})}
        tone="danger"
      />
    </main>
  );
}

function MinesweeperGamePage() {
  const {gameId} = Route.useParams();
  const {data: workspace} = useSuspenseQuery(workspaceQueryOptions(gameId));
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const {
    isConnected,
    status,
    snapshot,
    lastError,
    revealTile,
    toggleFlag,
    restartGame,
  } = useMinesweeperClient(gameId);

  useEffect(() => {
    if (lastError) appToast.error(lastError.message);
  }, [lastError]);

  const gameStatus = snapshot?.status ?? (isConnected ? "connected" : status);
  const boardDisabled = snapshot?.status !== "playing" || !isConnected;
  const elapsedSeconds = snapshot?.elapsedSeconds ?? 0;
  const elapsed = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const gameStatusTone =
    gameStatus.toLowerCase() === "lost"
      ? "bg-[#321923] text-[#ff7085]"
      : "bg-[#163c39] text-[#63e6be]";

  return (
    <div className="min-h-screen bg-[#091018] text-[#edf7f5]">
      <MinesweeperHeader
        workspaceId={gameId}
        status={gameStatus}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-[#26394a] bg-[#111c28] text-[#8296a6] hover:bg-[#172534] hover:text-[#edf7f5]"
              aria-label="Open leaderboard"
              onClick={() => setLeaderboardOpen(true)}
            >
              <Trophy className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-[#26394a] bg-[#111c28] text-[#8296a6] hover:bg-[#172534] hover:text-[#edf7f5]"
              disabled={!isConnected}
              aria-label="Restart game"
              onClick={restartGame}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </>
        }
      />

      <div className="border-b border-[#26394a] bg-[#0d151f]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-8">
          <GameMetric
            icon={<Bomb className="size-3.5 text-[#ff7085]" />}
            label="Mines"
            value={String(snapshot?.remainingMines ?? workspace.mines)}
          />
          <GameMetric
            icon={<Clock3 className="size-3.5 text-[#63e6be]" />}
            label="Time"
            value={elapsed}
          />
          <GameMetric
            icon={<Flag className="size-3.5 text-[#ffc857]" />}
            label="Status"
            value={gameStatus}
          />
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl gap-5 px-3 py-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#8296a6]">
                Workspace {gameId}
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {workspace.rows} × {workspace.cols} field
              </h2>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em]",
                gameStatusTone,
              )}
            >
              {gameStatus}
            </span>
          </div>

          {snapshot ? (
            <MinesweeperBoard
              snapshot={snapshot}
              disabled={boardDisabled}
              onReveal={revealTile}
              onToggleFlag={toggleFlag}
            />
          ) : (
            <ResourceState
              className="rounded-[1.75rem] border-[#26394a] bg-[#111c28]"
              title={isConnected ? "Synchronizing board…" : "Connecting…"}
              description="The board will appear after the runtime sends its authoritative snapshot."
            />
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[#8296a6]">
            <span className="flex items-center gap-1.5">
              <MousePointer2 className="size-3" />
              Reveal
            </span>
            <span className="flex items-center gap-1.5">
              <Flag className="size-3" />
              Right click to flag
            </span>
          </div>
        </section>

        <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-[#26394a] bg-[#111c28] p-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#8296a6]">
              Game detail
            </p>
            <dl className="mt-4 space-y-3 text-xs">
              <DetailRow
                label="Field"
                value={`${workspace.rows} × ${workspace.cols}`}
              />
              <DetailRow label="Mines" value={String(workspace.mines)} />
              <DetailRow
                label="Remaining"
                value={String(snapshot?.remainingMines ?? workspace.mines)}
              />
              <DetailRow label="Elapsed" value={elapsed} />
            </dl>
          </div>

          <div className="rounded-2xl border border-[#26394a] bg-[#111c28] p-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#8296a6]">
              Runtime
            </p>
            <dl className="mt-4 space-y-3 text-xs">
              <DetailRow
                label="Connection"
                value={isConnected ? "Connected" : status}
              />
              <DetailRow label="Authority" value="C++ board" />
              <DetailRow label="Transport" value="WebSocket" />
            </dl>
          </div>

          <div className="flex gap-2 rounded-2xl border border-[#26394a] bg-[#111c28] p-4 text-[10px] leading-4 text-[#8296a6] sm:col-span-2 lg:col-span-1">
            <Info className="mt-0.5 size-3.5 shrink-0 text-[#63e6be]" />
            The runtime owns the board. Every reveal and flag is confirmed by a
            fresh snapshot.
          </div>
        </aside>
      </main>

      <LeaderboardModal
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
      />
    </div>
  );
}

function GameMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-max items-center gap-2 rounded-xl border border-[#26394a] bg-[#111c28] px-3 py-2">
      {icon}
      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#8296a6]">
        {label}
      </span>
      <strong className="font-mono text-[10px] font-medium capitalize">
        {value}
      </strong>
    </div>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#8296a6]">{label}</dt>
      <dd className="font-mono text-[10px]">{value}</dd>
    </div>
  );
}
