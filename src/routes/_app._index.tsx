import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_index")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-4">
        Welcome to Swole Tracker! Your workout tracking dashboard will appear
        here.
      </p>
    </div>
  );
}
