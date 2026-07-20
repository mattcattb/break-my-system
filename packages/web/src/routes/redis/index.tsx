import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {ArrowRight, Database, Plus, TerminalSquare} from "lucide-react";
import {DetailedError, parseResponse} from "hono/client";
import {AppHeader, PanelHeading} from "../../components/common/SystemShell";
import {Button} from "../../components/ui/button";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

export const Route = createFileRoute("/redis/")({component: RedisIndexPage});

function RedisIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspacesQuery = useQuery({
    queryKey: ["redis-workspaces"],
    queryFn: () => parseResponse(rpcClient.api.redis.workspaces.$get()),
  });
  const createWorkspace = useMutation({
    mutationFn: () => parseResponse(rpcClient.api.redis.workspaces.$post()),
    onError: (error) => {
      if (error instanceof DetailedError) appToast.error(error.message);
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({queryKey: ["redis-workspaces"]});
      navigate({to: "/redis/$workspaceId", params: {workspaceId: workspace.id}});
    },
  });
  const workspaces = workspacesQuery.data?.workspaces ?? [];

  return (
    <div className="workshop-page">
      <AppHeader currentSystem="Go Redis" />
      <main className="page-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
          <section className="flex flex-col justify-between">
            <div>
              <div className="system-glyph mb-7 size-12 text-red-400">
                <Database className="size-6" />
              </div>
              <p className="eyebrow">System 01 / Go runtime</p>
              <h1 className="display-title mt-3">Redis from<br />the wire up.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
                Work directly against a Redis-compatible server written in Go.
                Run RESP commands, manage live connections, and inspect the
                keyspace without leaving the workspace.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-2">
              {[["Protocol", "RESP"], ["Transport", "TCP"], ["Instrument", "Terminal"]].map(([label, value]) => (
                <div key={label} className="metric-cell">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
                  <div className="mt-1 text-sm font-medium">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <PanelHeading
              eyebrow="Workspace registry"
              title="Open an isolated Redis session"
              action={<span className="font-mono text-[10px] text-muted-foreground">{workspaces.length} ACTIVE</span>}
            />
            <div className="p-4">
              <Button
                size="lg"
                className="h-12 w-full justify-between px-4"
                disabled={createWorkspace.isPending}
                onClick={() => createWorkspace.mutate()}
              >
                <span className="flex items-center gap-2"><Plus className="size-4" />{createWorkspace.isPending ? "Provisioning…" : "New workspace"}</span>
                <ArrowRight className="size-4" />
              </Button>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Creates a private connection with terminal history and a key explorer.
              </p>
            </div>
            <div className="border-t border-border">
              <div className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Recent workspaces</div>
              <div className="max-h-80 overflow-auto border-t border-border">
                {workspacesQuery.isLoading ? (
                  <p className="p-5 text-sm text-muted-foreground">Reading registry…</p>
                ) : workspaces.length ? workspaces.map((workspace, index) => (
                  <button
                    key={workspace.id}
                    type="button"
                    className="group flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted"
                    onClick={() => navigate({to: "/redis/$workspaceId", params: {workspaceId: workspace.id}})}
                  >
                    <span className="flex size-8 items-center justify-center border border-border bg-background font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs">{workspace.id}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-success"><TerminalSquare className="size-3" /> ready</span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                )) : <p className="p-5 text-sm text-muted-foreground">No active workspaces. Start at the top.</p>}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
