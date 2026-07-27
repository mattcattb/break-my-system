import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {
  ArrowRight,
  Bomb,
  Check,
  Clock3,
  Grid3X3,
  Play,
  Trophy,
  Users,
} from "lucide-react";
import {parseResponse} from "hono/client";
import {useState} from "react";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";
import {Label} from "../../components/ui/label";
import {LeaderboardModal} from "../../features/minesweeper/LeaderboardModal";
import {MinesweeperHeader} from "../../features/minesweeper/MinesweeperShell";
import {cn} from "../../lib/cn";
import {rpcClient} from "../../lib/rpc.client";
import {toastAnyError} from "../../lib/toast";

export const Route = createFileRoute("/minesweeper/")({
  component: MinesweeperIndexPage,
});

const presets = [
  {
    name: "Beginner",
    rows: 9,
    cols: 9,
    mines: 10,
    detail: "Quick and forgiving",
  },
  {
    name: "Intermediate",
    rows: 16,
    cols: 16,
    mines: 40,
    detail: "Balanced field",
  },
  {
    name: "Expert",
    rows: 16,
    cols: 30,
    mines: 99,
    detail: "Wide and dense",
  },
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
  const selectedPreset = presets.find(
    (preset) =>
      preset.rows === config.rows &&
      preset.cols === config.cols &&
      preset.mines === config.mines,
  );
  const density = Math.round(
    (config.mines / Math.max(config.rows * config.cols, 1)) * 100,
  );

  return (
    <div className="system-interface min-h-screen bg-background text-foreground">
      <MinesweeperHeader status="Ready" />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#73daca]">
              New game
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
              Game setup
            </h2>
          </div>
          <Button
            variant="outline"
            onClick={() => setLeaderboardOpen(true)}
          >
            <Trophy className="size-3.5 text-[#e0af68]" />
            Leaderboard
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <form
            className="border border-border bg-surface p-5 sm:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              if (validConfig) createWorkspace.mutate();
            }}
          >
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Difficulty
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {presets.map((preset) => {
                  const selected = preset === selectedPreset;

                  return (
                    <button
                      key={preset.name}
                      type="button"
                      className={cn(
                        "relative min-h-36 border border-border bg-background p-4 text-left transition-colors hover:bg-muted",
                        selected &&
                          "border-[#73daca] bg-muted",
                      )}
                      aria-pressed={selected}
                      onClick={() =>
                        setConfig({
                          rows: preset.rows,
                          cols: preset.cols,
                          mines: preset.mines,
                        })
                      }
                    >
                      <span className="flex items-start justify-between">
                        <Grid3X3 className="size-4 text-[#73daca]" />
                        {selected ? (
                          <span className="grid size-5 place-items-center rounded-full bg-[#73daca] text-background">
                            <Check className="size-3" />
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-7 block text-sm font-semibold">
                        {preset.name}
                      </span>
                      <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                        {preset.rows} × {preset.cols} · {preset.mines} mines
                      </span>
                      <span className="mt-2 block text-[10px] text-muted-foreground">
                        {preset.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Custom field
                </p>
                {!selectedPreset ? (
                  <span className="rounded-full bg-[#73daca]/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#73daca]">
                    Custom
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(
                  [
                    ["Rows", "rows"],
                    ["Columns", "cols"],
                    ["Mines", "mines"],
                  ] as const
                ).map(([label, key]) => (
                  <div key={key} className="space-y-2">
                    <Label
                      htmlFor={`minesweeper-${key}`}
                      className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {label}
                    </Label>
                    <Input
                      id={`minesweeper-${key}`}
                      type="number"
                      min={key === "mines" ? 1 : 2}
                      max={
                        key === "mines" ? config.rows * config.cols - 1 : 100
                      }
                      value={config[key]}
                      className="h-11 border-border bg-background px-3 text-foreground focus-visible:border-[#73daca]"
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
            </div>
          </form>

          <aside className="self-start border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Field preview
              </p>
              <span className="rounded-full bg-[#73daca]/10 px-2 py-1 font-mono text-[8px] text-[#73daca]">
                {Number.isFinite(density) ? density : 0}% density
              </span>
            </div>
            <FieldPreview density={density} />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <SetupMetric label="Board" value={`${config.rows} × ${config.cols}`} />
              <SetupMetric label="Mines" value={String(config.mines)} />
            </div>
            <Button
              size="lg"
              className="mt-4 h-11 w-full"
              disabled={!validConfig || createWorkspace.isPending}
              onClick={() => {
                if (validConfig) createWorkspace.mutate();
              }}
            >
              <Play className="size-3.5 fill-current" />
              {createWorkspace.isPending ? "Creating…" : "Create game"}
            </Button>
          </aside>
        </div>

        <section className="mt-5 overflow-hidden border border-border bg-surface">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Workspaces
              </p>
              <h2 className="mt-1 text-sm font-semibold">Recent games</h2>
            </div>
            <span className="font-mono text-[9px] text-muted-foreground">
              {workspaces.data?.workspaces.length ?? 0} active
            </span>
          </div>

          {workspaces.isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Loading…</p>
          ) : workspaces.data?.workspaces.length ? (
            <div>
              {workspaces.data.workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-4 text-left last:border-b-0 hover:bg-muted"
                  onClick={() =>
                    navigate({
                      to: "/minesweeper/$gameId",
                      params: {gameId: workspace.gameId},
                    })
                  }
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center border border-border bg-surface-elevated text-[#73daca]">
                      <Bomb className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs">
                        {workspace.id}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bomb className="size-3 text-[#f7768e]" />
                          {workspace.mines}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="size-3" />
                          {new Date(workspace.lastSeenAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {workspace.activeConnections}
                        </span>
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              No active workspaces yet.
            </p>
          )}
        </section>
      </main>

      <LeaderboardModal
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
      />
    </div>
  );
}

function FieldPreview({density}: {density: number}) {
  const mineCells = Math.max(1, Math.min(35, Math.round((density / 100) * 49)));

  return (
    <div className="mt-5 grid grid-cols-7 gap-1 border border-border bg-background p-3">
      {Array.from({length: 49}, (_, index) => (
        <span
          key={index}
          className={cn(
            "aspect-square bg-muted",
            (index * 17) % 49 < mineCells && "bg-[#73daca]/80",
          )}
        />
      ))}
    </div>
  );
}

function SetupMetric({label, value}: {label: string; value: string}) {
  return (
    <div className="border border-border bg-background p-3">
      <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block text-sm font-semibold">{value}</span>
    </div>
  );
}
