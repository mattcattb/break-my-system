import {Link} from "@tanstack/react-router";
import {
  Bomb,
  Braces,
  Database,
  FileArchive,
  Network,
} from "lucide-react";
import type {LucideIcon} from "lucide-react";
import type {ReactNode} from "react";
import {cn} from "../../lib/cn";

export const systemCatalog = {
  redis: {
    label: "Go Redis",
    code: "REDIS / GO",
    detail: "RESP · TCP",
    to: "/redis" as const,
    icon: Database,
    accent: "text-[#f7768e]",
  },
  plc: {
    label: "PLC Runtime",
    code: "PLC / JVM",
    detail: "PARSER · EVALUATOR",
    to: "/plc" as const,
    icon: Braces,
    accent: "text-[#bb9af7]",
  },
  wad: {
    label: "WAD Filesystem",
    code: "WAD / C++",
    detail: "BINARY · FILESYSTEM",
    to: "/wad" as const,
    icon: FileArchive,
    accent: "text-[#e0af68]",
  },
  minesweeper: {
    label: "Minesweeper",
    code: "MINE / C++",
    detail: "WEBSOCKET · REALTIME",
    to: "/minesweeper" as const,
    icon: Bomb,
    accent: "text-[#73daca]",
  },
  torrent: {
    label: "Go Torrent",
    code: "TORRENT / GO",
    detail: "P2P · PIECES",
    to: "/torrent" as const,
    icon: Network,
    accent: "text-[#7dcfff]",
  },
} satisfies Record<
  string,
  {
    label: string;
    code: string;
    detail: string;
    to: string;
    icon: LucideIcon;
    accent: string;
  }
>;

export type SystemId = keyof typeof systemCatalog;

export function SystemMark({
  system,
  bare = false,
  className,
}: {
  system: SystemId;
  bare?: boolean;
  className?: string;
}) {
  const {icon: Icon, accent} = systemCatalog[system];

  if (bare) {
    return <Icon className={cn("size-5 shrink-0", accent, className)} />;
  }

  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-elevated",
        accent,
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function AppHeader({
  currentSystem,
  workspaceId,
  workspaceMeta,
  status,
  actions,
  trailing,
}: {
  currentSystem?: SystemId;
  workspaceId?: string;
  workspaceMeta?: ReactNode;
  status?: string;
  actions?: ReactNode;
  trailing?: ReactNode;
}) {
  const system = currentSystem ? systemCatalog[currentSystem] : undefined;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <nav className="flex min-w-0 items-center gap-3 sm:gap-4" aria-label="Application context">
          <Link to="/" className="brand-lockup" aria-label="Break My System home">
            <BrandMark />
            <span className="brand-name hidden sm:block">Break / My System</span>
          </Link>
          {system ? (
            <>
              <span className="h-8 w-px shrink-0 bg-border" aria-hidden="true" />
              <Link to={system.to} className="flex min-w-0 items-center gap-3 text-foreground">
                <SystemMark system={currentSystem!} bare />
                <span className="min-w-0">
                  <span className="brand-eyebrow truncate">
                    {system.code} · {system.detail}
                  </span>
                  <span className="brand-name truncate">{system.label}</span>
                </span>
              </Link>
            </>
          ) : null}
          {workspaceId ? (
            <>
              <span className="h-8 w-px shrink-0 bg-border" aria-hidden="true" />
              <span className="min-w-0">
                <span className="brand-eyebrow">Workspace</span>
                <span className="block min-w-0 truncate font-mono text-[11px] text-foreground/80">
                  {workspaceId}
                  {workspaceMeta ? (
                    <span className="hidden text-muted-foreground lg:inline">
                      {" · "}{workspaceMeta}
                    </span>
                  ) : null}
                </span>
              </span>
            </>
          ) : null}
        </nav>
        {trailing ??
          (status || actions ? (
            <div className="flex shrink-0 items-center gap-2">
              {status ? (
                <span className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                  <StatusDot status={status} />
                  {status}
                </span>
              ) : null}
              {actions}
            </div>
          ) : null)}
      </div>
    </header>
  );
}

export function DirectorySectionHeader({
  title,
  detail,
}: {
  title: string;
  detail?: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 border-b border-border px-3">
      <h2 className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      {detail ? (
        <span className="font-mono text-[9px] text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

export function WorkspaceHeader({
  system,
  workspaceId,
  status,
  meta,
  actions,
}: {
  system: SystemId;
  workspaceId: string;
  status: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <AppHeader
      currentSystem={system}
      workspaceId={workspaceId}
      workspaceMeta={meta}
      status={status}
      actions={actions}
    />
  );
}

function StatusDot({status}: {status: string}) {
  const active = ["connected", "playing", "ready", "idle"].includes(
    status.toLowerCase(),
  );

  return (
    <span
      className={cn("status-dot", active ? "status-dot-active" : "status-dot-warn")}
      aria-hidden="true"
    />
  );
}

export function PanelHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}
