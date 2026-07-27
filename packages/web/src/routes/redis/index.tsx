import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  TerminalSquare,
} from "lucide-react";
import {DetailedError, parseResponse} from "hono/client";
import {useEffect, useState} from "react";
import {
  AppHeader,
  DirectorySectionHeader,
} from "../../components/common/SystemShell";
import {Button} from "../../components/ui/button";
import {cn} from "../../lib/cn";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

export const Route = createFileRoute("/redis/")({component: RedisIndexPage});

function RedisIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>();
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

  useEffect(() => {
    if (
      workspaces.length &&
      !workspaces.some((workspace) => workspace.id === selectedWorkspaceId)
    ) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [selectedWorkspaceId, workspaces]);

  return (
    <div className="system-interface workshop-page">
      <AppHeader
        currentSystem="redis"
        trailing={<span className="font-mono text-[9px] text-muted-foreground">
          {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"}
        </span>}
      />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="mb-5 border border-border bg-surface">
          <DirectorySectionHeader title="New workspace" />
          <div className="flex flex-wrap items-center gap-4 p-4">
            <span className="grid size-9 shrink-0 place-items-center border border-border bg-surface-elevated text-primary">
              <Plus className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-semibold">Start a Redis workspace</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Open a fresh terminal and key inspector.
              </p>
            </div>
            <Button
              size="sm"
              disabled={createWorkspace.isPending}
              onClick={() => createWorkspace.mutate()}
            >
              {createWorkspace.isPending ? "Creating…" : "Create workspace"}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </section>

        <section className="border border-border bg-surface">
          <DirectorySectionHeader
            title="Workspaces"
            detail={`${workspaces.length} total`}
          />
          {workspacesQuery.isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">
              Reading workspace registry…
            </p>
          ) : workspaces.length ? (
            <div>
              {workspaces.map((workspace) => {
                const selected = workspace.id === selectedWorkspaceId;
                const commandCount = workspace.terminals.reduce(
                  (total, terminal) => total + terminal.commandCount,
                  0,
                );
                const connected = workspace.connectionStatus === "connected";
                const failed = workspace.connectionStatus === "error";

                return (
                  <div
                    key={workspace.id}
                    className={cn(
                      "border-b border-border last:border-b-0",
                      selected && "border-l-2 border-l-primary bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      className="grid w-full grid-cols-[minmax(0,1fr)_7rem_1rem] items-center gap-3 px-4 py-3 text-left hover:bg-muted"
                      aria-expanded={selected}
                      onClick={() => setSelectedWorkspaceId(workspace.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[11px] text-foreground">
                          {workspace.id}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {workspace.terminals.length}{" "}
                          {workspace.terminals.length === 1
                            ? "terminal"
                            : "terminals"}{" "}
                          · {commandCount} commands
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-2 font-mono text-[9px] text-muted-foreground",
                          connected && "text-success",
                          failed && "text-danger",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full bg-muted-foreground",
                            connected && "bg-success",
                            failed && "bg-danger",
                          )}
                        />
                        {workspace.connectionStatus}
                      </span>
                      {selected ? (
                        <ChevronUp className="size-3.5 text-primary" />
                      ) : (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      )}
                    </button>

                    {selected ? (
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border bg-surface-elevated px-4 py-3">
                        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-8 gap-y-3 font-mono text-[9px] sm:grid-cols-4">
                          <div>
                            <dt className="text-muted-foreground">Connection</dt>
                            <dd className="mt-1 text-foreground/80">
                              Server environment
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">System</dt>
                            <dd className="mt-1 text-foreground/80">Go Redis</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Terminals</dt>
                            <dd className="mt-1 text-foreground/80">
                              {workspace.terminals.length}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Last active</dt>
                            <dd className="mt-1 truncate text-foreground/80">
                              {new Date(workspace.lastSeenAt).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </dd>
                          </div>
                        </dl>
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/redis/$workspaceId",
                              params: {workspaceId: workspace.id},
                            })
                          }
                        >
                          <TerminalSquare className="size-3.5" />
                          Open workspace
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              No workspaces yet. Create one above.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
