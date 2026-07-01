import {useEffect, useMemo, useState} from "react";
import {Play, RotateCcw} from "lucide-react";
import {Button} from "../../components/ui/button";
import {Textarea} from "../../components/ui/textarea";
import {apiFetch} from "../../lib/api";

type SystemSummary = {
  id: string;
  name: string;
  status: string;
  description: string;
  exampleCommands: string[];
};

type CommandResult = {
  systemId: string;
  command: string;
  output: string;
  exitCode: number;
  durationMs: number;
  ranAt: string;
};

type SystemsResponse = {
  systems: SystemSummary[];
};

export function SystemsConsole() {
  const [systems, setSystems] = useState<SystemSummary[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState("go-redis");
  const [command, setCommand] = useState("PING");
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SystemsResponse>("/api/systems")
      .then((response) => {
        setSystems(response.systems);
        setSelectedSystemId(response.systems[0]?.id ?? "go-redis");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load systems");
      });
  }, []);

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === selectedSystemId),
    [selectedSystemId, systems],
  );

  const runCommand = async () => {
    if (!command.trim()) {
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const result = await apiFetch<CommandResult>(
        `/api/systems/${selectedSystemId}/commands`,
        {
          method: "POST",
          body: JSON.stringify({command}),
        },
      );
      setHistory((current) => [result, ...current].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command failed");
    } finally {
      setIsRunning(false);
    }
  };

  const resetSystem = async () => {
    setError(null);
    await apiFetch(`/api/systems/${selectedSystemId}/reset`, {method: "POST"});
    setHistory([]);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Systems</h2>
          <p className="text-sm text-muted-foreground">
            Pick a module and send a command to the mock runner.
          </p>
        </div>

        <div className="space-y-2">
          {systems.map((system) => (
            <button
              key={system.id}
              type="button"
              onClick={() => {
                setSelectedSystemId(system.id);
                setCommand(system.exampleCommands[0] ?? "");
              }}
              className={`w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                selectedSystemId === system.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{system.name}</span>
                <span className="text-xs text-muted-foreground">
                  {system.status}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {system.description}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-4">
        <div className="rounded-md border border-border bg-surface-elevated p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedSystem?.name ?? "System"} console
              </h2>
              <p className="text-sm text-muted-foreground">
                This is a simple command form first. Swap in xterm.js later
                when you need full terminal emulation.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetSystem}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <Textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            className="min-h-24 font-mono"
            placeholder="PING"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSystem?.exampleCommands.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setCommand(example)}
                className="rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-muted/60"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={runCommand} disabled={isRunning}>
              <Play className="h-4 w-4" />
              {isRunning ? "Running" : "Run"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="min-h-[260px] rounded-md border border-border bg-[#101418] p-4 font-mono text-sm text-[#d6e2dc]">
          {history.length === 0 ? (
            <div className="text-[#7f918c]">No commands run yet.</div>
          ) : (
            <div className="space-y-5">
              {history.map((result) => (
                <div key={`${result.ranAt}-${result.command}`}>
                  <div className="text-[#7f918c]">
                    [{new Date(result.ranAt).toLocaleTimeString()}]{" "}
                    {result.systemId} exited {result.exitCode} in{" "}
                    {result.durationMs}ms
                  </div>
                  <div className="mt-1 text-[#8dd9c7]">$ {result.command}</div>
                  <pre className="mt-1 whitespace-pre-wrap">
                    {result.output}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
