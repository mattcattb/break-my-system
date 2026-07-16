import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {parseResponse} from "hono/client";
import {rpcClient} from "../../lib/rpc.client";
import {appToast} from "../../lib/toast";

export const Route = createFileRoute("/plc/")({
  component: PlcIndexPage,
});

function PlcIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sandboxesQuery = useQuery({
    queryKey: ["plc-sandboxes"],
    queryFn: () => parseResponse(rpcClient.api.plc.sandbox.list.$get()),
  });
  const createSandbox = useMutation({
    mutationFn: () => parseResponse(rpcClient.api.plc.sandbox.$post()),
    onError: (error) => appToast.error(error.message),
    onSuccess: (sandbox) => {
      queryClient.invalidateQueries({queryKey: ["plc-sandboxes"]});
      navigate({to: "/plc/sandbox/$id", params: {id: sandbox.id}});
    },
  });

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-sm text-green-300">
      <div className="mb-3 text-green-500">$ plc</div>
      <button
        type="button"
        className="block w-full max-w-xl text-left outline-none"
        disabled={createSandbox.isPending}
        onClick={() => createSandbox.mutate()}
        autoFocus
      >
        &gt; {createSandbox.isPending ? "starting sandbox" : "new sandbox"}
      </button>

      {sandboxesQuery.data?.sandboxes.map((sandbox) => (
        <button
          key={sandbox.id}
          type="button"
          className="mt-1 block w-full max-w-xl text-left text-green-500 outline-none hover:text-green-200"
          onClick={() =>
            navigate({to: "/plc/sandbox/$id", params: {id: sandbox.id}})
          }
        >
          &nbsp;&nbsp;{sandbox.id}
        </button>
      ))}
    </div>
  );
}
