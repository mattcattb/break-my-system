import {queryOptions, useSuspenseQuery} from "@tanstack/react-query";
import {createFileRoute, redirect, useNavigate} from "@tanstack/react-router";
import {
  Bomb,
  Flag,
  RotateCcw,
  Timer,
  Trophy,
} from "lucide-react";
import {DetailedError, parseResponse} from "hono/client";
import {useEffect, useState} from "react";
import {ResourceState} from "../../components/common/ResourceState";
import {WorkspaceHeader} from "../../components/common/SystemShell";
import {Button} from "../../components/ui/button";
import {LeaderboardModal} from "../../features/minesweeper/LeaderboardModal";
import {MinesweeperBoard} from "../../features/minesweeper/MinesweeperBoard";
import {useMinesweeperClient} from "../../features/minesweeper/useMinesweeperClient";
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
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <ResourceState
        className="w-full max-w-md"
        title="Loading game…"
        description="Retrieving the workspace before connecting to its runtime."
      />
    </main>
  );
}

function MinesweeperGameError() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <ResourceState
        className="w-full max-w-md"
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

  const boardDisabled = snapshot?.status !== "playing" || !isConnected;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WorkspaceHeader
        system="Minesweeper"
        workspaceId={gameId}
        status={isConnected ? snapshot?.status ?? "connected" : status}
        backTo="/minesweeper"
        icon={<Bomb className="size-4 text-cyan-400" />}
        meta="authoritative C++ board"
        actions={<>
            <Button variant="outline" size="sm" onClick={() => setLeaderboardOpen(true)}>
              <Trophy className="h-4 w-4 text-warning" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!isConnected}
              onClick={restartGame}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Restart</span>
            </Button>
          </>}
      />

      <div className="grid grid-cols-3 border-b border-border bg-surface text-sm sm:grid-cols-[repeat(3,10rem)] sm:justify-center">
        <div className="flex items-center justify-center gap-2 border-r border-border px-4 py-3">
          <Bomb className="h-4 w-4 text-danger" />
          <span className="font-mono">
            {snapshot?.remainingMines ?? workspace.mines}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 border-r border-border px-4 py-3">
          <Timer className="h-4 w-4 text-primary" />
          <span className="font-mono">
            {String(Math.floor((snapshot?.elapsedSeconds ?? 0) / 60)).padStart(
              2,
              "0",
            )}
            :{String((snapshot?.elapsedSeconds ?? 0) % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <Flag className="h-4 w-4 text-warning" />
          <span className="capitalize">{snapshot?.status ?? "waiting"}</span>
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col items-center px-4 py-8">
        {snapshot ? (
          <>
            <MinesweeperBoard
              snapshot={snapshot}
              disabled={boardDisabled}
              onReveal={revealTile}
              onToggleFlag={toggleFlag}
            />

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Left click to reveal · Right click to toggle a flag
            </p>
          </>
        ) : (
          <ResourceState
            className="w-full max-w-md"
            title={isConnected ? "Synchronizing board…" : "Connecting…"}
            description="The board will appear after the server sends its authoritative snapshot."
          />
        )}
      </main>

      <LeaderboardModal
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
      />
    </div>
  );
}
