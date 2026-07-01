import {queryOptions} from "@tanstack/react-query";
import {parseResponse, type InferResponseType} from "hono/client";
import {rpcClient} from "../../lib/rpc.client";

const projectsApi = rpcClient.projects;

export type Project = InferResponseType<typeof projectsApi.$get>[number];

export const projectsQueryKey = ["projects"] as const;

export const projectsQueryOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: projectsQueryKey,
    queryFn: () => parseResponse(projectsApi.$get()),
    enabled,
  });

export const createProject = (payload: {name: string}) =>
  parseResponse(
    projectsApi.$post({
      json: payload,
    }),
  );
