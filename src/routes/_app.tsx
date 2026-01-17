import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkAuth } from "~/server/functions/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { isAuthenticated } = await checkAuth();
    if (!isAuthenticated) {
      throw redirect({
        to: "/api/auth/login",
        search: { redirectTo: "/" },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="bg-background min-h-screen">
      <Outlet />
    </div>
  );
}
