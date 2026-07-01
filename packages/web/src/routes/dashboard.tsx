import {createFileRoute, Navigate} from "@tanstack/react-router";
import {ProjectsPanel} from "../features/projects/ProjectsPanel";
import {useSession} from "../lib/auth";
export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: session, isPending } = useSession();
  const canFetch = Boolean(session && !isPending);
  if (!isPending && !session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-3xl font-semibold">Dashboard</h2>
        <p className="text-muted-foreground">
          Signed in as {session?.user.email}.
        </p>
      </section>

      <ProjectsPanel enabled={canFetch} />
    </div>
  );
}
