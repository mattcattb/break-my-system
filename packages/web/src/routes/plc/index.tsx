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

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-sm text-green-300">
      <div className="mb-3 text-green-500">$ plc</div>
      <button
        type="button"
        className="block w-full max-w-xl text-left outline-none"
        disabled={createWorkspace.isPending}
        onClick={() => createWorkspace.mutate()}
        autoFocus
      >
        &gt; {createWorkspace.isPending ? "creating workspace" : "new workspace"}
      </button>

      {workspacesQuery.data?.workspaces.map((workspace) => (
        <button
          key={workspace.id}
          type="button"
          className="mt-1 block w-full max-w-xl text-left text-green-500 outline-none hover:text-green-200"
          onClick={() =>
            navigate({to: "/plc/$workspaceId", params: {workspaceId: workspace.id}})
          }
        >
          &nbsp;&nbsp;{workspace.id}
        </button>
      ))}
    </div>
  );
}
