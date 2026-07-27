import {useMutation, useQuery} from "@tanstack/react-query";
import {createFileRoute, redirect, useNavigate} from "@tanstack/react-router";
import {Play, RotateCcw, TerminalSquare, Trash2} from "lucide-react";
import {DetailedError, parseResponse} from "hono/client";
import {useState} from "react";
import {PanelHeading, WorkspaceHeader} from "../../components/common/SystemShell";
import {Button} from "../../components/ui/button";
import {Textarea} from "../../components/ui/textarea";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

const workspaceQuery = (workspaceId: string) => ({
  queryKey: ["plc-workspace", workspaceId] as const,
  queryFn: async () => {
    try {
      return await parseResponse(
        rpcClient.api.plc.workspaces[":workspaceId"].$get({param: {workspaceId}}),
      );
    } catch (error) {
      if (error instanceof DetailedError && error.statusCode === 404) {
        throw redirect({to: "/plc"});
      }
      throw error;
    }
  },
});

export const Route = createFileRoute("/plc/$workspaceId")({
  loader: ({context, params}) =>
    context.queryClient.ensureQueryData(workspaceQuery(params.workspaceId)),
  component: PlcWorkspacePage,
});

function PlcWorkspacePage() {
  const {workspaceId} = Route.useParams();
  const navigate = useNavigate();
  const workspace = useQuery(workspaceQuery(workspaceId));
  const [source, setSource] = useState(
    'FOR temperature IN range(68, 73) DO\n    IF temperature > 70 DO\n        print("cooling · " + temperature);\n    ELSE\n        print("stable · " + temperature);\n    END\nEND',
  );
  const [output, setOutput] = useState(
    "Edit the example or run it as-is to inspect the evaluator output.",
  );
  const [succeeded, setSucceeded] = useState<boolean>();
  const evaluate = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.plc.workspaces[":workspaceId"].evaluate.$post({
          param: {workspaceId},
          json: {source},
        }),
      ),
    onError: (error) => appToast.error(error.message),
    onSuccess: (result) => {
      setSucceeded(result.ok);
      setOutput(
        `${result.output.trimEnd()}\n\n[${result.durationMs} ms · ${result.ok ? "ok" : "error"}]`,
      );
    },
  });
  const reset = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.plc.workspaces[":workspaceId"].reset.$post({param: {workspaceId}}),
      ),
    onError: (error) => appToast.error(error.message),
    onSuccess: () => {
      workspace.refetch();
      setSucceeded(undefined);
      setOutput("PLC process reset. The next run starts with a clean scope.");
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.plc.workspaces[":workspaceId"].$delete({param: {workspaceId}}),
      ),
    onSuccess: () => navigate({to: "/plc"}),
  });
  const status = workspace.data?.status ?? "idle";

  return (
    <div className="system-interface flex h-dvh min-h-[32rem] flex-col overflow-hidden bg-background">
      <WorkspaceHeader
        system="plc"
        workspaceId={workspaceId}
        status={status}
        meta="persistent evaluator scope"
        actions={
          <>
            <Button variant="outline" size="sm" disabled={reset.isPending} onClick={() => reset.mutate()}>
              <RotateCcw className="size-3.5" /> Reset scope
            </Button>
            <Button variant="danger" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
              <Trash2 className="size-3.5" /> Close
            </Button>
          </>
        }
      />
      <main className="grid min-h-0 flex-1 grid-rows-2 gap-px bg-border lg:grid-cols-2 lg:grid-rows-1">
        <section className="flex min-h-0 flex-col bg-surface">
          <PanelHeading
            eyebrow="Program"
            title="source.plc"
            action={<span className="font-mono text-[10px] text-muted-foreground">{source.split("\n").length} LINES</span>}
          />
          <div className="min-h-0 flex-1 bg-background p-3">
            <Textarea
              id="plc-source"
              value={source}
              spellCheck={false}
              aria-label="PLC source"
              className="terminal-surface h-full min-h-0 resize-none border-border p-4 font-mono text-sm leading-6 text-foreground"
              onChange={(event) => setSource(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">LET / DEF persist until reset</span>
            <Button disabled={evaluate.isPending || !source.trim()} onClick={() => evaluate.mutate()}>
              <Play className="size-3.5" /> {evaluate.isPending ? "Running…" : "Run program"}
            </Button>
          </div>
        </section>
        <section className="flex min-h-0 flex-col bg-surface">
          <PanelHeading
            eyebrow="Runtime"
            title="Program output"
            action={<span className={`font-mono text-[10px] uppercase ${succeeded === false ? "text-danger" : succeeded ? "text-success" : "text-muted-foreground"}`}>{succeeded === undefined ? "WAITING" : succeeded ? "OK" : "ERROR"}</span>}
          />
          <pre className={`terminal-surface min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm leading-6 ${succeeded === false ? "text-danger" : "text-foreground/80"}`}>
            {output}
          </pre>
          <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            <TerminalSquare className="size-3.5" /> Analyzer · evaluator · stdout
          </div>
        </section>
      </main>
    </div>
  );
}
