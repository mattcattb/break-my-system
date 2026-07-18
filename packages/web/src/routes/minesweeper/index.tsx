import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {ArrowLeft, Bomb, Clock3, Play, Trophy, Users} from "lucide-react";
import {parseResponse} from "hono/client";
import {useState} from "react";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";
import {Label} from "../../components/ui/label";
import {LeaderboardModal} from "../../features/minesweeper/LeaderboardModal";
import {rpcClient} from "../../lib/rpc.client";
import {toastAnyError} from "../../lib/toast";

export const Route = createFileRoute("/minesweeper/")({
  component: MinesweeperIndexPage,
});

const presets = [
  {name: "Beginner", rows: 9, cols: 9, mines: 10},
  {name: "Intermediate", rows: 16, cols: 16, mines: 40},
  {name: "Expert", rows: 16, cols: 30, mines: 99},
] as const;

function MinesweeperIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({rows: 9, cols: 9, mines: 10});
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const workspaces = useQuery({
    queryKey: ["minesweeper-workspaces"],
    queryFn: () =>
      parseResponse(rpcClient.api.minesweeper.workspaces.$get()),
  });

  const createWorkspace = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.minesweeper.workspaces.$post({json: config}),
      ),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({queryKey: ["minesweeper-workspaces"]});
      navigate({
        to: "/minesweeper/$gameId",
        params: {gameId: workspace.gameId},
      });
    },
    onError: (error) =>
      toastAnyError(error, "The workspace could not be created"),
  });

  const validConfig =
    config.rows >= 2 &&
    config.cols >= 2 &&
    config.rows <= 100 &&
    config.cols <= 100 &&
    config.mines > 0 &&
    config.mines < config.rows * config.cols;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate({to: "/"})}
          >
            <ArrowLeft className="h-4 w-4" />
            Systems
          </button>
          <Button variant="outline" onClick={() => setLeaderboardOpen(true)}>
            <Trophy className="h-4 w-4 text-warning" />
            Leaderboard
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
        <section>
          <div className="flex h-12 w-12 items-center justify-center border border-primary bg-primary/10 text-primary">
            <Bomb className="h-6 w-6" />
          </div>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Authoritative runtime
          </p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Minesweeper, driven by the server.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Create an isolated workspace, connect through the WebSocket gateway,
            and let the C++ event loop own every reveal, flag, and finish.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {presets.map((preset) => {
              const selected =
                preset.rows === config.rows &&
                preset.cols === config.cols &&
                preset.mines === config.mines;
              return (
                <button
                  key={preset.name}
                  type="button"
                  className={`border p-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface hover:bg-muted"
                  }`}
                  onClick={() => setConfig(preset)}
                >
                  <span className="block text-sm font-medium">{preset.name}</span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">
                    {preset.rows} × {preset.cols} · {preset.mines} mines
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold">New workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One API lease maps to one game in the C++ runtime.
          </p>

          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (validConfig) createWorkspace.mutate();
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["Rows", "rows"],
                  ["Columns", "cols"],
                  ["Mines", "mines"],
                ] as const
              ).map(([label, key]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`minesweeper-${key}`}>{label}</Label>
                  <Input
                    id={`minesweeper-${key}`}
                    type="number"
                    min={key === "mines" ? 1 : 2}
                    max={key === "mines" ? config.rows * config.cols - 1 : 100}
                    value={config[key]}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!validConfig || createWorkspace.isPending}
            >
              <Play className="h-4 w-4" />
              {createWorkspace.isPending ? "Creating…" : "Create and connect"}
            </Button>
          </form>

          <div className="mt-8 border-t border-border pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Recent workspaces</h3>
              <span className="font-mono text-xs text-muted-foreground">
                {workspaces.data?.workspaces.length ?? 0} active
              </span>
            </div>

            {workspaces.isLoading ? (
              <p className="py-4 text-sm text-muted-foreground">Loading…</p>
            ) : workspaces.data?.workspaces.length ? (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {workspaces.data.workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    className="grid w-full grid-cols-[1fr_auto] gap-3 border border-border px-3 py-3 text-left hover:bg-muted"
                    onClick={() =>
                      navigate({
                        to: "/minesweeper/$gameId",
                        params: {gameId: workspace.gameId},
                      })
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs text-foreground">
                        {workspace.id}
                      </span>
                      <span className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bomb className="h-3 w-3" /> {workspace.mines}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" />
                          {new Date(workspace.lastSeenAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {workspace.activeConnections}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No active workspaces yet.
              </p>
            )}
          </div>
        </section>
      </main>

      <LeaderboardModal
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
      />
    </div>
  );
}
