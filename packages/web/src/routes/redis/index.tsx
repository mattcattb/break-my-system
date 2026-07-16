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

  const sandboxListQuery = useQuery({
    queryKey: ["sandboxes"],
    queryFn: async () => {
      return await parseResponse(rpcClient.api.redis.sandbox.list.$get());
    },
  });
  const sandboxes = sandboxListQuery.data?.sandboxes ?? [];

  const createSandboxMutation = useMutation({
    mutationFn: async () => {
      return await parseResponse(rpcClient.api.redis.sandbox.$post());
    },
    onError: (err) => {
      if (err instanceof DetailedError) {
        appToast.error(err.message);
      }
    },
    onSuccess: (sandbox) => {
      queryClient.invalidateQueries({queryKey: ["sandboxes"]});
      navigate({to: "/redis/sandbox/$id", params: {id: sandbox.id}});
    },
  });
  const optionCount = sandboxes.length + 1;

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, optionCount - 1));
  }, [optionCount]);

  useEffect(() => {
    const selectOption = (index: number) => {
      if (index === 0) {
        createSandboxMutation.mutate();
        return;
      }

      const sandbox = sandboxes[index - 1];

      if (sandbox) {
        navigate({to: "/redis/sandbox/$id", params: {id: sandbox.id}});
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
  }, [createSandboxMutation, navigate, optionCount, sandboxes, selectedIndex]);

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-sm text-green-300">
      <div className="mb-3 text-green-500">$ redis</div>
      <button
        type="button"
        className="block w-full max-w-xl text-left outline-none"
        disabled={createSandboxMutation.isPending}
        onClick={() => createSandboxMutation.mutate()}
        onFocus={() => setSelectedIndex(0)}
      >
        {selectedIndex === 0 ? "> " : "  "}
        {createSandboxMutation.isPending ? "creating sandbox" : "new sandbox"}
      </button>

      {sandboxListQuery.isLoading ? (
        <div className="mt-2 text-green-700">loading sandboxes</div>
      ) : null}

      {sandboxes.map((sandbox, index) => (
        <button
          key={sandbox.id}
          type="button"
          className="block w-full max-w-xl text-left outline-none"
          onClick={() =>
            navigate({to: "/redis/sandbox/$id", params: {id: sandbox.id}})
          }
          onFocus={() => setSelectedIndex(index + 1)}
        >
          {selectedIndex === index + 1 ? "> " : "  "}
          {sandbox.id}
        </button>
      ))}
    </div>
  );
}
