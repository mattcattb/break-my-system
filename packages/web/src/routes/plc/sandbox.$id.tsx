import {useMutation, useQuery} from "@tanstack/react-query";
import {createFileRoute, redirect, useNavigate} from "@tanstack/react-router";
import {DetailedError, parseResponse} from "hono/client";
import {useState} from "react";
import {Button} from "../../components/ui/button";
import {Textarea} from "../../components/ui/textarea";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

const sandboxQuery = (sandboxId: string) => ({
  queryKey: ["plc-sandbox", sandboxId] as const,
  queryFn: async () => {
    try {
      return await parseResponse(
        rpcClient.api.plc.sandbox[":sandboxId"].$get({
          param: {sandboxId},
        }),
      );
    } catch (error) {
      if (error instanceof DetailedError && error.statusCode === 404) {
        throw redirect({to: "/plc"});
      }
      throw error;
    }
  },
});

export const Route = createFileRoute("/plc/sandbox/$id")({
  loader: ({context, params}) =>
    context.queryClient.ensureQueryData(sandboxQuery(params.id)),
  component: PlcSandboxPage,
});

function PlcSandboxPage() {
  const {id: sandboxId} = Route.useParams();
  const navigate = useNavigate();
  useQuery(sandboxQuery(sandboxId));
  const [source, setSource] = useState(
    'LET greeting = "Hello from the PLC";\nprint(greeting);\ngreeting;',
  );
  const [output, setOutput] = useState("Run a program to start the PLC process.");
  const [succeeded, setSucceeded] = useState<boolean>();

  const evaluate = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.plc.sandbox[":sandboxId"].evaluate.$post({
          param: {sandboxId},
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
        rpcClient.api.plc.sandbox[":sandboxId"].reset.$post({
          param: {sandboxId},
        }),
      ),
    onError: (error) => appToast.error(error.message),
    onSuccess: () => {
      setSucceeded(undefined);
      setOutput("PLC process reset. The next run starts with a clean scope.");
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.plc.sandbox[":sandboxId"].$delete({
          param: {sandboxId},
        }),
      ),
    onSuccess: () => navigate({to: "/plc"}),
  });

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-sm text-green-300">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-green-500">$ plc --sandbox {sandboxId}</div>
            <p className="mt-1 text-xs text-green-800">
              Evaluator mode · scope persists until reset
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={reset.isPending}
              onClick={() => reset.mutate()}
            >
              reset scope
            </Button>
            <Button variant="danger" onClick={() => remove.mutate()}>
              close sandbox
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <label htmlFor="plc-source" className="mb-2 block text-green-600">
              source.plc
            </label>
            <Textarea
              id="plc-source"
              value={source}
              className="min-h-96 resize-y rounded-none border-green-900 bg-black font-mono text-green-200"
              onChange={(event) => setSource(event.target.value)}
            />
            <Button
              className="mt-3"
              disabled={evaluate.isPending || !source.trim()}
              onClick={() => evaluate.mutate()}
            >
              {evaluate.isPending ? "running" : "run program"}
            </Button>
          </section>

          <section>
            <div className="mb-2 text-green-600">output</div>
            <pre
              className={`min-h-96 overflow-auto whitespace-pre-wrap border p-3 text-xs ${
                succeeded === false
                  ? "border-red-900 text-red-300"
                  : "border-green-900 text-green-300"
              }`}
            >
              {output}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
