import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getServerContext } from "~/server/context";
import { DashboardHeader } from "~/components/dashboard-header";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { user } = await getServerContext();
    if (!user) {
      throw redirect({
        to: "/api/auth/login",
        search: { redirectTo: "/" },
      });
    }
    return { user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="bg-background min-h-screen">
      <DashboardHeader />
      <Outlet />
    </div>
  );
}
