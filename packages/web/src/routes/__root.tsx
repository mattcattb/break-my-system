import {createRootRouteWithContext, Outlet} from "@tanstack/react-router";
import {Toaster} from "../components/ui/toast";
import {QueryClient} from "@tanstack/react-query";

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="min-h-screen w-full">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
