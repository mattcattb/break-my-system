import {createFileRoute, Link} from "@tanstack/react-router";
import {
  ArrowRight,
  Bomb,
  Braces,
  Database,
  FileArchive,
  Network,
  Plus,
} from "lucide-react";
import {
  AppHeader,
  DirectorySectionHeader,
  SystemIcon,
} from "../components/common/SystemShell";

export const Route = createFileRoute("/")({component: HomePage});

const systems = [
  {
    name: "Go Redis",
    code: "REDIS/GO",
    to: "/redis" as const,
    icon: Database,
    iconTone: "text-[#f7768e]",
    detail: "RESP · TCP",
  },
  {
    name: "PLC Runtime",
    code: "PLC/JVM",
    to: "/plc" as const,
    icon: Braces,
    iconTone: "text-[#bb9af7]",
    detail: "PARSER · EVALUATOR",
  },
  {
    name: "WAD Filesystem",
    code: "WAD/C++",
    to: "/wad" as const,
    icon: FileArchive,
    iconTone: "text-[#e0af68]",
    detail: "BINARY · FILESYSTEM",
  },
  {
    name: "Minesweeper",
    code: "MINE/C++",
    to: "/minesweeper" as const,
    icon: Bomb,
    iconTone: "text-[#7dcfff]",
    detail: "WEBSOCKET · REALTIME",
  },
  {
    name: "Go Torrent",
    code: "TORRENT/GO",
    to: "/torrent" as const,
    icon: Network,
    iconTone: "text-[#73daca]",
    detail: "P2P · PIECES",
  },
];

function HomePage() {
  return (
    <div className="system-interface workshop-page">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            System directory
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Choose a system
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Open a system directory, then continue an existing workspace or
            start a new one.
          </p>
        </div>

        <section className="border border-border bg-surface">
          <DirectorySectionHeader title="Systems" detail="5 available" />
          {systems.map((system, index) => {
            const Icon = system.icon;
            return (
              <Link
                key={system.to}
                to={system.to}
                className="group grid min-h-16 grid-cols-[1.5rem_2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 last:border-b-0 hover:bg-muted sm:grid-cols-[1.5rem_2.25rem_minmax(0,1fr)_10rem_auto]"
              >
                <span className="font-mono text-[9px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <SystemIcon className={system.iconTone}>
                  <Icon className="size-4" />
                </SystemIcon>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">
                    {system.name}
                  </span>
                  <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
                    {system.code}
                  </span>
                </span>
                <span className="hidden font-mono text-[9px] text-muted-foreground sm:block">
                  {system.detail}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
              </Link>
            );
          })}
        </section>

        <section className="mt-5 border border-border bg-surface">
          <DirectorySectionHeader title="New workspace" />
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {systems.map((system) => (
              <Link
                key={system.to}
                to={system.to}
                className="flex min-h-11 items-center gap-2 bg-surface px-3 text-xs text-foreground/75 hover:bg-muted hover:text-foreground sm:last:col-span-2"
              >
                <Plus className="size-3.5 text-primary" />
                <span className="min-w-0 flex-1 truncate">{system.name}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
