import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {rpcClient} from "../../lib/rpc.client";
import {DetailedError, parseResponse} from "hono/client";
import {appToast} from "../../lib/toast";
import {useEffect, useState} from "react";

export const Route = createFileRoute("/redis/")({
  component: RouteComponent,
  loader: async () => {},
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const workspaceListQuery = useQuery({
    queryKey: ["redis-workspaces"],
    queryFn: async () => {
      return await parseResponse(rpcClient.api.redis.workspaces.$get());
    },
  });
  const workspaces = workspaceListQuery.data?.workspaces ?? [];

  const createWorkspaceMutation = useMutation({
    mutationFn: async () => {
      return await parseResponse(rpcClient.api.redis.workspaces.$post());
    },
    onError: (err) => {
      if (err instanceof DetailedError) {
        appToast.error(err.message);
      }
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({queryKey: ["redis-workspaces"]});
      navigate({
        to: "/redis/$workspaceId",
        params: {workspaceId: workspace.id},
      });
    },
  });
  const optionCount = workspaces.length + 1;

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, optionCount - 1));
  }, [optionCount]);

  useEffect(() => {
    const selectOption = (index: number) => {
      if (index === 0) {
        createWorkspaceMutation.mutate();
        return;
      }

      const workspace = workspaces[index - 1];

      if (workspace) {
        navigate({
          to: "/redis/$workspaceId",
          params: {workspaceId: workspace.id},
        });
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % optionCount);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + optionCount) % optionCount);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        selectOption(selectedIndex);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    createWorkspaceMutation,
    navigate,
    optionCount,
    selectedIndex,
    workspaces,
  ]);

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-sm text-green-300">
      <div className="mb-3 text-green-500">$ redis</div>
      <button
        type="button"
        className="block w-full max-w-xl text-left outline-none"
        disabled={createWorkspaceMutation.isPending}
        onClick={() => createWorkspaceMutation.mutate()}
        onFocus={() => setSelectedIndex(0)}
      >
        {selectedIndex === 0 ? "> " : "  "}
        {createWorkspaceMutation.isPending
          ? "creating workspace"
          : "new workspace"}
      </button>

      {workspaceListQuery.isLoading ? (
        <div className="mt-2 text-green-700">loading workspaces</div>
      ) : null}

      {workspaces.map((workspace, index) => (
        <button
          key={workspace.id}
          type="button"
          className="block w-full max-w-xl text-left outline-none"
          onClick={() =>
            navigate({
              to: "/redis/$workspaceId",
              params: {workspaceId: workspace.id},
            })
          }
          onFocus={() => setSelectedIndex(index + 1)}
        >
          {selectedIndex === index + 1 ? "> " : "  "}
          {workspace.id}
        </button>
      ))}
    </div>
  );
}
