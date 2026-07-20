import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {Bomb, Clock3, Play, Trophy, Users} from "lucide-react";
import {parseResponse} from "hono/client";
import {useState} from "react";
import {Button} from "../../components/ui/button";
import {AppHeader} from "../../components/common/SystemShell";
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
    <div className="workshop-page">
      <AppHeader currentSystem="Minesweeper" />

      <main className="page-container">
        <div className="mb-6 flex items-center gap-3">
          <div className="system-glyph text-cyan-400"><Bomb className="size-4" /></div>
          <div><p className="font-mono text-[10px] text-muted-foreground">MINE/C++ · WEBSOCKET · REALTIME</p><h1 className="mt-0.5 text-lg font-medium">Minesweeper</h1></div>
        </div>

        <section className="panel mx-auto max-w-3xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">New workspace</h2>
            <Button variant="outline" size="sm" onClick={() => setLeaderboardOpen(true)}><Trophy className="h-4 w-4 text-warning" />Leaderboard</Button>
          </div>

          <form
            className="space-y-5 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (validConfig) createWorkspace.mutate();
            }}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {presets.map((preset) => {
                const selected = preset.rows === config.rows && preset.cols === config.cols && preset.mines === config.mines;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    className={`border px-3 py-2.5 text-left ${selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted"}`}
                    onClick={() => setConfig(preset)}
                  >
                    <span className="block text-xs font-medium">{preset.name}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{preset.rows} × {preset.cols} · {preset.mines}</span>
                  </button>
                );
              })}
            </div>

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

          <div className="border-t border-border">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-xs font-medium">Recent workspaces</h3>
              <span className="font-mono text-xs text-muted-foreground">
                {workspaces.data?.workspaces.length ?? 0} active
              </span>
            </div>

            {workspaces.isLoading ? (
              <p className="border-t border-border p-4 text-sm text-muted-foreground">Loading…</p>
            ) : workspaces.data?.workspaces.length ? (
              <div className="max-h-56 overflow-y-auto border-t border-border">
                {workspaces.data.workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted"
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
              <p className="border-t border-border p-4 text-sm text-muted-foreground">
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
