import {createRootRoute, Link, Outlet} from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-surface/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            break-my-system
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <a
              href="http://localhost:3000/health"
              className="text-muted-foreground hover:text-foreground"
            >
              API health
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
