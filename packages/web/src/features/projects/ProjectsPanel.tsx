import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {type FormEvent, useState} from "react";
import {ResourceState} from "../../components/common/ResourceState";
import {Button} from "../../components/ui/button";
import {Card, CardContent} from "../../components/ui/card";
import {Input} from "../../components/ui/input";
import {Label} from "../../components/ui/label";
import {
  createProject,
  type Project,
  projectsQueryKey,
  projectsQueryOptions,
} from "./projects.query";

export function ProjectsPanel({enabled}: {enabled: boolean}) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const projectsQuery = useQuery(projectsQueryOptions(enabled));

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (created) => {
      queryClient.setQueryData<Project[]>(projectsQueryKey, (prev) => [
        created,
        ...(prev ?? []),
      ]);
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKey,
      });
      setName("");
    },
  });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({name});
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-6">
          <form
            onSubmit={handleCreate}
            className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="project-name">New project</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My next product"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
          {createMutation.error ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Failed to create project"}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Your projects</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {(projectsQuery.data ?? []).map((project) => (
            <Card key={project.id}>
              <CardContent className="p-4">
                <div className="text-base font-semibold">{project.name}</div>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
          {projectsQuery.isLoading ? (
            <ResourceState title="Loading projects..." />
          ) : null}
          {projectsQuery.error ? (
            <ResourceState
              title="Failed to load projects"
              description={
                projectsQuery.error instanceof Error
                  ? projectsQuery.error.message
                  : undefined
              }
              actionLabel="Retry"
              onAction={() => void projectsQuery.refetch()}
              tone="danger"
            />
          ) : null}
          {(projectsQuery.data?.length ?? 0) === 0 &&
          !projectsQuery.isLoading &&
          !projectsQuery.error ? (
            <ResourceState
              title="No projects yet"
              description="Create your first project above."
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
