import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {ArrowRight, Braces, Code2, Plus} from "lucide-react";
import {parseResponse} from "hono/client";
import {AppHeader, PanelHeading} from "../../components/common/SystemShell";
import {Button} from "../../components/ui/button";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

export const Route = createFileRoute("/plc/")({component: PlcIndexPage});

function PlcIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspacesQuery = useQuery({
    queryKey: ["plc-workspaces"],
    queryFn: () => parseResponse(rpcClient.api.plc.workspaces.$get()),
  });
  const createWorkspace = useMutation({
    mutationFn: () => parseResponse(rpcClient.api.plc.workspaces.$post()),
    onError: (error) => appToast.error(error.message),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({queryKey: ["plc-workspaces"]});
      navigate({to: "/plc/$workspaceId", params: {workspaceId: workspace.id}});
    },
  });
  const workspaces = workspacesQuery.data?.workspaces ?? [];

  return (
    <div className="workshop-page">
      <AppHeader currentSystem="PLC Runtime" />
      <main className="page-container">
        <div className="mb-6 flex items-center gap-3">
          <div className="system-glyph text-violet-400"><Braces className="size-4" /></div>
          <div><p className="font-mono text-[10px] text-muted-foreground">PLC/JVM · PARSER · EVALUATOR</p><h1 className="mt-0.5 text-lg font-medium">PLC Runtime</h1></div>
        </div>
        <section className="panel mx-auto max-w-3xl">
            <PanelHeading title="Workspaces" action={<span className="font-mono text-[10px] text-muted-foreground">{workspaces.length} ACTIVE</span>} />
            <div className="p-4">
              <Button size="lg" className="h-12 w-full justify-between px-4" disabled={createWorkspace.isPending} onClick={() => createWorkspace.mutate()}>
                <span className="flex items-center gap-2"><Plus className="size-4" />{createWorkspace.isPending ? "Starting evaluator…" : "New workspace"}</span><ArrowRight className="size-4" />
              </Button>
            </div>
            <div className="border-t border-border">
              <div className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Recent workspaces</div>
              <div className="max-h-80 overflow-auto border-t border-border">
                {workspacesQuery.isLoading ? <p className="p-5 text-sm text-muted-foreground">Reading registry…</p> : workspaces.length ? workspaces.map((workspace, index) => (
                  <button key={workspace.id} type="button" className="group flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted" onClick={() => navigate({to: "/plc/$workspaceId", params: {workspaceId: workspace.id}})}>
                    <span className="flex size-8 items-center justify-center border border-border bg-background font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-mono text-xs">{workspace.id}</span><span className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-success"><Code2 className="size-3" /> evaluator ready</span></span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground" />
                  </button>
                )) : <p className="p-5 text-sm text-muted-foreground">No active workspaces. Start at the top.</p>}
              </div>
            </div>
        </section>
      </main>
    </div>
  );
}
