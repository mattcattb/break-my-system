import {createFileRoute, Link} from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bomb,
  Braces,
  Database,
  FileArchive,
  Radio,
} from "lucide-react";
import {AppHeader} from "../components/common/SystemShell";

export const Route = createFileRoute("/")({component: HomePage});

const systems = [
  {
    name: "Go Redis",
    code: "REDIS/GO",
    to: "/redis" as const,
    icon: Database,
    accent: "text-red-400",
    border: "group-hover:border-red-400/60",
    description: "Probe a Redis-compatible server through live terminals and inspect its keyspace.",
    runtime: "Go · RESP · TCP",
  },
  {
    name: "PLC Runtime",
    code: "PLC/JVM",
    to: "/plc" as const,
    icon: Braces,
    accent: "text-violet-400",
    border: "group-hover:border-violet-400/60",
    description: "Write, evaluate, and break a stateful language runtime from source to output.",
    runtime: "Java · Parser · Evaluator",
  },
  {
    name: "WAD Filesystem",
    code: "WAD/C++",
    to: "/wad" as const,
    icon: FileArchive,
    accent: "text-amber-400",
    border: "group-hover:border-amber-400/60",
    description: "Open binary archives, traverse their namespace tree, and modify working copies.",
    runtime: "C++ · Binary · Filesystem",
  },
  {
    name: "Minesweeper",
    code: "MINE/C++",
    to: "/minesweeper" as const,
    icon: Bomb,
    accent: "text-cyan-400",
    border: "group-hover:border-cyan-400/60",
    description: "Play against an authoritative C++ event loop over a realtime connection.",
    runtime: "C++ · WebSocket · Realtime",
  },
];

function HomePage() {
  return (
    <div className="workshop-page">
      <AppHeader />
      <main className="page-container">
        <section className="grid items-end gap-8 border-b border-border pb-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <div>
            <p className="eyebrow mb-4">Control plane / laboratory index</p>
            <h1 className="display-title max-w-4xl">
              Systems built to be
              <span className="block text-primary">taken apart.</span>
            </h1>
          </div>
          <div className="border-l border-border pl-5">
            <p className="max-w-lg text-sm leading-6 text-muted-foreground">
              Independent runtimes, real protocols, isolated workspaces. Choose a
              system, open its instrument, and learn where it bends or breaks.
            </p>
            <div className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-success">
              <Radio className="size-3.5" /> 4 systems available
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">System directory</p>
              <h2 className="mt-1 text-lg font-semibold">Select a runtime</h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              01—04 / online
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {systems.map((system, index) => {
              const Icon = system.icon;
              return (
                <Link
                  key={system.to}
                  to={system.to}
                  className={`group relative min-h-56 overflow-hidden border border-border bg-surface p-5 transition-colors ${system.border}`}
                >
                  <div className="absolute right-4 top-1 font-display text-8xl font-bold leading-none text-foreground/[0.025]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="flex items-start justify-between">
                    <div className={`flex size-10 items-center justify-center border border-current/30 bg-background ${system.accent}`}>
                      <Icon className="size-5" />
                    </div>
                    <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <div className="mt-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {system.code}
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
                      {system.name}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                      {system.description}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-border px-5 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{system.runtime}</span>
                    <span className="text-success">ready</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
