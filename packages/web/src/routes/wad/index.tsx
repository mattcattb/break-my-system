import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {parseResponse} from "hono/client";
import {rpcClient} from "../../lib/rpc.client";

export const Route = createFileRoute("/wad/")({component: WadIndexPage});

function WadIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspaces = useQuery({
    queryKey: ["wad-workspaces"],
    queryFn: () => parseResponse(rpcClient.api.wad.workspaces.$get()),
  });
  const createWorkspace = useMutation({
    mutationFn: () => parseResponse(rpcClient.api.wad.workspaces.$post()),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({queryKey: ["wad-workspaces"]});
      navigate({to: "/wad/$workspaceId", params: {workspaceId: workspace.id}});
    },
  });

  return <div className="min-h-screen bg-black p-4 font-mono text-sm text-green-300"><div className="mb-3 text-green-500">$ wad</div><button type="button" className="block w-full max-w-xl text-left outline-none" disabled={createWorkspace.isPending} onClick={() => createWorkspace.mutate()}>&gt; {createWorkspace.isPending ? "creating workspace" : "new workspace"}</button>{workspaces.data?.workspaces.map((workspace) => <button key={workspace.id} type="button" className="mt-1 block w-full max-w-xl text-left text-green-500 outline-none hover:text-green-200" onClick={() => navigate({to: "/wad/$workspaceId", params: {workspaceId: workspace.id}})}>&nbsp;&nbsp;{workspace.id} · {workspace.wads.length} WADs</button>)}</div>;
}
