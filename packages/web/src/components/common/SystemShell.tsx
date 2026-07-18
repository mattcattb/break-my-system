import {Link} from "@tanstack/react-router";
import {ArrowLeft, Box, ChevronDown, Grid2X2, Radio} from "lucide-react";
import type {ReactNode} from "react";
import {cn} from "../../lib/cn";

export function AppHeader({currentSystem}: {currentSystem?: string}) {
  return (
    <header className="app-header">
      <Link to="/" className="brand-lockup" aria-label="Break My System home">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span>
          <span className="brand-name">BREAK / MY SYSTEM</span>
          <span className="brand-subtitle">Independent runtimes · one workshop</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:flex">
          <Radio className="size-3 text-primary" /> control plane online
        </span>
        {currentSystem ? (
          <Link to="/" className="system-switcher">
            <Grid2X2 className="size-3.5" />
            <span>{currentSystem}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function WorkspaceHeader({
  system,
  workspaceId,
  status,
  backTo,
  icon,
  meta,
  actions,
}: {
  system: string;
  workspaceId: string;
  status: string;
  backTo: "/redis" | "/plc" | "/wad" | "/minesweeper";
  icon: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <AppHeader currentSystem={system} />
      <div className="workspace-header">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={backTo}
            className="icon-button shrink-0"
            aria-label={`Back to ${system} workspaces`}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="system-glyph shrink-0">{icon}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">{system}</h1>
              <StatusDot status={status} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {status}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <Box className="size-3 shrink-0" />
              <span className="truncate">{workspaceId}</span>
              {meta ? <><span className="text-border">/</span>{meta}</> : null}
            </div>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </>
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
